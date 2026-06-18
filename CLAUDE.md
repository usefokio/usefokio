# UseFokio — CRM (Módulo em Desenvolvimento)

## Visão Geral

SaaS para fotógrafos. Este repositório é o projeto Next.js principal (`usefokio`), branch `feature/crm`. O desenvolvimento atual é focado no módulo CRM.

## Como rodar localmente

```bash
npm install
npm run dev:crm   # inicia na porta 3001
```

Acesse: http://localhost:3001

## Ambiente de desenvolvimento

- **Porta:** 3001
- **Banco:** Supabase de dev exclusivo (`usefokio-crm-dev`, project id: `lcpoufencuaawpztmclb`)
- **Autenticação:** desativada em dev — nenhum login necessário
- **`.env.local`** deve existir na raiz com:

```
NEXT_PUBLIC_SUPABASE_URL="https://lcpoufencuaawpztmclb.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjcG91ZmVuY3VhYXdwenRtY2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MjYxMDUsImV4cCI6MjA5NzMwMjEwNX0.crgj1obPknWgoWq8-BovkDR8zDOLnYNep6PpTsTzI-4"
```

## Bypass de autenticação em dev

Todos os guards e contextos verificam `process.env.NODE_ENV === "development"` antes de chamar o Supabase. Em dev:

- `lib/context/FotografoContext.tsx` — retorna um fotógrafo mock sem chamar Supabase Auth
- `app/(dashboard)/_components/DashboardGuard.tsx` — pula verificação de auth e termos
- `app/page.tsx` — redireciona direto para `/crm`
- `components/layout/Sidebar.tsx` — exibe apenas o menu CRM

### Fotógrafo mock (dev)

```ts
id: "00000000-0000-0000-0000-000000000001"
email: "dev@local.dev"
plano: "estudio"
recursos: { selecao, entrega, album, contatos, pagamentos, crm } — todos true
```

## Estrutura do CRM

```
app/(dashboard)/crm/
  clientes/
    page.tsx          — listagem com busca e filtro por tipo
    [id]/             — detalhe/edição (a criar)
    novo/             — formulário novo cliente (a criar)
  oportunidades/      — kanban por etapa do funil
  pedidos/
  produtos/
  contas/
  financeiro/
  resultados/
  config/
```

## Banco de dados dev

Dados copiados da produção (fotógrafo `contato@fernandoagrelafotografia.com.br`) e atribuídos ao usuário dev:

| Tabela | Qtd |
|---|---|
| clientes | 101 |
| crm_funnels | 1 ("Negociação Web") |
| crm_funnel_stages | 8 etapas |
| crm_oportunidade_status | 6 |
| crm_oportunidade_categorias | 11 |
| crm_canais_origem | 9 |
| crm_product_categories | 10 |
| crm_products | 74 |
| crm_contas_bancarias | 1 ("Caixa Empresa") |
| crm_opportunities | 1 ("Cas Ors 2027") |

## Produção

- **Supabase prod:** project id `fhsoqlttxggjpgrupjse`
- **Branch:** `feature/crm` → merge para `main` quando pronto
- Nunca alterar o `.env.local` para apontar para produção durante o desenvolvimento

## Convenções

- Sem comentários desnecessários no código
- Sem login/auth em dev — qualquer chamada ao Supabase Auth deve ser protegida por `if (process.env.NODE_ENV === "development") return`
- Commits em português no estilo `feat(crm): descrição`
- Push para `origin feature/crm` após cada alteração
