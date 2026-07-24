"use client";

// EDITOR DE BLOCOS compartilhado — lista arrastável + paleta + edição por bloco.
// Extraído do editor de landing pages; usado também pela Aparência (páginas do site).
// O componente NÃO persiste nada: entrega a lista nova via onChange; o pai salva.
import { useRef, useState } from "react";
import { uploadFileClient } from "@/lib/storage/uploadClient";
import { processarImagemEntrega } from "@/lib/imageResize";
import { SiteRichEditor } from "@/app/(dashboard)/site/_components/SiteRichEditor";
import { FormularioConfigEditor } from "@/app/(dashboard)/site/_components/FormularioConfigEditor";
import { normalizarConfig } from "@/lib/site/formulario";
import { normalizarVideoUrl } from "@/lib/utils/youtube";
import { CATALOGO_BLOCOS, novoBloco, valorExibido, separarValor, type SiteBloco, type TipoBloco } from "@/lib/site/blocos";
import { mascaraValor } from "@/lib/utils/format";
import { Seg, Range, campo, PROP_OPTS, ANC_OPTS, mini } from "@/app/(dashboard)/site/_components/ControlesUI";
import { BotaoEscolherDoSite } from "@/app/(dashboard)/site/_components/SeletorImagemSite";
import type { ProporcaoCapa, AncoraFoto, BannerAjuste } from "@/lib/site/design";

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

function rotuloBloco(tipo: TipoBloco) {
  return CATALOGO_BLOCOS.find((c) => c.tipo === tipo) ?? { label: tipo, icone: "▪" };
}
function resumoBloco(b: SiteBloco): string {
  const d = b.dados;
  return d.titulo || d.nome || d.texto || (d.html ? d.html.replace(/<[^>]+>/g, " ").trim().slice(0, 60) : "") || (d.cards ? `${d.cards.length} card(s)` : "") || "";
}

