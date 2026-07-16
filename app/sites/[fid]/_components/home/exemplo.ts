// Conteúdo FICTÍCIO para a prévia do editor de Aparência. Usado por bloco quando o
// fotógrafo ainda não tem aquele conteúdo — assim TODOS os blocos têm prévia (imagens
// viram gradientes via placeholder). Nunca é usado no site publicado.
import type { DadosHome } from "./tipos";
import type { SiteBanner, SiteDepoimento, SitePost, SiteSelo, SiteTrabalho, SiteVideo } from "@/lib/supabase/types";

const trab = (id: string, titulo: string, local: string): SiteTrabalho =>
  ({ id, titulo, categoria: "casamentos", local, capa_url: null, slug: "exemplo", legacy_id: null, views: 0, likes: 0 } as unknown as SiteTrabalho);

const video = (id: string, titulo: string): SiteVideo =>
  ({ id, titulo, video_url: "", descricao: null } as unknown as SiteVideo);

const post = (id: string, titulo: string, resumo: string): SitePost =>
  ({ id, titulo, resumo, capa_url: null, slug: "exemplo", legacy_id: null } as unknown as SitePost);

const depo = (id: string, nome: string, texto: string): SiteDepoimento =>
  ({ id, nome, texto, foto_url: null } as unknown as SiteDepoimento);

const banner = (id: string): SiteBanner =>
  ({ id, imagem_url: "", titulo: null, link: null } as unknown as SiteBanner);

const selo = (id: string, titulo: string): SiteSelo =>
  ({ id, titulo, logo_url: "", link: null } as unknown as SiteSelo);

export const DADOS_EXEMPLO: DadosHome = {
  banners: [banner("ex-b1"), banner("ex-b2"), banner("ex-b3")],
  trabalhos: [
    trab("ex-t1", "Bianca e Vinícius", "Espaço 22 · Ourinhos"),
    trab("ex-t2", "Maria e Diego", "Estação Baguette"),
    trab("ex-t3", "Mariana e Jefferson", "Espaço Montjuïc"),
    trab("ex-t4", "Ana e Gabriel", "Chalé Arco-Íris"),
    trab("ex-t5", "Carol e Mateus", "Águas de Sta. Bárbara"),
    trab("ex-t6", "Isabela e Rafael", "Morro do Gavião"),
  ],
  videos: [
    video("ex-v1", "Bianca e Vinícius — Trailer"),
    video("ex-v2", "Maria e Diego — Same Day Edit"),
    video("ex-v3", "Mariana e Jefferson — Filme"),
  ],
  posts: [
    post("ex-p1", "Como escolher o local do seu casamento", "Dicas para encontrar o cenário perfeito para o grande dia, do rústico ao clássico."),
    post("ex-p2", "5 momentos que todo casal deve registrar", "Do primeiro olhar à última dança — os instantes que contam a sua história."),
    post("ex-p3", "Ensaio pré-wedding: por que fazer", "Um ensaio antes do casamento aproxima o casal das lentes e rende fotos incríveis."),
  ],
  depoimentos: [
    depo("ex-d1", "Juliana Prado", "Fotos maravilhosas e um olhar sensível para cada detalhe. Superou todas as nossas expectativas!"),
    depo("ex-d2", "Rafael Monteiro", "Profissionalismo do início ao fim. As imagens do nosso casamento ficaram simplesmente perfeitas."),
    depo("ex-d3", "Camila e Bruno", "Reviver o nosso dia através dessas fotos é emocionante. Recomendamos de olhos fechados."),
  ],
  selos: [
    selo("ex-s1", "ABF"),
    selo("ex-s2", "WPJA"),
    selo("ex-s3", "Fearless"),
    selo("ex-s4", "AG|WPJA"),
    selo("ex-s5", "Inspire"),
  ],
};
