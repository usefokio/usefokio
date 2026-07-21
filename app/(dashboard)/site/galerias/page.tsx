"use client";

// Galerias = Trabalhos (cobertura de cada evento; cada trabalho vira uma página em /portfolio).
// O best-of por área de atuação foi separado para /site/portfolio.
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { useFotografo } from "@/lib/context/FotografoContext";
import { nomeCategoria } from "@/lib/site/categorias";
import { auditarTrabalho, resumo } from "@/lib/site/seoAudit";
import { CardGaleria, GRID } from "@/app/(dashboard)/site/galerias/_components/CardGaleria";
import type { SiteTrabalho, SiteCategoria } from "@/lib/supabase/types";

type SortKey = "legacy_id" | "titulo" | "categoria" | "views" | "likes";

const SORT_LABEL: Record<SortKey, string> = {
  legacy_id: "ID (URL)", titulo: "Título", categoria: "Categoria", views: "Visualizações", likes: "Curtidas",
};

const inputCtrl: React.CSSProperties = {
  padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", fontSize: 13,
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};

export default function GaleriasPage() {
  const router = useRouter();
  const { fotografo } = useFotografo();
  const [trabalhos, setTrabalhos] = useState<SiteTrabalho[]>([]);
  const [cats, setCats] = useState<SiteCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [catFiltro, setCatFiltro] = useState<string>("todas");
  const [sortKey, setSortKey] = useState<SortKey>("legacy_id");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    async function carregar() {
      const [trab, { data: categorias }] = await Promise.all([
        fetchAllRows<SiteTrabalho>(
          (sb, from, to) => sb.from("site_trabalhos").select("*").eq("fotografo_id", fotografo!.id).range(from, to),
          supabase,
        ),
        supabase.from("site_categorias").select("*").eq("fotografo_id", fotografo!.id).order("ordem"),
      ]);
      setTrabalhos(trab ?? []);
      setCats((categorias as SiteCategoria[]) ?? []);
      setLoading(false);
    }
    carregar();
  }, [fotografo]);

  // Mapa slug→nome das categorias da conta (nome de exibição vem daqui; fallback amigável no helper).
  const catMap = useMemo(() => Object.fromEntries(cats.map((c) => [c.slug, c.nome])), [cats]);

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

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Galerias</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => router.push("/site/galerias/categorias")}
            style={{ padding: "8px 14px", borderRadius: 9, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}
          >
            🏷️ Categorias
          </button>
          <button
            onClick={() => router.push("/site/galerias/trabalho/novo")}
            style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            + Novo trabalho
          </button>
        </div>
      </div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 20px", lineHeight: 1.6 }}>
        <strong>Trabalhos</strong> são os posts de cada evento (a cobertura). Cada trabalho vira uma página no site (em <code>/portfolio</code>).
        As páginas best-of por área de atuação ficam agora em <strong>Portfólio</strong>.
      </p>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : (
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
                <option key={cat} value={cat}>{nomeCategoria(cat, catMap)} ({qtd})</option>
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
                  categoria={nomeCategoria(t.categoria, catMap)}
                  publicado={t.publicado}
                  views={t.views}
                  likes={t.likes}
                  seo={resumo(auditarTrabalho(t))}
                  onClick={() => router.push(`/site/galerias/trabalho/${t.id}`)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
