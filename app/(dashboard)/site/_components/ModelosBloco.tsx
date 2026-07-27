"use client";

// Biblioteca de BLOCOS-MODELO do fotógrafo: salva um bloco já configurado (ex.: "Álbuns",
// "Formas de pagamento") e insere em outras landing pages / páginas do site.
// As imagens vêm junto (os campos guardam URL absoluta) — é uma cópia independente: editar
// o bloco na página não altera o modelo, e vice-versa.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CATALOGO_BLOCOS, type SiteBloco, type TipoBloco } from "@/lib/site/blocos";
import type { SiteBlocoModelo } from "@/lib/supabase/types";

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex",
  alignItems: "center", justifyContent: "center", zIndex: 1200, padding: 20,
};
const caixa: React.CSSProperties = {
  background: "var(--color-background-primary)", borderRadius: 14, width: "100%", maxWidth: 560,
  maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  overflow: "hidden",
};
const btn: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 8, border: "1px solid var(--color-border-secondary)",
  background: "transparent", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer",
};
const input: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8, boxSizing: "border-box",
  border: "1px solid var(--color-border-secondary)", fontSize: 14,
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};

function rotulo(tipo: string) {
  return CATALOGO_BLOCOS.find((c) => c.tipo === tipo) ?? { label: tipo, icone: "▪" };
}

