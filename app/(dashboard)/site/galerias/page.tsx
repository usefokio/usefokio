"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { useFotografo } from "@/lib/context/FotografoContext";
import { nomeCategoria, resolverCategoria } from "@/lib/site/categorias";
import { CategoriaCombobox } from "@/app/(dashboard)/site/_components/CategoriaCombobox";
import { SeoStatusSelo } from "@/app/(dashboard)/site/_components/SeoDica";
import { auditarTrabalho, auditarColecao, resumo, type NivelAchado } from "@/lib/site/seoAudit";
import type { SitePortfolio, SiteTrabalho, SiteCategoria } from "@/lib/supabase/types";

function slugify(v: string): string {
  return v.normalize("NFD").replace(/[^\x20-\x7E]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

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
function CardGaleria({ capa, titulo, categoria, publicado, views, likes, seo, onClick }: {
  capa: string | null; titulo: string; categoria: string; publicado: boolean;
  views?: number; likes?: number; seo?: { pendencias: number; pior: NivelAchado }; onClick: () => void;
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
          <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
            {seo && <SeoStatusSelo pendencias={seo.pendencias} pior={seo.pior} />}
            <Badge pub={publicado} />
          </span>
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
  const [cats, setCats] = useState<SiteCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [catFiltro, setCatFiltro] = useState<string>("todas");
  const [sortKey, setSortKey] = useState<SortKey>("legacy_id");
  const [sortAsc, setSortAsc] = useState(false);
  const [criarPortAberto, setCriarPortAberto] = useState(false);
  const [novoPortTitulo, setNovoPortTitulo] = useState("");
  const [novoPortCat, setNovoPortCat] = useState("");
  const [criandoPort, setCriandoPort] = useState(false);
  const [msgPort, setMsgPort] = useState<string | null>(null);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    async function carregar() {
      const [trab, ports, { data: categorias }] = await Promise.all([
        fetchAllRows<SiteTrabalho>(
          (sb, from, to) => sb.from("site_trabalhos").select("*").eq("fotografo_id", fotografo!.id).range(from, to),
          supabase,
        ),
        fetchAllRows<SitePortfolio>(
          (sb, from, to) => sb.from("site_portfolios").select("*").eq("fotografo_id", fotografo!.id).order("ordem").range(from, to),
          supabase,
        ),
        supabase.from("site_categorias").select("*").eq("fotografo_id", fotografo!.id).order("ordem"),
      ]);
      setTrabalhos(trab ?? []);
      setPortfolios(ports ?? []);
      setCats((categorias as SiteCategoria[]) ?? []);
      setLoading(false);
    }
    carregar();
  }, [fotografo]);

  // Mapa slug→nome das categorias da conta (nome de exibição vem daqui; fallback amigável no helper).
  const catMap = useMemo(() => Object.fromEntries(cats.map((c) => [c.slug, c.nome])), [cats]);

  // Cria um portfólio DIRETO: nome + categoria (área de atuação) e já vai pro editor subir as
  // fotos. Gera um slug único (a URL /colecoes/{slug} é fixa). A `categoria` vem do combobox
  // (registrada em site_categorias, como no trabalho); sem categoria, cai no slug do título —
  // comportamento antigo, ajustável depois no editor.
  async function criarPortfolio() {
    const titulo = novoPortTitulo.trim();
    if (!fotografo || !titulo || criandoPort) return;
    setCriandoPort(true); setMsgPort(null);
    const usados = new Set(portfolios.flatMap((p) => [p.categoria, p.slug].filter(Boolean) as string[]));
    const base = slugify(titulo) || "portfolio";
    let slug = base;
    for (let n = 2; usados.has(slug); n++) slug = `${base}-${n}`;
    const sb = createClient();
    let categoria = slug;
    if (novoPortCat.trim()) {
      const { slug: slugCat, existente } = resolverCategoria(novoPortCat, cats);
      if (slugCat && !existente) {
        const ordemCat = cats.length > 0 ? Math.max(...cats.map((c) => c.ordem)) + 1 : 0;
        const { data: nova } = await sb.from("site_categorias").insert({ fotografo_id: fotografo.id, slug: slugCat, nome: novoPortCat.trim(), ordem: ordemCat }).select("*").single();
        if (nova) setCats((prev) => [...prev, nova as SiteCategoria]);
      }
      if (slugCat) categoria = slugCat;
    }
    const ordem = portfolios.length > 0 ? Math.max(...portfolios.map((p) => p.ordem)) + 1 : 0;
    const { data, error } = await sb.from("site_portfolios")
      .insert({ fotografo_id: fotografo.id, categoria, titulo, slug, modo_exibicao: "grid", publicado: true, ordem })
      .select("id").single();
    setCriandoPort(false);
    if (error || !data) { setMsgPort(error?.code === "23505" ? "Já existe um portfólio com esse nome — troque o nome." : ("Erro ao criar: " + (error?.message ?? ""))); return; }
    router.push(`/site/galerias/portfolio/${data.id}`);
  }

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
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {aba === "trabalhos" ? (
            <>
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
            </>
          ) : (
            <button
              onClick={() => { setCriarPortAberto(true); setMsgPort(null); }}
              style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              + Novo portfólio
            </button>
          )}
        </div>
      </div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 20px", lineHeight: 1.6 }}>
        <strong>Trabalhos</strong> são os posts de cada evento. <strong>Portfólios</strong> são páginas de galeria (best-of) que você cria e enche com as fotos que quiser.
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
      ) : (
        <>
          {criarPortAberto && (
            <div style={{ marginBottom: 16, border: "1px solid var(--color-border-tertiary)", borderRadius: 12, padding: 16, background: "var(--color-background-secondary)" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>Novo portfólio</div>
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 10px", lineHeight: 1.5 }}>
                Dê um nome ao portfólio. Depois é só subir as fotos direto nele (ou, se quiser, puxar os destaques ⭐ dos trabalhos).
              </p>
              <input autoFocus value={novoPortTitulo} onChange={(e) => setNovoPortTitulo(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") criarPortfolio(); if (e.key === "Escape") setCriarPortAberto(false); }}
                placeholder="Ex.: Melhores casamentos 2026" style={{ ...inputCtrl, width: "100%", boxSizing: "border-box" }} />
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>Categoria (área de atuação)</div>
                <CategoriaCombobox valor={novoPortCat} onChange={setNovoPortCat} cats={cats} listaId="lista-categorias-novo-port"
                  placeholder="Ex.: Casamentos — liga a coleção aos trabalhos da área" style={{ ...inputCtrl, width: "100%", boxSizing: "border-box" }} />
              </div>
              {msgPort && <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 600, color: "#DC2626" }}>{msgPort}</div>}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                <button onClick={() => { setCriarPortAberto(false); setMsgPort(null); }}
                  style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12.5, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
                  Cancelar
                </button>
                <button onClick={() => criarPortfolio()} disabled={!novoPortTitulo.trim() || criandoPort}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 12.5, fontWeight: 700, cursor: (!novoPortTitulo.trim() || criandoPort) ? "default" : "pointer", opacity: (!novoPortTitulo.trim() || criandoPort) ? 0.6 : 1 }}>
                  {criandoPort ? "Criando…" : "Criar e adicionar fotos"}
                </button>
              </div>
            </div>
          )}

          {portfolios.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)", border: "1px dashed var(--color-border-secondary)", borderRadius: 12 }}>Nenhum portfólio ainda. Use “+ Novo portfólio”.</div>
          ) : (
            <div style={GRID}>
              {portfolios.map((p) => (
                <CardGaleria
                  key={p.id}
                  capa={p.capa_url}
                  titulo={p.titulo}
                  categoria={nomeCategoria(p.categoria, catMap)}
                  publicado={p.publicado}
                  seo={resumo(auditarColecao(p))}
                  onClick={() => router.push(`/site/galerias/portfolio/${p.id}`)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
