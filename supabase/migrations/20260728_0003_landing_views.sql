-- Contador simples de acessos por landing page (pedido do Fernando: "quantos acesso aquele lp
-- teve, pode ser um contato simples"). Sem identificação — conta toda visita, mesmo landing sem
-- gate. Independe de site_landing_acessos (que só registra quem se identificou).
alter table public.site_landing_pages
  add column if not exists views integer not null default 0;
