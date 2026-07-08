// Helpers do site público do fotógrafo (Fase 1).
// As rotas vivem em /_site/[fid]/** — em produção serão servidas pelo domínio
// do fotógrafo via rewrite por host no proxy; em dev acessa-se direto pela URL.
import { createAdminClient } from "@/lib/supabase/admin";

export const CATEGORIA_LABEL: Record<string, string> = {
  "casamentos": "Casamentos",
  "pre-casamento": "Pré-wedding",
  "gestantes": "Gestantes",
  "aniversarios": "Aniversários Infantis",
  "familia": "Família",
  "still-gastronomia": "Still Gastronomia",
  "sem-categoria": "Outros",
};

export function base(fid: string) {
  return `/_site/${fid}`;
}

export async function carregarSite(fid: string) {
  const admin = createAdminClient();
  const [{ data: fotografo }, { data: config }, { data: menu }] = await Promise.all([
    admin.from("fotografos").select("id, nome_empresa, nome_completo, email, telefone, whatsapp, logo_url").eq("id", fid).maybeSingle(),
    admin.from("site_config").select("*").eq("fotografo_id", fid).maybeSingle(),
    admin.from("site_menu").select("*").eq("fotografo_id", fid).order("ordem"),
  ]);
  return { fotografo, config, menu: menu ?? [] };
}

// Extrai o legacy_id numérico do começo do slug da URL ("1668408-casamento-...")
export function legacyDoSlug(idSlug: string): number | null {
  const m = idSlug.match(/^(\d+)(?:-|$)/);
  return m ? parseInt(m[1], 10) : null;
}
