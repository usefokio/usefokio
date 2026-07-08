"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { SitePortfolio, SiteTrabalho } from "@/lib/supabase/types";

const CATEGORIA_LABEL: Record<string, string> = {
  "casamentos": "Casamentos",
  "pre-casamento": "Pré-wedding",
  "gestantes": "Gestantes",
  "aniversarios": "Aniversários Infantis",
  "familia": "Família",
  "still-gastronomia": "Still Gastronomia",
};

type SortKey = "titulo" | "categoria" | "legacy_id";

export default function GaleriasPage() {
  const router = useRouter();
  const { fotografo } = useFotografo();
  const [aba, setAba] = useState<"trabalhos" | "portfolios">("trabalhos");
  const [trabalhos, setTrabalhos] = useState<SiteTrabalho[]>([]);
  const [portfolios, setPortfolios] = useState<SitePortfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [catFiltro, setCatFiltro] = useState<string>("todas");
  const [sortKey, setSortKey] = useState<SortKey>("legacy_id");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    async function carregar() {
      const [trab, ports] = await Promise.all([
        fetchAllRows<SiteTrabalho>(
          (sb, from, to) => sb.from("site_trabalhos").select("*").eq("fotografo_id", fotografo!.id).range(from, to),
          supabase,
        ),
        fetchAllRows<SitePortfolio>(
          (sb, from, to) => sb.from("site_portfolios").select("*").eq("fotografo_id", fotografo!.id).order("ordem").range(from, to),
          supabase,
        ),
      ]);
      setTrabalhos(trab ?? []);
      setPortfolios(ports ?? []);
      setLoading(false);
    }
    carregar();
  }, [fotografo]);

  const categorias = useMemo(() => {
    const set = new Map<string, number>();
    for (const t of trabalhos) set.set(t.categoria, (set.get(t.categoria) ?? 0) + 1);
    return Array.from(set.entries()).sort((a, b) => b[1] - a[1]);
  }, [trabalhos]);

  const trabalhosVisiveis = useMemo(() => {
    let lista = trabalhos;
    if (catFiltro !== "todas") lista = lista.filter((t) => t.categoria === catFiltro);
    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      lista = lista.filter((t) => t.titulo.toLowerCase().includes(q) || t.slug.includes(q));
    }
    return [...lista].sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      if (sortKey === "legacy_id") return ((a.legacy_id ?? 0) - (b.legacy_id ?? 0)) * dir;
      return String(a[sortKey]).localeCompare(String(b[sortKey]), "pt-BR") * dir;
    });
  }, [trabalhos, catFiltro, busca, sortKey, sortAsc]);

  function th(label: string, key: SortKey) {
    const ativo = sortKey === key;
    return (
      <th
        onClick={() => { if (ativo) setSortAsc(!sortAsc); else { setSortKey(key); setSortAsc(true); } }}
        style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: ativo ? "var(--color-text-primary)" : "var(--color-text-secondary)", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
      >
        {label} {ativo ? (sortAsc ? "↑" : "↓") : ""}
      </th>
    );
  }

  const badge = (pub: boolean) => (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: pub ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.15)", color: pub ? "#059669" : "#B45309" }}>
      {pub ? "Publicado" : "Rascunho"}
    </span>
  );

  const tabBtn = (id: "trabalhos" | "portfolios", label: string) => {
    const ativo = aba === id;
    return (
      <button
        onClick={() => setAba(id)}
        style={{ padding: "8px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: ativo ? 700 : 500, color: ativo ? "var(--color-text-primary)" : "var(--color-text-secondary)", borderBottom: ativo ? "2px solid var(--color-text-primary)" : "2px solid transparent" }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Galerias</h1>
        <button
          onClick={() => router.push("/site/galerias/trabalho/novo")}
          style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          + Novo trabalho
        </button>
      </div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 20px", lineHeight: 1.6 }}>
        <strong>Trabalhos</strong> são os posts de cada evento. <strong>Portfólios</strong> são as páginas best-of por categoria.
        Conteúdo importado do site atual — fotos e descrições entram na próxima etapa.
      </p>

      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--color-border-tertiary)", marginBottom: 18 }}>
        {tabBtn("trabalhos", `Trabalhos (${trabalhos.length})`)}
        {tabBtn("portfolios", `Portfólios (${portfolios.length})`)}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : aba === "trabalhos" ? (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
            <input
              value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título…"
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", fontSize: 13, width: 260, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}
            />
            <select
              value={catFiltro} onChange={(e) => setCatFiltro(e.target.value)}
              style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", fontSize: 13, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}
            >
              <option value="todas">Todas as categorias ({trabalhos.length})</option>
              {categorias.map(([cat, qtd]) => (
                <option key={cat} value={cat}>{CATEGORIA_LABEL[cat] ?? cat} ({qtd})</option>
              ))}
            </select>
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{trabalhosVisiveis.length} exibidos</span>
          </div>

          <div style={{ border: "1px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "auto", background: "var(--color-background-primary)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border-tertiary)" }}>
                  {th("Título", "titulo")}
                  {th("Categoria", "categoria")}
                  {th("ID (URL)", "legacy_id")}
                  <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-secondary)" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {trabalhosVisiveis.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/site/galerias/trabalho/${t.id}`)}
                    style={{ borderBottom: "1px solid var(--color-border-tertiary)", cursor: "pointer" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-background-secondary)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <td style={{ padding: "9px 10px", color: "var(--color-text-primary)", fontWeight: 500 }}>{t.titulo}</td>
                    <td style={{ padding: "9px 10px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{CATEGORIA_LABEL[t.categoria] ?? t.categoria}</td>
                    <td style={{ padding: "9px 10px", color: "var(--color-text-secondary)", fontFamily: "monospace", fontSize: 12 }}>{t.legacy_id ?? "—"}</td>
                    <td style={{ padding: "9px 10px" }}>{badge(t.publicado)}</td>
                  </tr>
                ))}
                {trabalhosVisiveis.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: 24, textAlign: "center", color: "var(--color-text-secondary)" }}>Nenhum trabalho encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div style={{ border: "1px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "auto", background: "var(--color-background-primary)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border-tertiary)" }}>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-secondary)" }}>Título</th>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-secondary)" }}>Categoria</th>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-secondary)" }}>URL preservada</th>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-secondary)" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {portfolios.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--color-border-tertiary)" }}>
                  <td style={{ padding: "9px 10px", color: "var(--color-text-primary)", fontWeight: 500 }}>{p.titulo}</td>
                  <td style={{ padding: "9px 10px", color: "var(--color-text-secondary)" }}>{CATEGORIA_LABEL[p.categoria] ?? p.categoria}</td>
                  <td style={{ padding: "9px 10px", color: "var(--color-text-secondary)", fontFamily: "monospace", fontSize: 12 }}>
                    {p.legacy_id ? `/gallery.php?id=${p.legacy_id}` : "—"}
                  </td>
                  <td style={{ padding: "9px 10px" }}>{badge(p.publicado)}</td>
                </tr>
              ))}
              {portfolios.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 24, textAlign: "center", color: "var(--color-text-secondary)" }}>Nenhum portfólio ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
