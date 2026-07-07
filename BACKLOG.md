# BACKLOG — UseFokio

> Estado vivo do trabalho. **Sobrevive à compactação** (o hook SessionStart reinjeta este arquivo no
> início de cada sessão). Manter curto e atual: ao terminar um lote, atualizar as seções abaixo.
> Última atualização: 2026-07-06.

## Fluxo (relembrar)
- Desenvolver **local no dev** (`lcpoufencuaawpztmclb`), em **branch**; testar; **deploy só quando o
  Fernando pedir** (merge na `master`). Nunca push/merge na master por conta própria.
- Ele é o único testador. Nunca dizer "corrigido"; entregar checklist + status.

## Em aberto (próximos passos)
- [ ] **Testar a branch `fix/limite-1000`** (20 queries → `fetchAllRows`, `tsc` limpo) e, quando aprovar,
      pedir o deploy (merge em `master`). Telas a conferir: dashboard, CRM (home/contas/fluxo/recebimentos),
      financeiro do webmaster, download-zip de galeria grande.
- [ ] **INCERTOS do limite-1000 (7, não alterados)**: drill-downs de fluxo/panorama, aniversários da agenda,
      escolhas da seleção, lista de álbuns, comentários de álbum — decidir caso a caso se vale paginar.

## Melhorias do setup — CONCLUÍDO (itens 1–14 de `M:/CLAUDE/melhorias-claude.md`)
Todos executados. Sobra só o que depende de você (abaixo).

## Ações que dependem do Fernando (dashboards — não consigo fazer)
- [ ] **Rotacionar chaves que passaram pelo chat**: Resend, Asaas, Cloudflare (a service_role do Supabase
      já foi rotacionada). Salvar as novas em env da Vercel, nunca colar no chat.
- [ ] **Supabase → Auth**: ativar proteção de senha vazada (leaked-password) — recurso de plano pago.
- [ ] **Vercel**: excluir o projeto duplicado `usefokio-ll4r` (deploys iam pra ele por engano).

## Feito recentemente (para contexto)
- Ambiente de dev local + deploy em lote por branch (documentado no CLAUDE.md).
- Fix DRE "por código" (totais corretos), fix build de preview, fix upload de entrega (não duplica + retry).
- Hooks do Claude Code: gate de `tsc` no push, guard de SQL destrutivo em prod, lembrete pós-push;
  CLAUDE.md global. Ver memória `project_setup_hooks`.
