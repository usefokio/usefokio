# Deploy no Railway — UseFokio

Guia de hospedagem no **Railway**. A migração é só de *compute* (o app Next): **Supabase e Cloudflare R2
são externos e não mudam**. Fase 1: subir o app inteiro no Railway e apontar só os **domínios do Site**
(subdomínio `*.usefokio.com.br`) para lá; o CRM `www.usefokio.com.br` continua na Vercel.

O app já está pronto para container Node: `next start` no `package.json`, Node fixado em `.nvmrc`/`engines`,
`railway.json` com o start command, `ehAppHost` reconhece `*.up.railway.app`, e o roteamento por host lê
`x-forwarded-host` (tolerante a proxy reverso).

---

## 1. Criar o serviço

1. Railway → **New Project → Deploy from GitHub repo** → repositório `usefokio`, branch **`master`**.
2. Build/Start: o `railway.json` já define **Nixpacks** + `next start -H 0.0.0.0 -p $PORT`. Nada a configurar.
3. (Opcional) definir a região mais próxima (ex.: `us-east`) e recursos (RAM ≥ 1 GB — o upload/ZIP carrega
   o arquivo em memória).

## 2. Variáveis de ambiente (20)

Setar em **Settings → Variables** com os valores de **PRODUÇÃO** (mesmo Supabase prod, R2, etc.).
As `NEXT_PUBLIC_*` são embutidas no **build** — precisam existir antes do `next build` (o Railway usa o mesmo
conjunto no build e no runtime, então basta cadastrá-las).

**NEXT_PUBLIC_* (build-time):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` = `https://www.usefokio.com.br`  ← continua apontando para o CRM na Vercel
- `NEXT_PUBLIC_WEBMASTER_ID`
- `NEXT_PUBLIC_R2_PUBLIC_URL`
- `NEXT_PUBLIC_R2_SITE_PUBLIC_URL` = `https://sites.usefokio.com.br`

**Server-only (runtime):**
- `SUPABASE_SERVICE_ROLE_KEY`
- `WEBMASTER_EMAIL`
- `ASAAS_ENC_SECRET`
- `ASAAS_WEBHOOK_TOKEN`
- `CRON_SECRET`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_SITE_ACCESS_KEY_ID`
- `R2_SITE_SECRET_ACCESS_KEY`
- `R2_SITE_BUCKET_NAME`

> `NODE_ENV=production` é setado pelo Railway. **Não** cadastrar `PORT` (o Railway injeta).

## 3. Recriar os 2 crons (o `vercel.json` NÃO é lido pelo Railway)

Manter em **UTC** (para o e-mail de agenda continuar às **08:00 BRT**). No Railway, criar 2 serviços/schedules
do tipo Cron (ou usar um agendador externo) que fazem um GET com o header do `CRON_SECRET`:

| Schedule (UTC) | Comando |
|---|---|
| `0 11 * * *` | `curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://<APP>/api/crm/agenda/lembretes` |
| `0 12 * * *` | `curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://<APP>/api/cron/assinaturas` |

Trocar `<APP>` pela URL pública do serviço (ex.: `www.usefokio.com.br` depois da virada total, ou a URL
`*.up.railway.app` por enquanto). As rotas são GET idempotentes e retornam 401 sem o Bearer correto.

## 4. Primeiro deploy e validação

- Deploy verde no Railway.
- `https://<serviço>.up.railway.app/login` deve abrir o **CRM/login** (é app host — o Site só aparece por
  host de fotógrafo). Isso confirma que buildou e roda.

---

## 5. Virada de DNS do Site (subdomínio + wildcard)

Objetivo: `fernandoagrela.usefokio.com.br` (e qualquer `*.usefokio.com.br` futuro) servir o **Site** pelo
Railway. O CRM (`www`/apex) fica na Vercel. O **domínio próprio** do fotógrafo (cutover do Alboom) é um passo
SEPARADO (SEO — não fazer agora).

**No Railway** (Settings → Networking → Custom Domain):
1. Adicionar **`*.usefokio.com.br`** (wildcard). O Railway fornece **3 registros**: CNAME do wildcard,
   CNAME do `_acme-challenge` e um **TXT** de verificação. (Opcional: adicionar também
   `fernandoagrela.usefokio.com.br` explicitamente para validar um site.)

**No Cloudflare** (DNS da zona `usefokio.com.br`):
2. Adicionar os 3 registros exatamente como o Railway mostrar.
3. `_acme-challenge` → **grey cloud (DNS only)** — obrigatório para o Railway emitir o certificado.
4. **SSL/TLS** da zona = **Full** (não Full Strict); **Universal SSL** ligado.
5. O CNAME do wildcard pode ficar proxied (orange) OU grey. Se o cert travar em "Validating", deixar **grey**
   até o Railway mostrar o certificado emitido, depois religar o proxy se quiser.
6. **NÃO mexer** nos registros explícitos existentes — eles têm precedência sobre o wildcard e continuam:
   `www`/apex → Vercel (CRM), `sites.usefokio.com.br` e `arquivos.usefokio.com.br` → R2.

**No banco (Supabase PROD `fhsoqlttxggjpgrupjse`):**
7. Conferir que a `site_config` do fotógrafo tem `subdominio='fernandoagrela'` e **`publicado=true`**
   (o proxy só serve tenant publicado).

## 6. Verificação fim-a-fim

- `curl -I https://fernandoagrela.usefokio.com.br` → **200**, servindo o Site (não o CRM).
- `curl -I https://fernandoagrela.usefokio.com.br/login` → **308** para `https://www.usefokio.com.br/login`.
- `https://fernandoagrela.usefokio.com.br/robots.txt` e `/sitemap.xml` respondem por host.
- CRM na Vercel intacto: `https://www.usefokio.com.br/crm`.
- Crons: disparar manual via `curl` com o Bearer e conferir 200 + efeito (log/e-mail).

## 7. Fases seguintes (fora deste escopo)

- **Cutover do domínio próprio** (Alboom → Railway) — exige o checklist de SEO (crawl 1:1 + mapa de 301);
  ~143k views indexados.
- **Virada total**: mover o CRM (`www`/apex) para o Railway e desligar a Vercel.
- Re-hospedar as mídias do Site na PROD (hoje algumas URLs ainda apontam para o Supabase de dev).
