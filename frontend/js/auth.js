// auth.js — formulários de entrar e registrar

import { api } from './api.js';
import { montarCabecalho } from './cabecalho.js';

async function iniciar() {
  await montarCabecalho();

  const formEntrar = document.getElementById('form-entrar');
  if (formEntrar) {
    formEntrar.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const nome_usuario = document.getElementById('campo-usuario').value.trim();
      const senha = document.getElementById('campo-senha').value;
      const erroEl = document.getElementById('erro-form');
      erroEl.style.display = 'none';

      try {
        await api.entrar(nome_usuario, senha);
        window.location.href = 'index.html';
      } catch (e) {
        erroEl.textContent = e.message;
        erroEl.style.display = 'block';
      }
    });
  }

  const formRegistrar = document.getElementById('form-registrar');
  if (formRegistrar) {
    formRegistrar.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const nome_usuario = document.getElementById('campo-usuario').value.trim();
      const email = document.getElementById('campo-email').value.trim();
      const senha = document.getElementById('campo-senha').value;
      const erroEl = document.getElementById('erro-form');
      erroEl.style.display = 'none';

      try {
        await api.registrar(nome_usuario, email, senha);
        window.location.href = 'index.html';
      } catch (e) {
        erroEl.textContent = e.message;
        erroEl.style.display = 'block';
      }
    });
  }
}

iniciar();
