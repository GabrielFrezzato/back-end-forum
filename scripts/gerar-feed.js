// gerar-feed.js — QUADRO
//
// Gera database/../frontend/rss.xml a partir dos tópicos mais recentes,
// lendo o banco SQLite diretamente com o módulo nativo node:sqlite
// (Node >= 22.5, sem dependências externas). Demonstra que o schema.sql
// também é consumível por uma terceira linguagem, sem precisar de ORM.
//
// Uso:
//   node scripts/gerar-feed.js

const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const RAIZ = path.join(__dirname, '..');
const CAMINHO_BANCO = path.join(RAIZ, 'database', 'quadro.db');
const CAMINHO_SAIDA = path.join(RAIZ, 'frontend', 'rss.xml');
const URL_BASE = process.env.QUADRO_URL_BASE || 'http://localhost:5000';

function paraDataIso(valor) {
  // schema.sql já grava os timestamps com sufixo "Z"; só completamos
  // quando, por algum motivo, ele vier sem fuso.
  return valor.endsWith('Z') ? valor : `${valor}Z`;
}

function escaparXml(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function main() {
  if (!fs.existsSync(CAMINHO_BANCO)) {
    console.error(
      'Banco não encontrado em database/quadro.db.\n' +
      'Rode antes: flask --app backend/app.py init-db  (e opcionalmente "seed")'
    );
    process.exitCode = 1;
    return;
  }

  const db = new DatabaseSync(CAMINHO_BANCO, { readOnly: true });

  const topicos = db
    .prepare(
      `SELECT id, titulo, autor, canal_nome, criado_em
       FROM v_topicos_resumo
       ORDER BY criado_em DESC
       LIMIT 20`
    )
    .all();

  const itens = topicos
    .map(
      (t) => `
    <item>
      <title>${escaparXml(t.titulo)}</title>
      <link>${URL_BASE}/topico.html?id=${t.id}</link>
      <guid>${URL_BASE}/topico.html?id=${t.id}</guid>
      <author>${escaparXml(t.autor)}</author>
      <category>${escaparXml(t.canal_nome)}</category>
      <pubDate>${new Date(paraDataIso(t.criado_em)).toUTCString()}</pubDate>
    </item>`
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>QUADRO</title>
    <link>${URL_BASE}</link>
    <description>últimos tópicos publicados no QUADRO</description>
    <language>pt-br</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${itens}
  </channel>
</rss>
`;

  fs.writeFileSync(CAMINHO_SAIDA, xml, 'utf-8');
  db.close();

  console.log(`feed gerado com ${topicos.length} tópicos -> ${path.relative(RAIZ, CAMINHO_SAIDA)}`);
}

main();
