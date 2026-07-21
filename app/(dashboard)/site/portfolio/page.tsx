"use client";

// Portfólio = best-of por área de atuação (páginas de galeria que o fotógrafo cria e enche com as
// fotos que quiser). Público em /colecoes. Separado das Galerias (Trabalhos) em 2026-07-20.
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { useFotografo } from "@/lib/context/FotografoContext";
import { nomeCategoria, resolverCategoria } from "@/lib/site/categorias";
import { CategoriaCombobox } from "@/app/(dashboard)/site/_components/CategoriaCombobox";
import { auditarColecao, resumo } from "@/lib/site/seoAudit";
import { CardGaleria, GRID } from "@/app/(dashboard)/site/galerias/_components/CardGaleria";
import type { SitePortfolio, SiteCategoria } from "@/lib/supabase/types";

function slugify(v: string): string {
  return v.normalize("NFD").replace(/[^\x20-\x7E]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

const inputCtrl: React.CSSProperties = {
  padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", fontSize: 13,
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};

export default function PortfolioPage() {
  const router = useRouter();
  const { fotografo } = useFotografo();
  const [portfolios, setPortfolios] = useState<SitePortfolio[]>([]);
  const [cats, setCats] = useState<SiteCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [criarPortAberto, setCriarPortAberto] = useState(false);
  const [novoPortTitulo, setNovoPortTitulo] = useState("");
  const [novoPortCat, setNovoPortCat] = useState("");
  const [criandoPort, setCriandoPort] = useState(false);
  const [msgPort, setMsgPort] = useState<string | null>(null);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    async function carregar() {
      const [ports, { data: categorias }] = await Promise.all([
        fetchAllRows<SitePortfolio>(
          (sb, from, to) => sb.from("site_portfolios").select("*").eq("fotografo_id", fotografo!.id).order("ordem").range(from, to),
          supabase,
        ),
        supabase.from("site_categorias").select("*").eq("fotografo_id", fotografo!.id).order("ordem"),
      ]);
      setPortfolios(ports ?? []);
      setCats((categorias as SiteCategoria[]) ?? []);
      setLoading(false);
    }
    carregar();
  }, [fotografo]);

  // Mapa slug→nome das categorias da conta (nome de exibição vem daqui; fallback amigável no helper).
  const catMap = useMemo(() => Object.fromEntries(cats.map((c) => [c.slug, c.nome])), [cats]);

  // Cria um portfólio DIRETO: nome + categoria (área de atuação) e já vai pro editor subir as fotos.
  // Gera um slug único (a URL /colecoes/{slug} é fixa). A `categoria` vem do combobox (registrada em
  // site_categorias, como no trabalho); sem categoria, cai no slug do título.
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
    router.push(`/site/portfolio/${data.id}`);
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Portfólio</h1>
        <button
          onClick={() => { setCriarPortAberto(true); setMsgPort(null); }}
          style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          + Novo portfólio
        </button>
      </div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 20px", lineHeight: 1.6 }}>
        <strong>Portfólio</strong> são páginas de galeria best-of por área de atuação, que você cria e enche com as fotos que quiser.
        Ficam no site em <code>/colecoes</code>. A cobertura de cada evento fica em <strong>Galerias</strong>.
      </p>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
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
                  onClick={() => router.push(`/site/portfolio/${p.id}`)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
