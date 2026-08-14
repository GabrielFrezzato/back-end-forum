#!/usr/bin/env bash
# setup.sh — QUADRO
#
# Prepara o ambiente completo em uma única passada: cria o venv Python,
# instala as dependências do backend, inicializa o schema do banco e
# popula dados de exemplo. Idempotente — pode ser rodado de novo sem
# duplicar dados.
#
# Uso:
#   ./scripts/setup.sh

set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ"

echo "==> QUADRO: preparando ambiente em $RAIZ"

if [ ! -d ".venv" ]; then
  echo "==> criando ambiente virtual Python (.venv)"
  python3 -m venv .venv
fi

# shellcheck disable=SC1091
source .venv/bin/activate

echo "==> instalando dependências Python"
pip install --quiet --upgrade pip
pip install --quiet -r backend/requirements.txt

echo "==> inicializando banco de dados"
QUADRO_SECRET_KEY="${QUADRO_SECRET_KEY:-dev-nao-use-em-producao}" \
  flask --app backend/app.py init-db

echo "==> populando dados de exemplo (se o banco estiver vazio)"
QUADRO_SECRET_KEY="${QUADRO_SECRET_KEY:-dev-nao-use-em-producao}" \
  flask --app backend/app.py seed

cat <<'EOF'

==> tudo pronto!

Para rodar o fórum:
  source .venv/bin/activate
  flask --app backend/app.py run --debug

Depois abra http://127.0.0.1:5000

Usuários de teste: ana / bento / carla, senha "trocar123".

Extras opcionais:
  php -S localhost:8001 -t php          # painel de estatísticas em PHP
  node scripts/gerar-feed.js            # gera frontend/rss.xml
EOF
