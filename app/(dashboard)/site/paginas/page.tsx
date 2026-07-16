"use client";

// Páginas do site (Sobre e personalizadas): editar título e conteúdo (rich text).
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { uploadFileClient } from "@/lib/storage/uploadClient";
import { processarImagemEntrega } from "@/lib/imageResize";
import { SiteRichEditor } from "@/app/(dashboard)/site/_components/SiteRichEditor";
import { FormularioConfigEditor } from "@/app/(dashboard)/site/_components/FormularioConfigEditor";
import { useEditorEstado, SeloEstado, BotaoSalvarEstado, ModalNaoSalvo } from "@/app/(dashboard)/_components/EditorEstado";
import { ConfigPaginaModal } from "@/app/(dashboard)/site/_components/ConfigPaginaModal";
import { SeoDicas } from "@/app/(dashboard)/site/_components/SeoDica";
import { BotaoIA } from "@/app/(dashboard)/site/_components/BotaoIA";
import { auditarPagina, contarPalavras } from "@/lib/site/seoAudit";
import { normalizarConfig, type ConfigFormulario } from "@/lib/site/formulario";
import type { ConfigPaginaValores } from "@/lib/site/seo";
import type { SitePagina } from "@/lib/supabase/types";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8, boxSizing: "border-box",
  border: "1px solid var(--color-border-secondary)", fontSize: 13,
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};

type Conteudo = { html?: string | null; imagens?: string[]; formulario?: ConfigFormulario };

