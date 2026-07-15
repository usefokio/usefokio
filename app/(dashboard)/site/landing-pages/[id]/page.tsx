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

  const [blocos, setBlocos] = useState<SiteBloco[]>([]);
  const [cfgSite, setCfgSite] = useState<ConfigUrl | null>(null);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    supabase.from("site_config").select("subdominio, dominio_customizado, publicado").eq("fotografo_id", fotografo.id).maybeSingle().then(({ data }) => setCfgSite((data as ConfigUrl) ?? null));
    supabase.from("site_landing_pages").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (!data) { setMsg("Erro: landing não encontrada."); setCarregando(false); return; }
      const lp = data as SiteLandingPage;
      setTitulo(lp.titulo); setSlug(lp.slug); setPublicado(lp.publicado);
      setSeoTitle(lp.seo_title ?? ""); setSeoDesc(lp.seo_description ?? "");
      const d = (lp.dados ?? {}) as SiteLandingDados;
      setDadosOriginais(d);
      const bl = d.blocos && d.blocos.length > 0 ? d.blocos : dadosParaBlocos(d);
      setBlocos(bl);
      setBaseline(snapshot(lp.titulo, lp.slug, lp.publicado, lp.seo_title ?? "", lp.seo_description ?? "", bl));
      setCarregando(false);
    });
  }, [id, fotografo]);

  // Snapshot do estado editável → string, para comparar e detectar alterações não salvas.
  function snapshot(t: string, s: string, pub: boolean, st: string, sd: string, bl: SiteBloco[]) {
    return JSON.stringify({ t, s, pub, st, sd, bl });
  }
  const estadoAtual = snapshot(titulo, slug, publicado, seoTitle, seoDesc, blocos);
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
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    setSalvando(false);
    if (error) { setMsg("Erro: " + error.message); return false; }
    setSlug(s);
    setBaseline(snapshot(titulo.trim() || "Landing page", s, publicado, seoTitle, seoDesc, blocos)); // zera o "não salvo"
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

      {/* SEO + ações */}
      <details style={{ marginTop: 18 }}>
        <summary style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", cursor: "pointer" }}>SEO</summary>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
          <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} style={inputStyle} placeholder="SEO title" />
          <textarea value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} placeholder="SEO description" />
        </div>
      </details>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
        <button onClick={excluir} style={{ ...btnPeq, color: "#DC2626", borderColor: "#DC2626" }}>Excluir landing</button>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {msg && <span style={{ fontSize: 13, fontWeight: 600, color: msg.startsWith("Erro") ? "#DC2626" : "#059669" }}>{msg}</span>}
          {btnSalvar}
        </div>
      </div>

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
