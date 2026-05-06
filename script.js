/* ============================================================
   script.js — Página pública de status
   Lê via GitHub API (sem cache) em vez do raw.githubusercontent
   ============================================================ */

// ─── CONFIGURAÇÃO ─────────────────────────────────────────────
const CONFIG = {
  GITHUB_USER: 'FALL90HZ',       // ← seu usuário GitHub
  GITHUB_REPO: 'bot-status',     // ← nome do repositório
  REFRESH_INTERVAL: 30000,       // 30 segundos
};

// Usa a API do GitHub (sem cache) em vez do raw
const API_URL = `https://api.github.com/repos/${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}/contents/status.json`;

// ─── ESTADO ───────────────────────────────────────────────────
let isRefreshing = false;
let countdownValue = CONFIG.REFRESH_INTERVAL / 1000;

// ─── STATUS ───────────────────────────────────────────────────
const STATUS_CONFIG = {
  online: {
    ringClass: 'status-online',
    text: 'Online',
    desc: 'O bot está ativo e processando pedidos normalmente.',
    emoji: '🟢',
  },
  offline: {
    ringClass: 'status-offline',
    text: 'Offline',
    desc: 'O bot está temporariamente fora do ar. Por favor, aguarde.',
    emoji: '🔴',
  },
};

function applyStatus(status) {
  const cfg  = STATUS_CONFIG[status];
  if (!cfg) return;

  const ring = document.getElementById('status-ring');
  ring.classList.remove('status-online', 'status-offline', 'status-loading');
  ring.classList.add(cfg.ringClass);

  document.getElementById('status-text').textContent = cfg.text;
  document.getElementById('status-desc').textContent = cfg.desc;
  document.title = `${cfg.emoji} Bot ${cfg.text} — FALL90HZ`;
}

function setLoading(on) {
  const ring = document.getElementById('status-ring');
  const icon = document.getElementById('refresh-icon');
  if (on) {
    ring.classList.remove('status-online', 'status-offline');
    ring.classList.add('status-loading');
    icon.style.animation = 'spin 0.7s linear infinite';
    isRefreshing = true;
  } else {
    ring.classList.remove('status-loading');
    icon.style.animation = 'none';
    isRefreshing = false;
  }
}

function updateTime() {
  document.getElementById('stat-time').textContent =
    new Date().toLocaleTimeString('pt-BR');
}

// ─── FETCH VIA API (SEM CACHE) ────────────────────────────────
async function fetchStatus() {
  if (isRefreshing) return;
  setLoading(true);

  try {
    // A API do GitHub retorna o conteúdo em base64
    // Adicionamos timestamp no header pra garantir sem cache
    const res = await fetch(API_URL, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Cache-Control': 'no-cache',
      },
      cache: 'no-store',
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    // Decodifica o conteúdo base64
    const decoded = atob(data.content.replace(/\n/g, ''));
    const json    = JSON.parse(decoded);

    if (!json.status || !['online', 'offline'].includes(json.status)) {
      throw new Error('Status inválido no arquivo');
    }

    applyStatus(json.status);

  } catch (error) {
    console.error('[FetchStatus]', error);
    const ring = document.getElementById('status-ring');
    ring.classList.remove('status-loading', 'status-online', 'status-offline');
    ring.classList.add('status-offline');
    document.getElementById('status-text').textContent = 'Erro';
    document.getElementById('status-desc').textContent =
      `Não foi possível verificar o status. (${error.message})`;
    document.title = '⚠️ Erro — FALL90HZ';
  } finally {
    updateTime();
    setLoading(false);
    // Pisca ícone de refresh
    const icon = document.getElementById('refresh-icon');
    icon.style.color = 'var(--accent)';
    setTimeout(() => { icon.style.color = ''; }, 400);
  }
}

// ─── COUNTDOWN ────────────────────────────────────────────────
function startCountdown() {
  const el = document.getElementById('stat-interval');
  countdownValue = CONFIG.REFRESH_INTERVAL / 1000;

  setInterval(() => {
    countdownValue--;
    if (countdownValue <= 0) {
      countdownValue = CONFIG.REFRESH_INTERVAL / 1000;
    }
    el.textContent = `${countdownValue}s`;
  }, 1000);
}

// ─── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  fetchStatus();
  setInterval(fetchStatus, CONFIG.REFRESH_INTERVAL);
  startCountdown();
});
