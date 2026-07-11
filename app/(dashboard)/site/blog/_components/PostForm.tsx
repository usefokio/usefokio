"use client";

// Form de criar/editar post do blog: título, slug, categoria, tags, capa, corpo rico, SEO e publicação.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { uploadFileClient } from "@/lib/storage/uploadClient";
import { processarImagemEntrega } from "@/lib/imageResize";
import { SiteRichEditor } from "@/app/(dashboard)/site/_components/SiteRichEditor";
import { useEditorEstado, SeloEstado, BotaoSalvarEstado, ModalNaoSalvo } from "@/app/(dashboard)/_components/EditorEstado";
import { ConfigPaginaModal } from "@/app/(dashboard)/site/_components/ConfigPaginaModal";
import type { ConfigPaginaValores } from "@/lib/site/seo";
import type { SitePost } from "@/lib/supabase/types";

function slugify(texto: string): string {
  return texto
    .normalize("NFD").replace(/[^\x20-\x7E]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8, boxSizing: "border-box",
  border: "1px solid var(--color-border-secondary)", fontSize: 13,
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)",
  textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5,
};

export function PostForm({ postId }: { postId?: string }) {
  const router = useRouter();
  const { fotografo } = useFotografo();
  const editando = !!postId;

  const [carregando, setCarregando] = useState(editando);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const [titulo, setTitulo] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTocado, setSlugTocado] = useState(false);
  const [categoria, setCategoria] = useState("");
  const [tags, setTags] = useState("");
  const [resumo, setResumo] = useState("");
  const [corpo, setCorpo] = useState("");
  const [publicado, setPublicado] = useState(false);
  const [publicadoEm, setPublicadoEm] = useState(new Date().toISOString().slice(0, 10));
  const [capaUrl, setCapaUrl] = useState<string | null>(null);
  const [legacyId, setLegacyId] = useState<number | null>(null);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [seoKw, setSeoKw] = useState("");
  const [seoNoindex, setSeoNoindex] = useState(false);
  const [ogTitle, setOgTitle] = useState("");
  const [ogDesc, setOgDesc] = useState("");
  const [ogImage, setOgImage] = useState<string | null>(null);
  const [mostrarData, setMostrarData] = useState(true);
  const [configAberto, setConfigAberto] = useState(false);
  const [dominio, setDominio] = useState("seusite.usefokio.com.br");
  const [enviandoCapa, setEnviandoCapa] = useState(false);
  const inputCapaRef = useRef<HTMLInputElement>(null);

  // Estado de salvamento claro (regra de sistema) — capa fica de fora (upload persiste na hora)
  const snapshotAtual = JSON.stringify([titulo, slug, categoria, tags, resumo, corpo, publicado, publicadoEm, seoTitle, seoDesc, seoKw, seoNoindex, ogTitle, ogDesc, ogImage, mostrarData]);
  const estado = useEditorEstado(snapshotAtual, "/site/blog");

  useEffect(() => {
    if (!editando) {
      estado.inicializar(JSON.stringify(["", "", "", "", "", "", false, new Date().toISOString().slice(0, 10), "", "", "", false, "", "", null, true]));
      return;
    }
    if (!fotografo) return;
    const supabase = createClient();
    async function carregar() {
      const { data } = await supabase.from("site_posts").select("*").eq("id", postId!).maybeSingle();
      if (!data) { setMsg({ tipo: "erro", texto: "Post não encontrado." }); setCarregando(false); return; }
      const p = data as SitePost;
      setTitulo(p.titulo); setSlug(p.slug); setSlugTocado(true);
      setCategoria(p.categoria ?? ""); setTags(p.tags ?? "");
      setResumo(p.resumo ?? ""); setCorpo(p.corpo ?? "");
      setPublicado(p.publicado);
      setPublicadoEm(p.publicado_em ? p.publicado_em.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setCapaUrl(p.capa_url); setLegacyId(p.legacy_id);
      setSeoTitle(p.seo_title ?? ""); setSeoDesc(p.seo_description ?? ""); setSeoKw(p.seo_keywords ?? "");
      setSeoNoindex(p.seo_noindex); setOgTitle(p.og_title ?? ""); setOgDesc(p.og_description ?? ""); setOgImage(p.og_image_url);
      setMostrarData(p.mostrar_data);
      const { data: cfg } = await supabase.from("site_config").select("subdominio, dominio_customizado").eq("fotografo_id", fotografo!.id).maybeSingle();
      if (cfg) setDominio(cfg.dominio_customizado || (cfg.subdominio ? `${cfg.subdominio}.usefokio.com.br` : "seusite.usefokio.com.br"));
      estado.inicializar(JSON.stringify([
        p.titulo, p.slug, p.categoria ?? "", p.tags ?? "", p.resumo ?? "", p.corpo ?? "", p.publicado,
        p.publicado_em ? p.publicado_em.slice(0, 10) : new Date().toISOString().slice(0, 10),
        p.seo_title ?? "", p.seo_description ?? "", p.seo_keywords ?? "",
        p.seo_noindex, p.og_title ?? "", p.og_description ?? "", p.og_image_url, p.mostrar_data,
      ]));
      setCarregando(false);
    }
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editando, postId, fotografo]);

  const urlPublica = useMemo(() => `/post/${legacyId ? `${legacyId}-` : ""}${slug || slugify(titulo)}`, [legacyId, slug, titulo]);

  // Ponte para o modal de Configurações (post: URL + mostrar data + SEO + redes; sem modo de exibição).
  const valores: ConfigPaginaValores = {
    slug, mostrar_data: mostrarData, modo_exibicao: "lista",
    seo_title: seoTitle, seo_description: seoDesc, seo_keywords: seoKw, seo_noindex: seoNoindex,
    og_title: ogTitle, og_description: ogDesc, og_image_url: ogImage,
  };
  const setValores = (patch: Partial<ConfigPaginaValores>) => {
    if (patch.slug !== undefined) { setSlug(patch.slug); setSlugTocado(true); }
    if (patch.mostrar_data !== undefined) setMostrarData(patch.mostrar_data);
    if (patch.seo_title !== undefined) setSeoTitle(patch.seo_title);
    if (patch.seo_description !== undefined) setSeoDesc(patch.seo_description);
    if (patch.seo_keywords !== undefined) setSeoKw(patch.seo_keywords);
    if (patch.seo_noindex !== undefined) setSeoNoindex(patch.seo_noindex);
    if (patch.og_title !== undefined) setOgTitle(patch.og_title);
    if (patch.og_description !== undefined) setOgDesc(patch.og_description);
    if (patch.og_image_url !== undefined) setOgImage(patch.og_image_url);
  };

  async function salvar(): Promise<boolean> {
    if (!fotografo) return false;
    if (!titulo.trim()) { setMsg({ tipo: "erro", texto: "Informe o título." }); return false; }
    const slugFinal = (slug || slugify(titulo)).trim();
    setSalvando(true); setMsg(null);
    const supabase = createClient();
    const corpoLimpo = corpo.replace(/<p>\s*<\/p>/g, "").trim();
    const campos = {
      titulo: titulo.trim(), slug: slugFinal,
      categoria: categoria.trim() || null, tags: tags.trim() || null,
      resumo: resumo.trim() || null, corpo: corpoLimpo || null,
      capa_url: capaUrl, publicado,
      publicado_em: publicado ? `${publicadoEm}T12:00:00Z` : null,
      seo_title: seoTitle.trim() || null, seo_description: seoDesc.trim() || null, seo_keywords: seoKw.trim() || null,
      seo_noindex: seoNoindex, og_title: ogTitle.trim() || null, og_description: ogDesc.trim() || null, og_image_url: ogImage,
      mostrar_data: mostrarData,
      updated_at: new Date().toISOString(),
    };
    if (editando) {
      const { error } = await supabase.from("site_posts").update(campos).eq("id", postId!);
      setSalvando(false);
      if (error) { setMsg({ tipo: "erro", texto: error.message }); return false; }
      estado.marcarSalvo(snapshotAtual);
      setMsg({ tipo: "ok", texto: "Post salvo!" });
      return true;
    } else {
      const { data, error } = await supabase.from("site_posts").insert({ ...campos, fotografo_id: fotografo.id }).select("id").single();
      setSalvando(false);
      if (error || !data) { setMsg({ tipo: "erro", texto: error?.message ?? "Erro ao criar." }); return false; }
      estado.marcarSaiu();
      router.replace(`/site/blog/${data.id}`);
      return true;
    }
  }

  async function enviarCapa(files: FileList | null) {
    if (!files || files.length === 0 || !fotografo) return;
    setEnviandoCapa(true);
    try {
      const { blob } = await processarImagemEntrega(files[0], 1600, 0.85);
      const base = slugify(files[0].name.replace(/\.[a-z0-9]+$/i, "")) || "capa";
      const path = `site/${fotografo.id}/posts/${postId ?? "novo"}/${base}-${crypto.randomUUID().slice(0, 6)}.jpg`;
      const { url_publica } = await uploadFileClient(path, blob);
      setCapaUrl(url_publica);
    } catch (e) {
      setMsg({ tipo: "erro", texto: "Falha no upload da capa: " + (e instanceof Error ? e.message : "") });
    }
    setEnviandoCapa(false);
    if (inputCapaRef.current) inputCapaRef.current.value = "";
  }

  if (carregando) return <div style={{ padding: 60, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;

  const btnSalvar = editando
    ? <BotaoSalvarEstado temAlteracoes={estado.temAlteracoes} salvando={salvando} onClick={() => salvar()} />
    : (
      <button onClick={() => salvar()} disabled={salvando}
        style={{ padding: "10px 22px", borderRadius: 9, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
        {salvando ? "Salvando…" : "Criar post"}
      </button>
    );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, gap: 10, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
          {editando ? "Editar post" : "Novo post"}
        </h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {editando && (
            <button onClick={() => setConfigAberto(true)} title="Configurações da página (URL, SEO, redes sociais)"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
              ⚙ Configurações
            </button>
          )}
          {editando && <SeloEstado temAlteracoes={estado.temAlteracoes} />}
          {btnSalvar}
        </div>
      </div>
      <button onClick={estado.sair} style={{ border: "none", background: "transparent", color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 20 }}>
        ← Voltar para o Blog
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>Título *</label>
          <input value={titulo} onChange={(e) => { setTitulo(e.target.value); if (!slugTocado) setSlug(slugify(e.target.value)); }} style={inputStyle} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Categoria</label>
            <input value={categoria} onChange={(e) => setCategoria(e.target.value)} style={inputStyle} placeholder="Ex.: Dicas para o Casamento" />
          </div>
          <div>
            <label style={labelStyle}>Tags (separadas por vírgula)</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} style={inputStyle} placeholder="dicas para noivas, making-of…" />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Capa</label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {capaUrl && <img src={capaUrl} alt="" style={{ width: 160, aspectRatio: "16/10", objectFit: "cover", borderRadius: 8 }} />}
            <button onClick={() => inputCapaRef.current?.click()} disabled={enviandoCapa}
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
              {enviandoCapa ? "Enviando…" : (capaUrl ? "Trocar capa" : "+ Imagem de capa")}
            </button>
            <input ref={inputCapaRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => enviarCapa(e.target.files)} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Resumo (aparece na lista do blog e no SEO)</label>
          <textarea value={resumo} onChange={(e) => setResumo(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
        </div>

        <div>
          <label style={labelStyle}>Conteúdo</label>
          <SiteRichEditor value={corpo} onChange={setCorpo} minHeight={320} pasta={`posts/${postId ?? "novo"}`} />
        </div>

        <div style={{ display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer" }}>
            <input type="checkbox" checked={publicado} onChange={(e) => setPublicado(e.target.checked)} style={{ width: 15, height: 15 }} />
            Publicado
          </label>
          {publicado && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--color-text-secondary)" }}>
              Data de publicação
              <input type="date" value={publicadoEm} onChange={(e) => setPublicadoEm(e.target.value)} style={{ ...inputStyle, width: "auto" }} />
            </label>
          )}
        </div>

        <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
          URL, SEO e redes sociais ficam em <button onClick={() => setConfigAberto(true)} style={{ border: "none", background: "transparent", color: "#2563EB", fontWeight: 600, cursor: "pointer", padding: 0, fontSize: 12 }}>⚙ Configurações</button>.
        </div>
      </div>

      {msg && <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: msg.tipo === "ok" ? "#059669" : "#DC2626" }}>{msg.texto}</div>}
      <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>{btnSalvar}</div>

      {configAberto && fotografo && (
        <ConfigPaginaModal
          onFechar={() => setConfigAberto(false)}
          onSalvar={async () => { if (await salvar() && editando) setConfigAberto(false); }}
          valores={valores}
          onChange={setValores}
          recursos={{ url: true, data: true }}
          urlPublica={urlPublica}
          dominio={dominio}
          tituloFallback={titulo}
          descricaoFallback={resumo}
          imagemFallback={capaUrl}
          fotografoId={fotografo.id}
          salvando={salvando}
        />
      )}

      <ModalNaoSalvo
        aberto={estado.modalAberto}
        salvando={salvando}
        onSalvarESair={async () => { if (await salvar() && editando) estado.sairAgora(); }}
        onSairSemSalvar={estado.sairAgora}
        onContinuar={estado.fecharModal}
      />
    </div>
  );
}
