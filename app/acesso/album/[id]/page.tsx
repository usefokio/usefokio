"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AlbumSelecao, AlbumLamina, AlbumComentario } from "@/lib/supabase/types";

type Page =
  | { type: "capa" }
  | { type: "spread"; lamina: AlbumLamina }
  | { type: "contracapa" };

// ─── Página sistema (capa / contracapa) ──────────────────────────────────────
function SystemPage({
  tipo, titulo, modeloNome, logoUrl, larguraCm, alturaCm,
}: {
  tipo: "capa" | "contracapa";
  titulo: string; modeloNome: string | null; logoUrl: string | null;
  larguraCm: number | null; alturaCm: number | null;
}) {
  const aspRatio = larguraCm && alturaCm ? alturaCm / larguraCm : 1;
  return (
    <div style={{ width: "100%", paddingTop: `${aspRatio * 100}%`, position: "relative", background: "#f4f2ee", borderRadius: 2 }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: "10%" }}>
        {logoUrl && <img src={logoUrl} alt="" style={{ maxHeight: "18%", maxWidth: "55%", objectFit: "contain", opacity: 0.7 }} />}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "clamp(9px,2.5vw,13px)", fontWeight: 400, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: "0.6em" }}>
            {tipo === "capa" ? "Capa" : "Contracapa"}
          </div>
          <div style={{ fontSize: "clamp(14px,4vw,26px)", fontWeight: 700, color: "#333", lineHeight: 1.25 }}>{titulo}</div>
          {modeloNome && (
            <div style={{ fontSize: "clamp(8px,1.8vw,11px)", color: "#bbb", marginTop: "0.8em", letterSpacing: "0.06em" }}>
              {modeloNome}{larguraCm && alturaCm ? ` · ${larguraCm}×${alturaCm} cm` : ""}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Visualizador ─────────────────────────────────────────────────────────────
function BookViewer({
  pages, selecao, logoUrl, comentarios,
  onUpsertComentario, onDeleteComentario, onApprove, onSend,
  podeEditar, aprovado,
}: {
  pages: Page[];
  selecao: AlbumSelecao;
  logoUrl: string | null;
  comentarios: AlbumComentario[];
  onUpsertComentario: (laminaId: string, texto: string, comentarioId?: string) => Promise<AlbumComentario | null>;
  onDeleteComentario: (id: string) => void;
  onApprove: () => void;
  onSend: () => void;
  podeEditar: boolean;
  aprovado: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [anim, setAnim] = useState<"none" | "out-left" | "out-right" | "in-left" | "in-right">("none");
  // Textos por lamina_id — não resetam ao navegar
  const [textos, setTextos] = useState<Record<string, string>>({});
  const [statusSalvo, setStatusSalvo] = useState<Record<string, "idle" | "salvando" | "salvo">>({});
  const animating = useRef(false);
  const total = pages.length;
  const page  = pages[idx];

  const isCapa       = page.type === "capa";
  const isContracapa = page.type === "contracapa";
  const isSingle     = isCapa || isContracapa;

  // Inicializa textos a partir dos comentários já carregados (um por lâmina)
  useEffect(() => {
    const mapa: Record<string, string> = {};
    comentarios.forEach((c) => {
      if (!mapa[c.lamina_id]) mapa[c.lamina_id] = c.texto;
    });
    setTextos((prev) => {
      // Só preenche campos que o cliente ainda não começou a digitar
      const merged: Record<string, string> = { ...mapa };
      Object.keys(prev).forEach((k) => { if (prev[k]) merged[k] = prev[k]; });
      return merged;
    });
  }, [comentarios]);

  // Teclado
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") navigate(1);
      if (e.key === "ArrowLeft")  navigate(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function navigate(dir: 1 | -1) {
    const next = idx + dir;
    if (next < 0 || next >= total || animating.current) return;
    animating.current = true;
    const outAnim = dir === 1 ? "out-left" : "out-right";
    const inAnim  = dir === 1 ? "in-right" : "in-left";
    setAnim(outAnim);
    setTimeout(() => {
      setIdx(next);
      setAnim(inAnim);
      setTimeout(() => { setAnim("none"); animating.current = false; }, 350);
    }, 280);
  }

  const pageComentarios = page.type === "spread"
    ? comentarios.filter((c) => c.lamina_id === page.lamina.id)
    : [];
  const totalComentarios = comentarios.length;
  const temComentarios   = totalComentarios > 0;

  const bookTransform = isCapa
    ? "rotateY(-14deg) scale(0.94)"
    : isContracapa ? "rotateY(14deg) scale(0.94)" : "rotateY(0deg) scale(1)";

  const animStyle: React.CSSProperties =
    anim === "out-left"  ? { opacity: 0, transform: `${bookTransform} translateX(-60px)` } :
    anim === "out-right" ? { opacity: 0, transform: `${bookTransform} translateX(60px)`  } :
    anim === "in-right"  ? { opacity: 0, transform: `${bookTransform} translateX(60px)`  } :
    anim === "in-left"   ? { opacity: 0, transform: `${bookTransform} translateX(-60px)` } :
    { opacity: 1, transform: bookTransform };

  async function autoSalvar(laminaId: string) {
    if (!podeEditar) return;
    const texto = textos[laminaId]?.trim() ?? "";
    // Comentário existente para esta lâmina
    const existente = comentarios.find((c) => c.lamina_id === laminaId);
    // Se texto igual ao salvo, não faz nada
    if (existente && existente.texto === texto) return;
    // Se vazio e não há existente, não faz nada
    if (!texto && !existente) return;
    // Se vazio e há existente, deleta
    if (!texto && existente) {
      onDeleteComentario(existente.id);
      return;
    }
    setStatusSalvo((s) => ({ ...s, [laminaId]: "salvando" }));
    await onUpsertComentario(laminaId, texto, existente?.id);
    setStatusSalvo((s) => ({ ...s, [laminaId]: "salvo" }));
    setTimeout(() => setStatusSalvo((s) => ({ ...s, [laminaId]: "idle" })), 2000);
  }

  return (
    <div style={{ width: "100%", userSelect: "none" }}>

      {/* Contador */}
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <span style={{
          fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase",
          letterSpacing: "0.06em", padding: "3px 12px", borderRadius: 20,
          background: "rgba(0,0,0,0.05)",
        }}>
          {isCapa ? "Capa" : isContracapa ? "Contracapa" : `Lâmina ${idx} de ${total - 2}`}
          {" · "}{idx + 1}/{total}
        </span>
      </div>

      {/* Livro 3D */}
      <div style={{ perspective: "1200px", perspectiveOrigin: "50% 45%" }}>
        <div style={{
          ...animStyle,
          transition: anim === "none" ? "transform 0.45s ease, opacity 0s" : "transform 0.28s ease, opacity 0.28s ease",
          position: "relative",
          margin: "0 auto",
          maxWidth: isSingle ? "54%" : "100%",
        }}>
          <div style={{
            position: "absolute", bottom: -12, left: "3%", right: "3%", height: 16,
            background: "radial-gradient(ellipse at center, rgba(0,0,0,0.28) 0%, transparent 70%)",
            filter: "blur(4px)",
          }} />
          <div style={{
            borderRadius: "2px 8px 8px 2px", overflow: "hidden",
            boxShadow: isSingle
              ? "-4px 4px 20px rgba(0,0,0,0.25), 4px 0 0 #c8b89a"
              : "-4px 4px 20px rgba(0,0,0,0.25)",
          }}>
            {page.type === "capa" && <SystemPage tipo="capa" titulo={selecao.titulo} modeloNome={selecao.modelo_nome} logoUrl={logoUrl} larguraCm={selecao.modelo_largura_cm} alturaCm={selecao.modelo_altura_cm} />}
            {page.type === "contracapa" && <SystemPage tipo="contracapa" titulo={selecao.titulo} modeloNome={selecao.modelo_nome} logoUrl={logoUrl} larguraCm={selecao.modelo_largura_cm} alturaCm={selecao.modelo_altura_cm} />}
            {page.type === "spread" && (
              <>
                <img src={page.lamina.url_publica} alt="" style={{ display: "block", width: "100%", height: "auto" }} draggable={false} />
                <div style={{ position: "absolute", top: 0, bottom: 0, left: "calc(50% - 1px)", width: 3, background: "linear-gradient(to right, rgba(0,0,0,0.18), rgba(0,0,0,0.06), rgba(0,0,0,0.18))" }} />
              </>
            )}
            {isCapa && <div style={{ position: "absolute", top: "3%", bottom: "3%", right: -5, width: 5, background: "linear-gradient(to right, #d4c5a9, #ede0c4, #d4c5a9)", borderRadius: "0 2px 2px 0" }} />}
            {isContracapa && <div style={{ position: "absolute", top: "3%", bottom: "3%", left: -5, width: 5, background: "linear-gradient(to left, #d4c5a9, #ede0c4, #d4c5a9)", borderRadius: "2px 0 0 2px" }} />}
          </div>
        </div>
      </div>

      {/* Navegação */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 28 }}>
        <button onClick={() => navigate(-1)} disabled={idx === 0} style={{ width: 44, height: 44, borderRadius: "50%", border: "0.5px solid var(--color-border-secondary)", background: idx === 0 ? "var(--color-background-secondary)" : "var(--color-background-primary)", color: idx === 0 ? "var(--color-text-secondary)" : "var(--color-text-primary)", fontSize: 18, cursor: idx === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: idx === 0 ? 0.35 : 1, boxShadow: idx === 0 ? "none" : "0 1px 4px rgba(0,0,0,0.08)" }}>←</button>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {pages.map((_, i) => (
            <button key={i} onClick={() => { if (!animating.current) setIdx(i); }} style={{ width: i === idx ? 20 : 7, height: 7, borderRadius: 4, border: "none", padding: 0, cursor: "pointer", background: i === idx ? "#2563EB" : "var(--color-border-secondary)", transition: "width 0.25s, background 0.25s" }} />
          ))}
        </div>
        <button onClick={() => navigate(1)} disabled={idx === total - 1} style={{ width: 44, height: 44, borderRadius: "50%", border: "0.5px solid var(--color-border-secondary)", background: idx === total - 1 ? "var(--color-background-secondary)" : "var(--color-background-primary)", color: idx === total - 1 ? "var(--color-text-secondary)" : "var(--color-text-primary)", fontSize: 18, cursor: idx === total - 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: idx === total - 1 ? 0.35 : 1, boxShadow: idx === total - 1 ? "none" : "0 1px 4px rgba(0,0,0,0.08)" }}>→</button>
      </div>

      {/* ── Área de comentário (apenas spreads) ── */}
      {page.type === "spread" && !aprovado && (
        <div style={{ marginTop: 24, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
          {podeEditar ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  Observação sobre esta lâmina
                </label>
                {statusSalvo[page.lamina.id] === "salvando" && (
                  <span style={{ fontSize: 11, color: "#94A3B8" }}>Salvando…</span>
                )}
                {statusSalvo[page.lamina.id] === "salvo" && (
                  <span style={{ fontSize: 11, color: "#059669" }}>✓ Salvo</span>
                )}
              </div>
              <textarea
                value={textos[page.lamina.id] ?? ""}
                onChange={(e) => setTextos((prev) => ({ ...prev, [page.lamina.id]: e.target.value }))}
                onBlur={() => autoSalvar(page.lamina.id)}
                placeholder="Descreva o que deve ser alterado nesta página…"
                rows={3}
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "10px 12px", borderRadius: 8,
                  border: "0.5px solid var(--color-border-secondary)",
                  background: "var(--color-background-secondary)",
                  color: "var(--color-text-primary)",
                  fontSize: 13, resize: "vertical",
                  fontFamily: "inherit", outline: "none", lineHeight: 1.5,
                }}
              />
              <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-secondary)" }}>
                Salvo automaticamente ao sair do campo. Deixe vazio para remover.
              </p>
            </div>
          ) : (
            /* Modo leitura: mostrar comentários mesmo depois de enviado */
            pageComentarios.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Sua observação
                </div>
                {pageComentarios.map((c) => (
                  <div key={c.id} style={{ padding: "10px 12px", borderRadius: 8, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.5 }}>
                    {c.texto}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* ── Ações do cliente ── */}
      {!aprovado && podeEditar && (
        <div style={{ marginTop: 28, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 24 }}>
          {temComentarios ? (
            <>
              <div style={{ background: "rgba(37,99,235,0.06)", border: "0.5px solid rgba(37,99,235,0.2)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 12, color: "#1E40AF" }}>
                Você adicionou <strong>{totalComentarios} observaç{totalComentarios === 1 ? "ão" : "ões"}</strong>. Clique em <strong>Enviar ao fotógrafo</strong> quando terminar de revisar todas as lâminas.
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={onSend} style={{ flex: 1, minWidth: 160, padding: "12px 20px", borderRadius: 9, border: "none", background: "#2563EB", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  📨 Enviar ao fotógrafo
                </button>
                <button onClick={onApprove} style={{ padding: "12px 20px", borderRadius: 9, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer" }}>
                  Aprovar assim mesmo
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ background: "rgba(16,185,129,0.06)", border: "0.5px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 12, color: "#065F46" }}>
                Revise todas as lâminas. Quando estiver satisfeito, clique em <strong>Aprovar álbum</strong>.
              </div>
              <button onClick={onApprove} style={{ width: "100%", padding: "12px 20px", borderRadius: 9, border: "none", background: "#059669", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                ✅ Aprovar álbum
              </button>
            </>
          )}
        </div>
      )}

      {aprovado && (
        <div style={{ marginTop: 28, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 24, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#059669", marginBottom: 4 }}>Álbum aprovado!</div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>O fotógrafo recebeu sua aprovação e vai encaminhar para produção.</div>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AcessoAlbumPage() {
  const { id } = useParams<{ id: string }>();

  const [selecao,       setSelecao]       = useState<AlbumSelecao & { fotografos?: { logo_url: string | null } } | null>(null);
  const [laminas,       setLaminas]       = useState<AlbumLamina[]>([]);
  const [comentarios,   setComentarios]   = useState<AlbumComentario[]>([]);
  const [carregando,    setCarregando]    = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [enviado,       setEnviado]       = useState(false);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("album_selecoes").select("*, fotografos(logo_url)").eq("id", id).in("status", ["ativa", "aprovado", "aguardando_revisao"]).maybeSingle(),
      supabase.from("album_laminas").select("*").eq("selecao_id", id).order("ordem").order("created_at"),
      supabase.from("album_comentarios").select("*").eq("selecao_id", id).order("created_at"),
    ]).then(([{ data: s }, { data: l }, { data: c }]) => {
      if (!s) { setNaoEncontrado(true); setCarregando(false); return; }
      setSelecao(s as any);
      setLaminas((l as AlbumLamina[]) ?? []);
      setComentarios((c as AlbumComentario[]) ?? []);
      setCarregando(false);
    });
  }, [id]);

  // Upsert: cria novo ou atualiza existente pelo ID
  async function handleUpsertComentario(laminaId: string, texto: string, comentarioId?: string): Promise<AlbumComentario | null> {
    const supabase = createClient();
    if (comentarioId) {
      // Atualizar existente
      const { data, error } = await supabase
        .from("album_comentarios")
        .update({ texto, updated_at: new Date().toISOString() })
        .eq("id", comentarioId)
        .select()
        .single();
      if (!error && data) {
        setComentarios((prev) => prev.map((c) => c.id === comentarioId ? data as AlbumComentario : c));
        return data as AlbumComentario;
      }
      return null;
    } else {
      // Inserir novo
      const { data, error } = await supabase
        .from("album_comentarios")
        .insert({ selecao_id: id, lamina_id: laminaId, pos_x: 0, pos_y: 0, texto })
        .select()
        .single();
      if (!error && data) {
        setComentarios((prev) => [...prev, data as AlbumComentario]);
        return data as AlbumComentario;
      }
      return null;
    }
  }

  async function handleDeleteComentario(comentarioId: string) {
    const supabase = createClient();
    await supabase.from("album_comentarios").delete().eq("id", comentarioId);
    setComentarios((prev) => prev.filter((c) => c.id !== comentarioId));
  }

  async function handleApprove() {
    const supabase = createClient();
    await supabase.from("album_selecoes").update({ status: "aprovado" }).eq("id", id);
    setSelecao((s) => s ? { ...s, status: "aprovado" } : s);
    setEnviado(true);
  }

  async function handleSend() {
    const supabase = createClient();
    await supabase.from("album_selecoes").update({ status: "aguardando_revisao" }).eq("id", id);
    setSelecao((s) => s ? { ...s, status: "aguardando_revisao" } : s);
    setEnviado(true);
  }

  if (carregando) {
    return (
      <div style={{ minHeight: "calc(100vh - var(--dev-banner-h, 0px))", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-tertiary)" }}>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando álbum…</div>
      </div>
    );
  }

  if (naoEncontrado || !selecao) {
    return (
      <div style={{ minHeight: "calc(100vh - var(--dev-banner-h, 0px))", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-tertiary)", padding: 20 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📖</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 8 }}>Álbum não encontrado</div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Este link pode estar inativo. Fale com o fotógrafo.</div>
        </div>
      </div>
    );
  }

  const logoUrl    = (selecao as any).fotografos?.logo_url ?? null;
  const aprovado   = selecao.status === "aprovado";
  const podeEditar = selecao.status === "ativa" && !enviado;

  const pages: Page[] = [
    { type: "capa" },
    ...laminas.map((l) => ({ type: "spread" as const, lamina: l })),
    { type: "contracapa" },
  ];

  return (
    <div style={{ minHeight: "calc(100vh - var(--dev-banner-h, 0px))", background: "var(--color-background-tertiary)", paddingBottom: 80 }}>

      <div style={{ background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "14px 20px", textAlign: "center" }}>
        {logoUrl && <img src={logoUrl} alt="" style={{ maxHeight: 32, maxWidth: 140, objectFit: "contain", display: "block", margin: "0 auto 8px" }} />}
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)" }}>{selecao.titulo}</h1>
        {selecao.modelo_nome && (
          <p style={{ margin: "3px 0 0", fontSize: 11, color: "var(--color-text-secondary)" }}>
            {selecao.modelo_nome}{selecao.modelo_largura_cm && selecao.modelo_altura_cm ? ` · ${selecao.modelo_largura_cm}×${selecao.modelo_altura_cm} cm` : ""}
          </p>
        )}
      </div>

      {enviado && (
        <div style={{ background: aprovado ? "rgba(5,150,105,0.08)" : "rgba(37,99,235,0.08)", borderBottom: `0.5px solid ${aprovado ? "rgba(5,150,105,0.2)" : "rgba(37,99,235,0.2)"}`, padding: "10px 20px", textAlign: "center", fontSize: 13, color: aprovado ? "#059669" : "#2563EB", fontWeight: 600 }}>
          {aprovado ? "✅ Álbum aprovado! O fotógrafo foi notificado." : "📨 Observações enviadas! O fotógrafo irá analisar e entrar em contato."}
        </div>
      )}

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 0" }}>
        {selecao.descricao && (
          <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--color-text-secondary)", textAlign: "center", lineHeight: 1.5 }}>
            {selecao.descricao}
          </p>
        )}
        <BookViewer
          pages={pages}
          selecao={selecao}
          logoUrl={logoUrl}
          comentarios={comentarios}
          onUpsertComentario={handleUpsertComentario}
          onDeleteComentario={handleDeleteComentario}
          onApprove={handleApprove}
          onSend={handleSend}
          podeEditar={podeEditar}
          aprovado={aprovado || enviado}
        />
      </div>
    </div>
  );
}
