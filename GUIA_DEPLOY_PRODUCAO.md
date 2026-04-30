# Guia Completo de Deploy em Produção
## LP Finanças — lpfinancass.com.br

---

## Arquitetura de Produção

```
lpfinancass.com.br          → Landing page (Hostgator)
app.lpfinancass.com.br      → Frontend React (Vercel ou Netlify)
api.lpfinancass.com.br      → Backend FastAPI (Railway)
```

---

## PARTE 1 — Banco de Dados (MongoDB Atlas) — GRATUITO

### 1.1 Criar conta e cluster

1. Acesse [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Clique em **"Try Free"** e crie uma conta
3. Escolha o plano **M0 Free** (gratuito para começar)
4. Selecione a região **São Paulo (sa-east-1)**
5. Dê o nome `lpfinancas-prod` ao cluster

### 1.2 Configurar acesso

1. Em **Database Access** → Add New Database User
   - Username: `lpfinancas_admin`
   - Password: gere uma senha forte e **anote**
   - Role: `Atlas admin`

2. Em **Network Access** → Add IP Address
   - Clique em **"Allow Access from Anywhere"** (0.0.0.0/0)
   - Isso é necessário para o Railway acessar

### 1.3 Obter a connection string

1. Clique em **Connect** → **Connect your application**
2. Copie a string no formato:
   ```
   mongodb+srv://lpfinancas_admin:SENHA@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
3. Substitua `SENHA` pela senha que você criou

---

## PARTE 2 — Backend (Railway)

### 2.1 Criar conta no Railway

1. Acesse [railway.app](https://railway.app)
2. Faça login com sua conta GitHub
3. Clique em **"New Project"**

### 2.2 Deploy do backend

1. Clique em **"Deploy from GitHub repo"**
2. Selecione o repositório `LP-Financas-Mobile`
3. Clique em **"Configure"** e defina:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`

### 2.3 Configurar variáveis de ambiente

No Railway, vá em **Variables** e adicione:

| Variável | Valor |
|---|---|
| `MONGO_URL` | `mongodb+srv://lpfinancas_admin:SENHA@cluster0.xxxxx.mongodb.net/...` |
| `DB_NAME` | `lpfinancas_prod` |
| `JWT_SECRET` | Gere com: `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `ADMIN_EMAIL` | `seu@email.com` |
| `ADMIN_PASSWORD` | `SuaSenhaAdmin123!` |
| `ADMIN_NAME` | `Admin LP Finanças` |
| `STRIPE_SECRET_KEY` | `sk_live_...` (do painel Stripe) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (do painel Stripe) |
| `STRIPE_PRICE_MONTHLY` | `price_...` (ID do preço mensal) |
| `STRIPE_PRICE_ANNUAL` | `price_...` (ID do preço anual) |
| `FRONTEND_URL` | `https://app.lpfinancass.com.br` |

### 2.4 Configurar domínio personalizado

1. No Railway, vá em **Settings** → **Domains**
2. Clique em **"Add Custom Domain"**
3. Digite: `api.lpfinancass.com.br`
4. O Railway vai mostrar um registro CNAME para configurar

### 2.5 Configurar DNS na Hostgator

1. Acesse o cPanel da Hostgator
2. Vá em **Zone Editor** ou **DNS Zone Editor**
3. Adicione um registro CNAME:
   - **Nome**: `api`
   - **Tipo**: `CNAME`
   - **Valor**: o valor que o Railway forneceu (ex: `xxx.railway.app`)
   - **TTL**: 3600

---

## PARTE 3 — Frontend (Vercel)

### 3.1 Criar conta no Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Faça login com GitHub
3. Clique em **"New Project"**

### 3.2 Deploy do frontend

1. Importe o repositório `LP-Financas-Mobile`
2. Configure:
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
   - **Build Command**: `yarn build`
   - **Output Directory**: `build`

### 3.3 Variáveis de ambiente no Vercel

Vá em **Settings** → **Environment Variables** e adicione:

| Variável | Valor |
|---|---|
| `REACT_APP_BACKEND_URL` | `https://api.lpfinancass.com.br` |

### 3.4 Configurar domínio personalizado

1. No Vercel, vá em **Settings** → **Domains**
2. Adicione: `app.lpfinancass.com.br`
3. O Vercel vai mostrar registros DNS para configurar

### 3.5 Configurar DNS na Hostgator

Adicione um registro CNAME:
- **Nome**: `app`
- **Tipo**: `CNAME`
- **Valor**: `cname.vercel-dns.com`
- **TTL**: 3600

---

## PARTE 4 — Landing Page (Hostgator)

### 4.1 Upload via cPanel File Manager

1. Acesse o cPanel da Hostgator
2. Vá em **File Manager**
3. Navegue até `public_html`
4. Faça upload do arquivo `landing/index.html`
5. Renomeie para `index.html` (se ainda não estiver)

### 4.2 Configurar o domínio raiz

O domínio `lpfinancass.com.br` já aponta para o `public_html` da Hostgator por padrão. Basta ter o `index.html` na pasta raiz.

---

## PARTE 5 — Stripe (Pagamentos)

### 5.1 Criar conta e produtos

1. Acesse [dashboard.stripe.com](https://dashboard.stripe.com)
2. Crie uma conta (use modo **Live** para produção)
3. Vá em **Products** → **Add Product**

**Produto 1: LP Finanças Pro Mensal**
- Nome: `LP Finanças Pro`
- Preço: `R$ 29,90` por mês (recorrente)
- Moeda: BRL
- Copie o **Price ID** (começa com `price_`)

**Produto 2: LP Finanças Pro Anual**
- Nome: `LP Finanças Pro Anual`
- Preço: `R$ 97,90` por ano (recorrente)
- Moeda: BRL
- Copie o **Price ID** (começa com `price_`)

### 5.2 Obter as chaves

1. Vá em **Developers** → **API Keys**
2. Copie a **Secret key** (`sk_live_...`)

### 5.3 Configurar Webhook

1. Vá em **Developers** → **Webhooks**
2. Clique em **"Add endpoint"**
3. URL: `https://api.lpfinancass.com.br/stripe/webhook`
4. Eventos a escutar:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copie o **Signing secret** (`whsec_...`)

### 5.4 Configurar portal do cliente

1. Vá em **Settings** → **Billing** → **Customer portal**
2. Ative e configure as opções desejadas
3. Salve as configurações

---

## PARTE 6 — Verificação Final

Após o deploy, teste:

- [ ] `https://lpfinancass.com.br` — Landing page carrega
- [ ] `https://app.lpfinancass.com.br` — App React carrega
- [ ] `https://api.lpfinancass.com.br/health` — Retorna `{"status":"healthy"}`
- [ ] `https://api.lpfinancass.com.br/api/health` — Retorna `{"status":"healthy"}`
- [ ] Login com admin funciona
- [ ] Criar conta de usuário funciona
- [ ] Checkout do Stripe redireciona corretamente
- [ ] Webhook do Stripe ativa a assinatura

---

## Custos Estimados

| Serviço | Plano | Custo |
|---|---|---|
| MongoDB Atlas | M0 Free | R$ 0/mês |
| Railway | Hobby | ~R$ 25/mês |
| Vercel | Hobby | R$ 0/mês |
| Hostgator | Já contratado | — |
| Stripe | Taxa por transação | 3,4% + R$ 0,40 por venda |

**Total fixo estimado: ~R$ 25/mês**

Com 10 assinantes mensais (R$ 299/mês), o projeto já cobre os custos e gera lucro.

---

## Suporte

Em caso de dúvidas:
- Railway: [docs.railway.app](https://docs.railway.app)
- Vercel: [vercel.com/docs](https://vercel.com/docs)
- MongoDB Atlas: [docs.atlas.mongodb.com](https://docs.atlas.mongodb.com)
- Stripe: [stripe.com/docs](https://stripe.com/docs)
