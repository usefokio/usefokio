-- Vínculo entre o contato recebido pelo site e a oportunidade gerada a partir dele.
-- Sem isso o inbox não sabe quais contatos já foram aproveitados e o fotógrafo pode gerar duas
-- oportunidades do mesmo lead sem perceber.
-- on delete set null: se a oportunidade for excluída, o contato volta a ficar disponível para
-- gerar outra — nunca some junto.
alter table public.site_leads
  add column if not exists oportunidade_id uuid references public.crm_opportunities(id) on delete set null;
