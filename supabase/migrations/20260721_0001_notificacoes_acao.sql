-- Ação opcional na notificação (ex.: botão "Enviar ao funil" para galeria re-expirada).
-- acao_tipo: identificador da ação ('enviar_funil', ...); acao_ref: id do alvo (ex.: galeria_id).
alter table public.notificacoes
  add column if not exists acao_tipo text,
  add column if not exists acao_ref  uuid;
