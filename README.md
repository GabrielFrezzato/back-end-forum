# QUADRO

> um quadro de avisos digital — fórum modelo, feito para ser adaptado

QUADRO é um template de fórum completo e funcional: canais, tópicos,
respostas, autenticação com senha com hash e um visual próprio inspirado
nos antigos terminais de BBS (o ancestral direto dos fóruns modernos).
O objetivo é servir de ponto de partida para quem quer publicar o
próprio fórum no GitHub e customizar a partir daí.

O projeto foi construído deliberadamente como uma pequena vitrine
poliglota: a mesma base SQLite é lida por três linguagens de backend
diferentes, cada uma cumprindo um papel distinto.

## linguagens usadas e por quê

| linguagem       | onde                          | papel                                                   |
|------------------|-------------------------------|----------------------------------------------------------|
| **Python**       | `backend/`                    | API REST (Flask) + autenticação + serve o frontend       |
| **SQL**          | `database/schema.sql`         | fonte única da verdade do modelo de dados                |
| **HTML**         | `frontend/*.html`             | páginas do fórum                                          |
| **CSS**          | `frontend/css/estilo.css`     | identidade visual (design system em variáveis CSS)        |
| **JavaScript**   | `frontend/js/`                | interatividade no navegador (módulos ES nativos)          |
| **PHP**          | `php/estatisticas.php`        | painel de estatísticas lendo o banco direto via PDO       |
| **Node.js**      | `scripts/gerar-feed.js`       | gera um feed RSS a partir do banco (`node:sqlite` nativo) |
| **Bash**         | `scripts/setup.sh`            | provisiona o ambiente inteiro em um comando               |
| **YAML**         | `.github/workflows/ci.yml`, `docker/docker-compose.yml` | CI e orquestração de containers |
| **Dockerfile**   | `docker/Dockerfile`           | empacota o backend Flask                                   |
| **JSON**         | `config/settings.json`        | configuração central do app                                |
| **Markdown**     | este arquivo                  | documentação                                                |

Nenhuma dessas linguagens é decorativa: o PHP e o Node realmente leem
`database/quadro.db` de forma independente da API Flask, para mostrar
que o schema SQL é a peça central e qualquer linguagem pode falar com
ele diretamente.

## estrutura do projeto

```
quadro-forum/
├── backend/              # API Flask (Python)
│   ├── app.py
│   ├── db.py
│   └── requirements.txt
├── frontend/             # HTML/CSS/JS puro, sem build step
│   ├── index.html
│   ├── topico.html
│   ├── novo-topico.html
│   ├── entrar.html
│   ├── registrar.html
│   ├── css/estilo.css
│   └── js/
├── database/
│   └── schema.sql        # DDL usado por Python, PHP e Node
├── php/
│   └── estatisticas.php  # painel alternativo, leitura direta via PDO
├── scripts/
│   ├── setup.sh           # provisiona tudo de uma vez
│   └── gerar-feed.js      # gera frontend/rss.xml
├── docker/
│   ├── Dockerfile
│   ├── entrypoint.sh
│   └── docker-compose.yml
├── config/
│   └── settings.json
└── .github/workflows/ci.yml
```

## rodando localmente

### opção rápida

```bash
git clone <url-do-seu-repositorio>
cd quadro-forum
./scripts/setup.sh
source .venv/bin/activate
flask --app backend/app.py run --debug
```

Abra **http://127.0.0.1:5000**. Usuários de teste já vêm cadastrados:
`ana`, `bento` ou `carla`, todos com a senha `trocar123`.

### passo a passo manual

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

export QUADRO_SECRET_KEY="troque-por-um-valor-aleatorio"
flask --app backend/app.py init-db   # cria as tabelas
flask --app backend/app.py seed      # dados de exemplo (opcional)
flask --app backend/app.py run --debug
```

### extras opcionais

```bash
# painel de estatísticas em PHP, lendo o banco direto
php -S localhost:8001 -t php
# -> http://localhost:8001/estatisticas.php

# gera um feed RSS a partir dos tópicos mais recentes
node scripts/gerar-feed.js
# -> frontend/rss.xml
```

### com Docker

```bash
docker compose -f docker/docker-compose.yml up --build
```

Sobe o fórum em `http://localhost:5000` e o painel PHP em
`http://localhost:8001/estatisticas.php`, ambos compartilhando o mesmo
volume de banco de dados.

## API

Toda a API vive sob `/api`. Autenticação é por cookie de sessão — não
há tokens para gerenciar manualmente.

| método | rota                          | descrição                          |
|--------|--------------------------------|--------------------------------------|
| GET    | `/api/canais`                  | lista canais com contagem de tópicos |
| GET    | `/api/topicos?canal=slug`      | lista tópicos (opcionalmente por canal) |
| GET    | `/api/topicos/<id>`            | detalhe do tópico + posts            |
| POST   | `/api/topicos`                 | cria tópico (requer login)           |
| POST   | `/api/topicos/<id>/posts`      | responde a um tópico (requer login)  |
| POST   | `/api/auth/registrar`          | cria conta                            |
| POST   | `/api/auth/entrar`             | login                                 |
| POST   | `/api/auth/sair`               | logout                                |
| GET    | `/api/auth/eu`                 | usuário logado atual                  |
| GET    | `/api/estatisticas`            | contagem de usuários/tópicos/posts   |

## publicando no GitHub

```bash
cd quadro-forum
git init
git add .
git commit -m "primeiro commit: template QUADRO"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

O `.gitignore` já exclui o banco de dados gerado localmente
(`database/*.db`) e o ambiente virtual (`.venv/`) — cada pessoa que
clonar o repositório roda `./scripts/setup.sh` e gera os próprios
dados de exemplo. O workflow em `.github/workflows/ci.yml` já testa
automaticamente o backend Python, o frontend JS, o script Node, o
painel PHP e o schema SQL a cada push.

## customizando

- **visual**: tudo passa pelas variáveis CSS no topo de
  `frontend/css/estilo.css` — trocar `--cor-acento` já muda a cor
  primária em todo o site.
- **modelo de dados**: edite `database/schema.sql` e rode
  `flask --app backend/app.py init-db` de novo.
- **nome do site / paginação**: `config/settings.json`.

## licença

MIT — veja [LICENSE](LICENSE).
