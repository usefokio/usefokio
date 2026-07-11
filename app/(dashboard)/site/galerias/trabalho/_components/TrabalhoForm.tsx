"use client";

// Form de criar/editar Trabalho do Site + gestão de fotos (upload em fila, capa, destaque).
// Fotos só aparecem no modo edição (o trabalho precisa existir para receber uploads).
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { uploadFileClient } from "@/lib/storage/uploadClient";
import { deleteFilesClient } from "@/lib/storage/deleteClient";
import { processarImagemEntrega } from "@/lib/imageResize";
import { RichTextEditor } from "@/app/(dashboard)/crm/_components/RichTextEditor";
import { useEditorEstado, SeloEstado, BotaoSalvarEstado, ModalNaoSalvo } from "@/app/(dashboard)/_components/EditorEstado";
import { ConfigPaginaModal } from "@/app/(dashboard)/site/_components/ConfigPaginaModal";
import type { ConfigPaginaValores } from "@/lib/site/seo";
import type { SiteTrabalho, SiteTrabalhoFoto } from "@/lib/supabase/types";

const CATEGORIAS_BASE = [
  ["casamentos", "Casamentos"],
  ["pre-casamento", "Pré-wedding"],
  ["gestantes", "Gestantes"],
  ["aniversarios", "Aniversários Infantis"],
  ["familia", "Família"],
  ["still-gastronomia", "Still Gastronomia"],
  ["sem-categoria", "Sem categoria"],
] as const;

