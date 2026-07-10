"use client";

// EDITOR DE BLOCOS da landing page — arrastar para reordenar, adicionar da paleta,
// editar cada bloco e salvar. Base da personalização do site (evolui para as demais páginas).
import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { uploadFileClient } from "@/lib/storage/uploadClient";
import { processarImagemEntrega } from "@/lib/imageResize";
import { SiteRichEditor } from "@/app/(dashboard)/site/_components/SiteRichEditor";
import { useUnsavedGuard } from "@/lib/hooks/useUnsavedGuard";
import { CATALOGO_BLOCOS, dadosParaBlocos, novoBloco, type SiteBloco, type TipoBloco } from "@/lib/site/blocos";
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
// Aceita link normal do YouTube e converte para embed
function normalizarVideo(url: string): string {
  const id = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/)?.[1];
  return id ? `https://www.youtube.com/embed/${id}` : url;
}
function rotuloBloco(tipo: TipoBloco) {
  return CATALOGO_BLOCOS.find((c) => c.tipo === tipo) ?? { label: tipo, icone: "▪" };
}
function resumoBloco(b: SiteBloco): string {
  const d = b.dados;
  return d.titulo || d.nome || d.texto || (d.html ? d.html.replace(/<[^>]+>/g, " ").trim().slice(0, 60) : "") || (d.cards ? `${d.cards.length} card(s)` : "") || "";
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
  const [aberto, setAberto] = useState<string | null>(null);   // bloco expandido para edição
  const [paleta, setPaleta] = useState(false);
  const [enviandoImg, setEnviandoImg] = useState(false);
  const dragIdx = useRef<number | null>(null);
  const [sobreIdx, setSobreIdx] = useState<number | null>(null);
  const inputImgRef = useRef<HTMLInputElement>(null);
  const inputGaleriaRef = useRef<HTMLInputElement>(null);
  const alvoUpload = useRef<{ blocoId: string; campo: "imagem_url" | "logo_url" | "url"; cardIdx?: number } | null>(null);
  const alvoGaleria = useRef<string | null>(null);
  const [filaGaleria, setFilaGaleria] = useState<{ total: number; feitas: number } | null>(null);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
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

  function mudar(blocoId: string, patch: Partial<SiteBloco["dados"]>) {
    setBlocos((prev) => prev.map((b) => b.id === blocoId ? { ...b, dados: { ...b.dados, ...patch } } : b));
  }

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

  function soltar(destino: number) {
    const origem = dragIdx.current;
    dragIdx.current = null; setSobreIdx(null);
    if (origem === null || origem === destino) return;
    setBlocos((prev) => {
      const novas = [...prev];
      const [movido] = novas.splice(origem, 1);
      novas.splice(destino, 0, movido);
      return novas;
    });
  }

  function pedirUpload(blocoId: string, campo: "imagem_url" | "logo_url" | "url", cardIdx?: number) {
    alvoUpload.current = { blocoId, campo, cardIdx };
    inputImgRef.current?.click();
  }

  async function subirImagem(files: FileList | null) {
    const alvo = alvoUpload.current;
    if (!files || files.length === 0 || !fotografo || !alvo) return;
    setEnviandoImg(true);
    try {
      const ehLogo = alvo.campo === "logo_url";
      const { blob } = await processarImagemEntrega(files[0], ehLogo ? 600 : 2000, 0.85);
      const nome = files[0].name.replace(/\.[a-z0-9]+$/i, "").normalize("NFD").replace(/[^\x20-\x7E]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-") || "img";
      const path = `site/${fotografo.id}/landing/${id}/${nome}-${crypto.randomUUID().slice(0, 6)}.${ehLogo ? "png" : "jpg"}`;
      const { url_publica } = await uploadFileClient(path, blob);
      if (alvo.cardIdx !== undefined) {
        setBlocos((prev) => prev.map((b) => {
          if (b.id !== alvo.blocoId) return b;
          const cards = [...(b.dados.cards ?? [])];
          if (cards[alvo.cardIdx!]) cards[alvo.cardIdx!] = { ...cards[alvo.cardIdx!], foto_url: url_publica };
          return { ...b, dados: { ...b.dados, cards } };
        }));
      } else {
        mudar(alvo.blocoId, { [alvo.campo]: url_publica } as Partial<SiteBloco["dados"]>);
      }
    } catch (e) {
      setMsg("Erro no upload: " + (e instanceof Error ? e.message : ""));
    }
    setEnviandoImg(false);
    if (inputImgRef.current) inputImgRef.current.value = "";
  }

  // Upload múltiplo do bloco galeria (em fila, uma a uma)
  async function subirGaleria(files: FileList | null) {
    const blocoId = alvoGaleria.current;
    if (!files || files.length === 0 || !fotografo || !blocoId) return;
    const lista = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setFilaGaleria({ total: lista.length, feitas: 0 });
    for (const file of lista) {
      try {
        const { blob } = await processarImagemEntrega(file, 2000, 0.85);
        const nome = file.name.replace(/\.[a-z0-9]+$/i, "").normalize("NFD").replace(/[^\x20-\x7E]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-") || "img";
        const path = `site/${fotografo.id}/landing/${id}/galeria-${nome}-${crypto.randomUUID().slice(0, 6)}.jpg`;
        const { url_publica } = await uploadFileClient(path, blob);
        setBlocos((prev) => prev.map((b) => b.id === blocoId ? { ...b, dados: { ...b.dados, fotos: [...(b.dados.fotos ?? []), url_publica] } } : b));
      } catch (e) {
        setMsg("Erro no upload: " + (e instanceof Error ? e.message : ""));
      }
      setFilaGaleria((prev) => prev ? { ...prev, feitas: prev.feitas + 1 } : prev);
    }
    setFilaGaleria(null);
    alvoGaleria.current = null;
    if (inputGaleriaRef.current) inputGaleriaRef.current.value = "";
  }

  // Funções que retornam JSX (NÃO componentes): definidas dentro do componente-pai, se fossem
  // componentes o React as remontaria a cada render e os inputs perderiam o foco a cada tecla.
  function btnImagem({ blocoId, campo, urlAtual, rotulo, cardIdx }: { blocoId: string; campo: "imagem_url" | "logo_url" | "url"; urlAtual?: string | null; rotulo: string; cardIdx?: number }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {urlAtual && <img src={urlAtual} alt="" style={{ width: 84, height: 56, objectFit: "cover", borderRadius: 6 }} />}
        <button style={btnPeq} disabled={enviandoImg} onClick={() => pedirUpload(blocoId, campo, cardIdx)}>
          {enviandoImg ? "Enviando…" : (urlAtual ? `Trocar ${rotulo}` : `+ ${rotulo}`)}
        </button>
      </div>
    );
  }

  function camposDoBloco(b: SiteBloco) {
    const d = b.dados;
    switch (b.tipo) {
      case "hero":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label style={labelStyle}>Título</label><input value={d.titulo ?? ""} onChange={(e) => mudar(b.id, { titulo: e.target.value })} style={inputStyle} /></div>
            <div><label style={labelStyle}>Imagem de fundo</label>{btnImagem({ blocoId: b.id, campo: "imagem_url", urlAtual: d.imagem_url, rotulo: "imagem" })}</div>
            <div><label style={labelStyle}>Logo (sobre a imagem)</label>{btnImagem({ blocoId: b.id, campo: "logo_url", urlAtual: d.logo_url, rotulo: "logo" })}</div>
          </div>
        );
      case "titulo":
        return <div><label style={labelStyle}>Texto do título</label><input value={d.texto ?? ""} onChange={(e) => mudar(b.id, { texto: e.target.value })} style={inputStyle} /></div>;
      case "texto":
        return <SiteRichEditor value={d.html ?? ""} onChange={(html) => mudar(b.id, { html })} minHeight={140} pasta={`landing/${id}`} />;
      case "imagem":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {btnImagem({ blocoId: b.id, campo: "url", urlAtual: d.url, rotulo: "imagem" })}
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer" }}>
              <input type="checkbox" checked={d.largura_total ?? false} onChange={(e) => mudar(b.id, { largura_total: e.target.checked })} />
              Largura total da página
            </label>
          </div>
        );
      case "duas_colunas":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label style={labelStyle}>Título</label><input value={d.titulo ?? ""} onChange={(e) => mudar(b.id, { titulo: e.target.value })} style={inputStyle} /></div>
            <div><label style={labelStyle}>Texto</label><SiteRichEditor value={d.html ?? ""} onChange={(html) => mudar(b.id, { html })} minHeight={120} pasta={`landing/${id}`} /></div>
            {btnImagem({ blocoId: b.id, campo: "imagem_url", urlAtual: d.imagem_url, rotulo: "imagem" })}
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer" }}>
              <input type="checkbox" checked={d.invertido ?? false} onChange={(e) => mudar(b.id, { invertido: e.target.checked })} />
              Imagem à esquerda (invertido)
            </label>
          </div>
        );
      case "pacote":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
              <div><label style={labelStyle}>Nome do pacote</label><input value={d.nome ?? ""} onChange={(e) => mudar(b.id, { nome: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>Valor (texto livre)</label><input value={d.valor ?? ""} onChange={(e) => mudar(b.id, { valor: e.target.value })} style={inputStyle} placeholder="R$ 10x 510,00" /></div>
            </div>
            <div>
              <label style={labelStyle}>Itens (um por linha)</label>
              <textarea value={(d.itens ?? []).join("\n")} onChange={(e) => mudar(b.id, { itens: e.target.value.split("\n") })} rows={Math.max(3, (d.itens ?? []).length)} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            {btnImagem({ blocoId: b.id, campo: "imagem_url", urlAtual: d.imagem_url, rotulo: "imagem" })}
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer" }}>
              <input type="checkbox" checked={d.invertido ?? false} onChange={(e) => mudar(b.id, { invertido: e.target.checked })} />
              Imagem à esquerda (invertido)
            </label>
          </div>
        );
      case "cards":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label style={labelStyle}>Título da seção</label><input value={d.titulo ?? ""} onChange={(e) => mudar(b.id, { titulo: e.target.value })} style={inputStyle} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
              {(d.cards ?? []).map((c, i) => (
                <div key={i} style={{ border: "1px solid var(--color-border-secondary)", borderRadius: 8, padding: 10, background: "var(--color-background-primary)" }}>
                  {c.foto_url && <img src={c.foto_url} alt="" style={{ width: "100%", aspectRatio: "3/2", objectFit: "cover", borderRadius: 6, marginBottom: 6 }} />}
                  <input value={c.nome} onChange={(e) => { const cards = [...(d.cards ?? [])]; cards[i] = { ...cards[i], nome: e.target.value }; mudar(b.id, { cards }); }} style={{ ...inputStyle, marginBottom: 6 }} placeholder="Nome" />
                  <input value={c.href ?? ""} onChange={(e) => { const cards = [...(d.cards ?? [])]; cards[i] = { ...cards[i], href: e.target.value }; mudar(b.id, { cards }); }} style={{ ...inputStyle, fontFamily: "monospace", fontSize: 11, marginBottom: 6 }} placeholder="Link (ex.: /portfolio/…)" />
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <button style={btnPeq} disabled={enviandoImg} onClick={() => pedirUpload(b.id, "imagem_url", i)}>Foto</button>
                    <button style={{ ...btnPeq, color: "#DC2626", borderColor: "#DC2626" }} onClick={() => mudar(b.id, { cards: (d.cards ?? []).filter((_, j) => j !== i) })}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
            <button style={btnPeq} onClick={() => mudar(b.id, { cards: [...(d.cards ?? []), { nome: "Novo card" }] })}>+ Card</button>
          </div>
        );
      case "galeria":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
              <div><label style={labelStyle}>Título da seção (opcional)</label><input value={d.titulo ?? ""} onChange={(e) => mudar(b.id, { titulo: e.target.value })} style={inputStyle} /></div>
              <div>
                <label style={labelStyle}>Colunas</label>
                <select value={d.colunas ?? 3} onChange={(e) => mudar(b.id, { colunas: parseInt(e.target.value, 10) })} style={inputStyle}>
                  <option value={2}>2</option><option value={3}>3</option><option value={4}>4</option>
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(4, Math.max(2, d.colunas ?? 3))}, 1fr)`, gap: 8 }}>
              {(d.fotos ?? []).map((f, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <img src={f} alt="" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: 6, display: "block" }} />
                  <button title="Remover foto"
                    onClick={() => mudar(b.id, { fotos: (d.fotos ?? []).filter((_, j) => j !== i) })}
                    style={{ position: "absolute", top: 4, right: 4, border: "none", borderRadius: 999, width: 22, height: 22, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 11, cursor: "pointer" }}>✕</button>
                </div>
              ))}
            </div>
            <button style={btnPeq} disabled={!!filaGaleria}
              onClick={() => { alvoGaleria.current = b.id; inputGaleriaRef.current?.click(); }}>
              {filaGaleria ? `Enviando ${filaGaleria.feitas}/${filaGaleria.total}…` : "+ Adicionar fotos"}
            </button>
          </div>
        );
      case "video":
        return (
          <div>
            <label style={labelStyle}>Link do vídeo (YouTube)</label>
            <input value={d.url ?? ""} onChange={(e) => mudar(b.id, { url: normalizarVideo(e.target.value) })} style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12 }} placeholder="https://www.youtube.com/watch?v=…" />
          </div>
        );
      case "depoimentos":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label style={labelStyle}>Título da seção</label><input value={d.titulo ?? ""} onChange={(e) => mudar(b.id, { titulo: e.target.value })} style={inputStyle} /></div>
            <div><label style={labelStyle}>Link "Escrever avaliação" (opcional)</label><input value={d.escrever_url ?? ""} onChange={(e) => mudar(b.id, { escrever_url: e.target.value })} style={{ ...inputStyle, fontFamily: "monospace", fontSize: 11 }} /></div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Os depoimentos exibidos são os cadastrados em Site → Depoimentos.</div>
          </div>
        );
      case "espaco":
        return (
          <div>
            <label style={labelStyle}>Altura (px)</label>
            <input type="number" min={0} max={400} value={d.altura ?? 40} onChange={(e) => mudar(b.id, { altura: parseInt(e.target.value || "0", 10) })} style={{ ...inputStyle, width: 120 }} />
          </div>
        );
      case "whatsapp":
        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label style={labelStyle}>Texto do botão</label><input value={d.texto ?? ""} onChange={(e) => mudar(b.id, { texto: e.target.value })} style={inputStyle} placeholder="Conversar no WhatsApp" /></div>
            <div><label style={labelStyle}>Número (vazio = o do cadastro)</label><input value={d.numero ?? ""} onChange={(e) => mudar(b.id, { numero: e.target.value.replace(/\D/g, "") })} style={inputStyle} placeholder="5514999990000" /></div>
          </div>
        );
      case "formulario":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div><label style={labelStyle}>Título da seção</label><input value={d.titulo ?? ""} onChange={(e) => mudar(b.id, { titulo: e.target.value })} style={inputStyle} placeholder="Fale comigo" /></div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Campos fixos: nome, email, telefone e mensagem. Os envios aparecem em <strong>Site → Inbox</strong>.</div>
          </div>
        );
      case "divisor":
        return <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Linha divisória — sem opções.</div>;
      default:
        return null;
    }
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
            <a href={`/sites/${fotografo.id}/${slugifyUrl(slug)}`} target="_blank" rel="noopener noreferrer" style={{ ...btnPeq, textDecoration: "none" }}>
              👁 Ver página
            </a>
          )}
          {btnSalvar}
        </div>
      </div>
      <button onClick={handleSair} style={{ border: "none", background: "transparent", color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 18 }}>
        ← Voltar para a lista
      </button>

      <input ref={inputImgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => subirImagem(e.target.files)} />
      <input ref={inputGaleriaRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => subirGaleria(e.target.files)} />

      {/* Identificação */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end", marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Título (interno)</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Slug (URL)</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12 }} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer", paddingBottom: 9 }}>
          <input type="checkbox" checked={publicado} onChange={(e) => setPublicado(e.target.checked)} style={{ width: 15, height: 15 }} />
          Publicada
        </label>
      </div>

      {/* Lista de blocos */}
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8 }}>
        Arraste os blocos para reordenar. Clique num bloco para editar o conteúdo.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {blocos.map((b, idx) => {
          const rot = rotuloBloco(b.tipo);
          const expandido = aberto === b.id;
          return (
            <div
              key={b.id}
              draggable={!expandido}
              onDragStart={() => { dragIdx.current = idx; }}
              onDragOver={(e) => { e.preventDefault(); if (sobreIdx !== idx) setSobreIdx(idx); }}
              onDragLeave={() => { if (sobreIdx === idx) setSobreIdx(null); }}
              onDrop={(e) => { e.preventDefault(); soltar(idx); }}
              onDragEnd={() => { dragIdx.current = null; setSobreIdx(null); }}
              style={{
                border: sobreIdx === idx ? "2px solid #2563EB" : "1px solid var(--color-border-tertiary)",
                borderRadius: 10, background: "var(--color-background-primary)",
              }}
            >
              <div
                onClick={() => setAberto(expandido ? null : b.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", cursor: "pointer" }}
              >
                <span style={{ color: "var(--color-text-secondary)", cursor: "grab" }} title="Arraste para reordenar">⠿</span>
                <span style={{ fontSize: 15 }}>{rot.icone}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", flexShrink: 0 }}>{rot.label}</span>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{resumoBloco(b)}</span>
                <button
                  title="Duplicar bloco"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBlocos((prev) => {
                      const i = prev.findIndex((x) => x.id === b.id);
                      const copia = { ...structuredClone(prev[i]), id: crypto.randomUUID() };
                      const novas = [...prev];
                      novas.splice(i + 1, 0, copia);
                      return novas;
                    });
                  }}
                  style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--color-text-secondary)" }}
                >⧉</button>
                <button
                  title="Remover bloco"
                  onClick={(e) => { e.stopPropagation(); if (confirm("Remover este bloco?")) setBlocos((prev) => prev.filter((x) => x.id !== b.id)); }}
                  style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#DC2626" }}
                >🗑</button>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{expandido ? "▲" : "▼"}</span>
              </div>
              {expandido && (
                <div style={{ padding: "4px 14px 14px", borderTop: "1px solid var(--color-border-tertiary)" }}>
                  <div style={{ paddingTop: 10 }}>
                    {camposDoBloco(b)}
                  </div>
                  {/* Salvar/Fechar do bloco — Salvar grava a página inteira na hora */}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
                    <button style={btnPeq} onClick={() => setAberto(null)}>Fechar</button>
                    <button onClick={() => salvar()} disabled={salvando || !temAlteracoes}
                      style={{ padding: "6px 16px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 700,
                        cursor: salvando || !temAlteracoes ? "default" : "pointer",
                        background: temAlteracoes ? "#2563EB" : "var(--color-background-tertiary)",
                        color: temAlteracoes ? "#fff" : "var(--color-text-secondary)" }}>
                      {salvando ? "Salvando…" : temAlteracoes ? "Salvar" : "Salvo ✓"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Paleta de novos blocos */}
      <div style={{ marginTop: 12 }}>
        {!paleta ? (
          <button style={{ ...btnPeq, width: "100%", padding: "11px" }} onClick={() => setPaleta(true)}>+ Adicionar bloco</button>
        ) : (
          <div style={{ border: "1px dashed var(--color-border-secondary)", borderRadius: 10, padding: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
              {CATALOGO_BLOCOS.map((c) => (
                <button key={c.tipo} style={{ ...btnPeq, textAlign: "left" }}
                  onClick={() => { const nb = novoBloco(c.tipo); setBlocos((prev) => [...prev, nb]); setAberto(nb.id); setPaleta(false); }}>
                  {c.icone} {c.label}
                </button>
              ))}
            </div>
            <button style={{ ...btnPeq, marginTop: 8, border: "none", color: "var(--color-text-secondary)" }} onClick={() => setPaleta(false)}>Cancelar</button>
          </div>
        )}
      </div>

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
