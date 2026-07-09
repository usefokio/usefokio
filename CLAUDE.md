# UseFokio — CRM (Em Produção)

## Visão Geral

SaaS para fotógrafos. Este repositório é o projeto Next.js principal (`usefokio`), branch **master** (produção ativa em usefokio.com.br). **Há usuários reais — não editar nem deployar direto em produção.**

**Fluxo de trabalho (atual):** desenvolver **localmente** contra o banco de DEV, numa **branch** → testar local → `git push` da branch (o Vercel gera um **Preview URL** com auth real) → quando um conjunto de features estiver pronto, **merge/push em `master`** = deploy de produção. **Deploys em lote, não a cada commit.**

## Como rodar localmente

```bash
npm install
npm run dev:crm   # inicia na porta 3001
```

Acesse: http://localhost:3001

## Ambiente de desenvolvimento

- **Porta:** 3001
- **Banco:** Supabase de dev exclusivo (`usefokio-crm-dev`, project id: `lcpoufencuaawpztmclb`)
- **Autenticação:** desativada em dev — nenhum login necessário (mock fotografo com todos os recursos)
- **Menu completo em dev:** UseFokio + CRM + painel `/webmaster` acessíveis (bypass gated por `NODE_ENV`,
  nunca afeta prod/preview do Vercel).
- **Setup do `.env.local`:** copie **`.env.example`** → `.env.local` (já vem apontando para o DEV) e cole o
  **`SUPABASE_SERVICE_ROLE_KEY` do projeto DEV** (Dashboard dev → Settings → API) — necessário para as rotas
  `/api` que usam `createAdminClient`. `.env.local` **nunca** deve conter chaves de PRODUÇÃO.
- **Rodar:** `npm run dev:crm` → http://localhost:3001.
- **Porta presa** (node órfão em 3000/3001): `Get-Process node | Stop-Process -Force` no PowerShell, ou usar
  `preview_start`/`preview_stop` (que gerenciam o processo) apenas quando o Fernando pedir teste.
- **Dois PCs (desktop + notebook):** ao iniciar/retomar, rodar `git fetch` e conferir `git status -sb` no
  usefokio antes de editar — o outro PC pode ter commits mais recentes.

