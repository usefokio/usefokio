-- E-mail unificado na Empresa (Configurações › Empresa › Servidor de e-mail).
-- O CRM tinha um SMTP próprio em fotografos.crm_email_config, com a SENHA EM TEXTO ABERTO. Agora o CRM usa
-- o SMTP da empresa (fotografos.smtp_*, senha criptografada). Aqui só saem as chaves de SMTP/remetente do
-- JSON do CRM — a identidade do remetente (nome_remetente, email_resposta, assinatura) continua.
-- Seguro: na produção a única conta com SMTP no CRM tem o MESMO servidor/usuário já salvo na Empresa.
update public.fotografos
   set crm_email_config = crm_email_config - 'smtp_host' - 'smtp_port' - 'smtp_user' - 'smtp_pass' - 'smtp_secure' - 'email_from'
 where crm_email_config is not null;