function slugify(texto: string): string {
  // NFD separa a letra da marca de acento; o filtro ASCII descarta as marcas.
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

export function TrabalhoForm({ trabalhoId }: { trabalhoId?: string }) {
  const router = useRouter();
  const { fotografo } = useFotografo();
  const editando = !!trabalhoId;

  const [carregando, setCarregando] = useState(editando);
  const [salvando, setSalvando]     = useState(false);
  const [msg, setMsg]               = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const [titulo, setTitulo]         = useState("");
  const [categoria, setCategoria]   = useState("casamentos");
  const [slug, setSlug]             = useState("");
  const [slugTocado, setSlugTocado] = useState(false);
  const [descricao, setDescricao]   = useState("");
  const [localEvento, setLocalEvento] = useState("");
  const [dataEvento, setDataEvento] = useState("");
  const [publicado, setPublicado]   = useState(true);
  const [destaqueHome, setDestaqueHome] = useState(false);
  const [seoTitle, setSeoTitle]     = useState("");
  const [seoDesc, setSeoDesc]       = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [seoNoindex, setSeoNoindex]   = useState(false);
  const [ogTitle, setOgTitle]         = useState("");
  const [ogDesc, setOgDesc]           = useState("");
  const [ogImage, setOgImage]         = useState<string | null>(null);
  const [mostrarData, setMostrarData] = useState(true);
  const [modoExibicao, setModoExibicao] = useState("lista");
  const [configAberto, setConfigAberto] = useState(false);
  const [dominio, setDominio]         = useState("seusite.usefokio.com.br");
  const [capaUrl, setCapaUrl]       = useState<string | null>(null);
  const [legacyId, setLegacyId]     = useState<number | null>(null);

  const [fotos, setFotos]           = useState<SiteTrabalhoFoto[]>([]);
  const [fila, setFila]             = useState<{ total: number; feitas: number } | null>(null);
  const inputFileRef                = useRef<HTMLInputElement>(null);

  // Estado de salvamento claro (regra de sistema) — fotos ficam de fora (persistem na hora)
  const snapshotAtual = JSON.stringify([titulo, categoria, slug, descricao, localEvento, dataEvento, publicado, destaqueHome, seoTitle, seoDesc, seoKeywords, seoNoindex, ogTitle, ogDesc, ogImage, mostrarData, modoExibicao]);
  const estado = useEditorEstado(snapshotAtual, "/site/galerias");

  useEffect(() => {
    if (!editando) {
      // Novo trabalho: baseline = formulário vazio (dirty quando algo for preenchido)
      estado.inicializar(JSON.stringify(["", "casamentos", "", "", "", "", true, false, "", "", "", false, "", "", null, true, "lista"]));
      return;
    }
    if (!fotografo) return;
    const supabase = createClient();
    async function carregar() {
      const { data: t } = await supabase.from("site_trabalhos").select("*").eq("id", trabalhoId!).maybeSingle();
      if (!t) { setMsg({ tipo: "erro", texto: "Trabalho não encontrado." }); setCarregando(false); return; }
      const trab = t as SiteTrabalho;
      setTitulo(trab.titulo); setCategoria(trab.categoria); setSlug(trab.slug); setSlugTocado(true);
      setDescricao(trab.descricao ?? ""); setLocalEvento(trab.local ?? ""); setDataEvento(trab.data_evento ?? "");
      setPublicado(trab.publicado); setDestaqueHome(trab.destaque_home);
      setSeoTitle(trab.seo_title ?? ""); setSeoDesc(trab.seo_description ?? "");
      setSeoKeywords(trab.seo_keywords ?? ""); setSeoNoindex(trab.seo_noindex);
      setOgTitle(trab.og_title ?? ""); setOgDesc(trab.og_description ?? ""); setOgImage(trab.og_image_url);
      setMostrarData(trab.mostrar_data); setModoExibicao(trab.modo_exibicao || "lista");
      setCapaUrl(trab.capa_url); setLegacyId(trab.legacy_id);
      // Domínio do site (para as prévias do modal de configurações)
      const { data: cfg } = await supabase.from("site_config").select("subdominio, dominio_customizado").eq("fotografo_id", fotografo!.id).maybeSingle();
      if (cfg) setDominio(cfg.dominio_customizado || (cfg.subdominio ? `${cfg.subdominio}.usefokio.com.br` : "seusite.usefokio.com.br"));
      const { data: fts } = await supabase.from("site_trabalho_fotos").select("*").eq("trabalho_id", trabalhoId!).order("ordem");
      setFotos((fts as SiteTrabalhoFoto[]) ?? []);
      estado.inicializar(JSON.stringify([
        trab.titulo, trab.categoria, trab.slug, trab.descricao ?? "", trab.local ?? "", trab.data_evento ?? "",
        trab.publicado, trab.destaque_home, trab.seo_title ?? "", trab.seo_description ?? "",
        trab.seo_keywords ?? "", trab.seo_noindex, trab.og_title ?? "", trab.og_description ?? "", trab.og_image_url,
        trab.mostrar_data, trab.modo_exibicao || "lista",
      ]));
      setCarregando(false);
    }
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editando, trabalhoId, fotografo]);

  const urlPublica = useMemo(() => {
    const idPart = legacyId ? `${legacyId}-` : "";
    return `/portfolio/${categoria}/${idPart}${slug || slugify(titulo)}`;
  }, [categoria, legacyId, slug, titulo]);

  // Ponte para o modal de Configurações (SEO/redes/exibição): objeto controlado + despacho por campo.
  const valores: ConfigPaginaValores = {
    slug, mostrar_data: mostrarData, modo_exibicao: modoExibicao,
    seo_title: seoTitle, seo_description: seoDesc, seo_keywords: seoKeywords, seo_noindex: seoNoindex,
    og_title: ogTitle, og_description: ogDesc, og_image_url: ogImage,
  };
  const setValores = (patch: Partial<ConfigPaginaValores>) => {
    if (patch.slug !== undefined) { setSlug(patch.slug); setSlugTocado(true); }
    if (patch.mostrar_data !== undefined) setMostrarData(patch.mostrar_data);
    if (patch.modo_exibicao !== undefined) setModoExibicao(patch.modo_exibicao);
    if (patch.seo_title !== undefined) setSeoTitle(patch.seo_title);
    if (patch.seo_description !== undefined) setSeoDesc(patch.seo_description);
    if (patch.seo_keywords !== undefined) setSeoKeywords(patch.seo_keywords);
    if (patch.seo_noindex !== undefined) setSeoNoindex(patch.seo_noindex);
    if (patch.og_title !== undefined) setOgTitle(patch.og_title);
    if (patch.og_description !== undefined) setOgDesc(patch.og_description);
    if (patch.og_image_url !== undefined) setOgImage(patch.og_image_url);
  };

  async function salvar(): Promise<boolean> {
    if (!fotografo) return false;
    if (!titulo.trim()) { setMsg({ tipo: "erro", texto: "Informe o título." }); return false; }
    const slugFinal = (slug || slugify(titulo)).trim();
    if (!slugFinal) { setMsg({ tipo: "erro", texto: "Slug inválido." }); return false; }
    setSalvando(true); setMsg(null);
    const supabase = createClient();
    const descLimpa = descricao.replace(/<p>\s*<\/p>/g, "").trim();
    const campos = {
      titulo: titulo.trim(), categoria, slug: slugFinal,
      descricao: descLimpa || null, local: localEvento.trim() || null, data_evento: dataEvento || null,
      publicado, destaque_home: destaqueHome,
      seo_title: seoTitle.trim() || null, seo_description: seoDesc.trim() || null,
      seo_keywords: seoKeywords.trim() || null, seo_noindex: seoNoindex,
      og_title: ogTitle.trim() || null, og_description: ogDesc.trim() || null, og_image_url: ogImage,
      mostrar_data: mostrarData, modo_exibicao: modoExibicao,
      updated_at: new Date().toISOString(),
    };
    if (editando) {
      const { error } = await supabase.from("site_trabalhos").update(campos).eq("id", trabalhoId!);
      setSalvando(false);
      if (error) { setMsg({ tipo: "erro", texto: error.message }); return false; }
      estado.marcarSalvo(snapshotAtual);
      setMsg({ tipo: "ok", texto: "Trabalho salvo!" });
      return true;
    } else {
      const { data, error } = await supabase.from("site_trabalhos")
        .insert({ ...campos, fotografo_id: fotografo.id })
        .select("id").single();
      setSalvando(false);
      if (error || !data) { setMsg({ tipo: "erro", texto: error?.message ?? "Erro ao criar." }); return false; }
      estado.marcarSaiu();
      router.replace(`/site/galerias/trabalho/${data.id}`);
      return true;
    }
  }

  async function enviarFotos(files: FileList | null) {
    if (!files || files.length === 0 || !fotografo || !trabalhoId) return;
    const supabase = createClient();
    const lista = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setFila({ total: lista.length, feitas: 0 });
    let ordem = fotos.length > 0 ? Math.max(...fotos.map((f) => f.ordem)) + 1 : 0;
    for (const file of lista) {
      try {
        const { blob, largura, altura } = await processarImagemEntrega(file, 1800, 0.85);
        // Preserva o nome original do arquivo (descritivo = melhor pra SEO de imagem);
        // sufixo curto evita colisão entre arquivos de mesmo nome.
        const base = slugify(file.name.replace(/\.[a-z0-9]+$/i, "")) || "foto";
        const path = `site/${fotografo.id}/trabalhos/${trabalhoId}/${base}-${crypto.randomUUID().slice(0, 6)}.jpg`;
        const { storage_path, url_publica } = await uploadFileClient(path, blob);
        const { data } = await supabase.from("site_trabalho_fotos")
          .insert({ trabalho_id: trabalhoId, storage_path, url_publica, ordem: ordem++, largura, altura })
          .select("*").single();
        if (data) setFotos((prev) => [...prev, data as SiteTrabalhoFoto]);
        if (!capaUrl) {
          setCapaUrl(url_publica);
          await supabase.from("site_trabalhos").update({ capa_url: url_publica }).eq("id", trabalhoId);
        }
      } catch (e) {
        console.error("[site] upload falhou:", e instanceof Error ? e.message : e);
      }
      setFila((prev) => prev ? { ...prev, feitas: prev.feitas + 1 } : prev);
    }
    setFila(null);
    if (inputFileRef.current) inputFileRef.current.value = "";
  }

  async function definirCapa(foto: SiteTrabalhoFoto) {
    const supabase = createClient();
    setCapaUrl(foto.url_publica);
    await supabase.from("site_trabalhos").update({ capa_url: foto.url_publica }).eq("id", trabalhoId!);
  }

  async function alternarDestaque(foto: SiteTrabalhoFoto) {
    const supabase = createClient();
    const novo = !foto.destaque;
    setFotos((prev) => prev.map((f) => f.id === foto.id ? { ...f, destaque: novo } : f));
    await supabase.from("site_trabalho_fotos").update({ destaque: novo }).eq("id", foto.id);
  }

  // Legenda (alt/SEO) e tags por foto — salvam na hora (as fotos persistem fora do "não salvo").
  async function atualizarFoto(fotoId: string, patch: Partial<Pick<SiteTrabalhoFoto, "descricao" | "tags">>) {
    setFotos((prev) => prev.map((f) => f.id === fotoId ? { ...f, ...patch } : f));
    await createClient().from("site_trabalho_fotos").update(patch).eq("id", fotoId);
  }

  async function removerFoto(foto: SiteTrabalhoFoto) {
    if (!confirm("Remover esta foto?")) return;
    const supabase = createClient();
    await supabase.from("site_trabalho_fotos").delete().eq("id", foto.id);
    if (foto.storage_path) await deleteFilesClient([{ storage_path: foto.storage_path, url_publica: foto.url_publica }]);
    setFotos((prev) => prev.filter((f) => f.id !== foto.id));
    if (capaUrl === foto.url_publica) {
      setCapaUrl(null);
      await supabase.from("site_trabalhos").update({ capa_url: null }).eq("id", trabalhoId!);
    }
  }

  if (carregando) return (
    <div style={{ padding: 60, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
  );

  const btnSalvar = editando
    ? <BotaoSalvarEstado temAlteracoes={estado.temAlteracoes} salvando={salvando} onClick={() => salvar()} />
    : (
      <button
        onClick={() => salvar()} disabled={salvando}
        style={{ padding: "10px 22px", borderRadius: 9, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
      >
        {salvando ? "Salvando…" : "Criar trabalho"}
      </button>
    );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, gap: 10, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
          {editando ? "Editar trabalho" : "Novo trabalho"}
        </h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {editando && (
            <button onClick={() => setConfigAberto(true)} title="Configurações da página (URL, SEO, redes sociais, exibição)"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
              ⚙ Configurações
            </button>
          )}
          {editando && <SeloEstado temAlteracoes={estado.temAlteracoes} />}
          {btnSalvar}
        </div>
      </div>
      <button onClick={estado.sair} style={{ border: "none", background: "transparent", color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 20 }}>
        ← Voltar para Galerias
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>Título *</label>
          <input value={titulo} onChange={(e) => { setTitulo(e.target.value); if (!slugTocado) setSlug(slugify(e.target.value)); }} style={inputStyle} placeholder="Ex.: Casamento, Ana e João no Espaço X" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Categoria</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={inputStyle}>
              {CATEGORIAS_BASE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Local</label>
            <input value={localEvento} onChange={(e) => setLocalEvento(e.target.value)} style={inputStyle} placeholder="Ex.: Espaço 22 em Ourinhos" />
          </div>
          <div>
            <label style={labelStyle}>Data do evento</label>
            <input type="date" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Descrição</label>
          <RichTextEditor value={descricao} onChange={setDescricao} minHeight={160} />
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>Texto exibido na página do trabalho (bom para SEO).</div>
        </div>

        <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer" }}>
            <input type="checkbox" checked={publicado} onChange={(e) => setPublicado(e.target.checked)} style={{ width: 15, height: 15 }} />
            Publicado
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer" }}>
            <input type="checkbox" checked={destaqueHome} onChange={(e) => setDestaqueHome(e.target.checked)} style={{ width: 15, height: 15 }} />
            Destaque na home
          </label>
        </div>

        <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
          URL, SEO, redes sociais e modo de exibição ficam em <button onClick={() => setConfigAberto(true)} style={{ border: "none", background: "transparent", color: "#2563EB", fontWeight: 600, cursor: "pointer", padding: 0, fontSize: 12 }}>⚙ Configurações</button>.
        </div>
      </div>

      {editando && (
        <div style={{ marginTop: 30 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
              Fotos ({fotos.length})
            </h2>
            <button
              onClick={() => inputFileRef.current?.click()} disabled={!!fila}
              style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}
            >
              {fila ? `Enviando ${fila.feitas}/${fila.total}…` : "+ Adicionar fotos"}
            </button>
            <input ref={inputFileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => enviarFotos(e.target.files)} />
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 12 }}>
            ⭐ = destaque (entra no portfólio da categoria) · a primeira foto vira capa automaticamente
          </div>

          {fotos.length === 0 && !fila && (
            <div style={{ padding: "30px 20px", borderRadius: 12, border: "1px dashed var(--color-border-secondary)", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)" }}>
              Nenhuma foto ainda — clique em “+ Adicionar fotos”.
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {fotos.map((f) => {
              const ehCapa = capaUrl === f.url_publica;
              return (
                <div key={f.id} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: ehCapa ? "2px solid #2563EB" : "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
                  <img src={f.url_publica} alt="" style={{ width: "100%", aspectRatio: "3/2", objectFit: "cover", display: "block" }} loading="lazy" />
                  {ehCapa && <span style={{ position: "absolute", top: 6, left: 6, fontSize: 10, fontWeight: 700, background: "#2563EB", color: "#fff", padding: "2px 7px", borderRadius: 6 }}>Capa</span>}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", gap: 4 }}>
                    <button title={f.destaque ? "Remover destaque" : "Marcar destaque"} onClick={() => alternarDestaque(f)} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 14, opacity: f.destaque ? 1 : 0.35 }}>⭐</button>
                    <button title="Definir como capa" onClick={() => definirCapa(f)} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 12, color: "var(--color-text-secondary)" }}>capa</button>
                    <button title="Remover" onClick={() => removerFoto(f)} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#DC2626" }}>🗑</button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "0 8px 8px" }}>
                    <input defaultValue={f.descricao ?? ""} onBlur={(e) => { const v = e.target.value.trim(); if (v !== (f.descricao ?? "")) atualizarFoto(f.id, { descricao: v || null }); }}
                      placeholder="Legenda (alt/SEO)" title="Legenda usada no alt da imagem (SEO)"
                      style={{ width: "100%", boxSizing: "border-box", padding: "5px 8px", borderRadius: 6, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", fontSize: 11, color: "var(--color-text-primary)", outline: "none" }} />
                    <input defaultValue={f.tags ?? ""} onBlur={(e) => { const v = e.target.value.trim(); if (v !== (f.tags ?? "")) atualizarFoto(f.id, { tags: v || null }); }}
                      placeholder="Tags (vírgula)" title="Palavras-chave da foto, separadas por vírgula"
                      style={{ width: "100%", boxSizing: "border-box", padding: "5px 8px", borderRadius: 6, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", fontSize: 11, color: "var(--color-text-primary)", outline: "none" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {msg && (
        <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: msg.tipo === "ok" ? "#059669" : "#DC2626" }}>{msg.texto}</div>
      )}
      <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>{btnSalvar}</div>

      {configAberto && fotografo && (
        <ConfigPaginaModal
          onFechar={() => setConfigAberto(false)}
          onSalvar={async () => { if (await salvar() && editando) setConfigAberto(false); }}
          valores={valores}
          onChange={setValores}
          recursos={{ url: true, data: true, exibicao: true }}
          urlPublica={urlPublica}
          dominio={dominio}
          tituloFallback={titulo}
          descricaoFallback={descricao.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}
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
