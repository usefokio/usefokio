-- ÁLBUM — RLS de PRODUÇÃO. ⚠️ Aplicar SOMENTE na prod (fhsoqlttxggjpgrupjse), com REVISÃO.
-- O dev roda sem RLS (padrão do projeto). Hoje as tabelas album_* estão SEM RLS também na prod
-- (verificar!) — ou seja, a chave anônima (pública) pode ler/alterar álbuns de QUALQUER fotógrafo.
-- Este script fecha isso. Modelo de segurança do álbum: o link (id uuid) é a "chave" — quem tem o
-- link do álbum publicado pode ver/comentar/aprovar. O DONO (autenticado) tem controle total.
--
-- ⚠️ PONTO A REVISAR ANTES DE APLICAR: a policy de UPDATE anônima em album_selecoes permite ao
-- cliente TROCAR O STATUS (enviar/aprovar), mas tecnicamente deixa alterar outras colunas da mesma
-- linha enquanto o álbum está 'ativa'. O ideal é trocar essa policy por uma FUNÇÃO RPC
-- security-definer que só altere `status` (album_enviar/album_aprovar). Deixado como está por
-- fidelidade ao fluxo atual; migrar para RPC numa próxima rodada de hardening.

ALTER TABLE public.fotografo_album_modelos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_selecoes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_laminas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_comentarios       ENABLE ROW LEVEL SECURITY;

-- ─── DONO (autenticado) — controle total dos próprios registros ───────────────────────────────
CREATE POLICY album_modelos_dono ON public.fotografo_album_modelos FOR ALL TO authenticated
  USING (fotografo_id = auth.uid()) WITH CHECK (fotografo_id = auth.uid());

CREATE POLICY album_selecoes_dono ON public.album_selecoes FOR ALL TO authenticated
  USING (fotografo_id = auth.uid()) WITH CHECK (fotografo_id = auth.uid());

CREATE POLICY album_laminas_dono ON public.album_laminas FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.album_selecoes s WHERE s.id = selecao_id AND s.fotografo_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.album_selecoes s WHERE s.id = selecao_id AND s.fotografo_id = auth.uid()));

CREATE POLICY album_comentarios_dono ON public.album_comentarios FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.album_selecoes s WHERE s.id = selecao_id AND s.fotografo_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.album_selecoes s WHERE s.id = selecao_id AND s.fotografo_id = auth.uid()));

-- ─── CLIENTE (anônimo) — só álbuns publicados; comenta/aprova enquanto o álbum permite ────────
-- Ler o álbum: apenas status visíveis (nunca rascunho/encerrada)
CREATE POLICY album_selecoes_publico_ler ON public.album_selecoes FOR SELECT TO anon
  USING (status IN ('ativa', 'aprovado', 'aguardando_revisao'));

-- Transição de status feita pelo cliente (Enviar / Aprovar): só a partir de 'ativa'
CREATE POLICY album_selecoes_publico_transicao ON public.album_selecoes FOR UPDATE TO anon
  USING (status = 'ativa')
  WITH CHECK (status IN ('ativa', 'aguardando_revisao', 'aprovado'));

-- Ver as lâminas dos álbuns visíveis
CREATE POLICY album_laminas_publico_ler ON public.album_laminas FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.album_selecoes s WHERE s.id = selecao_id
                 AND s.status IN ('ativa', 'aprovado', 'aguardando_revisao')));

-- Comentários: o cliente lê sempre (de álbum visível) e escreve/edita/apaga só enquanto 'ativa'
CREATE POLICY album_comentarios_publico_ler ON public.album_comentarios FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.album_selecoes s WHERE s.id = selecao_id
                 AND s.status IN ('ativa', 'aprovado', 'aguardando_revisao')));

CREATE POLICY album_comentarios_publico_inserir ON public.album_comentarios FOR INSERT TO anon
  WITH CHECK (EXISTS (SELECT 1 FROM public.album_selecoes s WHERE s.id = selecao_id AND s.status = 'ativa'));

CREATE POLICY album_comentarios_publico_editar ON public.album_comentarios FOR UPDATE TO anon
  USING (EXISTS (SELECT 1 FROM public.album_selecoes s WHERE s.id = selecao_id AND s.status = 'ativa'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.album_selecoes s WHERE s.id = selecao_id AND s.status = 'ativa'));

CREATE POLICY album_comentarios_publico_apagar ON public.album_comentarios FOR DELETE TO anon
  USING (EXISTS (SELECT 1 FROM public.album_selecoes s WHERE s.id = selecao_id AND s.status = 'ativa'));

-- ─── Senha e expiração ────────────────────────────────────────────────────────
-- A leitura pública real do álbum (título/lâminas) passa pela rota server-side
-- /api/album/acesso (service role), que valida STATUS + EXPIRAÇÃO + SENHA antes de
-- entregar as lâminas. As policies de SELECT anon acima existem só como defesa/compat;
-- por segurança, NÃO expor a coluna senha_acesso ao cliente anônimo:
REVOKE SELECT ON public.album_selecoes FROM anon;
GRANT  SELECT (id, fotografo_id, cliente_id, modelo_id, titulo, descricao, status, versao,
               expira_em, modelo_nome, modelo_largura_cm, modelo_altura_cm, created_at, updated_at)
  ON public.album_selecoes TO anon;
-- (senha_acesso fica de fora do GRANT → anon nunca lê a senha, mesmo com SELECT direto.)
