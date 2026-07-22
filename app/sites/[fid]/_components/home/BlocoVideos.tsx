// Bloco "Vídeos" da home — grade de miniaturas do YouTube (player em lightbox), reusando
// o MESMO componente da página /videos. Configurável (colunas/proporção/título) como o de
// Trabalhos. Retorna null quando não há vídeos (não ocupa espaço na home vazia).
import type { GradeConfig, HomeBloco } from "@/lib/site/design";
import { VideosGrade } from "../VideosGrade";
import type { SiteVideo } from "@/lib/supabase/types";

export function BlocoVideos({ config, videos }: { config: HomeBloco; videos: SiteVideo[] }) {
  if (videos.length === 0) return null;
  const grade: GradeConfig = {
    colunas: config.colunas ?? 3,
    proporcao: config.proporcao ?? "horizontal_16x9",
    titulo_pos: config.titulo_pos ?? "abaixo",
    texto_card: config.texto_card ?? "so_titulo",
    // Bloco da home: gap/achatamento não são configuráveis aqui (só nas grades das listagens).
    // Mantém o visual atual da home; quem ajusta é Aparência → Vídeos.
    gap: 30,
    achatamento: 0,
  };
  return (
    <section style={{ maxWidth: "var(--site-largura)", margin: "0 auto", padding: "var(--site-espaco-blocos, 56px) 24px" }}>
      <h2 className="site-secao-titulo" style={{ fontSize: 30, textAlign: "center", margin: "0 0 44px" }}>{config.titulo_secao?.trim() || "Vídeos"}</h2>
      <VideosGrade config={grade} videos={videos.map((v) => ({ id: v.id, video_url: v.video_url, titulo: v.titulo, descricao: v.descricao }))} />
    </section>
  );
}
