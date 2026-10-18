-- Escolhas do cliente (seleção) passam a guardar o NOME do arquivo e sobrevivem à exclusão das fotos.
-- Antes: escolha só tinha foto_id com ON DELETE CASCADE — apagar as fotos (ex.: para liberar espaço depois de
-- encerrar) apagava a lista de selecionadas junto.
alter table public.galerias_selecao_escolhas add column if not exists nome_arquivo text;

update public.galerias_selecao_escolhas e
   set nome_arquivo = f.nome_arquivo
  from public.galerias_selecao_fotos f
 where f.id = e.foto_id and e.nome_arquivo is null;

alter table public.galerias_selecao_escolhas alter column foto_id drop not null;
alter table public.galerias_selecao_escolhas drop constraint if exists galerias_selecao_escolhas_foto_id_fkey;
alter table public.galerias_selecao_escolhas add constraint galerias_selecao_escolhas_foto_id_fkey
  foreign key (foto_id) references public.galerias_selecao_fotos(id) on delete set null;

-- Toda escolha nova grava o nome do arquivo (as funções do cliente não precisam mudar).
create or replace function public.escolha_preenche_nome_arquivo()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if new.nome_arquivo is null and new.foto_id is not null then
    select f.nome_arquivo into new.nome_arquivo from public.galerias_selecao_fotos f where f.id = new.foto_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_escolha_preenche_nome on public.galerias_selecao_escolhas;
create trigger trg_escolha_preenche_nome
  before insert or update of foto_id on public.galerias_selecao_escolhas
  for each row execute function public.escolha_preenche_nome_arquivo();

-- Restaura a seleção perdida de "Pré-wedding Kethelyn e Felipe" (fotos apagadas em 18/10/2026), reconstituída
-- do andamento: último "Selecionou/Desmarcou" de cada arquivo até o envio = 62 fotos (bate com o evento
-- "Seleção finalizada com 62 fotos"). Comentários do cliente não estavam no andamento e não voltam.
insert into public.galerias_selecao_escolhas (galeria_id, foto_id, nome_arquivo, created_at)
select 'c4261044-ca26-4992-8c52-ec775644aa2f'::uuid, null, ev.arquivo,
       (select selecao_enviada_em from public.galerias_selecao where id = 'c4261044-ca26-4992-8c52-ec775644aa2f')
from (
  select regexp_replace(descricao, '^(Selecionou|Desmarcou) ', '') as arquivo, tipo,
         row_number() over (partition by regexp_replace(descricao, '^(Selecionou|Desmarcou) ', '') order by created_at desc, id desc) as rn
  from public.galeria_selecao_eventos
  where galeria_id = 'c4261044-ca26-4992-8c52-ec775644aa2f'
    and tipo in ('foto_selecionada', 'foto_desmarcada')
    and created_at <= (select max(created_at) from public.galeria_selecao_eventos
                       where galeria_id = 'c4261044-ca26-4992-8c52-ec775644aa2f' and tipo = 'selecao_enviada')
) ev
where ev.rn = 1 and ev.tipo = 'foto_selecionada'
  and exists (select 1 from public.galerias_selecao where id = 'c4261044-ca26-4992-8c52-ec775644aa2f')
  and not exists (select 1 from public.galerias_selecao_escolhas where galeria_id = 'c4261044-ca26-4992-8c52-ec775644aa2f');
