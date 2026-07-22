// Grade de cards com capa das LISTAGENS públicas (/portfolio e /colecoes), dirigida
// por design.grades (Aparência): colunas, proporção da capa, posição e texto do título.
// Espelha o visual do BlocoTrabalhos da home (mesma linguagem de card do tema).
import Link from "next/link";
import { aspectAchatado, type GradeConfig } from "@/lib/site/design";
import { gradPlaceholder } from "./home/placeholder";

export type ItemGrade = {
  id: string;
  href: string;
  capa_url: string | null;
  titulo: string;
  subtitulo?: string | null;                        // linha menor (categoria) — some em "só título"
  subtitulo2?: string | null;                       // linha extra (local) — some em "só título"
  rodape?: { views: number; likes: number } | null; // faixa 👁/♥ sobreposta na capa
};

export function GradeCards({ itens, config }: { itens: ItemGrade[]; config: GradeConfig }) {
  const aspect = aspectAchatado(config.proporcao, config.achatamento);
  const comSub = config.texto_card === "titulo_subtitulo";
  const pos = config.titulo_pos;

  const titulo = (item: ItemGrade, sobre: boolean) => (
    <div style={sobre
      ? { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "#fff", background: "rgba(0,0,0,0.30)", padding: 14 }
      : { padding: "16px 8px 0", textAlign: "center" }}>
      <div style={{ fontFamily: "var(--site-fonte-titulo), Georgia, serif", fontSize: 20, color: sobre ? "#fff" : "var(--site-titulo)", lineHeight: 1.25, textTransform: "uppercase", letterSpacing: "0.03em" }}>{item.titulo}</div>
      {comSub && item.subtitulo && (
        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: sobre ? "rgba(255,255,255,0.85)" : "var(--site-suave)", marginTop: 8 }}>{item.subtitulo}</div>
      )}
      {comSub && !sobre && item.subtitulo2 && (
        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--site-suave)", marginTop: 3 }}>{item.subtitulo2}</div>
      )}
    </div>
  );

  return (
    <div className="site-grid-cards" style={{ display: "grid", gridTemplateColumns: `repeat(${config.colunas}, minmax(0, 1fr))`, gap: config.gap }}>
      {itens.map((item) => (
        <Link key={item.id} href={item.href} style={{ textDecoration: "none", color: "var(--site-texto)" }}>
          {pos === "acima" && titulo(item, false)}
          <div style={{ position: "relative", overflow: "hidden", background: item.capa_url ? "var(--site-superficie)" : gradPlaceholder(item.id), aspectRatio: aspect }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {item.capa_url && <img src={item.capa_url} alt={item.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />}
            {item.rodape && (
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", justifyContent: "center", gap: 30, padding: "48px 12px 16px", fontSize: 36, fontWeight: 700, color: "#fff", background: "linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0))" }}>
                <span>👁 {item.rodape.views.toLocaleString("pt-BR")}</span>
                <span>♥ {item.rodape.likes.toLocaleString("pt-BR")}</span>
              </div>
            )}
            {pos === "centro" && titulo(item, true)}
          </div>
          {pos === "abaixo" && titulo(item, false)}
        </Link>
      ))}
    </div>
  );
}
