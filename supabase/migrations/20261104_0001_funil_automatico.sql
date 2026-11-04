-- Fase B do funil da galeria expirada: régua automática (cron diário), bloco de Tarefas e histórico de contatos.
-- Só adiciona colunas/tabela e copia o histórico que já existe; nada é apagado.

-- 1. Novas etapas e datas da régua
alter table public.respostas_campanha
  add column if not exists whatsapp_2_em     timestamptz,
  add column if not exists exclusao_feita_em timestamptz,
  add column if not exists pausado_em        timestamptz,
  add column if not exists pausa_motivo      text;

alter table public.respostas_campanha drop constraint if exists respostas_campanha_estagio_check;
alter table public.respostas_campanha add constraint respostas_campanha_estagio_check
  check (estagio = any (array['nao_contatado','email_1','email_2','whatsapp','whatsapp_2','excluido','encerrado','sem_retorno']));

-- 2. Envio automático vale só para galerias que entram no funil depois de ligado (não dispara em massa
--    para quem já estava no funil).
alter table public.entrega_regras
  add column if not exists funil_email_auto_desde timestamptz;

-- 3. Histórico de contatos de cada galeria
create table if not exists public.entrega_contatos (
  id           uuid primary key default gen_random_uuid(),
  fotografo_id uuid not null references public.fotografos(id),
  galeria_id   uuid not null references public.galerias_entrega(id) on delete cascade,
  etapa        text not null check (etapa in ('email_1','email_2','whatsapp_1','whatsapp_2','exclusao','resposta','pausa','retomada')),
  canal        text not null check (canal in ('email','whatsapp','sistema')),
  modo         text not null default 'manual' check (modo in ('auto','manual')),
  direcao      text not null default 'enviado' check (direcao in ('enviado','recebido')),
  resend_id    text,
  detalhe      text,
  criado_em    timestamptz not null default now()
);
create index if not exists entrega_contatos_galeria_idx on public.entrega_contatos (galeria_id, criado_em desc);
create index if not exists entrega_contatos_fotografo_idx on public.entrega_contatos (fotografo_id);

grant all on public.entrega_contatos to anon, authenticated, service_role;

-- 4. Copia para o histórico os contatos que já foram feitos (datas que já estão no funil)
insert into public.entrega_contatos (fotografo_id, galeria_id, etapa, canal, modo, criado_em)
select r.fotografo_id, r.galeria_id, x.etapa, x.canal, 'manual', x.quando
from public.respostas_campanha r
cross join lateral (values
  ('email_1',    'email',    r.email_1_em),
  ('email_2',    'email',    r.email_2_em),
  ('whatsapp_1', 'whatsapp', r.whatsapp_em)
) as x(etapa, canal, quando)
where x.quando is not null
  and not exists (select 1 from public.entrega_contatos c where c.galeria_id = r.galeria_id and c.etapa = x.etapa);
