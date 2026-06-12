# UseFokio — Resumo de contexto (handoff)

SaaS de galerias para fotógrafos. Next.js 16 (App Router) + Supabase + Vercel.
- Projeto Supabase (produção): `fhsoqlttxggjpgrupjse` (migrações via Supabase MCP)
- Deploy: `npx vercel --prod` na pasta `M:\CLAUDE\usefokio`. Testar SEMPRE em `usefokio.vercel.app`. **CRÍTICO:** o projeto Vercel correto é `usefokio` (não `usefokio-ll4r`). Antes de deployar, confirmar com `npx vercel project ls` que o link aponta para `usefokio`. Se apontar para `usefokio-ll4r`, rodar `npx vercel link --yes --project usefokio --scope usefokio-3215s-projects` para corrigir.
- Webmaster: `usefokio@gmail.com` (checagem dupla por email + `NEXT_PUBLIC_WEBMASTER_ID`); env privada `WEBMASTER_EMAIL`
- Conta de teste do fotógrafo: `contato@fernandoagrelafotografia.com.br` (limite custom 5.000 fotos, Asaas sandbox conectado)

## Estrutura principal
- `app/(dashboard)/entrega/` — listagem (`page.tsx`), `nova/`, `[id]/page.tsx` (detalhe), `[id]/editar/`
- `app/acesso/entrega/[id]/page.tsx` — galeria pública do cliente (state machine: carregando|nao_encontrada|identificacao|capa|galeria|expirada|suspensa)
- `app/api/` — `asaas/config`, `entrega/[id]/renovar(+/verificar)`, `entrega/[id]/download`, `doacao(+/sugerida)`, `webmaster/asaas`, `email/*`
- `lib/asaas.ts` (API Asaas v3 + cripto AES-256-GCM com `ASAAS_ENC_SECRET`), `lib/supabase/admin.ts` (service role — **sempre `.trim()` nas envs**, pipe do PowerShell já corrompeu valores 2x), `lib/moeda.ts`, `lib/planos.ts` (`limiteEfetivo` respeita `fotografos.limite_fotos_custom`), `lib/hooks/useUnsavedGuard.ts`
- Tabelas extras: `pagamentos`, `webmaster_config`, `contato_categorias`, `contatos`, `galeria_acessos`

## Colunas relevantes de `galerias_entrega`
`expires_at, renewal_fee, renovacao_dias (default 30), suspensa, rascunho, apenas_zip, identificacao_obrigatoria, drive_apenas_identificado, ordenacao_fotos ('envio'|'nome'|'data', default UI 'nome')`

## Funcionalidades implementadas (todas deployadas)
1. Entrega: data encerramento destacada (detalhe/listagem/pública), dedup de acessos com badge "Nx", botão "Salvar emails em lista" → tabelas de contatos + página `/contatos` no menu
2. Pagamentos Asaas: fotógrafo conecta a própria conta (Config → Pagamentos), cliente paga renovação na tela expirada/suspensa (form nome/email → invoiceUrl → "Já paguei" verifica e estende `expires_at` + `suspensa=false`); doação ao desenvolvedor (conta Asaas do webmaster OU Pix manual em `webmaster_config`), modal pós-venda no dashboard
3. Formulários: sem rascunho automático; `useUnsavedGuard` intercepta saída (links internos + beforeunload) com modal Salvar rascunho/Descartar/Continuar; **entrega/nova usa fila local de fotos enviada só ao publicar** (processo igual à seleção, overlay de progresso); galeria pública usa grid justificado com proporção original das fotos
4. Webmaster: aprovação, config Asaas/doação, coluna "Recursos" com checkboxes por fotógrafo (jsonb `fotografos.recursos`, RPC `webmaster_set_recursos`); Sidebar oculta menus desativados
5. Fase beta: landing/planos sem preços nem depoimentos
6. Drive: botão "Baixar todas" sempre visível; se `drive_apenas_identificado` e visitante anônimo → modal nome/email antes; cliente vinculado passa direto

## Armadilhas conhecidas (causaram retrabalho)
- **Cache do navegador/bundle antigo**: muitos "bugs reportados" eram abas antigas. Sempre Ctrl+F5 após deploy
- **Envs na Vercel via pipe do PowerShell ganham `\n`** → usar `node -e "process.stdout.write(...)"` ou confiar nos `.trim()` já no código
- Componentes definidos dentro de componentes remontam a cada render (perdeu foco de input — já corrigido em BlocoRenovacao)
- `vercel logs <url>` para depurar APIs em produção

## Pendências guardadas
- Endurecer RPCs `webmaster_aprovar`/`webmaster_set_recursos` (SECURITY DEFINER sem validar chamador)
- `album/nova` ainda usa lazy-draft (ensureSelecaoId); entrega/nova não usa mais
- Testes ponta a ponta do fluxo de pagamento sandbox ainda não confirmados pelo usuário
- Plano detalhado e histórico: `C:\Users\ferna\.claude\plans\expressive-watching-teacup.md`

## Foco declarado do usuário a partir de agora
Resolver os problemas da **galeria de entrega**.
