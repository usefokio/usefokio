"use client";

// EDITOR da landing page — identificação/SEO + EditorBlocos (componente compartilhado
// com a Aparência: arrastar para reordenar, paleta, edição por bloco).
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { useUnsavedGuard } from "@/lib/hooks/useUnsavedGuard";
import { dadosParaBlocos, type SiteBloco } from "@/lib/site/blocos";
import { EditorBlocos } from "@/app/(dashboard)/site/_components/EditorBlocos";
import { urlPublicaSite, type ConfigUrl } from "@/lib/site/urlPublica";
import { ConfigPaginaModal } from "@/app/(dashboard)/site/_components/ConfigPaginaModal";
import type { ConfigPaginaValores } from "@/lib/site/seo";
import type { SiteLandingPage, SiteLandingDados } from "@/lib/supabase/types";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 11px", borderRadius: 8, boxSizing: "border-box",
  border: "1px solid var(--color-border-secondary)", fontSize: 13,
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)",
  textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4,
};
const btnPeq: React.CSSProperties = {
  padding: "6px 11px", borderRadius: 8, border: "1px solid var(--color-border-secondary)",
  background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer",
};

function slugifyUrl(v: string) {
  return v.normalize("NFD").replace(/[^\x20-\x7E]/g, "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export default function EditorLandingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { fotografo } = useFotografo();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [dadosOriginais, setDadosOriginais] = useState<SiteLandingDados>({});
  const [baseline, setBaseline] = useState("");   // snapshot do estado salvo (detecção de "não salvo")
  const [saiu, setSaiu] = useState(false);         // desliga o guard após salvar+sair/excluir

  const [titulo, setTitulo] = useState("");
  const [slug, setSlug] = useState("");
  const [publicado, setPublicado] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [seoKw, setSeoKw] = useState("");
  const [seoNoindex, setSeoNoindex] = useState(true);   // landing nasce fora do Google (opt-in a indexar)
  const [ogTitle, setOgTitle] = useState("");
  const [ogDesc, setOgDesc] = useState("");
  const [ogImage, setOgImage] = useState<string | null>(null);
  const [configAberto, setConfigAberto] = useState(false);
  const [dominio, setDominio] = useState("seusite.usefokio.com.br");

  const [blocos, setBlocos] = useState<SiteBloco[]>([]);
  const [cfgSite, setCfgSite] = useState<ConfigUrl | null>(null);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    supabase.from("site_config").select("subdominio, dominio_customizado, publicado").eq("fotografo_id", fotografo.id).maybeSingle().then(({ data }) => {
      setCfgSite((data as ConfigUrl) ?? null);
      if (data) setDominio(data.dominio_customizado || (data.subdominio ? `${data.subdominio}.usefokio.com.br` : "seusite.usefokio.com.br"));
    });
    supabase.from("site_landing_pages").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (!data) { setMsg("Erro: landing não encontrada."); setCarregando(false); return; }
      const lp = data as SiteLandingPage;
      setTitulo(lp.titulo); setSlug(lp.slug); setPublicado(lp.publicado);
      setSeoTitle(lp.seo_title ?? ""); setSeoDesc(lp.seo_description ?? "");
      setSeoKw(lp.seo_keywords ?? ""); setSeoNoindex(lp.seo_noindex ?? true);
      setOgTitle(lp.og_title ?? ""); setOgDesc(lp.og_description ?? ""); setOgImage(lp.og_image_url);
      const d = (lp.dados ?? {}) as SiteLandingDados;
      setDadosOriginais(d);
      const bl = d.blocos && d.blocos.length > 0 ? d.blocos : dadosParaBlocos(d);
      setBlocos(bl);
      setBaseline(snapshot(lp.titulo, lp.slug, lp.publicado, snapSeo(lp.seo_title ?? "", lp.seo_description ?? "", lp.seo_keywords ?? "", lp.seo_noindex ?? true, lp.og_title ?? "", lp.og_description ?? "", lp.og_image_url), bl));
      setCarregando(false);
    });
  }, [id, fotografo]);

  // Snapshot do estado editável → string, para comparar e detectar alterações não salvas.
  function snapSeo(st: string, sd: string, kw: string, ni: boolean, ot: string, od: string, oi: string | null) {
    return { st, sd, kw, ni, ot, od, oi };
  }
  function snapshot(t: string, s: string, pub: boolean, seo: ReturnType<typeof snapSeo>, bl: SiteBloco[]) {
    return JSON.stringify({ t, s, pub, seo, bl });
  }
  const estadoAtual = snapshot(titulo, slug, publicado, snapSeo(seoTitle, seoDesc, seoKw, seoNoindex, ogTitle, ogDesc, ogImage), blocos);
  const temAlteracoes = !saiu && !carregando && estadoAtual !== baseline;
  const { modalAberto, setModalAberto, pedirSaida, irParaDestino } = useUnsavedGuard(temAlteracoes);

  // Persiste no banco. Retorna true em sucesso (para o fluxo "salvar e sair").
  async function salvar(): Promise<boolean> {
    const s = slugifyUrl(slug);
    if (!s) { setMsg("Erro: informe um slug válido."); return false; }
    setSalvando(true); setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.from("site_landing_pages").update({
      titulo: titulo.trim() || "Landing page",
      slug: s,
      publicado,
      dados: { ...dadosOriginais, blocos },
      seo_title: seoTitle.trim() || null,
      seo_description: seoDesc.trim() || null,
      seo_keywords: seoKw.trim() || null,
      seo_noindex: seoNoindex,
      og_title: ogTitle.trim() || null,
      og_description: ogDesc.trim() || null,
      og_image_url: ogImage,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    setSalvando(false);
    if (error) { setMsg("Erro: " + error.message); return false; }
    setSlug(s);
    setBaseline(snapshot(titulo.trim() || "Landing page", s, publicado, snapSeo(seoTitle, seoDesc, seoKw, seoNoindex, ogTitle, ogDesc, ogImage), blocos)); // zera o "não salvo"
    setMsg("Página salva!");
    return true;
  }

  async function salvarESair() {
    if (await salvar()) { setSaiu(true); irParaDestino("/site/landing-pages"); }
  }

  function handleSair() {
    if (temAlteracoes) pedirSaida("/site/landing-pages");
    else router.push("/site/landing-pages");
  }

  async function excluir() {
    if (!confirm("Excluir esta landing page? A URL dela deixará de existir.")) return;
    const supabase = createClient();
    await supabase.from("site_landing_pages").delete().eq("id", id);
    setSaiu(true);
    router.push("/site/landing-pages");
  }

  // Ponte para o modal de Configurações (SEO/redes/indexação) — mesmo componente de posts/páginas.
  const valores: ConfigPaginaValores = {
    slug, mostrar_data: false, modo_exibicao: "lista",
    seo_title: seoTitle, seo_description: seoDesc, seo_keywords: seoKw, seo_noindex: seoNoindex,
    og_title: ogTitle, og_description: ogDesc, og_image_url: ogImage,
  };
  const setValores = (patch: Partial<ConfigPaginaValores>) => {
    if (patch.slug !== undefined) setSlug(patch.slug);
    if (patch.seo_title !== undefined) setSeoTitle(patch.seo_title);
    if (patch.seo_description !== undefined) setSeoDesc(patch.seo_description);
    if (patch.seo_keywords !== undefined) setSeoKw(patch.seo_keywords);
    if (patch.seo_noindex !== undefined) setSeoNoindex(patch.seo_noindex);
    if (patch.og_title !== undefined) setOgTitle(patch.og_title);
    if (patch.og_description !== undefined) setOgDesc(patch.og_description);
    if (patch.og_image_url !== undefined) setOgImage(patch.og_image_url);
  };

  if (carregando) return <div style={{ padding: 60, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;

  // Botão Salvar reflete o estado: destacado quando há alterações; "Salvo ✓" (esmaecido) quando limpo.
  const btnSalvar = (
    <button onClick={() => salvar()} disabled={salvando || !temAlteracoes}
      style={{
        padding: "10px 22px", borderRadius: 9, border: "none", fontSize: 13, fontWeight: 700,
        cursor: salvando || !temAlteracoes ? "default" : "pointer",
        background: temAlteracoes ? "#2563EB" : "var(--color-background-tertiary)",
        color: temAlteracoes ? "#fff" : "var(--color-text-secondary)",
      }}>
      {salvando ? "Salvando…" : temAlteracoes ? "Salvar alterações" : "Salvo ✓"}
    </button>
  );

  // Selo de estado (não salvo / tudo salvo)
  const seloEstado = (
    <span style={{
      fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
      background: temAlteracoes ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.12)",
      color: temAlteracoes ? "#B45309" : "#059669",
    }}>
      {temAlteracoes ? "● Alterações não salvas" : "✓ Tudo salvo"}
    </span>
  );

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, gap: 10, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Editor da landing page</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {seloEstado}
          {fotografo && (
            <a href={urlPublicaSite(cfgSite, fotografo.id, `/${slugifyUrl(slug)}`)} target="_blank" rel="noopener noreferrer" style={{ ...btnPeq, textDecoration: "none" }}>
              👁 Ver página
            </a>
          )}
          <button onClick={() => setConfigAberto(true)} title="Configurações da página (SEO, redes sociais, indexação)" style={btnPeq}>
            ⚙ Configurações
          </button>
          {btnSalvar}
        </div>
      </div>
      <button onClick={handleSair} style={{ border: "none", background: "transparent", color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 18 }}>
        ← Voltar para a lista
      </button>

      {/* Lista de blocos + paleta (componente compartilhado com a Aparência) */}
      {fotografo && (
        <EditorBlocos
          blocos={blocos}
          onChange={setBlocos}
          fotografoId={fotografo.id}
          pasta={`landing/${id}`}
          acaoBloco={
            <button onClick={() => salvar()} disabled={salvando || !temAlteracoes}
              style={{ padding: "6px 16px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 700,
                cursor: salvando || !temAlteracoes ? "default" : "pointer",
                background: temAlteracoes ? "#2563EB" : "var(--color-background-tertiary)",
                color: temAlteracoes ? "#fff" : "var(--color-text-secondary)" }}>
              {salvando ? "Salvando…" : temAlteracoes ? "Salvar" : "Salvo ✓"}
            </button>
          }
        />
      )}

      {/* SEO/redes/indexação ficam no modal ⚙ Configurações (cabeçalho) — mesmo padrão de posts/páginas. */}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
        <button onClick={excluir} style={{ ...btnPeq, color: "#DC2626", borderColor: "#DC2626" }}>Excluir landing</button>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {msg && <span style={{ fontSize: 13, fontWeight: 600, color: msg.startsWith("Erro") ? "#DC2626" : "#059669" }}>{msg}</span>}
          {btnSalvar}
        </div>
      </div>

      {/* Modal de Configurações da página (SEO, redes sociais, indexação) */}
      {configAberto && fotografo && (
        <ConfigPaginaModal
          onFechar={() => setConfigAberto(false)}
          onSalvar={async () => { if (await salvar()) setConfigAberto(false); }}
          valores={valores}
          onChange={setValores}
          recursos={{ url: true }}
          urlPublica={`/${slug}`}
          dominio={dominio}
          tituloFallback={titulo}
          descricaoFallback={seoDesc}
          imagemFallback={ogImage}
          fotografoId={fotografo.id}
          salvando={salvando}
        />
      )}

      {/* Modal de alterações não salvas (ao tentar sair) */}
      {modalAberto && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
          onClick={() => setModalAberto(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: 24, maxWidth: 420, width: "100%", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 8 }}>⚠️ Alterações não salvas</div>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 20px", lineHeight: 1.6 }}>
              Você fez alterações nesta landing page que ainda não foram salvas. O que deseja fazer?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={salvarESair} disabled={salvando}
                style={{ padding: "11px", borderRadius: 9, border: "none", background: "#2563EB", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {salvando ? "Salvando…" : "Salvar e sair"}
              </button>
              <button onClick={() => { setSaiu(true); irParaDestino("/site/landing-pages"); }}
                style={{ padding: "11px", borderRadius: 9, border: "1px solid var(--color-border-secondary)", background: "transparent", color: "#DC2626", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Sair sem salvar
              </button>
              <button onClick={() => setModalAberto(false)}
                style={{ padding: "11px", borderRadius: 9, border: "none", background: "transparent", color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer" }}>
                Continuar editando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
