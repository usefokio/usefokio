"use client";

// SEO global do site: título, descrição e código de rastreamento (analytics).
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { useEditorEstado, SeloEstado, BotaoSalvarEstado, ModalNaoSalvo } from "@/app/(dashboard)/_components/EditorEstado";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8, boxSizing: "border-box",
  border: "1px solid var(--color-border-secondary)", fontSize: 13,
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)",
  textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5,
};

export default function SeoPage() {
  const { fotografo } = useFotografo();
  const [tituloSite, setTituloSite] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [keywords, setKeywords] = useState("");
  const [analytics, setAnalytics] = useState("");
  const [gsv, setGsv] = useState("");
  const [pixel, setPixel] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Estado de salvamento claro (regra de sistema)
  const snapshotAtual = JSON.stringify([tituloSite, seoTitle, seoDesc, keywords, analytics, gsv, pixel]);
  const estado = useEditorEstado(snapshotAtual, "/site");

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    supabase.from("site_config").select("*").eq("fotografo_id", fotografo.id).maybeSingle().then(({ data }) => {
      if (data) {
        setTituloSite(data.titulo_site ?? "");
        setSeoTitle(data.seo_title ?? "");
        setSeoDesc(data.seo_description ?? "");
        setKeywords(data.seo_keywords ?? "");
        setAnalytics(data.analytics_head ?? "");
        setGsv(data.google_site_verification ?? "");
        setPixel(data.facebook_pixel ?? "");
      }
      estado.inicializar(JSON.stringify([
        data?.titulo_site ?? "", data?.seo_title ?? "", data?.seo_description ?? "", data?.seo_keywords ?? "",
        data?.analytics_head ?? "", data?.google_site_verification ?? "", data?.facebook_pixel ?? "",
      ]));
      setCarregando(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotografo]);

  async function salvar(): Promise<boolean> {
    if (!fotografo) return false;
    setSalvando(true); setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.from("site_config").upsert({
      fotografo_id: fotografo.id,
      titulo_site: tituloSite.trim() || null,
      seo_title: seoTitle.trim() || null,
      seo_description: seoDesc.trim() || null,
      seo_keywords: keywords.trim() || null,
      analytics_head: analytics.trim() || null,
      google_site_verification: gsv.trim() || null,
      facebook_pixel: pixel.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "fotografo_id" });
    setSalvando(false);
    if (error) { setMsg("Erro: " + error.message); return false; }
    estado.marcarSalvo(snapshotAtual);
    setMsg("SEO salvo!");
    return true;
  }

  if (carregando) return <div style={{ padding: 60, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>SEO do site</h1>
        <SeloEstado temAlteracoes={estado.temAlteracoes} />
      </div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 24px", lineHeight: 1.6 }}>
        Metadados gerais (home). Cada trabalho, portfólio e post tem o próprio SEO na sua tela de edição.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>Nome do site</label>
          <input value={tituloSite} onChange={(e) => setTituloSite(e.target.value)} style={inputStyle} placeholder="Ex.: Fernando Agrela Fotografia" />
        </div>
        <div>
          <label style={labelStyle}>SEO title (título da home no Google)</label>
          <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} style={inputStyle} placeholder="Ex.: Fernando Agrela — Fotógrafo de Casamento em Ourinhos e região" />
        </div>
        <div>
          <label style={labelStyle}>SEO description</label>
          <textarea value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="Descrição de até ~160 caracteres exibida nos resultados de busca." />
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 3 }}>{seoDesc.length} caracteres</div>
        </div>
        <div>
          <label style={labelStyle}>Palavras-chave (separadas por vírgula)</label>
          <textarea value={keywords} onChange={(e) => setKeywords(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="fotógrafo de casamento em Ourinhos, ensaio gestante interior SP…" />
        </div>

        <div style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)" }}>Integrações e verificação</div>
          <div>
            <label style={labelStyle}>ID do Google Analytics</label>
            <input value={analytics} onChange={(e) => setAnalytics(e.target.value)} style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12 }} placeholder="G-XXXXXXXXXX (ou o código &lt;script&gt; completo)" />
          </div>
          <div>
            <label style={labelStyle}>Código de verificação do Google</label>
            <input value={gsv} onChange={(e) => setGsv(e.target.value)} style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12 }} placeholder="conteúdo da meta google-site-verification" />
          </div>
          <div>
            <label style={labelStyle}>ID do Facebook Pixel</label>
            <input value={pixel} onChange={(e) => setPixel(e.target.value)} style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12 }} placeholder="ex.: 817018281705038" />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, alignItems: "center" }}>
          {msg && <span style={{ fontSize: 13, fontWeight: 600, color: msg.startsWith("Erro") ? "#DC2626" : "#059669" }}>{msg}</span>}
          <BotaoSalvarEstado temAlteracoes={estado.temAlteracoes} salvando={salvando} onClick={() => salvar()} />
        </div>
      </div>

      <ModalNaoSalvo
        aberto={estado.modalAberto}
        salvando={salvando}
        onSalvarESair={async () => { if (await salvar()) estado.sairAgora(); }}
        onSairSemSalvar={estado.sairAgora}
        onContinuar={estado.fecharModal}
      />
    </div>
  );
}
