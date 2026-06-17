"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type InfoGaleria = {
  encontrada: boolean;
  id: string;
  status: "rascunho" | "ativa" | "encerrada" | "aguardando_revisao";
  titulo: string;
  descricao: string | null;
  cliente_nome: string | null;
  data_evento: string | null;
  expira_em: string | null;
  selecao_livre: boolean;
  limite_minimo: number | null;
  limite_maximo: number | null;
  selecao_enviada: boolean;
  capa_url: string | null;
  capa_thumb: string | null;
  tem_senha: boolean;
  mostrar_rating_cliente: boolean;
};

type FotoPublica = {
  id: string;
  url: string;
  thumb: string;
  nome_arquivo: string;
  largura: number | null;
  altura: number | null;
  categoria_id: string | null;
  ordem: number;
  rating: number;
};

type EscolhaCliente = {
  foto_id: string;
  comentario: string | null;
};

type Tela = "carregando" | "nao_encontrada" | "senha" | "capa" | "galeria" | "selecionadas" | "enviada";

// ─── Proteção contra download ─────────────────────────────────────────────────
const noDownload = {
  onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  onDragStart:   (e: React.DragEvent)  => e.preventDefault(),
  style: { WebkitUserDrag: "none", userSelect: "none" } as React.CSSProperties,
} as const;

