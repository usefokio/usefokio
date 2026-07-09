"use client";

// Editor da landing page (template "orcamento"): hero, pacotes, seções, casais e CTA.
import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { uploadFileClient } from "@/lib/storage/uploadClient";
import { processarImagemEntrega } from "@/lib/imageResize";
import { SiteRichEditor } from "@/app/(dashboard)/site/_components/SiteRichEditor";
import { REGEX_SUBDOMINIO } from "@/lib/site/publico";
import type { SiteLandingPage, SiteLandingDados } from "@/lib/supabase/types";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8, boxSizing: "border-box",
  border: "1px solid var(--color-border-secondary)", fontSize: 13,
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)",
  textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5,
};
const cardStyle: React.CSSProperties = {
  border: "1px solid var(--color-border-tertiary)", borderRadius: 12,
  padding: "16px 18px", background: "var(--color-background-secondary)",
};
const btnPeq: React.CSSProperties = {
  padding: "7px 12px", borderRadius: 8, border: "1px solid var(--color-border-secondary)",
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

  const [titulo, setTitulo] = useState("");
  const [slug, setSlug] = useState("");
  const [publicado, setPublicado] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [dados, setDados] = useState<SiteLandingDados>({});
  const [enviando, setEnviando] = useState<string | null>(null);
  const inputImgRef = useRef<HTMLInputElement>(null);
  const alvoUpload = useRef<{ tipo: "hero" | "logo" | "casal"; indice?: number } | null>(null);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    supabase.from("site_landing_pages").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (!data) { setMsg("Erro: landing não encontrada."); setCarregando(false); return; }
      const lp = data as SiteLandingPage;
      setTitulo(lp.titulo); setSlug(lp.slug); setPublicado(lp.publicado);
      setSeoTitle(lp.seo_title ?? ""); setSeoDesc(lp.seo_description ?? "");
      setDados(lp.dados ?? {});
      setCarregando(false);
    });
  }, [id, fotografo]);

  async function salvar() {
    if (!fotografo) return;
    const s = slugifyUrl(slug);
    if (!s || !REGEX_SUBDOMINIO.test(s.replace(/-/g, "a"))) { setMsg("Erro: slug inválido."); return; }
    setSalvando(true); setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.from("site_landing_pages").update({
      titulo: titulo.trim() || "Landing page",
      slug: s,
      publicado,
      dados,
      seo_title: seoTitle.trim() || null,
      seo_description: seoDesc.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    setSalvando(false);
    setSlug(s);
    setMsg(error ? "Erro: " + error.message : "Landing salva!");
  }

  async function excluir() {
    if (!confirm("Excluir esta landing page? A URL dela deixará de existir.")) return;
    const supabase = createClient();
    await supabase.from("site_landing_pages").delete().eq("id", id);
    router.push("/site/landing-pages");
  }

  function pedirUpload(tipo: "hero" | "logo" | "casal", indice?: number) {
    alvoUpload.current = { tipo, indice };
    inputImgRef.current?.click();
  }

  async function subirImagem(files: FileList | null) {
    const alvo = alvoUpload.current;
    if (!files || files.length === 0 || !fotografo || !alvo) return;
    setEnviando(alvo.tipo);
    try {
      const maxLargura = alvo.tipo === "logo" ? 600 : 2000;
      const { blob } = await processarImagemEntrega(files[0], maxLargura, 0.85);
      const nome = files[0].name.replace(/\.[a-z0-9]+$/i, "").normalize("NFD").replace(/[^\x20-\x7E]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-") || "img";
      const path = `site/${fotografo.id}/landing/${id}/${alvo.tipo}-${nome}-${crypto.randomUUID().slice(0, 6)}.${alvo.tipo === "logo" ? "png" : "jpg"}`;
      const { url_publica } = await uploadFileClient(path, blob);
      setDados((prev) => {
        if (alvo.tipo === "hero") return { ...prev, hero: { ...prev.hero, imagem_url: url_publica } };
        if (alvo.tipo === "logo") return { ...prev, hero: { ...prev.hero, logo_url: url_publica } };
        const casais = [...(prev.casais ?? [])];
        if (alvo.indice !== undefined && casais[alvo.indice]) casais[alvo.indice] = { ...casais[alvo.indice], fotos: [url_publica] };
        return { ...prev, casais };
      });
    } catch (e) {
      setMsg("Erro no upload: " + (e instanceof Error ? e.message : ""));
    }
    setEnviando(null);
    if (inputImgRef.current) inputImgRef.current.value = "";
  }

  const mudarPacote = (i: number, campo: string, valor: string | string[]) =>
    setDados((prev) => {
      const pacotes = [...(prev.pacotes ?? [])];
      pacotes[i] = { ...pacotes[i], [campo]: valor };
      return { ...prev, pacotes };
    });

  const mudarCasal = (i: number, campo: string, valor: string) =>
    setDados((prev) => {
      const casais = [...(prev.casais ?? [])];
      casais[i] = { ...casais[i], [campo]: valor };
      return { ...prev, casais };
    });

  if (carregando) return <div style={{ padding: 60, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;

  const btnSalvar = (
    <button onClick={salvar} disabled={salvando}
      style={{ padding: "10px 22px", borderRadius: 9, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
      {salvando ? "Salvando…" : "Salvar"}
    </button>
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Editar landing page</h1>
        {btnSalvar}
      </div>
      <button onClick={() => router.push("/site/landing-pages")} style={{ border: "none", background: "transparent", color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 20 }}>
        ← Voltar para a lista
      </button>

      <input ref={inputImgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => subirImagem(e.target.files)} />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Identificação */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Título (interno)</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Slug (URL da página)</label>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12 }} />
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4, fontFamily: "monospace" }}>/{slugifyUrl(slug)}</div>
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer" }}>
          <input type="checkbox" checked={publicado} onChange={(e) => setPublicado(e.target.checked)} style={{ width: 15, height: 15 }} />
          Publicada
        </label>

        {/* Hero */}
        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 12 }}>Topo (hero)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label style={labelStyle}>Título exibido</label>
              <input value={dados.hero?.titulo ?? ""} onChange={(e) => setDados((p) => ({ ...p, hero: { ...p.hero, titulo: e.target.value } }))} style={inputStyle} />
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div>
                <label style={labelStyle}>Imagem de fundo</label>
                {dados.hero?.imagem_url && <img src={dados.hero.imagem_url} alt="" style={{ width: 200, aspectRatio: "16/9", objectFit: "cover", borderRadius: 8, display: "block", marginBottom: 6 }} />}
                <button onClick={() => pedirUpload("hero")} disabled={!!enviando} style={btnPeq}>{enviando === "hero" ? "Enviando…" : "Trocar imagem"}</button>
              </div>
              <div>
                <label style={labelStyle}>Logo (sobre a imagem)</label>
                {dados.hero?.logo_url && <img src={dados.hero.logo_url} alt="" style={{ height: 60, width: "auto", borderRadius: 6, display: "block", marginBottom: 6, background: "#333", padding: 6 }} />}
                <button onClick={() => pedirUpload("logo")} disabled={!!enviando} style={btnPeq}>{enviando === "logo" ? "Enviando…" : "Trocar logo"}</button>
              </div>
            </div>
          </div>
        </div>

        {/* Pacotes */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>Pacotes / preços</div>
            <button style={btnPeq} onClick={() => setDados((p) => ({ ...p, pacotes: [...(p.pacotes ?? []), { nome: "Novo pacote", itens: [""], valor: "R$ " }] }))}>+ Pacote</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {(dados.pacotes ?? []).map((pac, i) => (
              <div key={i} style={{ border: "1px solid var(--color-border-secondary)", borderRadius: 10, padding: 14, background: "var(--color-background-primary)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 10, alignItems: "end", marginBottom: 8 }}>
                  <div>
                    <label style={labelStyle}>Nome</label>
                    <input value={pac.nome} onChange={(e) => mudarPacote(i, "nome", e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Valor (texto livre)</label>
                    <input value={pac.valor} onChange={(e) => mudarPacote(i, "valor", e.target.value)} style={inputStyle} placeholder="R$ 10x 510,00" />
                  </div>
                  <button title="Remover pacote" onClick={() => setDados((p) => ({ ...p, pacotes: (p.pacotes ?? []).filter((_, j) => j !== i) }))}
                    style={{ ...btnPeq, color: "#DC2626", borderColor: "#DC2626" }}>🗑</button>
                </div>
                <label style={labelStyle}>Itens (um por linha)</label>
                <textarea
                  value={pac.itens.join("\n")}
                  onChange={(e) => mudarPacote(i, "itens", e.target.value.split("\n"))}
                  rows={Math.max(3, pac.itens.length)}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Seções de texto */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>Seções de texto (ex.: Álbuns)</div>
            <button style={btnPeq} onClick={() => setDados((p) => ({ ...p, secoes: [...(p.secoes ?? []), { titulo: "Nova seção", corpo_html: "" }] }))}>+ Seção</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {(dados.secoes ?? []).map((s, i) => (
              <div key={i} style={{ border: "1px solid var(--color-border-secondary)", borderRadius: 10, padding: 14, background: "var(--color-background-primary)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end", marginBottom: 8 }}>
                  <div>
                    <label style={labelStyle}>Título</label>
                    <input value={s.titulo} onChange={(e) => setDados((p) => { const secoes = [...(p.secoes ?? [])]; secoes[i] = { ...secoes[i], titulo: e.target.value }; return { ...p, secoes }; })} style={inputStyle} />
                  </div>
                  <button title="Remover seção" onClick={() => setDados((p) => ({ ...p, secoes: (p.secoes ?? []).filter((_, j) => j !== i) }))}
                    style={{ ...btnPeq, color: "#DC2626", borderColor: "#DC2626" }}>🗑</button>
                </div>
                <SiteRichEditor
                  value={s.corpo_html}
                  onChange={(html) => setDados((p) => { const secoes = [...(p.secoes ?? [])]; secoes[i] = { ...secoes[i], corpo_html: html }; return { ...p, secoes }; })}
                  minHeight={160}
                  pasta={`landing/${id}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Casais / destaques */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>Casais / destaques com foto</div>
            <button style={btnPeq} onClick={() => setDados((p) => ({ ...p, casais: [...(p.casais ?? []), { titulo: "Nome do casal", fotos: [] }] }))}>+ Casal</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
            {(dados.casais ?? []).map((c, i) => (
              <div key={i} style={{ border: "1px solid var(--color-border-secondary)", borderRadius: 10, padding: 12, background: "var(--color-background-primary)" }}>
                {c.fotos[0]
                  ? <img src={c.fotos[0]} alt={c.titulo} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", borderRadius: 8, display: "block", marginBottom: 8 }} />
                  : <div style={{ width: "100%", aspectRatio: "4/3", borderRadius: 8, border: "1px dashed var(--color-border-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 8 }}>Sem foto</div>}
                <input value={c.titulo} onChange={(e) => mudarCasal(i, "titulo", e.target.value)} style={{ ...inputStyle, marginBottom: 6 }} />
                <input value={c.link ?? ""} onChange={(e) => mudarCasal(i, "link", e.target.value)} style={{ ...inputStyle, fontFamily: "monospace", fontSize: 11, marginBottom: 8 }} placeholder="Link (opcional, ex.: /portfolio/...)" />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <button style={btnPeq} onClick={() => pedirUpload("casal", i)} disabled={!!enviando}>{enviando === "casal" ? "Enviando…" : "Foto"}</button>
                  <button title="Remover" onClick={() => setDados((p) => ({ ...p, casais: (p.casais ?? []).filter((_, j) => j !== i) }))}
                    style={{ ...btnPeq, color: "#DC2626", borderColor: "#DC2626" }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 12 }}>Rodapé / WhatsApp</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>Título da chamada</label>
              <input value={dados.avaliacoes_titulo ?? ""} onChange={(e) => setDados((p) => ({ ...p, avaliacoes_titulo: e.target.value }))} style={inputStyle} placeholder="O que meus clientes dizem:" />
            </div>
            <div>
              <label style={labelStyle}>Texto do botão</label>
              <input value={dados.cta_whatsapp?.texto ?? ""} onChange={(e) => setDados((p) => ({ ...p, cta_whatsapp: { ...p.cta_whatsapp, texto: e.target.value } }))} style={inputStyle} placeholder="Conversar no WhatsApp" />
            </div>
            <div>
              <label style={labelStyle}>Número (vazio = o do cadastro)</label>
              <input value={dados.cta_whatsapp?.numero ?? ""} onChange={(e) => setDados((p) => ({ ...p, cta_whatsapp: { ...p.cta_whatsapp, numero: e.target.value.replace(/\D/g, "") } }))} style={inputStyle} placeholder="5514999990000" />
            </div>
          </div>
        </div>

        {/* SEO */}
        <details>
          <summary style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", cursor: "pointer" }}>SEO</summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} style={inputStyle} placeholder="SEO title" />
            <textarea value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} placeholder="SEO description" />
          </div>
        </details>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={excluir} style={{ ...btnPeq, color: "#DC2626", borderColor: "#DC2626" }}>Excluir landing</button>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {msg && <span style={{ fontSize: 13, fontWeight: 600, color: msg.startsWith("Erro") ? "#DC2626" : "#059669" }}>{msg}</span>}
            {btnSalvar}
          </div>
        </div>
      </div>
    </div>
  );
}