export function EditorBlocos({ blocos, onChange, fotografoId, pasta, acaoBloco }: {
  blocos: SiteBloco[];
  onChange: (blocos: SiteBloco[]) => void;
  fotografoId: string;
  pasta: string;               // subpasta do storage (ex.: "landing/{id}" | "paginas/{id}")
  acaoBloco?: React.ReactNode; // ação extra no rodapé do bloco expandido (ex.: botão Salvar do pai)
}) {
  const [aberto, setAberto] = useState<string | null>(null);
  const [paleta, setPaleta] = useState(false);
  const [enviandoImg, setEnviandoImg] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const dragIdx = useRef<number | null>(null);
  const [sobreIdx, setSobreIdx] = useState<number | null>(null);
  const inputImgRef = useRef<HTMLInputElement>(null);
  const inputGaleriaRef = useRef<HTMLInputElement>(null);
  const alvoUpload = useRef<{ blocoId: string; campo: "imagem_url" | "logo_url" | "url"; cardIdx?: number } | null>(null);
  const alvoGaleria = useRef<string | null>(null);
  const [filaGaleria, setFilaGaleria] = useState<{ total: number; feitas: number } | null>(null);

  // Espelho da lista para updates funcionais (uploads em fila são assíncronos — prop ficaria stale).
  const blocosRef = useRef(blocos);
  blocosRef.current = blocos;
  function aplicar(fn: (prev: SiteBloco[]) => SiteBloco[]) {
    const next = fn(blocosRef.current);
    blocosRef.current = next;
    onChange(next);
  }

  function mudar(blocoId: string, patch: Partial<SiteBloco["dados"]>) {
    aplicar((prev) => prev.map((b) => b.id === blocoId ? { ...b, dados: { ...b.dados, ...patch } } : b));
  }

  function soltar(destino: number) {
    const origem = dragIdx.current;
    dragIdx.current = null; setSobreIdx(null);
    if (origem === null || origem === destino) return;
    aplicar((prev) => {
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

  // Grava a URL escolhida no campo certo do bloco — serve tanto ao upload quanto ao "escolher do site".
  function aplicarImagem(blocoId: string, campo: "imagem_url" | "logo_url" | "url", url: string, cardIdx?: number) {
    if (cardIdx !== undefined) {
      aplicar((prev) => prev.map((b) => {
        if (b.id !== blocoId) return b;
        const cards = [...(b.dados.cards ?? [])];
        if (cards[cardIdx]) cards[cardIdx] = { ...cards[cardIdx], foto_url: url };
        return { ...b, dados: { ...b.dados, cards } };
      }));
    } else {
      mudar(blocoId, { [campo]: url } as Partial<SiteBloco["dados"]>);
    }
  }

  async function subirImagem(files: FileList | null) {
    const alvo = alvoUpload.current;
    if (!files || files.length === 0 || !alvo) return;
    setEnviandoImg(true); setMsg(null);
    try {
      const ehLogo = alvo.campo === "logo_url";
      const { blob } = await processarImagemEntrega(files[0], ehLogo ? 600 : 2000, 0.85);
      const nome = files[0].name.replace(/\.[a-z0-9]+$/i, "").normalize("NFD").replace(/[^\x20-\x7E]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-") || "img";
      const path = `site/${fotografoId}/${pasta}/${nome}-${crypto.randomUUID().slice(0, 6)}.${ehLogo ? "png" : "jpg"}`;
      const { url_publica } = await uploadFileClient(path, blob);
      aplicarImagem(alvo.blocoId, alvo.campo, url_publica, alvo.cardIdx);
    } catch (e) {
      setMsg("Erro no upload: " + (e instanceof Error ? e.message : ""));
    }
    setEnviandoImg(false);
    if (inputImgRef.current) inputImgRef.current.value = "";
  }

  // Upload múltiplo do bloco galeria (em fila, uma a uma)
  async function subirGaleria(files: FileList | null) {
    const blocoId = alvoGaleria.current;
    if (!files || files.length === 0 || !blocoId) return;
    const lista = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setFilaGaleria({ total: lista.length, feitas: 0 });
    for (const file of lista) {
      try {
        const { blob } = await processarImagemEntrega(file, 2000, 0.85);
        const nome = file.name.replace(/\.[a-z0-9]+$/i, "").normalize("NFD").replace(/[^\x20-\x7E]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-") || "img";
        const path = `site/${fotografoId}/${pasta}/galeria-${nome}-${crypto.randomUUID().slice(0, 6)}.jpg`;
        const { url_publica } = await uploadFileClient(path, blob);
        aplicar((prev) => prev.map((b) => b.id === blocoId ? { ...b, dados: { ...b.dados, fotos: [...(b.dados.fotos ?? []), url_publica] } } : b));
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
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {urlAtual && <img src={urlAtual} alt="" style={{ width: 84, height: 56, objectFit: "cover", borderRadius: 6 }} />}
        <button style={btnPeq} disabled={enviandoImg} onClick={() => pedirUpload(blocoId, campo, cardIdx)}>
          {enviandoImg ? "Enviando…" : (urlAtual ? `Trocar ${rotulo}` : `+ ${rotulo}`)}
        </button>
        {/* Reaproveita uma imagem que já está no site (banner/trabalho/coleção/blog) — copia p/ a pasta do destino */}
        <BotaoEscolherDoSite pasta={pasta} rotulo="Do site" estilo={btnPeq}
          onEscolher={(url) => aplicarImagem(blocoId, campo, url, cardIdx)} />
      </div>
    );
  }

  // ── Blocos de opções reaproveitáveis (mesmos controles da Aparência) ──

  // Imagem: proporção + alinhamento do recorte + ajuste. Sem escolha = como sempre foi.
  function opcoesImagem(b: SiteBloco, opts?: { semAjuste?: boolean }) {
    const d = b.dados;
    return (
      <>
        {campo("Proporção da imagem",
          <Seg value={(d.proporcao ?? "original") as ProporcaoCapa | "original"}
            options={[{ v: "original", l: "Original" }, ...PROP_OPTS] as readonly { v: ProporcaoCapa | "original"; l: string }[]}
            onChange={(v) => mudar(b.id, { proporcao: v === "original" ? undefined : (v as ProporcaoCapa) })} />)}
        {d.proporcao && campo("Alinhamento do recorte",
          <>
            <Seg value={d.ancora ?? "centro"} options={ANC_OPTS as readonly { v: AncoraFoto; l: string }[]}
              onChange={(v) => mudar(b.id, { ancora: v })} />
            <p style={{ ...mini, margin: "4px 0 0" }}>Escolhe qual parte da foto aparece quando ela é cortada.</p>
          </>)}
        {d.proporcao && !opts?.semAjuste && campo("Ajuste da imagem",
          <Seg value={d.ajuste ?? "preencher"}
            options={[{ v: "preencher", l: "Preencher" }, { v: "manter_proporcao", l: "Manter proporção" }] as readonly { v: BannerAjuste; l: string }[]}
            onChange={(v) => mudar(b.id, { ajuste: v })} />)}
      </>
    );
  }

  // Espaçamento e largura — valem para QUALQUER bloco.
  function opcoesEspaco(b: SiteBloco) {
    const d = b.dados;
    return (
      <div style={{ marginTop: 6, paddingTop: 12, borderTop: "1px dashed var(--color-border-tertiary)" }}>
        <div style={{ ...mini, fontWeight: 700, marginBottom: 10 }}>Espaçamento e largura</div>
        {campo("Espaço acima", <Range label="Acima" value={d.espaco_antes ?? 0} min={0} max={160} unidade="px"
          onChange={(v) => mudar(b.id, { espaco_antes: v })} />)}
        {campo("Espaço abaixo", <Range label="Abaixo" value={d.espaco_depois ?? 0} min={0} max={160} unidade="px"
          onChange={(v) => mudar(b.id, { espaco_depois: v })} />)}
        {campo("Largura do bloco", <Seg value={d.largura_bloco ?? "normal"}
          options={[{ v: "normal", l: "Normal" }, { v: "total", l: "Ponta a ponta" }] as const}
          onChange={(v) => mudar(b.id, { largura_bloco: v })} />)}
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
            <div><label style={labelStyle}>Texto (subtítulo — opcional)</label><textarea value={d.texto ?? ""} onChange={(e) => mudar(b.id, { texto: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} /></div>
            <div><label style={labelStyle}>Imagem de fundo</label>{btnImagem({ blocoId: b.id, campo: "imagem_url", urlAtual: d.imagem_url, rotulo: "imagem" })}</div>
            <div><label style={labelStyle}>Logo (sobre a imagem)</label>{btnImagem({ blocoId: b.id, campo: "logo_url", urlAtual: d.logo_url, rotulo: "logo" })}</div>
            {campo("Altura do topo", <Range label="Altura" value={d.altura ?? 0} min={0} max={720} unidade={d.altura ? "px" : ""}
              onChange={(v) => mudar(b.id, { altura: v || undefined })} />)}
            {campo("Alinhamento do recorte",
              <Seg value={d.ancora ?? "centro"} options={ANC_OPTS as readonly { v: AncoraFoto; l: string }[]}
                onChange={(v) => mudar(b.id, { ancora: v })} />)}
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer" }}>
              <input type="checkbox" checked={d.com_formulario ?? false} onChange={(e) => mudar(b.id, { com_formulario: e.target.checked })} />
              Incluir formulário de contato sobreposto
            </label>
            {d.com_formulario && (
              <>
                <FormularioConfigEditor value={normalizarConfig(d.formulario)} onChange={(f) => mudar(b.id, { formulario: f })} />
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Os envios aparecem em <strong>Site → Inbox</strong>.</div>
              </>
            )}
          </div>
        );
      case "titulo":
        return <div><label style={labelStyle}>Texto do título</label><input value={d.texto ?? ""} onChange={(e) => mudar(b.id, { texto: e.target.value })} style={inputStyle} /></div>;
      case "texto":
        return <SiteRichEditor value={d.html ?? ""} onChange={(html) => mudar(b.id, { html })} minHeight={140} pasta={pasta} />;
      case "imagem":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {btnImagem({ blocoId: b.id, campo: "url", urlAtual: d.url, rotulo: "imagem" })}
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer" }}>
              <input type="checkbox" checked={d.largura_total ?? false} onChange={(e) => mudar(b.id, { largura_total: e.target.checked })} />
              Largura total da página
            </label>
            {!d.largura_total && campo("Tamanho da imagem",
              <Range label="Largura" value={d.largura ?? 100} min={20} max={100} unidade="%"
                onChange={(v) => mudar(b.id, { largura: v })} />)}
            {opcoesImagem(b)}
          </div>
        );
      case "duas_colunas":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label style={labelStyle}>Título</label><input value={d.titulo ?? ""} onChange={(e) => mudar(b.id, { titulo: e.target.value })} style={inputStyle} /></div>
            <div><label style={labelStyle}>Texto</label><SiteRichEditor value={d.html ?? ""} onChange={(html) => mudar(b.id, { html })} minHeight={120} pasta={pasta} /></div>
            {btnImagem({ blocoId: b.id, campo: "imagem_url", urlAtual: d.imagem_url, rotulo: "imagem" })}
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer" }}>
              <input type="checkbox" checked={d.invertido ?? false} onChange={(e) => mudar(b.id, { invertido: e.target.checked })} />
              Imagem à esquerda (invertido)
            </label>
            {opcoesImagem(b)}
          </div>
        );
      case "pacote": {
        // Valor legado ("R$ 10x 510,00") aparece separado nos campos certos, sem redigitar.
        const val = /r\$/i.test(d.valor ?? "") ? separarValor(d.valor) : { prefixo: d.valor_prefixo ?? "", numero: d.valor ?? "" };
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label style={labelStyle}>Nome do pacote</label><input value={d.nome ?? ""} onChange={(e) => mudar(b.id, { nome: e.target.value })} style={inputStyle} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 10 }}>
              <div>
                <label style={labelStyle}>Antes do valor (opcional)</label>
                <input value={val.prefixo}
                  onChange={(e) => mudar(b.id, { valor_prefixo: e.target.value, valor: val.numero })}
                  style={inputStyle} placeholder="10x" />
              </div>
              <div>
                <label style={labelStyle}>Valor</label>
                <div style={{ display: "flex", alignItems: "stretch" }}>
                  <span style={{ display: "flex", alignItems: "center", padding: "0 10px", border: "1px solid var(--color-border-secondary)", borderRight: "none", borderRadius: "8px 0 0 8px", background: "var(--color-background-secondary)", fontSize: 13, fontWeight: 700, color: "var(--color-text-secondary)" }}>R$</span>
                  <input value={val.numero}
                    onChange={(e) => mudar(b.id, { valor: mascaraValor(e.target.value), valor_prefixo: val.prefixo || undefined })}
                    inputMode="numeric" placeholder="0,00"
                    style={{ ...inputStyle, borderRadius: "0 8px 8px 0" }} />
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: -4 }}>
              Sai na página como <strong>{valorExibido({ ...d, valor: val.numero, valor_prefixo: val.prefixo }) ?? "—"}</strong>
            </div>
            <div>
              <label style={labelStyle}>Itens (um por linha)</label>
              <textarea value={(d.itens ?? []).join("\n")} onChange={(e) => mudar(b.id, { itens: e.target.value.split("\n") })} rows={Math.max(3, (d.itens ?? []).length)} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            {campo("Marcador da lista", <Seg value={d.lista_estilo ?? "bolinha"}
              options={[{ v: "bolinha", l: "• Bolinha" }, { v: "numero", l: "1. Número" }, { v: "traco", l: "– Traço" }, { v: "nenhum", l: "Sem marcador" }] as const}
              onChange={(v) => mudar(b.id, { lista_estilo: v })} />)}
            {btnImagem({ blocoId: b.id, campo: "imagem_url", urlAtual: d.imagem_url, rotulo: "imagem" })}
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer" }}>
              <input type="checkbox" checked={d.invertido ?? false} onChange={(e) => mudar(b.id, { invertido: e.target.checked })} />
              Imagem à esquerda (invertido)
            </label>
            {opcoesImagem(b)}
          </div>
        );
      }
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button style={btnPeq} disabled={enviandoImg} onClick={() => pedirUpload(b.id, "imagem_url", i)}>Foto</button>
                      <BotaoEscolherDoSite pasta={pasta} rotulo="Do site" estilo={btnPeq}
                        onEscolher={(url) => aplicarImagem(b.id, "imagem_url", url, i)} />
                    </div>
                    <button style={{ ...btnPeq, color: "#DC2626", borderColor: "#DC2626" }} onClick={() => mudar(b.id, { cards: (d.cards ?? []).filter((_, j) => j !== i) })}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
            <button style={btnPeq} onClick={() => mudar(b.id, { cards: [...(d.cards ?? []), { nome: "Novo card" }] })}>+ Card</button>
            {campo("Colunas", <Range label="Colunas" value={d.colunas ?? 3} min={1} max={6}
              onChange={(v) => mudar(b.id, { colunas: v })} />)}
            {opcoesImagem(b, { semAjuste: true })}
          </div>
        );
      case "galeria":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label style={labelStyle}>Título da seção (opcional)</label><input value={d.titulo ?? ""} onChange={(e) => mudar(b.id, { titulo: e.target.value })} style={inputStyle} /></div>
            {campo("Colunas", <Range label="Colunas" value={d.colunas ?? 3} min={1} max={6}
              onChange={(v) => mudar(b.id, { colunas: v })} />)}
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
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={btnPeq} disabled={!!filaGaleria}
                onClick={() => { alvoGaleria.current = b.id; inputGaleriaRef.current?.click(); }}>
                {filaGaleria ? `Enviando ${filaGaleria.feitas}/${filaGaleria.total}…` : "+ Adicionar fotos"}
              </button>
              {/* uma foto por vez, anexada ao fim da galeria */}
              <BotaoEscolherDoSite pasta={pasta} rotulo="Do site" estilo={btnPeq}
                onEscolher={(url) => aplicar((prev) => prev.map((x) => x.id === b.id ? { ...x, dados: { ...x.dados, fotos: [...(x.dados.fotos ?? []), url] } } : x))} />
            </div>
            {opcoesImagem(b, { semAjuste: true })}
          </div>
        );
      case "video":
        return (
          <div>
            <label style={labelStyle}>Link do vídeo (YouTube)</label>
            <input value={d.url ?? ""} onChange={(e) => mudar(b.id, { url: normalizarVideoUrl(e.target.value) })} style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12 }} placeholder="https://www.youtube.com/watch?v=…" />
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
        return campo("Altura do respiro",
          <Range label="Altura" value={d.altura ?? 40} min={0} max={400} unidade="px"
            onChange={(v) => mudar(b.id, { altura: v })} />);
      case "whatsapp":
        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label style={labelStyle}>Texto do botão</label><input value={d.texto ?? ""} onChange={(e) => mudar(b.id, { texto: e.target.value })} style={inputStyle} placeholder="Conversar no WhatsApp" /></div>
            <div><label style={labelStyle}>Número (vazio = o do cadastro)</label><input value={d.numero ?? ""} onChange={(e) => mudar(b.id, { numero: e.target.value.replace(/\D/g, "") })} style={inputStyle} placeholder="5514999990000" /></div>
          </div>
        );
      case "formulario":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label style={labelStyle}>Título da seção</label><input value={d.titulo ?? ""} onChange={(e) => mudar(b.id, { titulo: e.target.value })} style={inputStyle} placeholder="Fale comigo" /></div>
            <FormularioConfigEditor value={normalizarConfig(d.formulario)} onChange={(f) => mudar(b.id, { formulario: f })} />
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Os envios aparecem em <strong>Site → Inbox</strong>.</div>
          </div>
        );
      case "divisor":
        return <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Linha divisória — sem opções.</div>;
      default:
        return null;
    }
  }

  return (
    <div>
      <input ref={inputImgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => subirImagem(e.target.files)} />
      <input ref={inputGaleriaRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => subirGaleria(e.target.files)} />

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
                    aplicar((prev) => {
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
                  onClick={(e) => { e.stopPropagation(); if (confirm("Remover este bloco?")) aplicar((prev) => prev.filter((x) => x.id !== b.id)); }}
                  style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#DC2626" }}
                >🗑</button>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{expandido ? "▲" : "▼"}</span>
              </div>
              {expandido && (
                <div style={{ padding: "4px 14px 14px", borderTop: "1px solid var(--color-border-tertiary)" }}>
                  <div style={{ paddingTop: 10 }}>
                    {camposDoBloco(b)}
                    {/* Espaçamento/largura valem para qualquer bloco (o "espaco" já É respiro) */}
                    {b.tipo !== "espaco" && opcoesEspaco(b)}
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
                    <button style={btnPeq} onClick={() => setAberto(null)}>Fechar</button>
                    {acaoBloco}
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
                  onClick={() => { const nb = novoBloco(c.tipo); aplicar((prev) => [...prev, nb]); setAberto(nb.id); setPaleta(false); }}>
                  {c.icone} {c.label}
                </button>
              ))}
            </div>
            <button style={{ ...btnPeq, marginTop: 8, border: "none", color: "var(--color-text-secondary)" }} onClick={() => setPaleta(false)}>Cancelar</button>
          </div>
        )}
      </div>

      {msg && <div style={{ fontSize: 12, fontWeight: 600, color: "#DC2626", marginTop: 8 }}>{msg}</div>}
    </div>
  );
}
