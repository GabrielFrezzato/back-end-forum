// cabecalho.js — mostra "entrar / registrar" ou o usuário logado no topo
// de qualquer página que importe este módulo.

import { api, escapar } from './api.js';

export async function montarCabecalho() {
  const alvo = document.getElementById('nav-auth');
  if (!alvo) return null;

  try {
    const { usuario } = await api.eu();
    if (usuario) {
      alvo.innerHTML = `
        <span class="usuario-logado">${escapar(usuario.nome_usuario)}</span>
        <a href="#" id="link-sair">sair</a>
      `;
      document.getElementById('link-sair').addEventListener('click', async (ev) => {
        ev.preventDefault();
        await api.sair();
        window.location.href = 'index.html';
      });
    } else {
      alvo.innerHTML = `
        <a href="entrar.html">entrar</a>
        <a href="registrar.html">registrar</a>
      `;
    }
    return usuario || null;
  } catch {
    alvo.innerHTML = `<a href="entrar.html">entrar</a> <a href="registrar.html">registrar</a>`;
    return null;
  }
}
