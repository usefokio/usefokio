// Card de trabalho do tema Editorial — usado na home e nas listagens do portfólio.
import Link from "next/link";
import { CATEGORIA_LABEL } from "@/lib/site/publico";
import type { SiteTrabalho } from "@/lib/supabase/types";

export function CardTrabalho({ t, href }: { t: SiteTrabalho; href: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none", color: "var(--site-texto)" }}>
      <div style={{ position: "relative", overflow: "hidden", background: "var(--site-superficie)", aspectRatio: "4/3" }}>
        {t.capa_url && <img src={t.capa_url} alt={t.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", gap: 14, padding: "20px 12px 8px", fontSize: 12, fontWeight: 600, color: "#fff", background: "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0))" }}>
          <span>👁 {(t.views ?? 0).toLocaleString("pt-BR")}</span>
          <span>♥ {(t.likes ?? 0).toLocaleString("pt-BR")}</span>
        </div>
      </div>
      <div style={{ padding: "16px 8px 0", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--site-fonte-titulo), Georgia, serif", fontSize: 20, color: "var(--site-titulo)", lineHeight: 1.25, textTransform: "uppercase", letterSpacing: "0.03em" }}>{t.titulo}</div>
        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--site-suave)", marginTop: 8 }}>{CATEGORIA_LABEL[t.categoria] ?? t.categoria}</div>
        {t.local && <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--site-suave)", marginTop: 3 }}>{t.local}</div>}
      </div>
    </Link>
  );
}
