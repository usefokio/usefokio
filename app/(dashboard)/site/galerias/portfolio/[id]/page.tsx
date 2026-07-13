"use client";

// Editor do PORTFÓLIO (best-of da categoria): campos + fotos.
// Híbrido: botão puxa as fotos ⭐ destaque dos trabalhos da categoria; ajuste manual (upload/remover/ordem).
import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { uploadFileClient } from "@/lib/storage/uploadClient";
import { deleteFilesClient } from "@/lib/storage/deleteClient";
import { processarImagemEntrega } from "@/lib/imageResize";
import { useEditorEstado, SeloEstado, BotaoSalvarEstado, ModalNaoSalvo } from "@/app/(dashboard)/_components/EditorEstado";
import { ConfigPaginaModal } from "@/app/(dashboard)/site/_components/ConfigPaginaModal";
import type { ConfigPaginaValores } from "@/lib/site/seo";
import { urlPublicaSite, type ConfigUrl } from "@/lib/site/urlPublica";
import type { SitePortfolio, SitePortfolioFoto } from "@/lib/supabase/types";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8, boxSizing: "border-box",
  border: "1px solid var(--color-border-secondary)", fontSize: 13,
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)",
  textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5,
};

export default function PortfolioEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { fotografo } = useFotografo();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const [portfolio, setPortfolio] = useState<SitePortfolio | null>(null);
  const [titulo, setTitulo] = useState("");
  const [publicado, setPublicado] = useState(true);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [seoKw, setSeoKw] = useState("");
  const [seoNoindex, setSeoNoindex] = useState(false);
  const [ogTitle, setOgTitle] = useState("");
  const [ogDesc, setOgDesc] = useState("");
  const [ogImage, setOgImage] = useState<string | null>(null);
  const [modoExibicao, setModoExibicao] = useState("lista");
  const [configAberto, setConfigAberto] = useState(false);
  const [dominio, setDominio] = useState("seusite.usefokio.com.br");
  const [cfgSite, setCfgSite] = useState<ConfigUrl | null>(null);

  const [fotos, setFotos] = useState<SitePortfolioFoto[]>([]);
  const [capaUrl, setCapaUrl] = useState<string | null>(null);
  const [fila, setFila] = useState<{ total: number; feitas: number } | null>(null);
  const [puxando, setPuxando] = useState(false);
  const inputFileRef = useRef<HTMLInputElement>(null);

  // Estado de salvamento claro (regra de sistema) — fotos ficam de fora (persistem na hora, por design)
  const snapshotAtual = JSON.stringify([titulo, publicado, seoTitle, seoDesc, seoKw, seoNoindex, ogTitle, ogDesc, ogImage, modoExibicao]);
  const estado = useEditorEstado(snapshotAtual, "/site/galerias");

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    async function carregar() {
      const { data: p } = await supabase.from("site_portfolios").select("*").eq("id", id).maybeSingle();
      if (!p) { setMsg({ tipo: "erro", texto: "Portfólio não encontrado." }); setCarregando(false); return; }
      const port = p as SitePortfolio;
      setPortfolio(port);
      setTitulo(port.titulo);
      setPublicado(port.publicado);
      setSeoTitle(port.seo_title ?? ""); setSeoDesc(port.seo_description ?? ""); setSeoKw(port.seo_keywords ?? "");
      setSeoNoindex(port.seo_noindex); setOgTitle(port.og_title ?? ""); setOgDesc(port.og_description ?? ""); setOgImage(port.og_image_url);
      setModoExibicao(port.modo_exibicao || "lista");
      setCapaUrl(port.capa_url);
      const { data: cfg } = await supabase.from("site_config").select("subdominio, dominio_customizado, publicado").eq("fotografo_id", fotografo!.id).maybeSingle();
      if (cfg) { setDominio(cfg.dominio_customizado || (cfg.subdominio ? `${cfg.subdominio}.usefokio.com.br` : "seusite.usefokio.com.br")); setCfgSite(cfg as ConfigUrl); }
      const { data: fts } = await supabase.from("site_portfolio_fotos").select("*").eq("portfolio_id", id).order("ordem");
      setFotos((fts as SitePortfolioFoto[]) ?? []);
      estado.inicializar(JSON.stringify([
        port.titulo, port.publicado, port.seo_title ?? "", port.seo_description ?? "", port.seo_keywords ?? "",
        port.seo_noindex, port.og_title ?? "", port.og_description ?? "", port.og_image_url, port.modo_exibicao || "lista",
      ]));
      setCarregando(false);
    }
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, fotografo]);

  async function salvar(): Promise<boolean> {
    if (!titulo.trim()) { setMsg({ tipo: "erro", texto: "Informe o título." }); return false; }
    setSalvando(true); setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.from("site_portfolios").update({
      titulo: titulo.trim(), publicado,
      seo_title: seoTitle.trim() || null, seo_description: seoDesc.trim() || null, seo_keywords: seoKw.trim() || null,
      seo_noindex: seoNoindex, og_title: ogTitle.trim() || null, og_description: ogDesc.trim() || null, og_image_url: ogImage,
      modo_exibicao: modoExibicao,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    setSalvando(false);
    if (error) { setMsg({ tipo: "erro", texto: error.message }); return false; }
    estado.marcarSalvo(snapshotAtual);
    setMsg({ tipo: "ok", texto: "Portfólio salvo!" });
    return true;
  }

  // Puxa as fotos marcadas ⭐ destaque nos trabalhos da mesma categoria (sem duplicar)
  async function puxarDestaques() {
    if (!portfolio || !fotografo) return;
    setPuxando(true); setMsg(null);
    const supabase = createClient();
    const { data: trabalhos } = await supabase.from("site_trabalhos").select("id").eq("fotografo_id", fotografo.id).eq("categoria", portfolio.categoria);
    const ids = (trabalhos ?? []).map((t: { id: string }) => t.id);
    if (ids.length === 0) { setPuxando(false); setMsg({ tipo: "erro", texto: "Nenhum trabalho nesta categoria." }); return; }
    const { data: destaques } = await supabase.from("site_trabalho_fotos").select("id, url_publica, storage_path, descricao").in("trabalho_id", ids).eq("destaque", true);
    const jaTem = new Set(fotos.map((f) => f.trabalho_foto_id).filter(Boolean));
    const novas = ((destaques ?? []) as { id: string; url_publica: string; storage_path: string | null; descricao: string | null }[])
      .filter((d) => !jaTem.has(d.id));
    let ordem = fotos.length > 0 ? Math.max(...fotos.map((f) => f.ordem)) + 1 : 0;
    let capaDefinida = !!capaUrl;
    for (const d of novas) {
      const { data } = await supabase.from("site_portfolio_fotos")
        .insert({ portfolio_id: id, trabalho_foto_id: d.id, url_publica: d.url_publica, storage_path: d.storage_path, descricao: d.descricao, ordem: ordem++ })
        .select("*").single();
      if (data) setFotos((prev) => [...prev, data as SitePortfolioFoto]);
      if (!capaDefinida && d.url_publica) {
        capaDefinida = true;
        setCapaUrl(d.url_publica);
        await supabase.from("site_portfolios").update({ capa_url: d.url_publica }).eq("id", id);
      }
    }
    setPuxando(false);
    setMsg({ tipo: "ok", texto: novas.length > 0 ? `${novas.length} foto(s) de destaque adicionada(s).` : "Nenhuma foto de destaque nova (marque ⭐ nas fotos dos trabalhos)." });
  }

  async function enviarFotos(files: FileList | null) {
    if (!files || files.length === 0 || !fotografo) return;
    const supabase = createClient();
    const lista = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setFila({ total: lista.length, feitas: 0 });
    let ordem = fotos.length > 0 ? Math.max(...fotos.map((f) => f.ordem)) + 1 : 0;
    // Flag local: sem ela, "!capaUrl" (closure fixa) seria true em toda iteração → capa viraria a última.
    let capaDefinida = !!capaUrl;
    for (const file of lista) {
      try {
        const { blob } = await processarImagemEntrega(file, 1800, 0.85);
        const base = file.name.replace(/\.[a-z0-9]+$/i, "").normalize("NFD").replace(/[^\x20-\x7E]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "foto";
        const path = `site/${fotografo.id}/portfolios/${id}/${base}-${crypto.randomUUID().slice(0, 6)}.jpg`;
        const { storage_path, url_publica } = await uploadFileClient(path, blob);
        const { data } = await supabase.from("site_portfolio_fotos")
          .insert({ portfolio_id: id, storage_path, url_publica, ordem: ordem++ })
          .select("*").single();
        if (data) setFotos((prev) => [...prev, data as SitePortfolioFoto]);
        if (!capaDefinida) {
          capaDefinida = true;
          setCapaUrl(url_publica);
          await supabase.from("site_portfolios").update({ capa_url: url_publica }).eq("id", id);
        }
      } catch (e) {
        console.error("[site] upload portfólio falhou:", e instanceof Error ? e.message : e);
      }
      setFila((prev) => prev ? { ...prev, feitas: prev.feitas + 1 } : prev);
    }
    setFila(null);
    if (inputFileRef.current) inputFileRef.current.value = "";
  }

  async function removerFoto(foto: SitePortfolioFoto) {
    if (!confirm("Remover esta foto do portfólio?")) return;
    const supabase = createClient();
    await supabase.from("site_portfolio_fotos").delete().eq("id", foto.id);
    // Só apaga do storage se for foto avulsa (as de trabalho continuam pertencendo ao trabalho)
    if (!foto.trabalho_foto_id && foto.storage_path) {
      await deleteFilesClient([{ storage_path: foto.storage_path, url_publica: foto.url_publica }]);
    }
    const restantes = fotos.filter((f) => f.id !== foto.id);
    setFotos(restantes);
    // Se removeu a capa, promove a próxima foto disponível (ou limpa).
    if (capaUrl === foto.url_publica) {
      const novaCapa = restantes.find((f) => f.url_publica)?.url_publica ?? null;
      setCapaUrl(novaCapa);
      await supabase.from("site_portfolios").update({ capa_url: novaCapa }).eq("id", id);
    }
  }

  async function definirCapa(foto: SitePortfolioFoto) {
    if (!foto.url_publica) return;
    setCapaUrl(foto.url_publica);
    await createClient().from("site_portfolios").update({ capa_url: foto.url_publica }).eq("id", id);
  }

  // Legenda (alt/SEO) e tags por foto — salvam na hora.
  async function atualizarFoto(fotoId: string, patch: Partial<Pick<SitePortfolioFoto, "descricao" | "tags">>) {
    setFotos((prev) => prev.map((f) => f.id === fotoId ? { ...f, ...patch } : f));
    await createClient().from("site_portfolio_fotos").update(patch).eq("id", fotoId);
  }

  // Reordenação por arrastar-e-soltar: solta na posição desejada e persiste tudo num único upsert.
  const dragIdx = useRef<number | null>(null);
  const [sobreIdx, setSobreIdx] = useState<number | null>(null);

  async function soltar(destino: number) {
    const origem = dragIdx.current;
    dragIdx.current = null;
    setSobreIdx(null);
    if (origem === null || origem === destino) return;
    const novas = [...fotos];
    const [movida] = novas.splice(origem, 1);
    novas.splice(destino, 0, movida);
    const reordenadas = novas.map((f, i) => ({ ...f, ordem: i }));
    setFotos(reordenadas);
    const supabase = createClient();
    const { error } = await supabase.from("site_portfolio_fotos")
      .upsert(reordenadas.map((f) => ({ id: f.id, portfolio_id: id, ordem: f.ordem })), { onConflict: "id" });
    if (error) setMsg({ tipo: "erro", texto: "Falha ao salvar a ordem: " + error.message });
  }

  // Ponte para o modal de Configurações (portfólio: modo de exibição + SEO + redes; sem URL/data).
  // Importados preservam a URL legada; os novos usam a URL limpa /galeria/{slug}.
  const urlPublica = portfolio?.legacy_id
    ? `/gallery.php?id=${portfolio.legacy_id}`
    : (portfolio?.slug ? `/galeria/${portfolio.slug}` : "");
  const valores: ConfigPaginaValores = {
    slug: "", mostrar_data: false, modo_exibicao: modoExibicao,
    seo_title: seoTitle, seo_description: seoDesc, seo_keywords: seoKw, seo_noindex: seoNoindex,
    og_title: ogTitle, og_description: ogDesc, og_image_url: ogImage,
  };
  const setValores = (patch: Partial<ConfigPaginaValores>) => {
    if (patch.modo_exibicao !== undefined) setModoExibicao(patch.modo_exibicao);
    if (patch.seo_title !== undefined) setSeoTitle(patch.seo_title);
    if (patch.seo_description !== undefined) setSeoDesc(patch.seo_description);
    if (patch.seo_keywords !== undefined) setSeoKw(patch.seo_keywords);
    if (patch.seo_noindex !== undefined) setSeoNoindex(patch.seo_noindex);
    if (patch.og_title !== undefined) setOgTitle(patch.og_title);
    if (patch.og_description !== undefined) setOgDesc(patch.og_description);
    if (patch.og_image_url !== undefined) setOgImage(patch.og_image_url);
  };

  if (carregando) return <div style={{ padding: 60, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, gap: 10, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Editar portfólio</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <a href={urlPublicaSite(cfgSite, fotografo?.id ?? "", urlPublica)} target="_blank" rel="noopener noreferrer" title="Abrir este portfólio no site (nova aba)"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer", textDecoration: "none" }}>
            Ver no site ↗
          </a>
          <button onClick={() => setConfigAberto(true)} title="Configurações da página (SEO, redes sociais, modo de exibição)"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
            ⚙ Configurações
          </button>
          <SeloEstado temAlteracoes={estado.temAlteracoes} />
          <BotaoSalvarEstado temAlteracoes={estado.temAlteracoes} salvando={salvando} onClick={() => salvar()} />
        </div>
      </div>
      <button onClick={estado.sair} style={{ border: "none", background: "transparent", color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 20 }}>
        ← Voltar para Galerias
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>Título *</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} style={inputStyle} />
          {portfolio?.legacy_id ? (
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4, fontFamily: "monospace" }}>
              URL preservada: /gallery.php?id={portfolio.legacy_id}
            </div>
          ) : portfolio?.slug ? (
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4, fontFamily: "monospace" }}>
              Endereço no site: /galeria/{portfolio.slug}
            </div>
          ) : null}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer" }}>
          <input type="checkbox" checked={publicado} onChange={(e) => setPublicado(e.target.checked)} style={{ width: 15, height: 15 }} />
          Publicado
        </label>
      </div>

      <div style={{ marginTop: 30 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>Fotos ({fotos.length})</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={puxarDestaques} disabled={puxando}
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
              {puxando ? "Buscando…" : "⭐ Puxar destaques dos trabalhos"}
            </button>
            <button onClick={() => inputFileRef.current?.click()} disabled={!!fila}
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
              {fila ? `Enviando ${fila.feitas}/${fila.total}…` : "+ Adicionar fotos"}
            </button>
          </div>
          <input ref={inputFileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => enviarFotos(e.target.files)} />
        </div>

        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 8 }}>
          Arraste as fotos para reordenar — a ordem aqui é a ordem no site. A <strong>capa</strong> vira o banner no topo da página; a 1ª foto é capa automaticamente, e você pode trocar clicando em “definir capa”.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          {fotos.map((f, idx) => (
            <div
              key={f.id}
              draggable
              onDragStart={(e) => { if ((e.target as HTMLElement).tagName === "INPUT") { e.preventDefault(); return; } dragIdx.current = idx; }}
              onDragOver={(e) => { e.preventDefault(); if (sobreIdx !== idx) setSobreIdx(idx); }}
              onDragLeave={() => { if (sobreIdx === idx) setSobreIdx(null); }}
              onDrop={(e) => { e.preventDefault(); soltar(idx); }}
              onDragEnd={() => { dragIdx.current = null; setSobreIdx(null); }}
              style={{
                position: "relative",
                borderRadius: 10, overflow: "hidden", cursor: "grab",
                border: sobreIdx === idx ? "2px solid #2563EB" : "1px solid var(--color-border-tertiary)",
                background: "var(--color-background-secondary)",
              }}
            >
              {f.url_publica && <img src={f.url_publica} alt="" style={{ width: "100%", aspectRatio: "3/2", objectFit: "cover", display: "block", pointerEvents: "none" }} loading="lazy" />}
              {capaUrl === f.url_publica && <span style={{ position: "absolute", top: 6, left: 6, fontSize: 10, fontWeight: 700, background: "#2563EB", color: "#fff", padding: "2px 7px", borderRadius: 6 }}>Capa</span>}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>#{idx + 1}</span>
                <button title={capaUrl === f.url_publica ? "Esta é a capa do portfólio" : "Definir como capa"} onClick={() => definirCapa(f)}
                  style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 11, fontWeight: 700, color: capaUrl === f.url_publica ? "#2563EB" : "var(--color-text-secondary)" }}>
                  {capaUrl === f.url_publica ? "★ capa" : "definir capa"}
                </button>
                {f.trabalho_foto_id && <span title="Veio de um trabalho (destaque)" style={{ fontSize: 11 }}>⭐</span>}
                <button title="Remover" onClick={() => removerFoto(f)} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#DC2626" }}>🗑</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "0 8px 8px" }} onDragStart={(e) => e.preventDefault()}>
                <input defaultValue={f.descricao ?? ""} onBlur={(e) => { const v = e.target.value.trim(); if (v !== (f.descricao ?? "")) atualizarFoto(f.id, { descricao: v || null }); }}
                  placeholder="Legenda (alt/SEO)" title="Legenda usada no alt da imagem (SEO)" draggable={false}
                  style={{ width: "100%", boxSizing: "border-box", padding: "5px 8px", borderRadius: 6, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", fontSize: 11, color: "var(--color-text-primary)", outline: "none", cursor: "text" }} />
                <input defaultValue={f.tags ?? ""} onBlur={(e) => { const v = e.target.value.trim(); if (v !== (f.tags ?? "")) atualizarFoto(f.id, { tags: v || null }); }}
                  placeholder="Tags (vírgula)" title="Palavras-chave da foto, separadas por vírgula" draggable={false}
                  style={{ width: "100%", boxSizing: "border-box", padding: "5px 8px", borderRadius: 6, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", fontSize: 11, color: "var(--color-text-primary)", outline: "none", cursor: "text" }} />
              </div>
            </div>
          ))}
        </div>
        {fotos.length === 0 && !fila && (
          <div style={{ padding: "30px 20px", borderRadius: 12, border: "1px dashed var(--color-border-secondary)", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)" }}>
            Nenhuma foto — use "⭐ Puxar destaques" ou "+ Adicionar fotos".
          </div>
        )}
      </div>

      {msg && <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: msg.tipo === "ok" ? "#059669" : "#DC2626" }}>{msg.texto}</div>}

      {configAberto && fotografo && (
        <ConfigPaginaModal
          onFechar={() => setConfigAberto(false)}
          onSalvar={async () => { if (await salvar()) setConfigAberto(false); }}
          valores={valores}
          onChange={setValores}
          recursos={{ exibicao: true }}
          urlPublica={urlPublica}
          dominio={dominio}
          tituloFallback={titulo}
          descricaoFallback={(portfolio?.descricao ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || undefined}
          imagemFallback={portfolio?.capa_url}
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