// ── Salvar o bloco atual como modelo ─────────────────────────────────────────
export function ModalSalvarModelo({ bloco, fotografoId, sugestao, onFechar }: {
  bloco: SiteBloco;
  fotografoId: string;
  sugestao: string;
  onFechar: (salvouComNome?: string) => void;
}) {
  const [nome, setNome] = useState(sugestao);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const rot = rotulo(bloco.tipo);

  async function salvar() {
    if (!nome.trim()) { setErro("Dê um nome para o modelo."); return; }
    setSalvando(true); setErro("");
    const { error } = await createClient().from("site_bloco_modelos").insert({
      fotografo_id: fotografoId,
      nome: nome.trim().slice(0, 80),
      tipo: bloco.tipo,
      dados: bloco.dados,
    });
    setSalvando(false);
    if (error) { setErro("Erro ao salvar: " + error.message); return; }
    onFechar(nome.trim());
  }

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onFechar(); }}>
      <div style={{ ...caixa, maxWidth: 440 }}>
        <div style={{ padding: "18px 20px 0" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)" }}>💾 Salvar bloco como modelo</div>
          <div style={{ fontSize: 12.5, color: "var(--color-text-secondary)", marginTop: 4, lineHeight: 1.5 }}>
            Guarda este bloco <strong>{rot.icone} {rot.label}</strong> com o conteúdo e as fotos como estão agora,
            para você inserir em outras páginas. É uma cópia — editar aqui depois não muda o modelo.
          </div>
        </div>
        <div style={{ padding: "16px 20px" }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Nome do modelo</label>
          <input value={nome} autoFocus onChange={(e) => { setNome(e.target.value); setErro(""); }}
            onKeyDown={(e) => e.key === "Enter" && salvar()} placeholder="Ex.: Álbuns, Formas de pagamento" style={input} />
          {erro && <div style={{ fontSize: 12, color: "#DC2626", marginTop: 8 }}>{erro}</div>}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 20px", borderTop: "1px solid var(--color-border-tertiary)" }}>
          <button style={btn} onClick={() => onFechar()}>Cancelar</button>
          <button onClick={salvar} disabled={salvando}
            style={{ ...btn, background: "#111", color: "#fff", border: "none" }}>
            {salvando ? "Salvando…" : "Salvar modelo"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Biblioteca: inserir / renomear / excluir modelos ─────────────────────────
export function ModalModelos({ fotografoId, onFechar, onInserir }: {
  fotografoId: string;
  onFechar: () => void;
  onInserir: (tipo: TipoBloco, dados: SiteBloco["dados"]) => void;
}) {
  const [lista, setLista] = useState<SiteBlocoModelo[] | null>(null);
  const [erro, setErro] = useState("");
  const [renomeando, setRenomeando] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState("");
  const [excluir, setExcluir] = useState<SiteBlocoModelo | null>(null);

  async function carregar() {
    const { data, error } = await createClient().from("site_bloco_modelos")
      .select("*").eq("fotografo_id", fotografoId).order("created_at", { ascending: false });
    if (error) { setErro(error.message); setLista([]); return; }
    setLista((data as SiteBlocoModelo[]) ?? []);
  }
  useEffect(() => { carregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [fotografoId]);

  async function confirmarExcluir() {
    if (!excluir) return;
    await createClient().from("site_bloco_modelos").delete().eq("id", excluir.id);
    setExcluir(null);
    carregar();
  }

  async function salvarNome(m: SiteBlocoModelo) {
    const n = novoNome.trim();
    if (!n) { setRenomeando(null); return; }
    await createClient().from("site_bloco_modelos")
      .update({ nome: n.slice(0, 80), updated_at: new Date().toISOString() }).eq("id", m.id);
    setRenomeando(null);
    carregar();
  }

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onFechar(); }}>
      <div style={caixa}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--color-border-tertiary)" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)" }}>★ Meus blocos salvos</div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
              Clique num modelo para inserir uma cópia no fim desta página.
            </div>
          </div>
          <button onClick={onFechar} style={{ border: "none", background: "transparent", fontSize: 20, color: "var(--color-text-secondary)", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 16 }}>
          {lista === null ? (
            <div style={{ padding: "24px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
          ) : erro ? (
            <div style={{ fontSize: 13, color: "#DC2626" }}>{erro}</div>
          ) : lista.length === 0 ? (
            <div style={{ padding: "26px 16px", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6, border: "1px dashed var(--color-border-secondary)", borderRadius: 10 }}>
              Você ainda não salvou nenhum bloco.<br />
              Abra um bloco desta página e use <strong>💾 Salvar como modelo</strong> — ele aparece aqui para reusar nas outras páginas.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lista.map((m) => {
                const rot = rotulo(m.tipo);
                const editando = renomeando === m.id;
                return (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid var(--color-border-tertiary)", borderRadius: 10, padding: "10px 12px" }}>
                    <span style={{ fontSize: 16 }}>{rot.icone}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {editando ? (
                        <input value={novoNome} autoFocus onChange={(e) => setNovoNome(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") salvarNome(m); if (e.key === "Escape") setRenomeando(null); }}
                          onBlur={() => salvarNome(m)} style={{ ...input, padding: "6px 9px", fontSize: 13 }} />
                      ) : (
                        <>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.nome}</div>
                          <div style={{ fontSize: 11.5, color: "var(--color-text-secondary)" }}>{rot.label}</div>
                        </>
                      )}
                    </div>
                    {!editando && (
                      <>
                        <button style={{ ...btn, padding: "6px 12px" }} title="Inserir nesta página"
                          onClick={() => { onInserir(m.tipo as TipoBloco, (m.dados ?? {}) as SiteBloco["dados"]); onFechar(); }}>
                          + Inserir
                        </button>
                        <button style={{ ...btn, padding: "6px 9px" }} title="Renomear"
                          onClick={() => { setRenomeando(m.id); setNovoNome(m.nome); }}>✎</button>
                        <button style={{ ...btn, padding: "6px 9px", color: "#DC2626", borderColor: "rgba(220,38,38,0.4)" }} title="Excluir modelo"
                          onClick={() => setExcluir(m)}>🗑</button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Excluir — modal do sistema (nunca o confirm() do navegador) */}
      {excluir && (
        <div style={{ ...overlay, zIndex: 1300 }} onClick={(e) => { if (e.target === e.currentTarget) setExcluir(null); }}>
          <div style={{ ...caixa, maxWidth: 400, padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#DC2626", marginBottom: 8 }}>🗑 Excluir modelo</div>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 18px", lineHeight: 1.6 }}>
              Excluir <strong style={{ color: "var(--color-text-primary)" }}>{excluir.nome}</strong> da sua biblioteca?
              As páginas que já usam esse bloco <strong>não</strong> são afetadas.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button style={btn} onClick={() => setExcluir(null)}>Cancelar</button>
              <button onClick={confirmarExcluir} style={{ ...btn, background: "#DC2626", color: "#fff", border: "none" }}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
