"use client";

// SEO global do site: título, descrição, imagem de compartilhamento e rastreamento (analytics).
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { uploadFileClient } from "@/lib/storage/uploadClient";
import { processarImagemEntrega } from "@/lib/imageResize";
import { useEditorEstado, SeloEstado, BotaoSalvarEstado, ModalNaoSalvo } from "@/app/(dashboard)/_components/EditorEstado";
import { SeoDicas, SeoNota } from "@/app/(dashboard)/site/_components/SeoDica";
import { BotaoIA } from "@/app/(dashboard)/site/_components/BotaoIA";
import { auditarSiteGlobal, pontuar } from "@/lib/site/seoAudit";
import { normalizarBriefing, briefingPreenchido } from "@/lib/site/briefing";
import { gerarSugestoes, type SugestoesSeo } from "@/lib/site/briefingConfig";

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
  const [ogImageUrl, setOgImageUrl] = useState<string | null>(null); // imagem de compartilhamento do site
  const [enviandoOg, setEnviandoOg] = useState(false);
  const inputOg = useRef<HTMLInputElement>(null);
  const [publicado, setPublicado] = useState<boolean | null>(null);
  const [sugestoes, setSugestoes] = useState<SugestoesSeo | null>(null); // do briefing (template)

  // Estado de salvamento claro (regra de sistema)
  const snapshotAtual = JSON.stringify([tituloSite, seoTitle, seoDesc, keywords, analytics, gsv, pixel, ogImageUrl]);
  const estado = useEditorEstado(snapshotAtual, "/site");

  async function enviarOg(files: FileList | null) {
    if (!files || !files[0] || !fotografo) return;
    setEnviandoOg(true);
    try {
      const { blob } = await processarImagemEntrega(files[0], 1200, 0.85);
      const path = `site/${fotografo.id}/og/global-${crypto.randomUUID().slice(0, 6)}.jpg`;
      const { url_publica } = await uploadFileClient(path, blob);
      setOgImageUrl(url_publica);
    } catch { setMsg("Erro no upload da imagem."); }
    setEnviandoOg(false);
    if (inputOg.current) inputOg.current.value = "";
  }

  // Análise de SEO ao vivo do site (motor único em lib/site/seoAudit)
  const achadosSeo = auditarSiteGlobal({
    titulo_site: tituloSite, seo_title: seoTitle, seo_description: seoDesc, seo_keywords: keywords,
    og_image_url: ogImageUrl, analytics_head: analytics, google_site_verification: gsv,
    facebook_pixel: pixel, publicado,
  });
  const nota = pontuar(achadosSeo);

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
        setOgImageUrl(data.og_image_url ?? null);
        setPublicado(data.publicado ?? null);
        // Sugestões do briefing (template) — só quando o briefing foi preenchido
        const br = normalizarBriefing(data.briefing);
        if (briefingPreenchido(br)) setSugestoes(gerarSugestoes(br, { nome_empresa: fotografo.nome_empresa, cidade: fotografo.cidade }));
      }
      estado.inicializar(JSON.stringify([
        data?.titulo_site ?? "", data?.seo_title ?? "", data?.seo_description ?? "", data?.seo_keywords ?? "",
        data?.analytics_head ?? "", data?.google_site_verification ?? "", data?.facebook_pixel ?? "", data?.og_image_url ?? null,
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
      og_image_url: ogImageUrl,
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
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <BotaoIA compacto contexto={{ tipo: "descricao", entidade: "site", campos: { titulo_site: tituloSite } }} />
          <SeloEstado temAlteracoes={estado.temAlteracoes} />
        </div>
      </div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 16px", lineHeight: 1.6 }}>
        Metadados gerais (home). Cada trabalho, portfólio e post tem o próprio SEO na sua tela de edição.
      </p>

      {/* Nota + análise ao vivo do SEO global */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <SeoNota nota={nota} />
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
          <strong style={{ color: "var(--color-text-primary)" }}>Nota de SEO do site (home).</strong> Siga as dicas abaixo — a nota atualiza conforme você preenche.
        </div>
      </div>
      <div style={{ marginBottom: 18 }}><SeoDicas achados={achadosSeo} /></div>

      {/* Sugestões do briefing — preenche os campos; o fotógrafo revisa e salva */}
      {sugestoes && (sugestoes.seo_title || sugestoes.seo_description || sugestoes.seo_keywords) && (
        <div style={{ border: "1px solid rgba(37,99,235,0.3)", borderRadius: 12, padding: "14px 16px", background: "rgba(37,99,235,0.04)", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--color-text-primary)" }}>✨ Sugestões do seu briefing</div>
            <button
              onClick={() => {
                if (sugestoes.seo_title && !seoTitle.trim()) setSeoTitle(sugestoes.seo_title);
                if (sugestoes.seo_description && !seoDesc.trim()) setSeoDesc(sugestoes.seo_description);
                if (sugestoes.seo_keywords && !keywords.trim()) setKeywords(sugestoes.seo_keywords);
              }}
              style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#2563EB", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              Aplicar nos campos vazios
            </button>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
            {sugestoes.seo_title && <div><strong>Título:</strong> {sugestoes.seo_title}</div>}
            {sugestoes.seo_description && <div><strong>Descrição:</strong> {sugestoes.seo_description}</div>}
            {sugestoes.seo_keywords && <div><strong>Palavras-chave:</strong> {sugestoes.seo_keywords}</div>}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 8 }}>Só preenche o que estiver vazio (não sobrescreve o que você já escreveu). Revise e clique em Salvar.</div>
        </div>
      )}

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

        <div>
          <label style={labelStyle}>Imagem de compartilhamento do site (WhatsApp/redes)</label>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {ogImageUrl
              ? <img src={ogImageUrl} alt="" style={{ width: 180, aspectRatio: "1200/630", objectFit: "cover", borderRadius: 8, display: "block" }} />
              : <div style={{ width: 180, aspectRatio: "1200/630", borderRadius: 8, border: "1px dashed var(--color-border-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--color-text-secondary)", textAlign: "center", padding: 6 }}>Sem imagem — o logo é usado</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button onClick={() => inputOg.current?.click()} disabled={enviandoOg}
                style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
                {enviandoOg ? "Enviando…" : (ogImageUrl ? "Trocar imagem" : "+ Escolher imagem")}
              </button>
              {ogImageUrl && (
                <button onClick={() => setOgImageUrl(null)}
                  style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "transparent", fontSize: 11, color: "#DC2626", cursor: "pointer", textAlign: "left" }}>
                  Remover (volta a usar o logo)
                </button>
              )}
            </div>
            <input ref={inputOg} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => enviarOg(e.target.files)} />
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>Use uma foto forte na horizontal (ideal 1200×630) — é a imagem que aparece quando compartilham o seu site.</div>
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
