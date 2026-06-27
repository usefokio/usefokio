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

---

## Mapa do Sistema CRM

### Tabelas do banco (dev: `lcpoufencuaawpztmclb`)

| Tabela | Descrição | Página CRM |
|--------|-----------|------------|
| `clientes` | Contatos (clientes/fornecedores) | `/crm/clientes` |
| `crm_orders` | Pedidos de serviço | `/crm/pedidos` |
| `crm_order_items` | Itens do pedido (vazio — aguarda export photomanager) | `/crm/pedidos/[id]` |
| `crm_financial_entries` | Receitas e despesas | `/crm/financeiro` |
| `crm_chart_of_accounts` | Plano de contas (receita/despesa) | `/crm/config` → aba Plano |
| `crm_opportunities` | Pipeline de vendas | `/crm/oportunidades` |
| `crm_products` | Catálogo de produtos | `/crm/produtos` |
| `crm_contas_bancarias` | Contas bancárias com saldo calculado | `/crm/contas` |
| `crm_schedules` | Agenda/eventos vinculados a pedidos | `/crm/agenda` |
| `crm_funnel_stages` | Etapas do funil de oportunidades | `/crm/config` → aba Funis |
| `crm_oportunidade_status` | Status das oportunidades (dinâmico, com cor) | `/crm/config` → aba Status |
| `crm_product_categories` | Categorias de produtos | `/crm/config` → aba Produtos |

### Campos críticos

| Campo | Tabela | Uso |
|-------|--------|-----|
| `data_lancamento` | `crm_orders` | Data do lançamento (= `add_date` do CSV legado). Usada pelo Resultados em **regime de competência** |
| `legacy_id` | `crm_orders` | ID numérico do photomanager. Chave de idempotência em imports. Range 2025: 541–599; 2026: 600–627 |
| `pago_em` | `crm_financial_entries` | Data real do pagamento. Usada pelo Resultados em **regime de caixa** |
| `conta_id` | `crm_financial_entries` | FK → `crm_chart_of_accounts` (categoria contábil para o DRE) |
| `conta_bancaria_id` | `crm_financial_entries` | FK → `crm_contas_bancarias` (banco físico onde o dinheiro entrou/saiu) |
| `fotografo_id` | todas | Dev mock: `"00000000-0000-0000-0000-000000000001"` |

### Utilitários compartilhados (não duplicar)

| Arquivo | Exporta |
|---------|---------|
| `lib/utils/format.ts` | `formatBRL`, `formatNum`, `formatData` |
| `lib/hooks/useWindowWidth.ts` | `useWindowWidth()` — responsividade |
| `lib/constants/statusMaps.ts` | `PEDIDO_STATUS_MAP`, `FIN_STATUS_MAP` |
| `app/(dashboard)/crm/_components/Icons.tsx` | `IcoEdit`, `IcoTrash`, `IcoOpen`, `IcoMail`, `IcoCheck`, `IcoWhatsApp` |

### Lógica de Resultados (DRE)

- **Regime de Competência**: receitas = `crm_orders` agrupados por `data_lancamento`, mapeados via `CATEGORIA_CODIGO` em `resultados/page.tsx`. Despesas = `crm_financial_entries` por `vencimento`.
- **Regime de Caixa**: receitas = `crm_financial_entries` com `tipo=receita` e `pago_em` no período. Despesas = idem por `pago_em`.
- `CATEGORIA_CODIGO` é hardcoded em `resultados/page.tsx` — atualizar sempre que adicionar nova categoria de pedido ou conta de receita. Categorias sem mapeamento exibem aviso amarelo na tela.

### Dados importados (histórico photomanager)

| Período | Qtd pedidos | Fonte |
|---------|-------------|-------|
| 2014–2024 | 500 | `pedidos total.csv` (importado via REST API) |
| 2025 | 57 | `pedidos2025.csv` (importado via SQL) |
| 2026 | 27 | `pedidos total.csv` — legacy_ids 600–627 |
| Financeiro 2025 | 520 entries | `contas recebidas 2025.csv` + `contaspagas2025.csv` |
