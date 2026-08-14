<?php
/**
 * QUADRO — painel de estatísticas (PHP)
 *
 * Página solta, no estilo dos antigos painéis de administração de fóruns
 * PHP: lê o mesmo banco SQLite que o backend Flask, direto via PDO, sem
 * passar pela API REST. Serve como demonstração de que o schema.sql é a
 * fonte única da verdade e pode ser consumido por qualquer linguagem.
 *
 * Rodar:
 *   php -S localhost:8001 -t php
 *   (com o banco já inicializado por `flask --app backend/app.py init-db`)
 */

declare(strict_types=1);

$caminhoBanco = __DIR__ . '/../database/quadro.db';
$erro = null;
$stats = null;
$canais = [];

if (!file_exists($caminhoBanco)) {
    $erro = 'Banco de dados não encontrado em database/quadro.db. '
          . 'Rode "flask --app backend/app.py init-db" e "seed" primeiro.';
} else {
    try {
        $pdo = new PDO('sqlite:' . $caminhoBanco);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

        $stats = [
            'usuarios' => (int) $pdo->query('SELECT COUNT(*) FROM usuarios')->fetchColumn(),
            'topicos'  => (int) $pdo->query('SELECT COUNT(*) FROM topicos')->fetchColumn(),
            'posts'    => (int) $pdo->query('SELECT COUNT(*) FROM posts')->fetchColumn(),
        ];

        $canais = $pdo->query(
            'SELECT c.nome, c.slug, COUNT(t.id) AS total
             FROM canais c
             LEFT JOIN topicos t ON t.canal_id = c.id
             GROUP BY c.id
             ORDER BY total DESC'
        )->fetchAll();

        $topicosRecentes = $pdo->query(
            'SELECT titulo, canal_slug, autor, total_respostas, criado_em
             FROM v_topicos_resumo
             ORDER BY criado_em DESC
             LIMIT 8'
        )->fetchAll();
    } catch (PDOException $e) {
        $erro = 'Falha ao ler o banco: ' . $e->getMessage();
    }
}

function h(string $texto): string
{
    return htmlspecialchars($texto, ENT_QUOTES, 'UTF-8');
}
?>
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>painel — QUADRO</title>
  <style>
    :root {
      --bg: #0a0d0a; --painel: #12160f; --borda: #262c20;
      --texto: #e8e6dc; --dim: #8b9186; --acento: #ffb000; --acento2: #57c7b8;
    }
    * { box-sizing: border-box; }
    body {
      background: var(--bg); color: var(--texto);
      font-family: 'Courier New', monospace;
      max-width: 760px; margin: 0 auto; padding: 40px 20px;
      line-height: 1.6;
    }
    h1 { color: var(--acento); font-size: 20px; }
    .aviso { color: var(--dim); font-size: 13px; margin-bottom: 30px; }
    .grade { display: flex; gap: 16px; margin-bottom: 30px; flex-wrap: wrap; }
    .cartao {
      border: 1px solid var(--borda); background: var(--painel);
      border-radius: 4px; padding: 16px 22px; min-width: 120px;
    }
    .cartao .numero { font-size: 26px; color: var(--acento2); font-weight: bold; }
    .cartao .rotulo { font-size: 11px; text-transform: uppercase; color: var(--dim); letter-spacing: .05em; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--borda); }
    th { color: var(--dim); text-transform: uppercase; font-size: 11px; letter-spacing: .05em; }
    .erro { border: 1px solid #ff6b5b; color: #ff6b5b; padding: 14px; border-radius: 4px; }
    a { color: var(--acento); }
  </style>
</head>
<body>
  <h1>QUADRO_▌ painel (php)</h1>
  <p class="aviso">
    leitura direta do banco via PDO — não passa pela API Flask.
    <a href="http://localhost:5000/">← voltar ao fórum</a>
    <span style="color:var(--dim)">(supondo o Flask rodando na porta 5000)</span>
  </p>

  <?php if ($erro): ?>
    <div class="erro"><?= h($erro) ?></div>
  <?php else: ?>
    <div class="grade">
      <div class="cartao"><div class="numero"><?= $stats['usuarios'] ?></div><div class="rotulo">usuários</div></div>
      <div class="cartao"><div class="numero"><?= $stats['topicos'] ?></div><div class="rotulo">tópicos</div></div>
      <div class="cartao"><div class="numero"><?= $stats['posts'] ?></div><div class="rotulo">posts</div></div>
    </div>

    <h2>canais</h2>
    <table>
      <tr><th>canal</th><th>slug</th><th>tópicos</th></tr>
      <?php foreach ($canais as $c): ?>
        <tr>
          <td><?= h($c['nome']) ?></td>
          <td>#<?= h($c['slug']) ?></td>
          <td><?= (int) $c['total'] ?></td>
        </tr>
      <?php endforeach; ?>
    </table>

    <h2>tópicos recentes</h2>
    <table>
      <tr><th>título</th><th>canal</th><th>autor</th><th>respostas</th></tr>
      <?php foreach ($topicosRecentes as $t): ?>
        <tr>
          <td><?= h($t['titulo']) ?></td>
          <td>#<?= h($t['canal_slug']) ?></td>
          <td><?= h($t['autor']) ?></td>
          <td><?= (int) $t['total_respostas'] ?></td>
        </tr>
      <?php endforeach; ?>
    </table>
  <?php endif; ?>
</body>
</html>
