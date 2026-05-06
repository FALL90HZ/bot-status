/* ============================================================
   admin.js — Lógica do painel de administrador
   FALL90HZ Bot Monitor
   ============================================================ */

// ─── ⚠️ CONFIGURAÇÃO — EDITE AQUI ─────────────────────────────
const ADMIN_CONFIG = {
  // Senha do painel admin (troque para uma senha segura)
  PASSWORD: 'fall90hz2025',

  // Seus dados do GitHub:
  GITHUB_USER:  'SEU_USUARIO',
  GITHUB_REPO:  'SEU_REPOSITORIO',
  GITHUB_TOKEN: 'SEU_GITHUB_TOKEN',

  // Arquivo de status no repositório
  FILE_PATH: 'status.json',
  BRANCH:    'main',
};
// ─────────────────────────────────────────────────────────────

const API_BASE = `https://api.github.com/repos/${ADMIN_CONFIG.GITHUB_USER}/${ADMIN_CONFIG.GITHUB_REPO}/contents/${ADMIN_CONFIG.FILE_PATH}`;
const RAW_URL  = `https://raw.githubusercontent.com/${ADMIN_CONFIG.GITHUB_USER}/${ADMIN_CONFIG.GITHUB_REPO}/${ADMIN_CONFIG.BRANCH}/${ADMIN_CONFIG.FILE_PATH}`;

// ─── ESTADO ───────────────────────────────────────────────────
let isAuthenticated = false;
let currentStatus   = null;
let isBusy          = false;

// ─── RELÓGIO ──────────────────────────────────────────────────
function updateClock() {
  const el = document.getElementById('footer-clock');
  if (el) {
    el.textContent = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }
}
setInterval(updateClock, 1000);
updateClock();

// ─── LOGIN ────────────────────────────────────────────────────
function handleLogin() {
  const input = document.getElementById('password-input');
  const error = document.getElementById('login-error');
  const pw    = input.value;

  if (pw === ADMIN_CONFIG.PASSWORD) {
    error.classList.remove('visible');
    isAuthenticated = true;

    // Transição para dashboard
    document.getElementById('login-view').style.display = 'none';
    const adminView = document.getElementById('admin-view');
    adminView.style.display = 'block';

    addLog('Autenticação bem-sucedida.', 'ok');
    loadCurrentStatus();

  } else {
    input.value = '';
    error.classList.add('visible');

    // Shake animation
    input.style.animation = 'none';
    input.getBoundingClientRect();
    input.style.animation = 'shake 0.4s ease';
    input.focus();

    addLog('Tentativa de login com senha incorreta.', 'err');
  }
}

function handleLogout() {
  isAuthenticated = false;
  currentStatus   = null;
  document.getElementById('admin-view').style.display = 'none';
  document.getElementById('login-view').style.display = 'block';
  document.getElementById('password-input').value = '';
}