```
NEXT_PUBLIC_SUPABASE_URL="https://lcpoufencuaawpztmclb.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon do dev>"
SUPABASE_SERVICE_ROLE_KEY="<service_role do dev>"
# ...demais vars: ver .env.example
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
- **Branch:** `master` (produção ativa)
- Nunca alterar o `.env.local` para apontar para produção durante o desenvolvimento

## Convenções

- Sem comentários desnecessários no código
- Sem login/auth em dev — qualquer chamada ao Supabase Auth deve ser protegida por `if (process.env.NODE_ENV === "development") return`
- Commits em português no estilo `feat(crm): descrição`
- Desenvolver em **branch**, testar local (dev DB), e deployar **em lote** via merge em `master` — não push direto a cada mudança
- **Schema do banco:** mudanças via arquivo SQL em `supabase/migrations/`, aplicadas **primeiro no DEV**, testadas, e só então na PROD (fim de migration direto em produção)

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

### Lógica de Resultados (DRE) — fontes e regras (auditoria 2026-07-04)

**Duas telas, DUAS fontes distintas** (podem divergir — cuidado ao comparar):

1. **Cards do topo + gráfico "por ano"** (`resultados/page.tsx` e `resultados/panorama/page.tsx`): RPC
   `get_panorama_financeiro` → soma `crm_financial_entries` com `num_documento='DRE'`, `status='pago'`, por
   ano de **`vencimento`**, agrupado por `tipo`. NÃO inclui pedidos `crm_nativo` nem lançamentos não-DRE.
2. **Tabela "DRE por Plano de Contas" (panorama) + Resultados mensal**: função `carregarDRE`/`carregar`:
   - **Competência**: lançamentos `num_documento='DRE'` por `vencimento` **+** pedidos `crm_orders`
     `crm_nativo=true` por `data_lancamento` (mapeados via `CATEGORIA_CODIGO`). Não filtra `status`.
   - **Caixa**: `crm_financial_entries` `status='pago'` (exceto DRE) por `pago_em`.
   - **Usuário novo (sem DRE)**: lançamentos não-DRE por `conta_id`.

**`CATEGORIA_CODIGO`** (categoria do pedido → código contábil) é hardcoded nos dois arquivos — atualizar ao
adicionar categoria/conta. Categorias sem mapeamento exibem aviso amarelo (só no Resultados).

**Dados importados (contas recebidas/pagas):** vão para `crm_financial_entries` — recebidas `tipo=receita`,
pagas `tipo=despesa`, `status='pago'`, `pago_em=vencimento`, marcadas **`num_documento='DRE'`**; `conta_id`
derivado (recebidas: categoria do pedido→código→conta; pagas: `account_id` do CSV→código→conta). Nota: os
scripts `scripts/import-contas-*.mjs` apontam pro **dev** e setam `num_documento=document_number` — a
marcação `'DRE'` de produção veio por outra importação (SQL).

**⚠️ Plano de contas tem 2 versões por código** (conta do sistema `fotografo_id IS NULL` + cópia do
fotógrafo, ids diferentes). Os lançamentos apontam pra cópia. Por isso a agregação da DRE é **por CÓDIGO da
conta**, não por `conta_id` (senão a dedup por código escolhe a versão errada e perde valores → totais
errados; foi o bug corrigido em 2026-07-04). Ao mexer na DRE, sempre agregar por `codigo` e, no drill-down,
buscar `.in("conta_id", <todos os ids do código>)`.

**Divergências conhecidas (não corrigidas):** a RPC (cards) filtra `status='pago'` e ignora `crm_nativo`,
enquanto a tabela DRE (competência) não filtra status e inclui `crm_nativo` → podem divergir com pedidos
novos/lançamentos pendentes. O card "Despesas" soma custos (seção 4) + despesas (seção 5) juntos.

## Padrões de sistema — REVISAR esta lista antes de entregar QUALQUER tela/form novo

São regras válidas em **todo o sistema** (não só na tela citada no pedido). Foram repetidas várias vezes
sessão após sessão — tratar como checklist obrigatório, não como preferência pontual.

- **Campo de valor R$**: sempre com máscara — `mascaraValor`/`parsearValor` (ou `mascaraMoeda`/`parseMoeda`).
  Nunca `<input>` numérico cru para dinheiro. Exibir com `formatNum`/`formatBRL` (`lib/utils/format.ts`).
- **Listagens/somas: NUNCA `select` direto** — sempre `fetchAllRows` (`lib/supabase/fetchAll.ts`) para listas,
  ou RPC de agregação para totais. O PostgREST corta em **1000 linhas silenciosamente** → totais/listas
  errados. Este bug já reapareceu em ~9 telas.
- **Visualizar ≠ Editar**: telas de visualização são **read-only**. Alterações só em **modo de edição** com
  botão **Salvar** explícito. Nunca auto-save ao selecionar/clicar (ex.: produtos no pedido). Ver memória
  [[feedback_view_vs_edit]].
- **Estado de salvamento CLARO em todo editor** (ver [[feedback_editor_salvar]]): (a) **selo de estado**
  visível — âmbar "● Alterações não salvas" vs verde "✓ Tudo salvo", derivado de baseline capturado no load
  (`JSON.stringify`) + flag `saiu`; (b) botão **Salvar reflete o estado** (destacado quando há mudanças,
  "Salvo ✓"/desabilitado quando limpo); em editores por blocos/seções, ter também Salvar **dentro** do bloco
  (grava o registro inteiro); (c) **aviso ao sair sem salvar** via `lib/hooks/useUnsavedGuard.ts` (cliques em
  links + `beforeunload`; botões de Voltar chamam `pedirSaida`; modal de 3 botões Salvar e sair / Sair sem
  salvar / Continuar editando). Nunca auto-save. Referência: `site/landing-pages/[id]` e `entrega/[id]/editar`.
- **Listagens**: título da coluna é **clicável** e alterna a ordenação; filtros e busca **persistentes**;
  paginação universal.
- **Selects/dropdowns**: opções em **ordem alfabética** (ou por `ordem` explícita quando houver).
- **Formulários longos**: botão **Salvar** no **topo e no rodapé**.
- **Data**: campos de data começam com **hoje** por padrão.
- **Upload de fotos**: sempre em **fila/blocos** com barra de progresso e concorrência limitada; reaproveitar
  o padrão de `entrega/nova` (retry + idempotência, não recriar a galeria a cada tentativa).
- **Email para cliente**: seguir o padrão já existente na tela (manual via `mailto`/botão) — não disparar
  envio automático sem pedido.
- **Nada hardcoded de negócio**: preços, limites de fotos/galerias e regras de plano vêm de **`planos_config`**
  (não constantes no código).
- **Cliente único**: uma só tabela `clientes` compartilhada por CRM/seleção/entrega. Nunca base paralela nem
  recadastro. Ver [[project_cliente_unico]].

## Migrações de schema (regra)
Toda mudança de schema vira um **arquivo SQL numerado** em `supabase/migrations/`, aplicado **primeiro no dev**
(`lcpoufencuaawpztmclb`), testado, e só então na **prod** (`fhsoqlttxggjpgrupjse`) no dia do deploy em lote.
Nunca alterar schema direto em produção sem passar pelo dev. (O guard de SQL destrutivo em prod é mecânico —
ver memória [[project_setup_hooks]].)

### Dados importados (histórico photomanager)

| Período | Qtd pedidos | Fonte |
|---------|-------------|-------|
| 2014–2024 | 500 | `pedidos total.csv` (importado via REST API) |
| 2025 | 57 | `pedidos2025.csv` (importado via SQL) |
| 2026 | 27 | `pedidos total.csv` — legacy_ids 600–627 |
| Financeiro 2025 | 520 entries | `contas recebidas 2025.csv` + `contaspagas2025.csv` |
