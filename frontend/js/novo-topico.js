// novo-topico.js — formulário de criação de tópico (exige login)

import { api, escapar } from './api.js';
import { montarCabecalho } from './cabecalho.js';

async function preencherCanais() {
  const { canais } = await api.listarCanais();
  const select = document.getElementById('campo-canal');
  select.innerHTML = canais.map((c) => `<option value="${c.slug}">${escapar(c.nome)}</option>`).join('');
}

async function iniciar() {
  const usuario = await montarCabecalho();

  if (!usuario) {
    document.getElementById('conteudo').innerHTML = `
      <div class="aviso-login">
        você precisa <a href="entrar.html">entrar</a> para abrir um novo tópico.
      </div>`;
    return;
  }

  await preencherCanais();

  document.getElementById('form-topico').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const canal_slug = document.getElementById('campo-canal').value;
    const titulo = document.getElementById('campo-titulo').value.trim();
    const corpo = document.getElementById('campo-corpo').value.trim();
    const erroEl = document.getElementById('erro-form');
    erroEl.style.display = 'none';

    try {
      const resultado = await api.criarTopico(canal_slug, titulo, corpo);
      window.location.href = `topico.html?id=${resultado.topico_id}`;
    } catch (e) {
      erroEl.textContent = e.message;
      erroEl.style.display = 'block';
    }
  });
}

iniciar();
