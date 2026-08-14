// main.js — página inicial (lista de canais + tópicos)

import { api, tempoRelativo, paraData, escapar } from './api.js';
import { montarCabecalho } from './cabecalho.js';

const params = new URLSearchParams(window.location.search);
const canalAtivo = params.get('canal');

async function rodarBoot() {
  const alvo = document.getElementById('boot');
  if (!alvo) return;

  const stats = await api.estatisticas().catch(() => null);
  const linhas = [
    'inicializando quadro...',
    'conectando ao banco local...       [ <span class="ok">ok</span> ]',
    stats
      ? `sincronizando ${stats.topicos} tópicos, ${stats.posts} posts...  [ <span class="ok">ok</span> ]`
      : 'sincronizando dados...             [ <span class="ok">ok</span> ]',
    'pronto.',
  ];

  const reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  for (let i = 0; i < linhas.length; i++) {
    const p = document.createElement('div');
    p.className = 'boot__linha';
    p.innerHTML = linhas[i];
    if (!reduzMovimento) p.style.animationDelay = `${i * 0.12}s`;
    alvo.appendChild(p);
  }

  await new Promise((r) => setTimeout(r, reduzMovimento ? 0 : 620));
  alvo.style.display = 'none';
  document.getElementById('app').style.display = '';
}

function linhaTopico(t) {
  const recente = (Date.now() - paraData(t.ultima_atividade || t.criado_em).getTime()) < 1000 * 60 * 60;
  const ledClasse = t.fixado ? 'led--fixado' : recente ? 'led--recente' : '';
  return `
    <a class="linha-topico" href="topico.html?id=${t.id}">
      <span class="led ${ledClasse}"></span>
      <span class="linha-topico__principal">
        <span class="linha-topico__titulo">
          ${t.fixado ? '<span class="etiqueta-fixado">fixado</span>' : ''}
          ${escapar(t.titulo)}
        </span>
        <div class="linha-topico__meta">#${escapar(t.canal_slug)} · por ${escapar(t.autor)}</div>
      </span>
      <span class="linha-topico__respostas">${t.total_respostas} resp</span>
      <span class="linha-topico__atividade">${tempoRelativo(t.ultima_atividade || t.criado_em)}</span>
    </a>
  `;
}

async function carregarCanais() {
  const { canais } = await api.listarCanais();
  const lista = document.getElementById('lista-canais');
  const itemTudo = `
    <li><a href="index.html" class="${!canalAtivo ? 'ativo' : ''}">
      todos <span class="contagem">${canais.reduce((s, c) => s + c.total_topicos, 0)}</span>
    </a></li>`;
  lista.innerHTML = itemTudo + canais.map((c) => `
    <li><a href="index.html?canal=${c.slug}" class="${canalAtivo === c.slug ? 'ativo' : ''}">
      # ${escapar(c.nome)} <span class="contagem">${c.total_topicos}</span>
    </a></li>
  `).join('');

  const canalObj = canais.find((c) => c.slug === canalAtivo);
  document.getElementById('titulo-lista').textContent = canalObj ? `# ${canalObj.nome}` : 'todos os tópicos';
  document.getElementById('descricao-lista').textContent = canalObj ? canalObj.descricao : 'as transmissões mais recentes da comunidade';
}

async function carregarTopicos() {
  const container = document.getElementById('lista-topicos');
  const { topicos } = await api.listarTopicos(canalAtivo || undefined);
  container.innerHTML = topicos.length
    ? topicos.map(linhaTopico).join('')
    : '<div class="estado-vazio">nenhum sinal por aqui ainda — abra o primeiro tópico.</div>';
}

async function carregarStatusBar() {
  const stats = await api.estatisticas().catch(() => null);
  if (!stats) return;
  document.getElementById('barra-status').innerHTML = `
    <span class="barra-status__item"><strong>${stats.usuarios}</strong> usuários</span>
    <span class="barra-status__item"><strong>${stats.topicos}</strong> tópicos</span>
    <span class="barra-status__item"><strong>${stats.posts}</strong> posts</span>
  `;
}

async function iniciar() {
  await montarCabecalho();
  await rodarBoot();
  await Promise.all([carregarCanais(), carregarTopicos(), carregarStatusBar()]);
}

iniciar();
