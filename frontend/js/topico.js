// topico.js — página de um tópico: lista de posts + caixa de resposta

import { api, tempoRelativo, escapar } from './api.js';
import { montarCabecalho } from './cabecalho.js';

const params = new URLSearchParams(window.location.search);
const topicoId = params.get('id');

function linhaPost(p) {
  return `
    <article class="post">
      <div class="post__cabecalho">
        <span class="post__avatar" style="background:${escapar(p.autor_cor)}"></span>
        <span class="post__autor">${escapar(p.autor)}</span>
        <span>@quadro ~ ${tempoRelativo(p.criado_em)}</span>
      </div>
      <div class="post__corpo">${escapar(p.corpo)}</div>
    </article>
  `;
}

async function carregarTopico() {
  const { topico, posts } = await api.obterTopico(topicoId);

  document.title = `${topico.titulo} — QUADRO`;
  document.getElementById('trilha').innerHTML =
    `<a href="index.html">quadro</a> / <a href="index.html?canal=${topico.canal_slug}">${escapar(topico.canal_nome)}</a>`;
  document.getElementById('titulo-topico').textContent = topico.titulo;
  document.getElementById('lista-posts').innerHTML = posts.map(linhaPost).join('');

  if (topico.trancado) {
    document.getElementById('area-resposta').innerHTML =
      '<div class="aviso-login">este tópico está trancado para novas respostas.</div>';
  }

  return topico;
}

async function configurarResposta(usuarioLogado, topico) {
  const area = document.getElementById('area-resposta');
  if (topico.trancado) return;

  if (!usuarioLogado) {
    area.innerHTML = `<div class="aviso-login">
      <a href="entrar.html">entre</a> para responder a este tópico.
    </div>`;
    return;
  }

  area.innerHTML = `
    <div class="caixa-resposta">
      <div class="caixa-resposta__prompt">${escapar(usuarioLogado.nome_usuario)}@quadro ~ $</div>
      <div class="campo">
        <textarea id="corpo-resposta" placeholder="escreva sua resposta..."></textarea>
      </div>
      <div class="mensagem-erro" id="erro-resposta" style="display:none;"></div>
      <button class="botao" id="botao-responder">[ enviar resposta ]</button>
    </div>
  `;

  document.getElementById('botao-responder').addEventListener('click', async () => {
    const corpo = document.getElementById('corpo-resposta').value.trim();
    const erroEl = document.getElementById('erro-resposta');
    erroEl.style.display = 'none';

    if (!corpo) {
      erroEl.textContent = 'a resposta não pode ficar vazia.';
      erroEl.style.display = 'block';
      return;
    }

    try {
      await api.responderTopico(topicoId, corpo);
      await carregarTopico();
      document.getElementById('corpo-resposta').value = '';
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (e) {
      erroEl.textContent = e.message;
      erroEl.style.display = 'block';
    }
  });
}

async function iniciar() {
  const usuario = await montarCabecalho();
  const topico = await carregarTopico();
  await configurarResposta(usuario, topico);
}

iniciar();
