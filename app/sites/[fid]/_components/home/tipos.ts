// Dados reais que os blocos da home consomem. As MESMAS estruturas são usadas
// tanto no site público (server) quanto na prévia ao vivo do editor de Aparência (client).
import type { SiteBanner, SiteDepoimento, SitePost, SiteTrabalho, SiteSelo } from "@/lib/supabase/types";

export type DadosHome = {
  banners: SiteBanner[];
  trabalhos: SiteTrabalho[];
  posts: SitePost[];
  depoimentos: SiteDepoimento[];
  selos: SiteSelo[];
};
