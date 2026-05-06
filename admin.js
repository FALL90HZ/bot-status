/* ============================================================
   admin.js — Painel Admin FALL90HZ
   Token salvo no localStorage do navegador (nunca no código)
   ============================================================ */

// ─── CONFIGURAÇÃO — só senha e repositório aqui ───────────────
const ADMIN_CONFIG = {
  PASSWORD:    'fall90hz',      // ← troque para sua senha
  GITHUB_USER: 'FALL90HZ',         // ← seu usuário GitHub
  GITHUB_REPO: 'bot-status',       // ← nome do repositório
  FILE_PATH:   'status.json',
  BRANCH:      'main',
};
// ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'fall90hz_gh_token';

const API_BASE = `https://api.github.com/repos/${ADMIN_CONFIG.GITHUB_USER}/${ADMIN_CONFIG.GITHUB_REPO}/contents/${ADMIN_CONFIG.FILE_PATH}`;
const RAW_URL  = `https://raw.githubusercontent.com/${ADMIN_CONFIG.GITHUB_USER}/${ADMIN_CONFIG.GITHUB_REPO}/${ADMIN_CONFIG.BRANCH}/${ADMIN_CONFIG.FILE_PATH}`;

let isAuthenticated = false;
let currentStatus   = null;
let isBusy          = false;
let githubToken     = '';

// ─── RELÓGIO ──────────────────────────────────────────────────
setInterval(() => {
  const el = document.getElementById('footer-clock');
  if (el) el.textContent = new Date().toLocaleTimeString('pt-BR');
}, 1000);

