alter table public.fotografos
  add column if not exists revelacao_extras_titulo text not null default 'Quer aproveitar e levar mais alguma coisa?',
  add column if not exists revelacao_extras_subtitulo text not null default 'Porta-retratos, quadros e álbuns para montar com estas fotos.';