function PaginasConteudo() {
  const { fotografo } = useFotografo();
  const router = useRouter();
  const editarId = useSearchParams().get("editar");
  const [paginas, setPaginas] = useState<SitePagina[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<SitePagina | null>(null);
  const [titulo, setTitulo] = useState("");
  const [html, setHtml] = useState("");
  const [imagens, setImagens] = useState<string[]>([]);
  const [formConfig, setFormConfig] = useState<ConfigFormulario>(() => normalizarConfig(null));
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [seoKw, setSeoKw] = useState("");
  const [seoNoindex, setSeoNoindex] = useState(false);
  const [ogTitle, setOgTitle] = useState("");
  const [ogDesc, setOgDesc] = useState("");
  const [ogImage, setOgImage] = useState<string | null>(null);
  const [configAberto, setConfigAberto] = useState(false);
  const [dominio, setDominio] = useState("seusite.usefokio.com.br");
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  // Estado de salvamento claro (regra de sistema) — dirty só enquanto uma página está em edição
  const snapshotAtual = editando ? JSON.stringify([editando.id, titulo, html, imagens, formConfig, seoTitle, seoDesc, seoKw, seoNoindex, ogTitle, ogDesc, ogImage]) : "idle";
  const estado = useEditorEstado(snapshotAtual, "/site");

  // Análise de SEO ao vivo (motor único em lib/site/seoAudit)
  const achadosSeo = editando
    ? auditarPagina({ titulo, html, seo_title: seoTitle, seo_description: seoDesc, seo_keywords: seoKw, seo_noindex: seoNoindex, og_image_url: ogImage })
    : [];
  const palavrasHtml = contarPalavras(html);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    supabase.from("site_paginas").select("*").eq("fotografo_id", fotografo.id).order("slug")
      .then(({ data }) => { setPaginas((data as SitePagina[]) ?? []); estado.inicializar("idle"); setLoading(false); });
    supabase.from("site_config").select("subdominio, dominio_customizado").eq("fotografo_id", fotografo.id).maybeSingle()
      .then(({ data }) => { if (data) setDominio(data.dominio_customizado || (data.subdominio ? `${data.subdominio}.usefokio.com.br` : "seusite.usefokio.com.br")); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotografo]);

  function abrirLocal(p: SitePagina) {
    setEditando(p);
    setTitulo(p.titulo);
    const c = (p.conteudo ?? {}) as Conteudo;
    setHtml(c.html ?? "");
    const imgs = Array.isArray(c.imagens) ? c.imagens : [];
    setImagens(imgs);
    const cfg = normalizarConfig(c.formulario);
    setFormConfig(cfg);
    setSeoTitle(p.seo_title ?? ""); setSeoDesc(p.seo_description ?? ""); setSeoKw(p.seo_keywords ?? "");
    setSeoNoindex(p.seo_noindex); setOgTitle(p.og_title ?? ""); setOgDesc(p.og_description ?? ""); setOgImage(p.og_image_url);
    estado.inicializar(JSON.stringify([p.id, p.titulo, c.html ?? "", imgs, cfg, p.seo_title ?? "", p.seo_description ?? "", p.seo_keywords ?? "", p.seo_noindex, p.og_title ?? "", p.og_description ?? "", p.og_image_url]));
    setMsg(null);
  }

  // Esta rota é o EDITOR DE CONTEÚDO de uma página, aberto pela lista unificada
  // (Site → Páginas e Menu) via ?editar=<id>. Sem ?editar, volta para a lista unificada.
  useEffect(() => {
    if (!editarId) { router.replace("/site/menu"); return; }
    if (editando?.id === editarId) return;
    const p = paginas.find((x) => x.id === editarId);
    if (p) abrirLocal(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editarId, paginas]);

  function voltarParaLista() {
    if (estado.temAlteracoes && !confirm("Há alterações não salvas nesta página. Sair sem salvar?")) return;
    router.push("/site/menu");
  }

  async function trocarFoto(files: FileList | null) {
    if (!files || files.length === 0 || !fotografo || !editando) return;
    setEnviandoFoto(true);
    try {
      const { blob } = await processarImagemEntrega(files[0], 1200, 0.85);
      const path = `site/${fotografo.id}/paginas/${editando.slug}/foto-${crypto.randomUUID().slice(0, 6)}.jpg`;
      const { url_publica } = await uploadFileClient(path, blob);
      setImagens((prev) => [url_publica, ...prev.slice(1)]); // substitui a principal
    } catch (e) {
      setMsg("Erro no upload: " + (e instanceof Error ? e.message : ""));
    }
    setEnviandoFoto(false);
    if (inputFotoRef.current) inputFotoRef.current.value = "";
  }

  async function salvar(): Promise<boolean> {
    if (!editando) return false;
    setSalvando(true);
    const supabase = createClient();
    const conteudoAtual = (editando.conteudo ?? {}) as Conteudo;
    const novoConteudo: Conteudo = { ...conteudoAtual, html: html.replace(/<p>\s*<\/p>/g, "").trim() || null, imagens };
    if (editando.slug === "contato") novoConteudo.formulario = formConfig;
    const camposSeo = {
      seo_title: seoTitle.trim() || null, seo_description: seoDesc.trim() || null, seo_keywords: seoKw.trim() || null,
      seo_noindex: seoNoindex, og_title: ogTitle.trim() || null, og_description: ogDesc.trim() || null, og_image_url: ogImage,
    };
    const { error } = await supabase.from("site_paginas").update({
      titulo: titulo.trim() || editando.titulo,
      conteudo: novoConteudo,
      ...camposSeo,
      updated_at: new Date().toISOString(),
    }).eq("id", editando.id);
    setSalvando(false);
    if (error) { setMsg("Erro: " + error.message); return false; }
    // Mantém o nome no menu ("Páginas e Menu") igual ao título da página
    if (fotografo) await supabase.from("site_menu").update({ label: titulo.trim() || editando.titulo })
      .eq("fotografo_id", fotografo.id).eq("href", `/${editando.slug}`);
    setPaginas((prev) => prev.map((p) => p.id === editando.id ? { ...p, titulo, conteudo: novoConteudo, ...camposSeo } : p));
    estado.marcarSalvo(snapshotAtual);
    setMsg("Página salva!");
    return true;
  }

  // Ponte para o modal de Configurações (páginas: só SEO + redes; slug institucional não é editável).
  const valores: ConfigPaginaValores = {
    slug: editando?.slug ?? "", mostrar_data: false, modo_exibicao: "lista",
    seo_title: seoTitle, seo_description: seoDesc, seo_keywords: seoKw, seo_noindex: seoNoindex,
    og_title: ogTitle, og_description: ogDesc, og_image_url: ogImage,
  };
  const setValores = (patch: Partial<ConfigPaginaValores>) => {
    if (patch.seo_title !== undefined) setSeoTitle(patch.seo_title);
    if (patch.seo_description !== undefined) setSeoDesc(patch.seo_description);
    if (patch.seo_keywords !== undefined) setSeoKw(patch.seo_keywords);
    if (patch.seo_noindex !== undefined) setSeoNoindex(patch.seo_noindex);
    if (patch.og_title !== undefined) setOgTitle(patch.og_title);
    if (patch.og_description !== undefined) setOgDesc(patch.og_description);
    if (patch.og_image_url !== undefined) setOgImage(patch.og_image_url);
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 6px", letterSpacing: "-0.02em" }}>Páginas</h1>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 24px" }}>Conteúdo das páginas institucionais do site (Sobre, Contato).</p>

      {loading || !editando ? (
        <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
            <button onClick={voltarParaLista} style={{ border: "none", background: "transparent", color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer", padding: 0 }}>
              ← Voltar para a lista
            </button>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <BotaoIA compacto contexto={{ tipo: "texto", entidade: "pagina", campos: { titulo, slug: editando.slug } }} />
              <button onClick={() => setConfigAberto(true)} title="Configurações da página (SEO, redes sociais)"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
                ⚙ Configurações
              </button>
              <SeloEstado temAlteracoes={estado.temAlteracoes} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Título</label>
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Foto da página</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {imagens[0]
                  ? <img src={imagens[0]} alt="" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 10 }} />
                  : <div style={{ width: 120, height: 120, borderRadius: 10, border: "1px dashed var(--color-border-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--color-text-secondary)", textAlign: "center" }}>Sem foto</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button onClick={() => inputFotoRef.current?.click()} disabled={enviandoFoto}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
                    {enviandoFoto ? "Enviando…" : (imagens[0] ? "Trocar foto" : "+ Adicionar foto")}
                  </button>
                  {imagens[0] && (
                    <button onClick={() => setImagens((prev) => prev.slice(1))}
                      style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "transparent", fontSize: 11, color: "#DC2626", cursor: "pointer", textAlign: "left" }}>
                      Remover foto
                    </button>
                  )}
                </div>
                <input ref={inputFotoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => trocarFoto(e.target.files)} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Conteúdo</label>
              <SiteRichEditor value={html} onChange={setHtml} minHeight={280} pasta={`paginas/${editando.slug}`} />
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 6 }}>
                <strong>{palavrasHtml} palavra{palavrasHtml !== 1 ? "s" : ""}</strong> — textos com 120+ palavras dão mais contexto ao Google (conte a sua história, cidade e especialidades).
                {editando.slug === "contato" && " Obs.: este texto aparece acima do formulário de orçamento."}
              </div>
            </div>

            {/* Análise de SEO ao vivo — some quando está tudo OK */}
            {achadosSeo.some((a) => a.nivel !== "ok") && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Análise de SEO desta página</label>
                <SeoDicas achados={achadosSeo} />
              </div>
            )}
            {editando.slug === "contato" && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Formulário de orçamento</label>
                <FormularioConfigEditor value={formConfig} onChange={setFormConfig} />
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center" }}>
              {msg && <span style={{ fontSize: 13, fontWeight: 600, color: msg.startsWith("Erro") ? "#DC2626" : "#059669" }}>{msg}</span>}
              <BotaoSalvarEstado temAlteracoes={estado.temAlteracoes} salvando={salvando} onClick={() => salvar()} />
            </div>
          </div>
        </div>
      )}

      {configAberto && fotografo && editando && (
        <ConfigPaginaModal
          onFechar={() => setConfigAberto(false)}
          onSalvar={async () => { if (await salvar()) setConfigAberto(false); }}
          valores={valores}
          onChange={setValores}
          recursos={{}}
          urlPublica={`/${editando.slug}`}
          dominio={dominio}
          tituloFallback={titulo}
          descricaoFallback={html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}
          imagemFallback={imagens[0] ?? null}
          fotografoId={fotografo.id}
          salvando={salvando}
        />
      )}

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

export default function PaginasPage() {
  return (
    <Suspense>
      <PaginasConteudo />
    </Suspense>
  );
}
