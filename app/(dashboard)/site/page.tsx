"use client";

import Link from "next/link";
import { useFotografo } from "@/lib/context/FotografoContext";

export default function SiteDashboardPage() {
  const { fotografo } = useFotografo();
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 6px", letterSpacing: "-0.02em" }}>Site — Painel</h1>
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "0 0 24px", lineHeight: 1.6 }}>
        Gerencie seu site profissional: galerias (trabalhos e portfólios), blog, páginas, depoimentos, SEO e domínio.
      </p>
      {fotografo && (
        <a
          href={`/_site/${fotografo.id}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "inline-block", padding: "11px 22px", borderRadius: 9, background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}
        >
          🌐 Visualizar meu site (prévia)
        </a>
      )}
      <div style={{ marginTop: 24, padding: "16px 18px", borderRadius: 12, border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
        A prévia usa o conteúdo importado do seu site atual (trabalhos, portfólios, blog, sobre, depoimentos, banners).
        O domínio próprio e o tema definitivo entram nas próximas etapas.
      </div>
    </div>
  );
}
