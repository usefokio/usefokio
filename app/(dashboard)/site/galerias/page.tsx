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

type SortKey = "legacy_id" | "titulo" | "categoria" | "views" | "likes";

const SORT_LABEL: Record<SortKey, string> = {
  legacy_id: "ID (URL)", titulo: "Título", categoria: "Categoria", views: "Visualizações", likes: "Curtidas",
};

const inputCtrl: React.CSSProperties = {
  padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", fontSize: 13,
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};

const GRID: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 16 };

function Badge({ pub }: { pub: boolean }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: pub ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.15)", color: pub ? "#059669" : "#B45309" }}>
      {pub ? "Publicado" : "Rascunho"}
    </span>
  );
}

// Card de galeria (Trabalho/Portfólio) com capa e rodapé opcional de views/curtidas sobre a imagem.
function CardGaleria({ capa, titulo, categoria, publicado, views, likes, onClick }: {
  capa: string | null; titulo: string; categoria: string; publicado: boolean;
  views?: number; likes?: number; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{ cursor: "pointer", borderRadius: 12, overflow: "hidden", border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", display: "flex", flexDirection: "column" }}
    >
      <div style={{ position: "relative", aspectRatio: "4 / 3", background: "var(--color-background-secondary)" }}>
        {capa ? (
          <img src={capa} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", color: "var(--color-text-secondary)", fontSize: 12 }}>Sem capa</div>
        )}
        {(views !== undefined || likes !== undefined) && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", gap: 14, padding: "16px 10px 6px", fontSize: 12, fontWeight: 600, color: "#fff", background: "linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0))" }}>
            <span>👁 {(views ?? 0).toLocaleString("pt-BR")}</span>
            <span>♥ {(likes ?? 0).toLocaleString("pt-BR")}</span>
          </div>
        )}
      </div>
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{titulo}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: "auto" }}>
          <span style={{ fontSize: 11, color: "var(--color-text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{categoria}</span>
          <Badge pub={publicado} />
        </div>
      </div>
    </div>
  );
}

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
      if (sortKey === "titulo" || sortKey === "categoria") return String(a[sortKey]).localeCompare(String(b[sortKey]), "pt-BR") * dir;
      return (Number(a[sortKey] ?? 0) - Number(b[sortKey] ?? 0)) * dir;
    });
  }, [trabalhos, catFiltro, busca, sortKey, sortAsc]);

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
      </p>

      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--color-border-tertiary)", marginBottom: 18 }}>
        {tabBtn("trabalhos", `Trabalhos (${trabalhos.length})`)}
        {tabBtn("portfolios", `Portfólios (${portfolios.length})`)}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : aba === "trabalhos" ? (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <input
              value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título…"
              style={{ ...inputCtrl, width: 220 }}
            />
            <select value={catFiltro} onChange={(e) => setCatFiltro(e.target.value)} style={inputCtrl}>
              <option value="todas">Todas as categorias ({trabalhos.length})</option>
              {categorias.map(([cat, qtd]) => (
                <option key={cat} value={cat}>{CATEGORIA_LABEL[cat] ?? cat} ({qtd})</option>
              ))}
            </select>
            <div style={{ display: "flex", gap: 4, marginLeft: "auto", alignItems: "center" }}>
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} style={inputCtrl} title="Ordenar por">
                {(["legacy_id", "titulo", "categoria", "views", "likes"] as SortKey[]).map((k) => (
                  <option key={k} value={k}>Ordenar: {SORT_LABEL[k]}</option>
                ))}
              </select>
              <button onClick={() => setSortAsc((v) => !v)} title={sortAsc ? "Crescente" : "Decrescente"}
                style={{ ...inputCtrl, cursor: "pointer", width: 34, textAlign: "center", padding: "8px 0" }}>
                {sortAsc ? "↑" : "↓"}
              </button>
            </div>
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)", width: "100%" }}>{trabalhosVisiveis.length} exibidos</span>
          </div>

          {trabalhosVisiveis.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)", border: "1px dashed var(--color-border-secondary)", borderRadius: 12 }}>Nenhum trabalho encontrado.</div>
          ) : (
            <div style={GRID}>
              {trabalhosVisiveis.map((t) => (
                <CardGaleria
                  key={t.id}
                  capa={t.capa_url}
                  titulo={t.titulo}
                  categoria={CATEGORIA_LABEL[t.categoria] ?? t.categoria}
                  publicado={t.publicado}
                  views={t.views}
                  likes={t.likes}
                  onClick={() => router.push(`/site/galerias/trabalho/${t.id}`)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        portfolios.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)", border: "1px dashed var(--color-border-secondary)", borderRadius: 12 }}>Nenhum portfólio ainda.</div>
        ) : (
          <div style={GRID}>
            {portfolios.map((p) => (
              <CardGaleria
                key={p.id}
                capa={p.capa_url}
                titulo={p.titulo}
                categoria={CATEGORIA_LABEL[p.categoria] ?? p.categoria}
                publicado={p.publicado}
                onClick={() => router.push(`/site/galerias/portfolio/${p.id}`)}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}
