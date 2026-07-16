"use client";

// SAÚDE DO SEO — painel agregador: varre todo o conteúdo do site (config global, trabalhos,
// portfólios, posts e páginas), roda o motor de análise (lib/site/seoAudit) e mostra a nota
// geral + checklist do que falta configurar, com link direto pro editor de cada item.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { useFotografo } from "@/lib/context/FotografoContext";
import { SeoDicas, SeoNota, SeoStatusSelo } from "@/app/(dashboard)/site/_components/SeoDica";
import { BotaoIA } from "@/app/(dashboard)/site/_components/BotaoIA";
import {
  auditarTrabalho, auditarColecao, auditarPost, auditarPagina, auditarSiteGlobal,
  pontuar, resumo, type Achado,
} from "@/lib/site/seoAudit";
import type { SiteTrabalho, SitePortfolio, SitePost, SitePagina, SiteConfig } from "@/lib/supabase/types";

type FotoLeve = { descricao: string | null; tags: string | null };
type ItemAnalise = {
  id: string;
  rotulo: string;         // ex.: "Casamento Ana e João"
  grupo: string;          // seção (Trabalhos, Portfólios…)
  link: string;           // editor do item
  achados: Achado[];
  nota: number;
};

const CARD: React.CSSProperties = {
  border: "1px solid var(--color-border-tertiary)", borderRadius: 12,
  background: "var(--color-background-primary)", padding: "16px 18px",
};