// ─── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Injetar shake animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%,100%{transform:translateX(0)}
      20%{transform:translateX(-8px)}
      40%{transform:translateX(8px)}
      60%{transform:translateX(-5px)}
      80%{transform:translateX(5px)}
    }
  `;
  document.head.appendChild(style);

  // Enter no campo de senha
  document.getElementById('password-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('token-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });

  // Se já tiver token salvo, preenche o campo e deixa placeholder diferente
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    document.getElementById('token-input').placeholder = '✓ Token já salvo — deixe em branco para manter';
  }
});

// ─── LOGIN ────────────────────────────────────────────────────
function handleLogin() {
  const pw         = document.getElementById('password-input').value;
  const tokenInput = document.getElementById('token-input').value.trim();
  const errLogin   = document.getElementById('login-error');
  const errToken   = document.getElementById('token-error');

  errLogin.classList.remove('visible');
  errToken.classList.remove('visible');

  // Verificar senha
  if (pw !== ADMIN_CONFIG.PASSWORD) {
    errLogin.classList.add('visible');
    const input = document.getElementById('password-input');
    input.value = '';
    input.style.animation = 'none';
    void input.getBoundingClientRect();
    input.style.animation = 'shake 0.4s ease';
    input.focus();
    addLog('Tentativa de login com senha incorreta.', 'err');
    return;
  }

  // Pegar token: novo digitado > salvo no storage
  const savedToken = localStorage.getItem(STORAGE_KEY) || '';
  githubToken = tokenInput || savedToken;

  if (!githubToken) {
    errToken.classList.add('visible');
    document.getElementById('token-input').focus();
    return;
  }

  // Salvar token novo se foi digitado
  if (tokenInput) {
    localStorage.setItem(STORAGE_KEY, tokenInput);
    addLog('Token salvo no navegador.', 'ok');
  }

  // Sucesso
  isAuthenticated = true;
  document.getElementById('login-view').style.display  = 'none';
  document.getElementById('admin-view').style.display  = 'block';
  addLog('Autenticação bem-sucedida.', 'ok');
  loadCurrentStatus();
}

function handleLogout() {
  isAuthenticated = false;
  currentStatus   = null;
  githubToken     = '';
  document.getElementById('admin-view').style.display  = 'none';
  document.getElementById('login-view').style.display  = 'block';
  document.getElementById('password-input').value = '';
}

function clearToken() {
  localStorage.removeItem(STORAGE_KEY);
  githubToken = '';
  showToast('Token removido do navegador.', false);
  addLog('Token apagado do armazenamento local.', 'err');
  document.getElementById('token-input').placeholder = 'ghp_xxxxxxxxxxxxxxxxxxxx';
}

// ─── CARREGAR STATUS ─────────────────────────────────────────
async function loadCurrentStatus() {
  updateAdminBadge('loading');
  try {
    const res  = await fetch(RAW_URL + `?t=${Date.now()}`, { cache: 'no-store' });
    const data = await res.json();
    currentStatus = data.status;
    updateAdminBadge(currentStatus);
    const now = new Date().toLocaleTimeString('pt-BR');
    document.getElementById('admin-status-updated').textContent = `Última verificação: ${now}`;
    addLog(`Status atual: ${currentStatus.toUpperCase()}`, 'ok');
  } catch (e) {
    addLog(`Erro ao carregar status: ${e.message}`, 'err');
    updateAdminBadge('offline');
  }
}

// ─── BADGE ───────────────────────────────────────────────────
function updateAdminBadge(status) {
  const badge = document.getElementById('admin-badge');
  const text  = document.getElementById('admin-badge-text');
  badge.classList.remove('badge-online', 'badge-offline');
  if (status === 'online') {
    badge.classList.add('badge-online');
    text.textContent = 'Online';
  } else {
    badge.classList.add('badge-offline');
    text.textContent = status === 'offline' ? 'Offline' : 'Verificando...';
  }
}

// ─── SETAR STATUS ────────────────────────────────────────────
async function setStatus(newStatus) {
  if (!isAuthenticated || isBusy) return;
  if (newStatus === currentStatus) {
    showToast(`Bot já está ${newStatus === 'online' ? 'ONLINE' : 'OFFLINE'}.`, false);
    return;
  }

  isBusy = true;
  setButtonsLoading(true, newStatus);
  addLog(`Iniciando alteração para: ${newStatus.toUpperCase()}...`);

  try {
    // 1. Pegar SHA
    const shaRes = await fetch(API_BASE, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!shaRes.ok) {
      const err = await shaRes.json();
      // Token inválido
      if (shaRes.status === 401) {
        localStorage.removeItem(STORAGE_KEY);
        throw new Error('Token inválido ou expirado. Faça login novamente com um novo token.');
      }
      throw new Error(err.message || `HTTP ${shaRes.status}`);
    }

    const { sha } = await shaRes.json();
    addLog(`SHA: ${sha.substring(0, 8)}...`);

    // 2. Novo conteúdo
    const newContent = JSON.stringify({ status: newStatus }, null, 2);
    const encoded    = btoa(unescape(encodeURIComponent(newContent)));

    // 3. PUT
    const putRes = await fetch(API_BASE, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `chore: set bot status to ${newStatus}`,
        content: encoded,
        sha,
        branch: ADMIN_CONFIG.BRANCH,
      }),
    });

    if (!putRes.ok) {
      const err = await putRes.json();
      throw new Error(err.message || `HTTP ${putRes.status}`);
    }

    currentStatus = newStatus;
    updateAdminBadge(newStatus);
    document.getElementById('admin-status-updated').textContent =
      `Atualizado às ${new Date().toLocaleTimeString('pt-BR')}`;

    addLog(`✓ Status alterado para ${newStatus.toUpperCase()}.`, 'ok');
    showToast(newStatus === 'online' ? '✓ Bot definido como ONLINE' : '✓ Bot definido como OFFLINE', true);

  } catch (error) {
    addLog(`✗ Falha: ${error.message}`, 'err');
    showToast(`✗ ${error.message}`, false);
  } finally {
    isBusy = false;
    setButtonsLoading(false, null);
  }
}

// ─── BOTÕES ──────────────────────────────────────────────────
function setButtonsLoading(loading, active) {
  const on  = document.getElementById('btn-ligar');
  const off = document.getElementById('btn-desligar');
  on.disabled = off.disabled = loading;
  if (loading) {
    (active === 'online' ? on : off).querySelector('.ctrl-icon').textContent = '⟳';
  } else {
    on.querySelector('.ctrl-icon').textContent  = '🟢';
    off.querySelector('.ctrl-icon').textContent = '🔴';
  }
}

// ─── LOG ─────────────────────────────────────────────────────
function addLog(msg, type = '') {
  const log  = document.getElementById('admin-log');
  const time = new Date().toLocaleTimeString('pt-BR');
  const line = document.createElement('div');
  line.className = 'log-line';
  const cls = type === 'ok' ? 'log-ok' : type === 'err' ? 'log-err' : '';
  line.innerHTML = `<span class="log-time">[${time}]</span><span class="${cls}">${msg}</span>`;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

// ─── TOAST ───────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, ok = true) {
  const toast = document.getElementById('toast');
  clearTimeout(toastTimer);
  toast.classList.remove('show', 'toast-success', 'toast-error');
  document.getElementById('toast-icon').textContent = ok ? '✓' : '✗';
  document.getElementById('toast-text').textContent = msg;
  toast.classList.add(ok ? 'toast-success' : 'toast-error');
  void toast.offsetWidth;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}
