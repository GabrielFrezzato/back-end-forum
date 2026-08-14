// api.js — camada fina sobre fetch() para falar com a API Flask.
// Módulo ES nativo, sem build step: os outros scripts importam daqui.

const BASE = '/api';

async function requisitar(caminho, opcoes = {}) {
  const resposta = await fetch(BASE + caminho, {
    credentials: 'same-origin',
    headers: opcoes.corpo ? { 'Content-Type': 'application/json' } : undefined,
    method: opcoes.metodo || 'GET',
    body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
  });

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const erro = new Error(dados.erro || `erro ${resposta.status}`);
    erro.status = resposta.status;
    throw erro;
  }
  return dados;
}

export const api = {
  listarCanais: () => requisitar('/canais'),
  listarTopicos: (canalSlug, pagina = 1) =>
    requisitar(`/topicos?${canalSlug ? `canal=${encodeURIComponent(canalSlug)}&` : ''}pagina=${pagina}`),
  obterTopico: (id) => requisitar(`/topicos/${id}`),
  criarTopico: (canal_slug, titulo, corpo) =>
    requisitar('/topicos', { metodo: 'POST', corpo: { canal_slug, titulo, corpo } }),
  responderTopico: (id, corpo) =>
    requisitar(`/topicos/${id}/posts`, { metodo: 'POST', corpo: { corpo } }),
  estatisticas: () => requisitar('/estatisticas'),
  entrar: (nome_usuario, senha) =>
    requisitar('/auth/entrar', { metodo: 'POST', corpo: { nome_usuario, senha } }),
  registrar: (nome_usuario, email, senha) =>
    requisitar('/auth/registrar', { metodo: 'POST', corpo: { nome_usuario, email, senha } }),
  sair: () => requisitar('/auth/sair', { metodo: 'POST' }),
  eu: () => requisitar('/auth/eu'),
};

// o schema grava os timestamps com sufixo "Z"; só completamos quando,
// por algum motivo, vierem sem fuso (evita duplicar o "Z")
export function paraData(isoString) {
  return new Date(isoString.endsWith('Z') ? isoString : isoString + 'Z');
}

// formata um timestamp ISO como "há 2h", "há 5min" etc, em português
export function tempoRelativo(isoString) {
  if (!isoString) return '—';
  const entao = paraData(isoString);
  const agora = new Date();
  const diffSeg = Math.max(0, Math.floor((agora - entao) / 1000));

  if (diffSeg < 60) return 'agora';
  const diffMin = Math.floor(diffSeg / 60);
  if (diffMin < 60) return `há ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffDias = Math.floor(diffH / 24);
  if (diffDias < 30) return `há ${diffDias}d`;
  return entao.toLocaleDateString('pt-BR');
}

export function escapar(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}
