"""
Camada de acesso ao banco de dados.

Mantém a conexão SQLite por requisição (via `flask.g`) e sabe como
inicializar o schema a partir de database/schema.sql — o mesmo arquivo
usado pelo painel PHP e pelo script Node de geração de feed.
"""

import sqlite3
from pathlib import Path

import click
from flask import current_app, g

RAIZ_PROJETO = Path(__file__).resolve().parent.parent
CAMINHO_SCHEMA = RAIZ_PROJETO / "database" / "schema.sql"


def get_db() -> sqlite3.Connection:
    """Retorna a conexão SQLite da requisição atual, criando se preciso."""
    if "db" not in g:
        g.db = sqlite3.connect(
            current_app.config["CAMINHO_BANCO"],
            detect_types=sqlite3.PARSE_DECLTYPES,
        )
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def fechar_db(exceptions=None) -> None:
    db = g.pop("db", None)
    if db is not None:
        db.close()


def inicializar_db() -> None:
    """Cria as tabelas a partir do schema.sql (idempotente)."""
    db = get_db()
    with open(CAMINHO_SCHEMA, "r", encoding="utf-8") as f:
        db.executescript(f.read())
    db.commit()


def popular_dados_exemplo() -> None:
    """Insere canais, usuários e tópicos de demonstração, se o banco
    ainda estiver vazio. Usa geração de hash de senha do Werkzeug em vez
    de gravar hashes fixos no SQL, para não repetir lógica de auth."""
    from werkzeug.security import generate_password_hash

    db = get_db()
    if db.execute("SELECT COUNT(*) FROM canais").fetchone()[0] > 0:
        return

    canais = [
        ("geral", "Geral", "Assuntos gerais da comunidade", 0),
        ("desenvolvimento", "Desenvolvimento", "Código, bugs e arquitetura", 1),
        ("design", "Design", "Interfaces, protótipos e feedback visual", 2),
        ("off-topic", "Off-topic", "O resto da conversa", 3),
    ]
    db.executemany(
        "INSERT INTO canais (slug, nome, descricao, ordem) VALUES (?, ?, ?, ?)",
        canais,
    )

    usuarios = [
        ("ana", "ana@exemplo.com", "trocar123", "#FFB000"),
        ("bento", "bento@exemplo.com", "trocar123", "#57C7B8"),
        ("carla", "carla@exemplo.com", "trocar123", "#FF6B5B"),
    ]
    for nome_usuario, email, senha, cor in usuarios:
        db.execute(
            "INSERT INTO usuarios (nome_usuario, email, senha_hash, cor_avatar) "
            "VALUES (?, ?, ?, ?)",
            (nome_usuario, email, generate_password_hash(senha), cor),
        )

    db.commit()

    canal_geral = db.execute(
        "SELECT id FROM canais WHERE slug = 'geral'"
    ).fetchone()["id"]
    canal_dev = db.execute(
        "SELECT id FROM canais WHERE slug = 'desenvolvimento'"
    ).fetchone()["id"]
    usuario_ana = db.execute(
        "SELECT id FROM usuarios WHERE nome_usuario = 'ana'"
    ).fetchone()["id"]
    usuario_bento = db.execute(
        "SELECT id FROM usuarios WHERE nome_usuario = 'bento'"
    ).fetchone()["id"]

    cur = db.execute(
        "INSERT INTO topicos (canal_id, usuario_id, titulo, fixado) "
        "VALUES (?, ?, ?, 1)",
        (canal_geral, usuario_ana, "Bem-vindos ao QUADRO — leiam antes de postar"),
    )
    topico_boas_vindas = cur.lastrowid

    db.execute(
        "INSERT INTO posts (topico_id, usuario_id, corpo) VALUES (?, ?, ?)",
        (
            topico_boas_vindas,
            usuario_ana,
            "Esse é um fórum modelo. Sintam-se livres para adaptar o código, "
            "o esquema do banco e o visual para o projeto de vocês.",
        ),
    )
    db.execute(
        "INSERT INTO posts (topico_id, usuario_id, corpo) VALUES (?, ?, ?)",
        (topico_boas_vindas, usuario_bento, "Recebido. Sinal forte e claro."),
    )

    cur = db.execute(
        "INSERT INTO topicos (canal_id, usuario_id, titulo) VALUES (?, ?, ?)",
        (canal_dev, usuario_bento, "Como vocês organizam migrações de schema?"),
    )
    topico_migracoes = cur.lastrowid
    db.execute(
        "INSERT INTO posts (topico_id, usuario_id, corpo) VALUES (?, ?, ?)",
        (
            topico_migracoes,
            usuario_bento,
            "Nesse template as migrações são só o schema.sql aplicado direto. "
            "Em produção eu trocaria por Alembic ou similar.",
        ),
    )

    db.commit()


def registrar_comandos_cli(app) -> None:
    """Registra `flask init-db` e `flask seed` como comandos de terminal."""

    @app.cli.command("init-db")
    def comando_init_db():
        """Cria as tabelas do banco (não apaga dados existentes)."""
        inicializar_db()
        click.echo("Banco inicializado a partir de database/schema.sql")

    @app.cli.command("seed")
    def comando_seed():
        """Popula o banco com canais, usuários e tópicos de exemplo."""
        popular_dados_exemplo()
        click.echo("Dados de exemplo inseridos (ou já existiam).")
