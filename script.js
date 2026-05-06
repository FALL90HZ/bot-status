/* ============================================================
   script.js — Lógica da página pública de status
   FALL90HZ Bot Monitor
   ============================================================ */

// ─── CONFIGURAÇÃO ─────────────────────────────────────────────
const CONFIG = {
  // ⚠️ SUBSTITUA com seu usuário e repositório do GitHub:
  GITHUB_USER: 'SEU_USUARIO',
  GITHUB_REPO: 'SEU_REPOSITORIO',
  // Intervalo de atualização automática (ms)
  REFRESH_INTERVAL: 30000,
};

const STATUS_URL = `https://raw.githubusercontent.com/${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}/main/status.json`;

// ─── ESTADO ───────────────────────────────────────────────────
let refreshTimer = null;
let currentStatus = null;
let isRefreshing = false;

// ─── ELEMENTOS DOM ────────────────────────────────────────────
const el = {
  ring:       () => document.getElementById('status-ring'),
  dot:        () => document.getElementById('status-dot'),
  text:       () => document.getElementById('status-text'),
  desc:       () => document.getElementById('status-desc'),
  statTime:   () => document.getElementById('stat-time'),
  icon:       () => document.getElementById('refresh-icon'),
};

// ─── ESTADO VISUAL ────────────────────────────────────────────
const STATUS_CONFIG = {
  online: {
    ringClass: 'status-online',
    text: 'Online',
    desc: 'O bot está ativo e processando pedidos normalmente.',
  },
  offline: {
    ringClass: 'status-offline',
    text: 'Offline',
    desc: 'O bot está temporariamente fora do ar. Por favor, aguarde.',
  },
};

function applyStatus(status) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return;

  const ring = el.ring();
  const txt  = el.text();
  const desc = el.desc();

  // Remove classes anteriores
  ring.classList.remove('status-online', 'status-offline', 'status-loading');
  ring.classList.add(cfg.ringClass);

  // Atualiza textos
  txt.textContent  = cfg.text;
  desc.textContent = cfg.desc;

  // Atualiza documento
  document.title = `${cfg.text === 'Online' ? '🟢' : '🔴'} Bot ${cfg.text} — FALL90HZ`;

  currentStatus = status;
}

function setLoading(loading) {
  const ring = el.ring();
  const icon = el.icon();

  if (loading) {
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
  const now = new Date();
  const timeStr = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  el.statTime().textContent = timeStr;
}

// ─── BUSCA DE STATUS ──────────────────────────────────────────
async function fetchStatus() {
  if (isRefreshing) return;

  setLoading(true);

  try {
    // Adiciona cache-busting para sempre pegar versão mais recente
    const cacheBust = `?t=${Date.now()}`;
    const response  = await fetch(STATUS_URL + cacheBust, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.status || !['online', 'offline'].includes(data.status)) {
      throw new Error('Formato de status inválido');
    }

    applyStatus(data.status);

  } catch (error) {
    console.error('[FetchStatus] Erro:', error);

    const ring = el.ring();
    ring.classList.remove('status-loading', 'status-online', 'status-offline');
    ring.classList.add('status-offline');

    el.text().textContent  = 'Erro';
    el.desc().textContent  = `Não foi possível verificar o status. Verifique se o repositório está correto. (${error.message})`;
    document.title = '⚠️ Erro — FALL90HZ Bot Monitor';

  } finally {
    updateTime();
    setLoading(false);

    // Pisca o ícone de refresh
    const icon = el.icon();
    icon.style.color = 'var(--accent)';
    setTimeout(() => { icon.style.color = ''; }, 500);
  }
}

// ─── INICIALIZAÇÃO ────────────────────────────────────────────
function init() {
  // Verificar se repositório foi configurado
  if (CONFIG.GITHUB_USER === 'SEU_USUARIO') {
    const ring = el.ring();
    ring.classList.remove('status-loading');
    ring.classList.add('status-offline');
    el.text().textContent = 'Configurar';
    el.desc().innerHTML =
      '⚠️ Abra o arquivo <code style="font-family:var(--mono);background:var(--bg-secondary);padding:2px 6px;border-radius:4px;">script.js</code> e substitua ' +
      '<strong>SEU_USUARIO</strong> e <strong>SEU_REPOSITORIO</strong> com seus dados do GitHub.';
    isRefreshing = false;
    updateTime();
    return;
  }

  // Busca inicial
  fetchStatus();

  // Auto-refresh periódico
  refreshTimer = setInterval(() => {
    fetchStatus();
    updateCountdown();
  }, CONFIG.REFRESH_INTERVAL);

  // Countdown do próximo refresh
  startCountdown();
}

// ─── COUNTDOWN ────────────────────────────────────────────────
let countdownValue = CONFIG.REFRESH_INTERVAL / 1000;

function startCountdown() {
  const statInterval = document.getElementById('stat-interval');
  countdownValue = CONFIG.REFRESH_INTERVAL / 1000;

  setInterval(() => {
    countdownValue--;
    if (countdownValue <= 0) countdownValue = CONFIG.REFRESH_INTERVAL / 1000;
    statInterval.textContent = `${countdownValue}s`;
  }, 1000);
}

function updateCountdown() {
  countdownValue = CONFIG.REFRESH_INTERVAL / 1000;
}

// ─── START ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
