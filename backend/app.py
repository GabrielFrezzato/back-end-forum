"""
QUADRO — backend Flask.

Serve a API REST em /api/* e o frontend estático (HTML/CSS/JS puro) em /.
Autenticação é feita por sessão de cookie assinado pelo Flask; senhas são
guardadas com hash (werkzeug.security), nunca em texto puro.

Rodar localmente:
    cd backend
    flask --app app init-db
    flask --app app seed
    flask --app app run --debug
"""

import json
import math
import os
import sqlite3
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from werkzeug.security import check_password_hash, generate_password_hash

from db import fechar_db, get_db, registrar_comandos_cli

RAIZ_PROJETO = Path(__file__).resolve().parent.parent
CAMINHO_FRONTEND = RAIZ_PROJETO / "frontend"
CAMINHO_CONFIG = RAIZ_PROJETO / "config" / "settings.json"

with open(CAMINHO_CONFIG, "r", encoding="utf-8") as f:
    CONFIG = json.load(f)


def criar_app() -> Flask:
    app = Flask(__name__, static_folder=None)
    app.config["SECRET_KEY"] = os.environ.get("QUADRO_SECRET_KEY", "dev-nao-use-em-producao")
    app.config["CAMINHO_BANCO"] = str(RAIZ_PROJETO / CONFIG["banco_de_dados"])
    app.config["JSON_AS_ASCII"] = False

    app.teardown_appcontext(fechar_db)
    registrar_comandos_cli(app)

    # ---------------------------------------------------------------
    # Frontend estático (HTML / CSS / JS puro, sem build step)
    # ---------------------------------------------------------------
    @app.get("/")
    def servir_index():
        return send_from_directory(CAMINHO_FRONTEND, "index.html")

    @app.get("/<path:caminho>")
    def servir_estatico(caminho):
        arquivo = CAMINHO_FRONTEND / caminho
        if arquivo.exists():
            return send_from_directory(CAMINHO_FRONTEND, caminho)
        # rotas "bonitas" tipo /topico caem no respectivo .html
        if (CAMINHO_FRONTEND / f"{caminho}.html").exists():
            return send_from_directory(CAMINHO_FRONTEND, f"{caminho}.html")
        return jsonify(erro="não encontrado"), 404

    # ---------------------------------------------------------------
    # Auxiliares de sessão
    # ---------------------------------------------------------------
    from flask import session

    def obter_usuario_logado():
        uid = session.get("usuario_id")
        if not uid:
            return None
        db = get_db()
        return db.execute(
            "SELECT id, nome_usuario, email, cor_avatar FROM usuarios WHERE id = ?",
            (uid,),
        ).fetchone()

    def exigir_login():
        u = obter_usuario_logado()
        if u is None:
            return None
        return u

    # ---------------------------------------------------------------
    # Auth
    # ---------------------------------------------------------------
    @app.post("/api/auth/registrar")
    def registrar():
        dados = request.get_json(silent=True) or {}
        nome_usuario = (dados.get("nome_usuario") or "").strip()
        email = (dados.get("email") or "").strip().lower()
        senha = dados.get("senha") or ""

        if len(nome_usuario) < 3:
            return jsonify(erro="nome de usuário precisa de ao menos 3 caracteres"), 400
        if "@" not in email:
            return jsonify(erro="e-mail inválido"), 400
        if len(senha) < CONFIG["tamanho_min_senha"]:
            minimo = CONFIG["tamanho_min_senha"]
            return jsonify(erro=f"senha precisa de ao menos {minimo} caracteres"), 400

        db = get_db()
        try:
            cur = db.execute(
                "INSERT INTO usuarios (nome_usuario, email, senha_hash) VALUES (?, ?, ?)",
                (nome_usuario, email, generate_password_hash(senha)),
            )
            db.commit()
        except sqlite3.IntegrityError:
            return jsonify(erro="nome de usuário ou e-mail já cadastrado"), 409

        session["usuario_id"] = cur.lastrowid
        return jsonify(ok=True, usuario={"id": cur.lastrowid, "nome_usuario": nome_usuario}), 201

    @app.post("/api/auth/entrar")
    def entrar():
        dados = request.get_json(silent=True) or {}
        nome_usuario = (dados.get("nome_usuario") or "").strip()
        senha = dados.get("senha") or ""

        db = get_db()
        linha = db.execute(
            "SELECT * FROM usuarios WHERE nome_usuario = ?", (nome_usuario,)
        ).fetchone()

        if linha is None or not check_password_hash(linha["senha_hash"], senha):
            return jsonify(erro="usuário ou senha incorretos"), 401

        session["usuario_id"] = linha["id"]
        return jsonify(
            ok=True,
            usuario={"id": linha["id"], "nome_usuario": linha["nome_usuario"]},
        )

    @app.post("/api/auth/sair")
    def sair():
        session.pop("usuario_id", None)
        return jsonify(ok=True)

    @app.get("/api/auth/eu")
    def eu():
        u = obter_usuario_logado()
        if u is None:
            return jsonify(usuario=None)
        return jsonify(usuario=dict(u))

    # ---------------------------------------------------------------
    # Canais
    # ---------------------------------------------------------------
    @app.get("/api/canais")
    def listar_canais():
        db = get_db()
        canais = db.execute(
            """
            SELECT c.id, c.slug, c.nome, c.descricao,
                   COUNT(t.id) AS total_topicos
            FROM canais c
            LEFT JOIN topicos t ON t.canal_id = c.id
            GROUP BY c.id
            ORDER BY c.ordem
            """
        ).fetchall()
        return jsonify(canais=[dict(c) for c in canais])

    # ---------------------------------------------------------------
    # Tópicos
    # ---------------------------------------------------------------
    @app.get("/api/topicos")
    def listar_topicos():
        canal_slug = request.args.get("canal")
        pagina = max(1, request.args.get("pagina", 1, type=int))
        por_pagina = CONFIG["topicos_por_pagina"]

        db = get_db()
        params = []
        onde = ""
        if canal_slug:
            onde = "WHERE canal_slug = ?"
            params.append(canal_slug)

        total = db.execute(
            f"SELECT COUNT(*) FROM v_topicos_resumo {onde}", params
        ).fetchone()[0]

        linhas = db.execute(
            f"""
            SELECT * FROM v_topicos_resumo
            {onde}
            ORDER BY fixado DESC, COALESCE(ultima_atividade, criado_em) DESC
            LIMIT ? OFFSET ?
            """,
            [*params, por_pagina, (pagina - 1) * por_pagina],
        ).fetchall()

        return jsonify(
            topicos=[dict(r) for r in linhas],
            pagina=pagina,
            total_paginas=max(1, math.ceil(total / por_pagina)),
            total=total,
        )

    @app.get("/api/topicos/<int:topico_id>")
    def obter_topico(topico_id):
        db = get_db()
        topico = db.execute(
            "SELECT * FROM v_topicos_resumo WHERE id = ?", (topico_id,)
        ).fetchone()
        if topico is None:
            return jsonify(erro="tópico não encontrado"), 404

        posts = db.execute(
            """
            SELECT p.id, p.corpo, p.criado_em,
                   u.nome_usuario AS autor, u.cor_avatar AS autor_cor
            FROM posts p
            JOIN usuarios u ON u.id = p.usuario_id
            WHERE p.topico_id = ?
            ORDER BY p.criado_em ASC
            """,
            (topico_id,),
        ).fetchall()

        return jsonify(topico=dict(topico), posts=[dict(p) for p in posts])

    @app.post("/api/topicos")
    def criar_topico():
        u = exigir_login()
        if u is None:
            return jsonify(erro="é preciso estar logado"), 401

        dados = request.get_json(silent=True) or {}
        canal_slug = dados.get("canal_slug")
        titulo = (dados.get("titulo") or "").strip()
        corpo = (dados.get("corpo") or "").strip()

        if not titulo or len(titulo) < 4:
            return jsonify(erro="título muito curto"), 400
        if not corpo:
            return jsonify(erro="a mensagem inicial não pode ficar vazia"), 400

        db = get_db()
        canal = db.execute(
            "SELECT id FROM canais WHERE slug = ?", (canal_slug,)
        ).fetchone()
        if canal is None:
            return jsonify(erro="canal inválido"), 400

        cur = db.execute(
            "INSERT INTO topicos (canal_id, usuario_id, titulo) VALUES (?, ?, ?)",
            (canal["id"], u["id"], titulo),
        )
        topico_id = cur.lastrowid
        db.execute(
            "INSERT INTO posts (topico_id, usuario_id, corpo) VALUES (?, ?, ?)",
            (topico_id, u["id"], corpo),
        )
        db.commit()
        return jsonify(ok=True, topico_id=topico_id), 201

    @app.post("/api/topicos/<int:topico_id>/posts")
    def responder_topico(topico_id):
        u = exigir_login()
        if u is None:
            return jsonify(erro="é preciso estar logado"), 401

        dados = request.get_json(silent=True) or {}
        corpo = (dados.get("corpo") or "").strip()
        if not corpo:
            return jsonify(erro="a resposta não pode ficar vazia"), 400

        db = get_db()
        topico = db.execute(
            "SELECT trancado FROM topicos WHERE id = ?", (topico_id,)
        ).fetchone()
        if topico is None:
            return jsonify(erro="tópico não encontrado"), 404
        if topico["trancado"]:
            return jsonify(erro="este tópico está trancado"), 403

        cur = db.execute(
            "INSERT INTO posts (topico_id, usuario_id, corpo) VALUES (?, ?, ?)",
            (topico_id, u["id"], corpo),
        )
        db.commit()
        return jsonify(ok=True, post_id=cur.lastrowid), 201

    # ---------------------------------------------------------------
    # Estatísticas (mesmos números que o painel PHP calcula direto no banco)
    # ---------------------------------------------------------------
    @app.get("/api/estatisticas")
    def estatisticas():
        db = get_db()
        return jsonify(
            usuarios=db.execute("SELECT COUNT(*) FROM usuarios").fetchone()[0],
            topicos=db.execute("SELECT COUNT(*) FROM topicos").fetchone()[0],
            posts=db.execute("SELECT COUNT(*) FROM posts").fetchone()[0],
        )

    return app


app = criar_app()

if __name__ == "__main__":
    app.run(debug=True)
