# ⚡ FALL90HZ — Bot Status Monitor

Painel web profissional para exibir o status do seu bot em tempo real, hospedado no GitHub Pages. Sem backend, sem custos.

---

## 📁 Estrutura de Arquivos

```
/
├── index.html     → Página pública de status
├── admin.html     → Painel de administração
├── style.css      → Estilos compartilhados
├── script.js      → Lógica da página pública
├── admin.js       → Lógica do admin (configurar aqui)
└── status.json    → Arquivo de status do bot
```

---

## 🚀 Configuração Passo a Passo

### 1. Criar repositório no GitHub

1. Acesse [github.com](https://github.com) e faça login
2. Clique em **New repository**
3. Dê um nome (ex: `bot-status`)
4. Marque como **Public**
5. Clique em **Create repository**
6. Faça upload de todos os arquivos

### 2. Ativar GitHub Pages

1. No repositório, vá em **Settings** → **Pages**
2. Em *Source*, selecione **Deploy from a branch**
3. Selecione o branch `main` e pasta `/ (root)`
4. Clique em **Save**
5. Aguarde ~1 minuto e acesse o link gerado:
   ```
   https://SEU_USUARIO.github.io/SEU_REPOSITORIO/
   ```

### 3. Criar GitHub Token

1. Acesse: **GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic)**
2. Clique em **Generate new token (classic)**
3. Dê um nome (ex: `bot-status-token`)
4. Marque a permissão: ✅ `repo`
5. Clique em **Generate token**
6. **Copie o token** (ele só aparece uma vez!)

---

## ✏️ Configurar os Arquivos

### `script.js` — Página pública

Abra o arquivo e edite a seção `CONFIG`:

```js
const CONFIG = {
  GITHUB_USER: 'seu_usuario_aqui',   // ← seu usuário GitHub
  GITHUB_REPO: 'seu_repositorio',    // ← nome do repositório
  REFRESH_INTERVAL: 30000,           // ← atualização automática (ms)
};
```

### `admin.js` — Painel admin

Abra o arquivo e edite a seção `ADMIN_CONFIG`:

```js
const ADMIN_CONFIG = {
  PASSWORD:     'sua_senha_segura',   // ← senha do painel admin
  GITHUB_USER:  'seu_usuario_aqui',   // ← seu usuário GitHub
  GITHUB_REPO:  'seu_repositorio',    // ← nome do repositório
  GITHUB_TOKEN: 'ghp_xxxxxxxxxxxxx',  // ← token gerado no passo 3
  FILE_PATH: 'status.json',
  BRANCH:    'main',
};
```

---

## ⚠️ Avisos Importantes

| Risco | Detalhe |
|-------|---------|
| 🔓 Token exposto | O token fica visível no código-fonte. Use um token com permissões mínimas e considere excluir quando não usar. |
| 🔐 Senha no frontend | A senha também fica no código. Este sistema é para uso **pessoal/privado**. |
| ⏱️ Não é tempo real | A página pública atualiza de 30 em 30 segundos. O `raw.githubusercontent.com` pode ter cache de até 5 min. |

**Recomendações:**
- Crie o token com escopo mínimo (`repo` apenas)
- Revogue o token se não precisar mais
- Use uma senha única (não reutilize de outros serviços)
- O repositório pode ser **privado** — GitHub Pages funciona com repos privados em planos pagos

---

## 🎨 Design

- Tema 100% escuro (dark mode)
- Tipografia: Space Mono + Outfit
- Indicador com animação de pulso (verde = online, vermelho = offline)
- Grid de fundo sutil com glow azul
- Toast de notificação animado
- Log de atividades no painel admin
- Totalmente responsivo (mobile-friendly)

---

## 📡 Como Funciona

```
┌─────────────────────────────────────────────┐
│              status.json (GitHub)            │
│            { "status": "online" }            │
└──────┬────────────────────────┬──────────────┘
       │ fetch (leitura)        │ API PUT (escrita)
       ▼                        ▼
┌─────────────┐          ┌─────────────────┐
│  index.html │          │   admin.html    │
│ Exibe status│          │ Altera o status │
└─────────────┘          └─────────────────┘
```

---

## 🤖 Automatizar via Bot Python

Se quiser que seu bot Python atualize o status automaticamente:

```python
import requests
import base64
import json

GITHUB_USER  = "seu_usuario"
GITHUB_REPO  = "seu_repositorio"
GITHUB_TOKEN = "seu_token"
FILE_PATH    = "status.json"

def set_bot_status(status: str):
    """status = 'online' ou 'offline'"""
    api_url = f"https://api.github.com/repos/{GITHUB_USER}/{GITHUB_REPO}/contents/{FILE_PATH}"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
    }

    # Pegar SHA atual
    r = requests.get(api_url, headers=headers)
    sha = r.json()["sha"]

    # Novo conteúdo
    content = json.dumps({"status": status}, indent=2)
    encoded = base64.b64encode(content.encode()).decode()

    # Atualizar
    requests.put(api_url, headers=headers, json={
        "message": f"chore: set status to {status}",
        "content": encoded,
        "sha": sha,
    })

# Usar no seu bot:
# set_bot_status("online")   # quando iniciar
# set_bot_status("offline")  # quando encerrar
```

---

Feito com ⚡ para FALL90HZ