// ─── Lightbox (visualização grande + seleção + comentário) ────────────────────
function Lightbox({
  fotos,
  indexInicial,
  escolhas,
  info,
  senhaValida,
  galeriaId,
  onToggle,
  onComentario,
  onClose,
}: {
  fotos:       FotoPublica[];
  indexInicial: number;
  escolhas:    Map<string, string | null>;
  info:        InfoGaleria;
  senhaValida: string;
  galeriaId:   string;
  onToggle:    (fotoId: string) => void;
  onComentario:(fotoId: string, texto: string) => void;
  onClose:     () => void;
}) {
  const [idx, setIdx]           = useState(indexInicial);
  const [comentario, setComentario] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [salvou, setSalvou]     = useState(false);
  const debounceRef             = useRef<ReturnType<typeof setTimeout> | null>(null);

  const foto      = fotos[idx];
  const selecionada = escolhas.has(foto.id);
  const maxAtingido = !info.selecao_livre && info.limite_maximo
    ? escolhas.size >= info.limite_maximo && !selecionada
    : false;

  // Sincroniza comentário ao trocar de foto
  useEffect(() => {
    setComentario(escolhas.get(foto.id) ?? "");
    setSalvou(false);
  }, [foto.id]);

  // Salva comentário com debounce (só se foto estiver selecionada)
  useEffect(() => {
    if (!selecionada) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (comentario === (escolhas.get(foto.id) ?? "")) return; // não mudou
      setSalvando(true);
      const supabase = createClient();
      await supabase.rpc("cliente_salvar_comentario", {
        p_galeria_id: galeriaId,
        p_foto_id:    foto.id,
        p_senha:      senhaValida,
        p_comentario: comentario,
      });
      onComentario(foto.id, comentario);
      setSalvando(false);
      setSalvou(true);
      setTimeout(() => setSalvou(false), 1500);
    }, 700);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [comentario, selecionada]);

  // Navegação por teclado
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Se o foco está num campo de texto, não intercepta nenhuma tecla
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;

      if (e.key === "Escape")     onClose();
      if (e.key === "ArrowRight") setIdx((i) => Math.min(i + 1, fotos.length - 1));
      if (e.key === "ArrowLeft")  setIdx((i) => Math.max(i - 1, 0));
      if (e.key === " ")          { e.preventDefault(); onToggle(foto.id); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [foto.id, fotos.length]);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.96)", display: "flex", flexDirection: "column" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Topo */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
          {idx + 1} / {fotos.length}
          {foto.nome_arquivo && <span style={{ marginLeft: 10, fontFamily: "monospace" }}>{foto.nome_arquivo}</span>}
        </div>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%", width: 36, height: 36, fontSize: 18, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
      </div>

      {/* Conteúdo central */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>

        {/* Seta esquerda */}
        <button
          onClick={() => setIdx((i) => Math.max(i - 1, 0))}
          disabled={idx === 0}
          style={{ width: 56, background: "none", border: "none", color: idx === 0 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.5)", fontSize: 28, cursor: idx === 0 ? "default" : "pointer", flexShrink: 0 }}
        >‹</button>

        {/* Foto */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
          <img
            src={foto.url}
            alt=""
            {...noDownload}
            style={{ ...noDownload.style, maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 4 }}
          />
          {/* Badge de selecionada sobre a foto */}
          {selecionada && (
            <div style={{ position: "absolute", top: 14, right: 14, background: "#2563EB", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 7.5L6 11L12.5 4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          )}
        </div>

        {/* Seta direita */}
        <button
          onClick={() => setIdx((i) => Math.min(i + 1, fotos.length - 1))}
          disabled={idx === fotos.length - 1}
          style={{ width: 56, background: "none", border: "none", color: idx === fotos.length - 1 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.5)", fontSize: 28, cursor: idx === fotos.length - 1 ? "default" : "pointer", flexShrink: 0 }}
        >›</button>
      </div>

      {/* Painel inferior: seleção + comentário + teclas */}
      <div style={{ flexShrink: 0, padding: "16px 20px", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)", borderTop: "0.5px solid rgba(255,255,255,0.08)" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Botão de selecionar */}
          <button
            onClick={() => { if (!maxAtingido) onToggle(foto.id); }}
            disabled={maxAtingido}
            style={{
              width: "100%", padding: "12px", borderRadius: 10,
              background: selecionada ? "#2563EB" : maxAtingido ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)",
              border: selecionada ? "none" : "1px solid rgba(255,255,255,0.15)",
              color: maxAtingido && !selecionada ? "rgba(255,255,255,0.25)" : "#fff",
              fontSize: 14, fontWeight: 700, cursor: maxAtingido ? "not-allowed" : "pointer",
              transition: "all 0.15s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {selecionada ? (
              <><span>✓</span> Selecionada — clique para desmarcar</>
            ) : maxAtingido ? (
              <>Limite máximo atingido ({info.limite_maximo} fotos)</>
            ) : (
              <>☆ Selecionar esta foto</>
            )}
          </button>

          {/* Campo de comentário — sempre visível, ativo só quando selecionada */}
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
              <span>Comentário para o fotógrafo (opcional)</span>
              <span style={{ color: salvando ? "rgba(255,255,255,0.3)" : salvou ? "#34D399" : "transparent" }}>
                {salvando ? "salvando…" : salvou ? "✓ salvo" : ""}
              </span>
            </div>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder={selecionada ? "Deixe um comentário…" : "Selecione a foto para adicionar um comentário"}
              disabled={!selecionada}
              rows={2}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                background: selecionada ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${selecionada ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)"}`,
                color: selecionada ? "#fff" : "rgba(255,255,255,0.2)",
                fontSize: 13, resize: "none", outline: "none",
                boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.5,
                cursor: selecionada ? "text" : "default",
                transition: "all 0.2s",
              }}
            />
          </div>

          {/* Legenda de teclas de atalho */}
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            {([
              { key: "← →", label: "Navegar" },
              { key: "Espaço", label: "Selecionar" },
              { key: "Esc", label: "Fechar" },
            ] as const).map(({ key, label }) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                <kbd style={{ padding: "2px 7px", borderRadius: 4, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", fontFamily: "monospace", fontSize: 10, fontStyle: "normal" }}>{key}</kbd>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Miniaturas de navegação */}
      <div style={{ flexShrink: 0, padding: "8px 16px 12px", overflowX: "auto", display: "flex", gap: 4 }}>
        {fotos.map((f, i) => (
          <div
            key={f.id}
            onClick={() => setIdx(i)}
            style={{
              width: 48, height: 48, flexShrink: 0, cursor: "pointer",
              borderRadius: 4, overflow: "hidden",
              outline: i === idx ? "2px solid #2563EB" : escolhas.has(f.id) ? "2px solid rgba(37,99,235,0.5)" : "2px solid transparent",
              outlineOffset: 1, opacity: i === idx ? 1 : 0.6, transition: "opacity 0.15s, outline 0.15s",
            }}
          >
            <img src={f.thumb || f.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Modal de confirmação de envio ───────────────────────────────────────────
function ModalConfirmarSelecao({
  fotos,
  escolhas,
  info,
  enviando,
  erroEnvio,
  onConfirmar,
  onCancelar,
}: {
  fotos:      FotoPublica[];
  escolhas:   Map<string, string | null>;
  info:       InfoGaleria;
  enviando:   boolean;
  erroEnvio:  string;
  onConfirmar: () => void;
  onCancelar:  () => void;
}) {
  const selecionadas = fotos.filter((f) => escolhas.has(f.id));
  const totalComentarios = Array.from(escolhas.values()).filter(Boolean).length;

  // Bloqueia scroll do body enquanto modal está aberto
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // ESC fecha o modal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !enviando) onCancelar();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enviando]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !enviando) onCancelar(); }}
    >
      <div
        style={{
          background: "#fff", borderRadius: "20px 20px 0 0",
          width: "100%", maxWidth: 680,
          maxHeight: "92vh",
          display: "flex", flexDirection: "column",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}
      >
        {/* Cabeçalho */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f0f0f0", flexShrink: 0 }}>
          {/* Puxador visual */}
          <div style={{ width: 40, height: 4, background: "#e0e0e0", borderRadius: 2, margin: "0 auto 16px" }} />

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#111", letterSpacing: "-0.02em" }}>
                Confirmar seleção
              </div>
              <div style={{ fontSize: 13, color: "#888", marginTop: 3 }}>
                {selecionadas.length} foto{selecionadas.length !== 1 ? "s" : ""} selecionada{selecionadas.length !== 1 ? "s" : ""}
                {totalComentarios > 0 && ` · ${totalComentarios} com comentário`}
                {info.limite_maximo && ` · máx. ${info.limite_maximo}`}
              </div>
            </div>
            {!enviando && (
              <button
                onClick={onCancelar}
                style={{ background: "#f5f5f5", border: "none", borderRadius: "50%", width: 32, height: 32, fontSize: 16, color: "#666", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >×</button>
            )}
          </div>
        </div>

        {/* Grid de fotos selecionadas */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {selecionadas.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: 13 }}>
              Nenhuma foto selecionada
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
              gap: 6,
            }}>
              {selecionadas.map((foto) => {
                const comentario = escolhas.get(foto.id);
                const temComentario = !!comentario;
                return (
                  <div
                    key={foto.id}
                    style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", background: "#eee" }}
                  >
                    <img
                      src={foto.thumb || foto.url}
                      alt=""
                      loading="lazy"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                    {/* Badge de check */}
                    <div style={{
                      position: "absolute", bottom: 5, right: 5,
                      width: 20, height: 20, borderRadius: "50%",
                      background: "#2563EB",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                    }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    {/* Badge de comentário */}
                    {temComentario && (
                      <div style={{
                        position: "absolute", top: 4, left: 4,
                        background: "rgba(0,0,0,0.55)",
                        borderRadius: 4, padding: "2px 5px",
                        fontSize: 9, color: "#fff",
                      }}>
                        💬
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Aviso sobre comentários */}
          {totalComentarios > 0 && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: "#f8f8f8", borderRadius: 8, fontSize: 12, color: "#666", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span>💬</span>
              <span>{totalComentarios} foto{totalComentarios !== 1 ? "s têm" : " tem"} comentário — será{totalComentarios !== 1 ? "ão" : ""} enviado{totalComentarios !== 1 ? "s" : ""} ao fotógrafo.</span>
            </div>
          )}
        </div>

        {/* Rodapé com ações */}
        <div style={{ padding: "16px 24px 28px", borderTop: "1px solid #f0f0f0", flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {erroEnvio && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#DC2626", textAlign: "center" }}>
              ⚠️ {erroEnvio}
            </div>
          )}
          <div style={{ fontSize: 12, color: "#999", textAlign: "center" }}>
            Após enviar, o fotógrafo será notificado para analisar sua seleção.
          </div>
          <button
            onClick={onConfirmar}
            disabled={enviando || selecionadas.length === 0}
            style={{
              width: "100%", padding: "15px",
              borderRadius: 12,
              background: enviando || selecionadas.length === 0 ? "#ccc" : "#111",
              color: enviando || selecionadas.length === 0 ? "#999" : "#fff",
              border: "none", fontSize: 15, fontWeight: 800,
              cursor: enviando || selecionadas.length === 0 ? "not-allowed" : "pointer",
              letterSpacing: "-0.01em",
              transition: "all 0.2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {enviando ? (
              <>
                <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                Enviando…
              </>
            ) : (
              <>✓ Confirmar e enviar {selecionadas.length} foto{selecionadas.length !== 1 ? "s" : ""}</>
            )}
          </button>
          <button
            onClick={onCancelar}
            disabled={enviando}
            style={{ width: "100%", padding: "12px", borderRadius: 12, background: "transparent", color: "#888", border: "1px solid #e8e8e8", fontSize: 14, fontWeight: 600, cursor: enviando ? "not-allowed" : "pointer" }}
          >
            Voltar e revisar
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function GaleriaClientePage() {
  const { id } = useParams<{ id: string }>();

  const [tela, setTela]             = useState<Tela>("carregando");
  const [info, setInfo]             = useState<InfoGaleria | null>(null);
  const [senha, setSenha]           = useState("");
  const [senhaErro, setSenhaErro]   = useState("");
  const [fotos, setFotos]           = useState<FotoPublica[]>([]);
  // Map: foto_id → comentário (null = sem comentário)
  const [escolhas, setEscolhas]     = useState<Map<string, string | null>>(new Map());
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [enviando, setEnviando]     = useState(false);
  const [senhaValida, setSenhaValida] = useState("");
  const [modalConfirmar, setModalConfirmar] = useState(false);

  // ── Carrega info da galeria ──
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("galeria_publica", { p_galeria_id: id });
      if (error || !data?.encontrada) { setTela("nao_encontrada"); return; }
      const gInfo = data as InfoGaleria;
      setInfo(gInfo);
      // Se seleção já enviada E galeria aguardando revisão → mostra capa com opção de ver seleção
      // Se seleção enviada E outro status (ex: encerrada) → tela "enviada" simples
      if (gInfo.selecao_enviada && gInfo.status !== "aguardando_revisao") { setTela("enviada"); return; }
      setTela("capa");
    }
    load();
  }, [id]);

  // ── Entrar na galeria (valida senha + carrega fotos) ──
  const entrarNaGaleria = useCallback(async (pw: string) => {
    setSenhaErro("");
    const supabase = createClient();
    const { data, error } = await supabase.rpc("galeria_fotos_publicas", { p_galeria_id: id, p_senha: pw });
    if (error || !data?.ok) {
      setSenhaErro(data?.erro ?? "Senha incorreta. Tente novamente.");
      return;
    }
    setFotos(data.fotos ?? []);

    // Monta o Map de escolhas: foto_id → comentário
    const map = new Map<string, string | null>();
    for (const e of (data.escolhas ?? [])) {
      map.set(e.foto_id, e.comentario ?? null);
    }
    setEscolhas(map);
    setSenhaValida(pw);
    if (data.enviada) {
      // Seleção já enviada — mostra as fotos escolhidas (somente leitura)
      setTela("selecionadas");
      return;
    }
    setTela("galeria");
  }, [id]);

  // ── Toggle seleção ──
  const toggleEscolha = useCallback(async (fotoId: string) => {
    if (!info) return;
    const jaSelecionada = escolhas.has(fotoId);
    if (!jaSelecionada && !info.selecao_livre && info.limite_maximo && escolhas.size >= info.limite_maximo) return;

    // Atualização otimista
    setEscolhas((prev) => {
      const next = new Map(prev);
      if (next.has(fotoId)) next.delete(fotoId);
      else next.set(fotoId, null);
      return next;
    });

    const supabase = createClient();
    await supabase.rpc("cliente_toggle_escolha", { p_galeria_id: id, p_foto_id: fotoId, p_senha: senhaValida });
  }, [info, escolhas, id, senhaValida]);

  // ── Atualiza comentário local ──
  const atualizarComentario = useCallback((fotoId: string, texto: string) => {
    setEscolhas((prev) => {
      const next = new Map(prev);
      if (next.has(fotoId)) next.set(fotoId, texto || null);
      return next;
    });
  }, []);

  // ── Enviar seleção ──
  const [erroEnvio, setErroEnvio] = useState("");
  const enviarSelecao = useCallback(async () => {
    if (!info) return;
    setEnviando(true);
    setErroEnvio("");
    const supabase = createClient();
    const { data, error } = await supabase.rpc("cliente_enviar_selecao", { p_galeria_id: id, p_senha: senhaValida });
    setEnviando(false);
    if (data?.ok) {
      setTela("enviada");
      // Notifica fotógrafo por email (fire-and-forget)
      fetch("/api/email/selecao-enviada", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ galeriaId: id, totalSelecionadas: escolhas.size }),
      }).catch(() => {});
    } else {
      setErroEnvio(data?.erro ?? error?.message ?? "Erro ao enviar. Tente novamente.");
    }
  }, [info, id, senhaValida, escolhas.size]);

  const minOk      = !info?.limite_minimo || escolhas.size >= info.limite_minimo;
  const podeEnviar = minOk && escolhas.size > 0 && !enviando;

  // ═══════════════════════════════════════════════════════════════════════════
  // TELAS
  // ═══════════════════════════════════════════════════════════════════════════

  if (tela === "carregando") return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a" }}>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Carregando…</div>
    </div>
  );

  if (tela === "nao_encontrada") return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0a0a0a", gap: 12 }}>
      <div style={{ fontSize: 36 }}>📷</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Galeria não encontrada</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>O link pode estar incorreto ou a galeria foi removida.</div>
    </div>
  );

  // ── Tela de senha ──
  if (tela === "senha") return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: info?.capa_url ? `linear-gradient(rgba(0,0,0,0.72),rgba(0,0,0,0.88)), url(${info.capa_url}) center/cover` : "#0a0a0a" }}>
      <div style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: "36px 40px", width: 360, textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{info?.titulo}</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 28 }}>Digite a senha para acessar sua galeria</div>
        <input
          type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && entrarNaGaleria(senha)}
          placeholder="Senha de acesso" autoFocus
          style={{ width: "100%", padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.08)", border: senhaErro ? "1px solid rgba(239,68,68,0.6)" : "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: 16, letterSpacing: "0.2em", outline: "none", boxSizing: "border-box", marginBottom: senhaErro ? 8 : 16 }}
        />
        {senhaErro && <div style={{ fontSize: 12, color: "#f87171", marginBottom: 16, textAlign: "left" }}>{senhaErro}</div>}
        <button onClick={() => entrarNaGaleria(senha)} disabled={!senha} style={{ width: "100%", padding: "12px", borderRadius: 10, background: senha ? "#fff" : "rgba(255,255,255,0.15)", color: senha ? "#000" : "rgba(255,255,255,0.3)", border: "none", fontSize: 14, fontWeight: 700, cursor: senha ? "pointer" : "default", transition: "all 0.2s" }}>
          Acessar galeria
        </button>
      </div>
    </div>
  );

  // ── Tela de capa ──
  if (tela === "capa" && info) return (
    <div style={{ height: "100vh", position: "relative", overflow: "hidden", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {info.capa_url && (
        <img src={info.capa_url} alt="capa" {...noDownload}
          style={{ ...noDownload.style, position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }} />
      )}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.85) 100%)" }} />
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "0 24px", maxWidth: 600 }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.2em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 24 }}>Galeria de Seleção</div>
        <h1 style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 16px" }}>{info.titulo}</h1>
        {info.data_evento && <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>{new Date(info.data_evento + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}</div>}
        {info.cliente_nome && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 36 }}>Para {info.cliente_nome}</div>}
        {!info.cliente_nome && <div style={{ marginBottom: 36 }} />}

        {info.status === "encerrada" ? (
          <div style={{ padding: "14px 28px", borderRadius: 40, background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.15)", fontSize: 14, fontWeight: 600 }}>⏹ Prazo de seleção encerrado</div>
        ) : info.status === "rascunho" ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ padding: "14px 28px", borderRadius: 40, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 14, fontWeight: 600 }}>🔧 Galeria em preparação</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Esta galeria ainda não foi liberada para acesso.</div>
          </div>
        ) : info.status === "aguardando_revisao" && info.selecao_enviada ? (
          /* Galeria aguardando revisão: seleção já enviada */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{ padding: "8px 20px", borderRadius: 30, background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.4)", fontSize: 12, fontWeight: 700, color: "#FCD34D", letterSpacing: "0.04em" }}>
              ✓ Seleção enviada — aguardando revisão
            </div>
            <button
              onClick={() => info.tem_senha ? setTela("senha") : entrarNaGaleria("")}
              style={{ padding: "14px 40px", borderRadius: 40, background: "#fff", color: "#000", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: "-0.01em", boxShadow: "0 8px 32px rgba(0,0,0,0.3)", transition: "transform 0.15s, box-shadow 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.4)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.3)"; }}
            >Ver minha seleção</button>
          </div>
        ) : (
          <button
            onClick={() => info.tem_senha ? setTela("senha") : entrarNaGaleria("")}
            style={{ padding: "14px 40px", borderRadius: 40, background: "#fff", color: "#000", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: "-0.01em", boxShadow: "0 8px 32px rgba(0,0,0,0.3)", transition: "transform 0.15s, box-shadow 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.4)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.3)"; }}
          >Ver galeria</button>
        )}

        {info.expira_em && info.status === "ativa" && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 20 }}>Disponível até {new Date(info.expira_em).toLocaleDateString("pt-BR")}</div>
        )}
      </div>
    </div>
  );

  // ── Tela de galeria ──
  if (tela === "galeria" && info) return (
    <div style={{ minHeight: "100vh", background: "#f4f4f4" }}>

      {/* Barra superior */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{info.titulo}</div>
          {info.cliente_nome && <div style={{ fontSize: 11, color: "#888" }}>Para {info.cliente_nome}</div>}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>
            {escolhas.size}{info.limite_maximo ? `/${info.limite_maximo}` : ""}
          </div>
          <div style={{ fontSize: 10, color: "#888", marginTop: -2 }}>
            {info.limite_minimo && escolhas.size < info.limite_minimo ? `mín. ${info.limite_minimo}` : "selecionadas"}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ paddingTop: 68, paddingBottom: 100 }}>
        <div style={{ padding: "16px 16px 10px", maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ fontSize: 12, color: "#999" }}>
            {fotos.length} foto{fotos.length !== 1 ? "s" : ""}
            {info.selecao_livre ? " · Seleção livre"
              : ` · Selecione ${info.limite_minimo ? `mín. ${info.limite_minimo}` : ""}${info.limite_maximo ? ` máx. ${info.limite_maximo}` : ""}`}
            <span style={{ marginLeft: 8, color: "#bbb" }}>· Clique para ampliar · Barra de espaço para selecionar</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 3, padding: "0 3px", maxWidth: 1600, margin: "0 auto" }}>
          {fotos.map((foto, idx) => {
            const selecionada = escolhas.has(foto.id);
            const temComentario = selecionada && !!escolhas.get(foto.id);
            const maxAtingido  = !info.selecao_livre && info.limite_maximo ? escolhas.size >= info.limite_maximo && !selecionada : false;

            return (
              <div
                key={foto.id}
                style={{
                  position: "relative", aspectRatio: "3/2", overflow: "hidden",
                  cursor: "pointer", background: "#ddd",
                  outline: selecionada ? "3px solid #2563EB" : "3px solid transparent",
                  outlineOffset: -3,
                  opacity: maxAtingido ? 0.45 : 1,
                  transition: "outline 0.1s, opacity 0.15s",
                }}
                onClick={() => setLightboxIdx(idx)}
              >
                <img src={foto.thumb || foto.url} alt="" loading="lazy" {...noDownload}
                  style={{ ...noDownload.style, width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.2s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLImageElement).style.transform = "scale(1.04)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).style.transform = "scale(1)"; }}
                />

                {/* Overlay de selecionada */}
                {selecionada && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(37,99,235,0.15)", pointerEvents: "none" }}>
                    {/* Ícone de comentário */}
                    {temComentario && (
                      <div style={{ position: "absolute", bottom: 7, left: 7, background: "rgba(0,0,0,0.55)", borderRadius: 4, padding: "2px 5px", fontSize: 10, color: "#fff", display: "flex", alignItems: "center", gap: 3 }}>
                        💬
                      </div>
                    )}
                  </div>
                )}

                {/* Estrelas (só quando fotógrafo habilitou) */}
                {info.mostrar_rating_cliente && (foto.rating ?? 0) > 0 && (
                  <div style={{ position: "absolute", bottom: 6, left: 6, display: "flex", gap: 1, pointerEvents: "none" }}>
                    {[1,2,3,4,5].map((i) => (
                      <span key={i} style={{ fontSize: 11, color: i <= foto.rating ? "#F59E0B" : "rgba(255,255,255,0.25)", textShadow: "0 1px 2px rgba(0,0,0,0.7)", lineHeight: 1 }}>★</span>
                    ))}
                  </div>
                )}

                {/* Botão rápido de seleção (canto superior direito) */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleEscolha(foto.id); }}
                  title={selecionada ? "Desmarcar" : "Selecionar"}
                  style={{
                    position: "absolute", top: 6, right: 6,
                    width: 28, height: 28, borderRadius: "50%",
                    background: selecionada ? "#2563EB" : "rgba(0,0,0,0.4)",
                    border: selecionada ? "none" : "1.5px solid rgba(255,255,255,0.5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: maxAtingido ? "not-allowed" : "pointer",
                    opacity: selecionada ? 1 : 0,
                    transition: "opacity 0.15s",
                  }}
                  className="select-btn"
                >
                  {selecionada
                    ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 6L4.5 9L10.5 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    : <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 6L4.5 9L10.5 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/></svg>
                  }
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* CSS para hover do botão de seleção */}
      <style>{`
        div:hover > .select-btn { opacity: 1 !important; }
      `}</style>

      {/* Barra inferior */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(0,0,0,0.08)", padding: "12px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
        {erroEnvio && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#DC2626", textAlign: "center" }}>
            ⚠️ {erroEnvio}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1 }}>
            {!info.selecao_livre && info.limite_minimo ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "#888" }}>
                    {escolhas.size < info.limite_minimo ? `Selecione mais ${info.limite_minimo - escolhas.size} foto${info.limite_minimo - escolhas.size !== 1 ? "s" : ""}` : "Mínimo atingido ✓"}
                  </span>
                  <span style={{ fontSize: 11, color: "#888" }}>{escolhas.size}/{info.limite_minimo}</span>
                </div>
                <div style={{ height: 4, background: "#e8e8e8", borderRadius: 2 }}>
                  <div style={{ height: "100%", borderRadius: 2, background: minOk ? "#059669" : "#2563EB", width: `${Math.min(100, (escolhas.size / (info.limite_minimo ?? 1)) * 100)}%`, transition: "width 0.3s" }} />
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: "#888" }}>
                {escolhas.size} foto{escolhas.size !== 1 ? "s" : ""} selecionada{escolhas.size !== 1 ? "s" : ""}
                {Array.from(escolhas.values()).filter(Boolean).length > 0 && ` · ${Array.from(escolhas.values()).filter(Boolean).length} com comentário`}
              </div>
            )}
          </div>
          <button
            onClick={() => setModalConfirmar(true)}
            disabled={!podeEnviar}
            style={{ padding: "11px 24px", borderRadius: 10, background: podeEnviar ? "#111" : "#ccc", color: podeEnviar ? "#fff" : "#999", border: "none", fontSize: 13, fontWeight: 700, cursor: podeEnviar ? "pointer" : "not-allowed", flexShrink: 0, transition: "all 0.2s" }}
          >
            {`Enviar seleção (${escolhas.size})`}
          </button>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <Lightbox
          fotos={fotos}
          indexInicial={lightboxIdx}
          escolhas={escolhas}
          info={info}
          senhaValida={senhaValida}
          galeriaId={id}
          onToggle={toggleEscolha}
          onComentario={atualizarComentario}
          onClose={() => setLightboxIdx(null)}
        />
      )}

      {/* Modal de confirmação de envio */}
      {modalConfirmar && (
        <ModalConfirmarSelecao
          fotos={fotos}
          escolhas={escolhas}
          info={info}
          enviando={enviando}
          erroEnvio={erroEnvio}
          onConfirmar={enviarSelecao}
          onCancelar={() => { if (!enviando) { setModalConfirmar(false); setErroEnvio(""); } }}
        />
      )}
    </div>
  );

  // ── Tela: fotos selecionadas (somente leitura — aguardando revisão) ──
  if (tela === "selecionadas" && info) {
    const fotosEscolhidas = fotos.filter((f) => escolhas.has(f.id));
    const totalComentarios = Array.from(escolhas.values()).filter(Boolean).length;

    return (
      <div style={{ minHeight: "100vh", background: "#f4f4f4" }}>

        {/* Barra superior */}
        <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{info.titulo}</div>
            {info.cliente_nome && <div style={{ fontSize: 11, color: "#888" }}>Para {info.cliente_nome}</div>}
          </div>
          {/* Badge de status */}
          <div style={{ flexShrink: 0, padding: "4px 12px", borderRadius: 20, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", fontSize: 11, fontWeight: 700, color: "#B45309" }}>
            ⏳ Aguardando revisão
          </div>
        </div>

        {/* Banner informativo */}
        <div style={{ background: "#fff", borderBottom: "1px solid rgba(0,0,0,0.06)", padding: "16px 20px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(5,150,105,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>✅</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>Seleção enviada com sucesso!</div>
              <div style={{ fontSize: 13, color: "#666", marginTop: 2 }}>
                {fotosEscolhidas.length} foto{fotosEscolhidas.length !== 1 ? "s" : ""} selecionada{fotosEscolhidas.length !== 1 ? "s" : ""}
                {totalComentarios > 0 && ` · ${totalComentarios} com comentário`}
                {" · "}O fotógrafo irá analisar sua seleção em breve.
              </div>
            </div>
          </div>
        </div>

        {/* Grid das fotos selecionadas */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px 40px" }}>
          <div style={{ fontSize: 12, color: "#999", marginBottom: 14, fontWeight: 500 }}>
            Suas fotos selecionadas
          </div>

          {fotosEscolhidas.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa", fontSize: 14 }}>
              Nenhuma foto selecionada
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 4 }}>
              {fotosEscolhidas.map((foto) => {
                const comentario = escolhas.get(foto.id);
                const temComentario = !!comentario;
                return (
                  <div
                    key={foto.id}
                    style={{ position: "relative", aspectRatio: "3/2", borderRadius: 6, overflow: "hidden", background: "#ddd" }}
                  >
                    <img
                      src={foto.thumb || foto.url}
                      alt=""
                      loading="lazy"
                      {...noDownload}
                      style={{ ...noDownload.style, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />

                    {/* Overlay sutil de selecionada */}
                    <div style={{ position: "absolute", inset: 0, background: "rgba(37,99,235,0.08)", pointerEvents: "none" }} />

                    {/* Badge ✓ */}
                    <div style={{ position: "absolute", bottom: 7, right: 7, width: 26, height: 26, borderRadius: "50%", background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L4.5 8.5L10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>

                    {/* Badge de comentário */}
                    {temComentario && (
                      <div style={{ position: "absolute", bottom: 7, left: 7, background: "rgba(0,0,0,0.55)", borderRadius: 4, padding: "2px 6px", fontSize: 10, color: "#fff", display: "flex", alignItems: "center", gap: 3 }}>
                        💬 <span style={{ maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{comentario}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Comentários expandidos (se houver) */}
          {totalComentarios > 0 && (
            <div style={{ marginTop: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                Comentários enviados
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {fotosEscolhidas.filter((f) => !!escolhas.get(f.id)).map((foto) => (
                  <div key={foto.id} style={{ background: "#fff", borderRadius: 10, padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start", border: "0.5px solid rgba(0,0,0,0.08)" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
                      <img src={foto.thumb || foto.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: "#999", marginBottom: 3, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{foto.nome_arquivo}</div>
                      <div style={{ fontSize: 13, color: "#333", lineHeight: 1.5 }}>💬 {escolhas.get(foto.id)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Tela de confirmação ──
  if (tela === "enviada") return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: info?.capa_url ? `linear-gradient(rgba(0,0,0,0.72),rgba(0,0,0,0.82)), url(${info.capa_url}) center/cover` : "#0a0a0a", textAlign: "center", padding: 24 }}>
      <div style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(20px)", border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: "48px 40px", maxWidth: 440 }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>✅</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 10, letterSpacing: "-0.02em" }}>Seleção enviada!</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
          Suas escolhas foram registradas com sucesso.<br />O fotógrafo irá analisar sua seleção em breve.
        </div>
        {info?.cliente_nome && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 24 }}>{info.titulo} · {info.cliente_nome}</div>
        )}
        {/* Se o fotógrafo reabriu a galeria, o cliente pode recarregar para editar */}
        <button
          onClick={() => window.location.reload()}
          style={{ marginTop: 28, padding: "10px 22px", borderRadius: 30, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer" }}
        >
          O fotógrafo pediu para revisar? Recarregue a página
        </button>
      </div>
    </div>
  );

  return null;
}
