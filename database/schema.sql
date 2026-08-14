-- QUADRO — schema do banco de dados
-- SQLite. Este arquivo é a fonte da verdade da estrutura de dados
-- e é lido tanto pelo backend Python quanto pelo painel PHP e pelo
-- script Node.js de geração de feed.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS usuarios (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_usuario    TEXT NOT NULL UNIQUE,
    email           TEXT NOT NULL UNIQUE,
    senha_hash      TEXT NOT NULL,
    cor_avatar      TEXT NOT NULL DEFAULT '#FFB000',
    criado_em       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS canais (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    slug            TEXT NOT NULL UNIQUE,
    nome            TEXT NOT NULL,
    descricao       TEXT NOT NULL DEFAULT '',
    ordem           INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS topicos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    canal_id        INTEGER NOT NULL REFERENCES canais(id) ON DELETE CASCADE,
    usuario_id      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo          TEXT NOT NULL,
    fixado          INTEGER NOT NULL DEFAULT 0,
    trancado        INTEGER NOT NULL DEFAULT 0,
    criado_em       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS posts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    topico_id       INTEGER NOT NULL REFERENCES topicos(id) ON DELETE CASCADE,
    usuario_id      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    corpo           TEXT NOT NULL,
    criado_em       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_topicos_canal ON topicos(canal_id);
CREATE INDEX IF NOT EXISTS idx_posts_topico ON posts(topico_id);
CREATE INDEX IF NOT EXISTS idx_topicos_criado ON topicos(criado_em);

-- view usada pelo painel PHP e pela API para listar tópicos com contadores,
-- evitando repetir a mesma lógica de agregação em cada linguagem
CREATE VIEW IF NOT EXISTS v_topicos_resumo AS
SELECT
    t.id,
    t.titulo,
    t.fixado,
    t.trancado,
    t.criado_em,
    c.slug   AS canal_slug,
    c.nome   AS canal_nome,
    u.nome_usuario AS autor,
    u.cor_avatar   AS autor_cor,
    (SELECT COUNT(*) FROM posts p WHERE p.topico_id = t.id) AS total_respostas,
    (SELECT MAX(criado_em) FROM posts p WHERE p.topico_id = t.id) AS ultima_atividade
FROM topicos t
JOIN canais c   ON c.id = t.canal_id
JOIN usuarios u ON u.id = t.usuario_id;