// Enter no campo de senha
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('password-input');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
  }

  // Inject shake keyframe
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%,100%{transform:translateX(0)}
      20%{transform:translateX(-8px)}
      40%{transform:translateX(8px)}
      60%{transform:translateX(-6px)}
      80%{transform:translateX(6px)}
    }
  `;
  document.head.appendChild(style);
});

// ─── CARREGAR STATUS ATUAL ────────────────────────────────────
async function loadCurrentStatus() {
  updateAdminBadge('loading');
  document.getElementById('admin-status-updated').textContent = 'Carregando...';

  try {
    const res  = await fetch(RAW_URL + `?t=${Date.now()}`, { cache: 'no-store' });
    const data = await res.json();

    currentStatus = data.status;
    updateAdminBadge(currentStatus);

    const now = new Date().toLocaleTimeString('pt-BR');
    document.getElementById('admin-status-updated').textContent =
      `Última verificação: ${now}`;

    addLog(`Status atual carregado: ${currentStatus.toUpperCase()}`, 'ok');

  } catch (e) {
    addLog(`Erro ao carregar status: ${e.message}`, 'err');
    updateAdminBadge('offline');
    document.getElementById('admin-status-updated').textContent = 'Erro ao verificar';
  }
}

// ─── ATUALIZAR BADGE ─────────────────────────────────────────
function updateAdminBadge(status) {
  const badge = document.getElementById('admin-badge');
  const text  = document.getElementById('admin-badge-text');

  badge.classList.remove('badge-online', 'badge-offline');

  if (status === 'online') {
    badge.classList.add('badge-online');
    text.textContent = 'Online';
  } else if (status === 'offline') {
    badge.classList.add('badge-offline');
    text.textContent = 'Offline';
  } else {
    badge.classList.add('badge-offline');
    text.textContent = 'Verificando...';
  }
}

// ─── DEFINIR STATUS (LIGAR / DESLIGAR) ───────────────────────
async function setStatus(newStatus) {
  if (!isAuthenticated || isBusy) return;
  if (newStatus === currentStatus) {
    showToast(`O bot já está ${newStatus === 'online' ? 'ONLINE' : 'OFFLINE'}.`, false);
    return;
  }

  isBusy = true;
  setButtonsLoading(true, newStatus);
  addLog(`Iniciando alteração para: ${newStatus.toUpperCase()}...`);

  try {
    // 1. Pegar SHA atual do arquivo
    const shaRes = await fetch(API_BASE, {
      headers: {
        'Authorization': `token ${ADMIN_CONFIG.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!shaRes.ok) {
      const err = await shaRes.json();
      throw new Error(err.message || `HTTP ${shaRes.status}`);
    }

    const shaData = await shaRes.json();
    const sha     = shaData.sha;

    addLog(`SHA obtido: ${sha.substring(0,8)}...`);

    // 2. Montar novo conteúdo em base64
    const newContent    = JSON.stringify({ status: newStatus }, null, 2);
    const encodedContent = btoa(unescape(encodeURIComponent(newContent)));

    // 3. Fazer PUT para atualizar arquivo
    const putRes = await fetch(API_BASE, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${ADMIN_CONFIG.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `chore: set bot status to ${newStatus}`,
        content: encodedContent,
        sha:     sha,
        branch:  ADMIN_CONFIG.BRANCH,
      }),
    });

    if (!putRes.ok) {
      const err = await putRes.json();
      throw new Error(err.message || `HTTP ${putRes.status}`);
    }

    // Sucesso
    currentStatus = newStatus;
    updateAdminBadge(newStatus);

    const now = new Date().toLocaleTimeString('pt-BR');
    document.getElementById('admin-status-updated').textContent =
      `Atualizado às ${now}`;

    addLog(`✓ Status alterado para ${newStatus.toUpperCase()} com sucesso.`, 'ok');
    showToast(
      newStatus === 'online'
        ? '✓ Bot definido como ONLINE'
        : '✓ Bot definido como OFFLINE',
      true
    );

  } catch (error) {
    console.error('[SetStatus] Erro:', error);
    addLog(`✗ Falha: ${error.message}`, 'err');
    showToast(`✗ Erro: ${error.message}`, false);
  } finally {
    isBusy = false;
    setButtonsLoading(false, null);
  }
}

// ─── BOTÕES ───────────────────────────────────────────────────
function setButtonsLoading(loading, activeStatus) {
  const btnOn  = document.getElementById('btn-ligar');
  const btnOff = document.getElementById('btn-desligar');

  if (loading) {
    btnOn.disabled  = true;
    btnOff.disabled = true;

    if (activeStatus === 'online') {
      btnOn.querySelector('.ctrl-icon').textContent  = '⟳';
      btnOn.classList.add('loading');
    } else {
      btnOff.querySelector('.ctrl-icon').textContent = '⟳';
      btnOff.classList.add('loading');
    }
  } else {
    btnOn.disabled  = false;
    btnOff.disabled = false;
    btnOn.querySelector('.ctrl-icon').textContent  = '🟢';
    btnOff.querySelector('.ctrl-icon').textContent = '🔴';
    btnOn.classList.remove('loading');
    btnOff.classList.remove('loading');
  }
}

// ─── LOG ──────────────────────────────────────────────────────
function addLog(message, type = '') {
  const log   = document.getElementById('admin-log');
  const time  = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  const line  = document.createElement('div');
  line.className = 'log-line';

  const typeClass = type === 'ok'  ? 'log-ok'
                   : type === 'err' ? 'log-err'
                   : '';

  line.innerHTML = `<span class="log-time">[${time}]</span><span class="${typeClass}">${message}</span>`;
  log.appendChild(line);

  // Scroll para o fim
  log.scrollTop = log.scrollHeight;
}

// ─── TOAST ────────────────────────────────────────────────────
let toastTimer = null;

function showToast(message, success = true) {
  const toast = document.getElementById('toast');
  const icon  = document.getElementById('toast-icon');
  const text  = document.getElementById('toast-text');

  clearTimeout(toastTimer);

  toast.classList.remove('show', 'toast-success', 'toast-error');

  icon.textContent  = success ? '✓' : '✗';
  text.textContent  = message;
  toast.classList.add(success ? 'toast-success' : 'toast-error');

  // Força reflow
  void toast.offsetWidth;
  toast.classList.add('show');

  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}
