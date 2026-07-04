-- Sincroniza o schema do DEV com a PRODUÇÃO (2026-07-04).
-- Cria as tabelas que faltavam no dev + a view fotografos_nomes, e adiciona as
-- colunas em drift nas tabelas compartilhadas.
--
-- IMPORTANTE: o DEV é permissivo (RLS off + grants anon) para o fluxo no-auth
-- com o mock fotografo. Esta migration NÃO reproduz os REVOKEs/hardening de
-- produção (que quebrariam o dev sem sessão de auth). Aplicar SÓ no dev.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Tabelas faltantes (ordem respeita as FKs)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sistema_config (
  chave text PRIMARY KEY,
  valor text NOT NULL
);

CREATE TABLE IF NOT EXISTS planos_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  preco numeric NOT NULL DEFAULT 0,
  limite_fotos integer,
  duracao_dias integer,
  ativo boolean NOT NULL DEFAULT true,
  eh_campanha boolean NOT NULL DEFAULT false,
  valido_ate date,
  cor text DEFAULT '#2563EB',
  features jsonb DEFAULT '[]'::jsonb,
  ordem integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  preco_anual numeric(10,2),
  limite_galerias integer,
  forma_pagamento text DEFAULT 'pix'
);

CREATE TABLE IF NOT EXISTS assinaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fotografo_id uuid NOT NULL REFERENCES fotografos(id) ON DELETE CASCADE,
  plano text NOT NULL,
  valor numeric NOT NULL,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  asaas_id text,
  status text NOT NULL DEFAULT 'pendente',
  pago_em timestamptz,
  created_at timestamptz DEFAULT now(),
  plano_config_id uuid REFERENCES planos_config(id),
  preco_cobrado numeric
);

CREATE TABLE IF NOT EXISTS tutoriais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  url_youtube text NOT NULL,
  descricao text,
  ordem integer DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  categoria text NOT NULL DEFAULT 'usefokio'
);

CREATE TABLE IF NOT EXISTS arquivos_download (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  arquivo_url text NOT NULL,
  arquivo_nome text,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS apps_recomendados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  logo_url text,
  link text NOT NULL,
  categoria text,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fotografo_id uuid NOT NULL,
  code_hash text NOT NULL,
  action text NOT NULL,
  payload jsonb NOT NULL,
  tentativas integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webmaster_email_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webmaster_email_list_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES webmaster_email_lists(id) ON DELETE CASCADE,
  fotografo_id uuid NOT NULL REFERENCES fotografos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (list_id, fotografo_id)
);

CREATE TABLE IF NOT EXISTS webmaster_email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid REFERENCES webmaster_email_lists(id) ON DELETE SET NULL,
  list_nome text,
  assunto text NOT NULL,
  corpo text NOT NULL,
  total_destinatarios integer,
  total_enviados integer,
  total_falhas integer NOT NULL DEFAULT 0,
  falhas jsonb,
  enviado_em timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW fotografos_nomes AS
  SELECT id, nome_completo, nome_empresa FROM fotografos;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Colunas em drift (tabelas compartilhadas)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE crm_contas_bancarias  ADD COLUMN IF NOT EXISTS principal boolean NOT NULL DEFAULT false;

ALTER TABLE crm_contracts          ADD COLUMN IF NOT EXISTS arquivo_path text;
ALTER TABLE crm_contracts          ADD COLUMN IF NOT EXISTS arquivo_url  text;
ALTER TABLE crm_contracts          ADD COLUMN IF NOT EXISTS arquivo_nome text;

ALTER TABLE crm_financial_entries  ADD COLUMN IF NOT EXISTS recibo_grupo_id uuid;

ALTER TABLE crm_orders             ADD COLUMN IF NOT EXISTS crm_nativo boolean NOT NULL DEFAULT false;

ALTER TABLE crm_schedules          ADD COLUMN IF NOT EXISTS lembrete_1d_enviado  boolean DEFAULT false;
ALTER TABLE crm_schedules          ADD COLUMN IF NOT EXISTS lembrete_dia_enviado boolean DEFAULT false;

