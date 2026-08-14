#!/usr/bin/env sh
# entrypoint.sh — QUADRO
# Garante que o banco exista (schema + dados de exemplo) antes de subir
# o servidor. Idempotente: se database/quadro.db já existir (por exemplo,
# num volume persistente), pula a inicialização.
set -e

if [ ! -f database/quadro.db ]; then
  echo "==> banco não encontrado, inicializando..."
  flask --app backend/app.py init-db
  flask --app backend/app.py seed
fi

exec python -m flask --app backend/app.py run --host=0.0.0.0 --port=5000
