// Dados reais que os blocos da home consomem. As MESMAS estruturas são usadas
// tanto no site público (server) quanto na prévia ao vivo do editor de Aparência (client).
import type { SiteBanner, SiteDepoimento, SitePost, SiteTrabalho, SiteSelo, SiteVideo } from "@/lib/supabase/types";

export type DadosHome = {
  banners: SiteBanner[];
  trabalhos: SiteTrabalho[];
  destaques: SiteTrabalho[];   // trabalhos marcados como "destaque na home" (bloco próprio)
  videos: SiteVideo[];
  posts: SitePost[];
  depoimentos: SiteDepoimento[];
  selos: SiteSelo[];
  catMap?: Record<string, string>; // slug→nome das categorias da conta (rótulo do card)
};