ALTER TABLE galerias_entrega       ADD COLUMN IF NOT EXISTS drive_processado       boolean DEFAULT false;
ALTER TABLE galerias_entrega       ADD COLUMN IF NOT EXISTS drive_processado_em    timestamptz;
ALTER TABLE galerias_entrega       ADD COLUMN IF NOT EXISTS foto_capa_storage_path text;

ALTER TABLE pagamentos             ADD COLUMN IF NOT EXISTS gateway text DEFAULT 'asaas';

-- fotografos: colunas de gateways, SMTP, watermark, plano e onboarding
ALTER TABLE fotografos ADD COLUMN IF NOT EXISTS smtp_host text;
ALTER TABLE fotografos ADD COLUMN IF NOT EXISTS smtp_port integer DEFAULT 587;
ALTER TABLE fotografos ADD COLUMN IF NOT EXISTS smtp_user text;
ALTER TABLE fotografos ADD COLUMN IF NOT EXISTS smtp_pass_enc text;
ALTER TABLE fotografos ADD COLUMN IF NOT EXISTS smtp_from text;
ALTER TABLE fotografos ADD COLUMN IF NOT EXISTS smtp_ativo boolean DEFAULT false;
ALTER TABLE fotografos ADD COLUMN IF NOT EXISTS mp_api_key_enc text;
ALTER TABLE fotografos ADD COLUMN IF NOT EXISTS mp_ativo boolean DEFAULT false;
ALTER TABLE fotografos ADD COLUMN IF NOT EXISTS abacate_api_key_enc text;
ALTER TABLE fotografos ADD COLUMN IF NOT EXISTS abacate_ativo boolean DEFAULT false;
ALTER TABLE fotografos ADD COLUMN IF NOT EXISTS pix_chave text;
ALTER TABLE fotografos ADD COLUMN IF NOT EXISTS pix_tipo text;
ALTER TABLE fotografos ADD COLUMN IF NOT EXISTS pix_ativo boolean DEFAULT false;
ALTER TABLE fotografos ADD COLUMN IF NOT EXISTS lembrete_agenda_dia boolean DEFAULT true;
ALTER TABLE fotografos ADD COLUMN IF NOT EXISTS lembrete_agenda_1d boolean DEFAULT true;
ALTER TABLE fotografos ADD COLUMN IF NOT EXISTS onboarding_concluido boolean DEFAULT false;
ALTER TABLE fotografos ADD COLUMN IF NOT EXISTS watermark_escala numeric DEFAULT 0.30;
ALTER TABLE fotografos ADD COLUMN IF NOT EXISTS watermark_opacidade numeric DEFAULT 0.55;
ALTER TABLE fotografos ADD COLUMN IF NOT EXISTS watermark_url_vertical text;
ALTER TABLE fotografos ADD COLUMN IF NOT EXISTS plano_expira_em timestamptz;
ALTER TABLE fotografos ADD COLUMN IF NOT EXISTS plano_ativado_em timestamptz;
ALTER TABLE fotografos ADD COLUMN IF NOT EXISTS asaas_cobranca_id text;
ALTER TABLE fotografos ADD COLUMN IF NOT EXISTS plano_periodo text;
ALTER TABLE fotografos ADD COLUMN IF NOT EXISTS notificado_webmaster boolean NOT NULL DEFAULT false;
ALTER TABLE fotografos ADD COLUMN IF NOT EXISTS plano_cortesia boolean NOT NULL DEFAULT false;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Grants para o modelo permissivo do DEV (RLS permanece off nas tabelas novas)
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON
  sistema_config, planos_config, assinaturas, tutoriais, arquivos_download,
  apps_recomendados, email_confirmations, webmaster_email_lists,
  webmaster_email_list_members, webmaster_email_campaigns
  TO anon, authenticated;

GRANT SELECT ON fotografos_nomes TO anon, authenticated;