export default function SaudeSeoPage() {
  const { fotografo } = useFotografo();
  const [loading, setLoading] = useState(true);
  const [globais, setGlobais] = useState<Achado[]>([]);
  const [itens, setItens] = useState<ItemAnalise[]>([]);

  useEffect(() => {
    if (!fotografo) return;
    const sb = createClient();
    const fid = fotografo.id;
    (async () => {
      const [cfg, trabalhos, fotosTrab, portfolios, fotosPort, posts, paginas] = await Promise.all([
        sb.from("site_config").select("*").eq("fotografo_id", fid).maybeSingle().then((r) => r.data as SiteConfig | null),
        fetchAllRows<SiteTrabalho>((s, f, t) => s.from("site_trabalhos").select("*").eq("fotografo_id", fid).range(f, t), sb),
        fetchAllRows<{ trabalho_id: string } & FotoLeve>((s, f, t) => s.from("site_trabalho_fotos").select("trabalho_id, descricao, tags").range(f, t), sb),
        fetchAllRows<SitePortfolio>((s, f, t) => s.from("site_portfolios").select("*").eq("fotografo_id", fid).range(f, t), sb),
        fetchAllRows<{ portfolio_id: string } & FotoLeve>((s, f, t) => s.from("site_portfolio_fotos").select("portfolio_id, descricao, tags").range(f, t), sb),
        fetchAllRows<SitePost>((s, f, t) => s.from("site_posts").select("*").eq("fotografo_id", fid).range(f, t), sb),
        fetchAllRows<SitePagina>((s, f, t) => s.from("site_paginas").select("*").eq("fotografo_id", fid).range(f, t), sb),
      ]);

      setGlobais(auditarSiteGlobal({
        titulo_site: cfg?.titulo_site, seo_title: cfg?.seo_title, seo_description: cfg?.seo_description,
        seo_keywords: cfg?.seo_keywords, og_image_url: cfg?.og_image_url, analytics_head: cfg?.analytics_head,
        google_site_verification: cfg?.google_site_verification, facebook_pixel: cfg?.facebook_pixel,
        publicado: cfg?.publicado,
      }));

      const fotosPorTrab = new Map<string, FotoLeve[]>();
      for (const f of fotosTrab) { const l = fotosPorTrab.get(f.trabalho_id) ?? []; l.push(f); fotosPorTrab.set(f.trabalho_id, l); }
      const fotosPorPort = new Map<string, FotoLeve[]>();
      for (const f of fotosPort) { const l = fotosPorPort.get(f.portfolio_id) ?? []; l.push(f); fotosPorPort.set(f.portfolio_id, l); }

      const lista: ItemAnalise[] = [];
      for (const t of trabalhos.filter((x) => x.publicado)) {
        const a = auditarTrabalho(t, fotosPorTrab.get(t.id) ?? []);
        lista.push({ id: t.id, rotulo: t.titulo, grupo: "Trabalhos", link: `/site/galerias/trabalho/${t.id}`, achados: a, nota: pontuar(a) });
      }
      for (const p of portfolios.filter((x) => x.publicado)) {
        const a = auditarColecao(p, fotosPorPort.get(p.id) ?? []);
        lista.push({ id: p.id, rotulo: p.titulo, grupo: "Portfólios", link: `/site/galerias/portfolio/${p.id}`, achados: a, nota: pontuar(a) });
      }
      for (const p of posts.filter((x) => x.publicado)) {
        const a = auditarPost(p);
        lista.push({ id: p.id, rotulo: p.titulo, grupo: "Blog", link: `/site/blog/${p.id}`, achados: a, nota: pontuar(a) });
      }
      for (const p of paginas.filter((x) => x.publicado)) {
        const conteudo = (p.conteudo ?? {}) as { html?: string | null };
        const a = auditarPagina({ titulo: p.titulo, html: conteudo.html, seo_title: p.seo_title, seo_description: p.seo_description, seo_keywords: p.seo_keywords, seo_noindex: p.seo_noindex, og_image_url: p.og_image_url });
        lista.push({ id: p.id, rotulo: p.titulo, grupo: "Páginas", link: `/site/paginas?editar=${p.id}`, achados: a, nota: pontuar(a) });
      }
      setItens(lista);
      setLoading(false);
    })();
  }, [fotografo]);

  const { notaGeral, pendentes, okCount } = useMemo(() => {
    const notas = [pontuar(globais), ...itens.map((i) => i.nota)];
    const notaGeral = notas.length ? Math.round(notas.reduce((a, n) => a + n, 0) / notas.length) : 100;
    const pendentes = itens.filter((i) => resumo(i.achados).pendencias > 0 || i.achados.some((a) => a.nivel === "dica"));
    return { notaGeral, pendentes, okCount: itens.length - pendentes.length };
  }, [globais, itens]);

  const grupos = ["Trabalhos", "Portfólios", "Blog", "Páginas"];

  if (loading) return <div style={{ padding: 60, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Analisando o SEO do seu site…</div>;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Saúde do SEO</h1>
        <BotaoIA compacto contexto={{ tipo: "descricao", entidade: "site" }} />
      </div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 20px", lineHeight: 1.6 }}>
        Análise automática de todo o conteúdo publicado. Resolva primeiro os itens ⚠️ — são os que mais afetam o Google.
      </p>

      {/* Nota geral */}
      <div style={{ ...CARD, display: "flex", alignItems: "center", gap: 18, marginBottom: 16 }}>
        <SeoNota nota={notaGeral} tamanho={64} />
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--color-text-primary)", fontSize: 14 }}>Nota geral do site: {notaGeral}/100.</strong><br />
          {okCount} conteúdo{okCount !== 1 ? "s" : ""} em dia · {pendentes.length} com melhorias pendentes.
        </div>
      </div>

      {/* Global do site */}
      <div style={{ ...CARD, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--color-text-primary)" }}>Site (configuração geral)</div>
          <Link href="/site/seo" style={{ fontSize: 12, fontWeight: 700, color: "#2563EB", textDecoration: "none" }}>Corrigir em Site → SEO →</Link>
        </div>
        {globais.some((a) => a.nivel !== "ok")
          ? <SeoDicas achados={globais} />
          : <div style={{ fontSize: 12.5, color: "#059669", fontWeight: 600 }}>✓ Configuração geral em dia.</div>}
      </div>

      {/* Por conteúdo */}
      {grupos.map((g) => {
        const doGrupo = pendentes.filter((i) => i.grupo === g);
        if (doGrupo.length === 0) return null;
        return (
          <div key={g} style={{ ...CARD, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 10 }}>{g} — {doGrupo.length} com pendências</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {doGrupo.map((i) => {
                const r = resumo(i.achados);
                const naoOk = i.achados.filter((a) => a.nivel !== "ok");
                return (
                  <div key={i.id} style={{ border: "1px solid var(--color-border-tertiary)", borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <SeoStatusSelo pendencias={r.pendencias} pior={r.pior} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.rotulo}</span>
                      <Link href={i.link} style={{ fontSize: 12, fontWeight: 700, color: "#2563EB", textDecoration: "none", whiteSpace: "nowrap" }}>Corrigir →</Link>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 2 }}>
                      {naoOk.map((a) => (
                        <li key={a.id} style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                          <strong style={{ color: a.nivel === "erro" ? "#DC2626" : a.nivel === "aviso" ? "#B45309" : "#2563EB" }}>{a.titulo}</strong>
                          {a.comoResolver ? ` — ${a.comoResolver}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {pendentes.length === 0 && (
        <div style={{ ...CARD, textAlign: "center", fontSize: 13, color: "#059669", fontWeight: 600 }}>
          🎉 Todo o conteúdo publicado está com o SEO em dia!
        </div>
      )}
    </div>
  );
}
