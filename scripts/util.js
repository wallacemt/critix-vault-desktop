export const loadingHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Critix Vault</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background-color: #121212;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #b0b0b0;
      overflow: hidden;
      user-select: none;
    }

    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 28px;
      animation: fadeIn 0.6s ease forwards;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .logo-wrapper {
      width: 100px;
      height: 100px;
      border-radius: 20px;
      overflow: hidden;
      background: #1e1e1e;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 40px rgba(255, 193, 7, 0.15), 0 8px 32px rgba(0,0,0,0.5);
    }

    .logo-wrapper img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .logo-wrapper .logo-text {
      font-size: 2.2rem;
      font-weight: 900;
      color: #ffc107;
      letter-spacing: -1px;
    }

    .title {
      text-align: center;
    }

    .title h1 {
      font-size: 2rem;
      font-weight: 800;
      color: #f5f5f5;
      letter-spacing: -0.5px;
      margin-bottom: 6px;
    }

    .title h1 span { color: #ffc107; }

    .title p {
      font-size: 0.875rem;
      color: #6e6e6e;
    }

    .loading-area {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      min-height: 80px;
    }

    .spinner {
      width: 28px;
      height: 28px;
      border: 3px solid #2c2c2c;
      border-top-color: #ffc107;
      border-radius: 50%;
      animation: spin 0.9s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .loading-text {
      font-size: 0.8125rem;
      color: #6e6e6e;
      letter-spacing: 0.02em;
    }

    .error-area {
      display: none;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      max-width: 460px;
      text-align: center;
    }

    .error-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #3a1a00;
      border: 2px solid #c0610a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
    }

    .error-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: #f0a050;
    }

    .error-message {
      font-size: 0.78rem;
      color: #6e6e6e;
      line-height: 1.5;
    }

    .error-detail-wrap {
      width: 100%;
      text-align: left;
    }

    .error-detail-wrap summary {
      font-size: 0.72rem;
      color: #4a4a4a;
      cursor: pointer;
      user-select: none;
      list-style: none;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .error-detail-wrap summary::before {
      content: '\\25B6';
      font-size: 0.6rem;
      transition: transform 0.2s;
    }

    .error-detail-wrap[open] summary::before {
      transform: rotate(90deg);
    }

    .error-detail-box {
      margin-top: 8px;
      padding: 10px;
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 6px;
      font-size: 0.68rem;
      color: #5a5a5a;
      font-family: 'Consolas', 'Courier New', monospace;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 180px;
      overflow-y: auto;
      user-select: text;
    }

    .btn-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .retry-btn {
      margin-top: 4px;
      padding: 8px 22px;
      background: #c0610a;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .retry-btn:hover { background: #e07020; }

    .copy-btn {
      margin-top: 4px;
      padding: 8px 16px;
      background: transparent;
      color: #6e6e6e;
      border: 1px solid #3a3a3a;
      border-radius: 8px;
      font-size: 0.8125rem;
      cursor: pointer;
      transition: border-color 0.2s, color 0.2s;
    }

    .copy-btn:hover { border-color: #6e6e6e; color: #b0b0b0; }

    .version {
      position: fixed;
      bottom: 20px;
      font-size: 0.7rem;
      color: #3a3a3a;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-wrapper">
      <img
        src="./images/logo-short.png"
        alt="Critix Vault Logo"
        onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
      />
    </div>

    <div class="title">
      <h1>Critix <span>Vault</span></h1>
      <p>Sua Biblioteca Local Aprimorada</p>
    </div>

    <div id="loading-area" class="loading-area">
      <div class="spinner"></div>
      <span class="loading-text" id="loading-text">Iniciando o servidor...</span>
    </div>

    <div id="error-area" class="error-area">
      <div class="error-icon">&#9888;</div>
      <span class="error-title">Falha ao iniciar o servidor</span>
      <p class="error-message" id="error-message">
        O servidor interno nao iniciou corretamente. Feche e reabra o aplicativo.
      </p>

      <details class="error-detail-wrap" id="error-detail-wrap" style="display:none">
        <summary>Detalhes t&#233;cnicos</summary>
        <pre class="error-detail-box" id="error-detail-box"></pre>
      </details>

      <div class="btn-row">
        <button class="retry-btn" onclick="location.reload()">Tentar Novamente</button>
        <button class="copy-btn" id="copy-btn" onclick="copyDetail()" style="display:none">Copiar Detalhes</button>
      </div>
    </div>
  </div>

  <script>
    var _startTimeout;
    var _detailText = '';

    function showError(msg, detail) {
      clearTimeout(_startTimeout);
      var la = document.getElementById('loading-area');
      var ea = document.getElementById('error-area');
      if (la) la.style.display = 'none';
      if (ea) ea.style.display = 'flex';

      if (msg) {
        var em = document.getElementById('error-message');
        if (em) em.textContent = msg;
      }

      if (detail) {
        _detailText = detail;
        var dw = document.getElementById('error-detail-wrap');
        var db = document.getElementById('error-detail-box');
        var cb = document.getElementById('copy-btn');
        if (dw) dw.style.display = 'block';
        if (db) db.textContent = detail;
        if (cb) cb.style.display = 'inline-block';
      }
    }

    function copyDetail() {
      if (!_detailText) return;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(_detailText).then(function() {
          var btn = document.getElementById('copy-btn');
          if (btn) { btn.textContent = 'Copiado!'; setTimeout(function(){ btn.textContent = 'Copiar Detalhes'; }, 2000); }
        });
      }
    }

    function updateLoadingText(text) {
      var el = document.getElementById('loading-text');
      if (el) el.textContent = text;
    }

    // Exposed for Rust to call via window.eval()
    window.__critix_server_error = showError;
    window.__critix_loading_text = updateLoadingText;

    // Safety net: if Rust never calls back after 95 s, show generic error
    _startTimeout = setTimeout(function() {
      showError(
        'O servidor interno nao respondeu em 90 segundos.',
        'Nenhum detalhe disponivel — o processo pode ter sido bloqueado antes de gravar o log.\nCaminho do log: %TEMP%\\critix-server.log'
      );
    }, 95000);
  </script>
</body>
</html>`;
