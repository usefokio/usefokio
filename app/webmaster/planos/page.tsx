"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PlanoConfig = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  preco: number;
  preco_anual: number | null;
  limite_fotos: number | null;
  limite_galerias: number | null;
  limite_armazenamento_gb: number | null;
  duracao_dias: number | null;
  ativo: boolean;
  eh_campanha: boolean;
  valido_ate: string | null;
  cor: string;
  ordem: number;
  forma_pagamento: string | null;
};

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "0.5px solid var(--color-border-secondary)",
  fontSize: 12,
  background: "var(--color-background-secondary)",
  color: "var(--color-text-primary)",
  width: "100%",
  boxSizing: "border-box",
};

export default function PlanosPage() {
  const [planos,   setPlanos]   = useState<PlanoConfig[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState<Partial<PlanoConfig> | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [msg,      setMsg]      = useState("");

  const modalRef = useRef<Partial<PlanoConfig> | null>(null);
  useEffect(() => { modalRef.current = modal; }, [modal]);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/webmaster/planos", {
      headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
    });
    if (res.ok) setPlanos((await res.json()).planos ?? []);
    setLoading(false);
  }

  async function salvar() {
    const currentModal = modalRef.current;
    if (!currentModal) return;
    setSalvando(true); setMsg("");
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const isNovo = !currentModal.id;
    const res = await fetch(isNovo ? "/api/webmaster/planos" : `/api/webmaster/planos/${currentModal.id}`, {
      method: isNovo ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify(currentModal),
    });
    const json = await res.json();
    if (!res.ok) { setMsg("❌ " + (json.error ?? "Erro ao salvar")); setSalvando(false); return; }
    setModal(null);
    await carregar();
    setMsg("✅ Plano salvo com sucesso");
    setTimeout(() => setMsg(""), 3000);
    setSalvando(false);
  }

  async function toggleAtivo(p: PlanoConfig) {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/webmaster/planos/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ ativo: !p.ativo }),
    });
    await carregar();
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
          Planos e Campanhas
        </div>
        <button
          onClick={() => setModal({ ativo: true, eh_campanha: false, preco: 49, duracao_dias: 31, cor: "#2563EB", ordem: 10 })}
          style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#2563EB", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
        >
          + Nova Campanha
        </button>
      </div>

      {msg && <div style={{ fontSize: 12, marginBottom: 14, color: msg.startsWith("❌") ? "#EF4444" : "#059669" }}>{msg}</div>}

      {loading ? (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : planos.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Nenhum plano cadastrado.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {planos.map((p) => (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: 10,
              opacity: p.ativo ? 1 : 0.5,
            }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: p.cor, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text-primary)" }}>
                  {p.nome}
                  {p.eh_campanha && (
                    <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 10, background: "rgba(245,158,11,0.15)", color: "#B45309" }}>
                      CAMPANHA
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                  {`R$${Number(p.preco).toFixed(2).replace(".", ",")}/mês`}
                  {p.preco_anual != null ? ` · R$${Number(p.preco_anual).toFixed(2).replace(".", ",")}/mês anual` : ""}
                  {p.limite_fotos != null ? ` · ${p.limite_fotos.toLocaleString("pt-BR")} fotos` : " · fotos ilimitadas"}
                  {p.limite_armazenamento_gb != null ? ` · ${p.limite_armazenamento_gb} GB` : " · espaço ilimitado"}
                  <span style={{ color: p.limite_galerias == null ? "#059669" : "inherit" }}>
                    {p.limite_galerias != null ? ` · ${p.limite_galerias} gal. entrega` : " · galerias ilimitadas"}
                  </span>
                  {p.duracao_dias != null ? ` · ${p.duracao_dias}d` : ""}
                  {p.valido_ate ? ` · válido até ${new Date(p.valido_ate + "T12:00:00").toLocaleDateString("pt-BR")}` : ""}
                </div>
                {p.descricao && (
                  <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 2, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 380 }}>
                    {p.descricao}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => setModal({ ...p })}
                  style={{ padding: "5px 14px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}
                >
                  Editar
                </button>
                <button
                  onClick={() => setModal({
                    ativo:           true,
                    eh_campanha:     p.eh_campanha,
                    preco:           p.preco,
                    preco_anual:     p.preco_anual,
                    duracao_dias:    p.duracao_dias,
                    cor:             p.cor,
                    ordem:           p.ordem,
                    limite_fotos:    p.limite_fotos,
                    limite_galerias: p.limite_galerias,
                    limite_armazenamento_gb: p.limite_armazenamento_gb,
                    forma_pagamento: p.forma_pagamento,
                    nome:            `${p.nome} (cópia)`,
                    descricao:       p.descricao,
                    codigo:          `${p.codigo}-copia`,
                  })}
                  title="Duplicar plano"
                  style={{ padding: "5px 10px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", cursor: "pointer" }}
                >
                  ⎘
                </button>
                <button
                  onClick={() => toggleAtivo(p)}
                  style={{ padding: "5px 14px", borderRadius: 7, border: "none", background: p.ativo ? "rgba(239,68,68,0.1)" : "rgba(5,150,105,0.1)", fontSize: 11, fontWeight: 600, color: p.ativo ? "#EF4444" : "#059669", cursor: "pointer" }}
                >
                  {p.ativo ? "Desativar" : "Ativar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      {modal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
          onClick={(e) => { if (e.target === e.currentTarget && !salvando) { setModal(null); setMsg(""); } }}
        >
          <div style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: "28px 30px", width: 460, boxShadow: "0 8px 40px rgba(0,0,0,0.25)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 20 }}>
              {modal.id ? "Editar Plano" : "Nova Campanha"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Nome</div>
                <input style={inputStyle} value={modal.nome ?? ""} onChange={(e) => { const v = e.target.value; setModal((m) => m ? { ...m, nome: v } : m); }} placeholder="Ex: Promoção Julho" />
              </div>
              {!modal.id && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Código único</div>
                  <input style={inputStyle} value={modal.codigo ?? ""} onChange={(e) => { const v = e.target.value; setModal((m) => m ? { ...m, codigo: v } : m); }} placeholder="ex: campanha-jul26" />
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Preço mensal (R$)</div>
                  <input style={inputStyle} type="number" value={modal.preco ?? ""} onChange={(e) => { const v = Number(e.target.value); setModal((m) => m ? { ...m, preco: v } : m); }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Preço anual, valor/mês (R$)</div>
                  <input style={inputStyle} type="number" value={modal.preco_anual ?? ""} onChange={(e) => { const v = e.target.value ? Number(e.target.value) : null; setModal((m) => m ? { ...m, preco_anual: v } : m); }} placeholder="em branco = sem plano anual" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Duração (dias)</div>
                  <input style={inputStyle} type="number" value={modal.duracao_dias ?? ""} onChange={(e) => { const v = e.target.value ? Number(e.target.value) : null; setModal((m) => m ? { ...m, duracao_dias: v } : m); }} placeholder="31" />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Cor (hex)</div>
                  <input style={inputStyle} value={modal.cor ?? "#2563EB"} onChange={(e) => { const v = e.target.value; setModal((m) => m ? { ...m, cor: v } : m); }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Limite de fotos</div>
                  <input style={inputStyle} type="number" value={modal.limite_fotos ?? ""} onChange={(e) => { const v = e.target.value ? Number(e.target.value) : null; setModal((m) => m ? { ...m, limite_fotos: v } : m); }} placeholder="em branco = ilimitado" />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Limite de galerias de entrega</div>
                  <input style={inputStyle} type="number" value={modal.limite_galerias ?? ""} onChange={(e) => { const v = e.target.value ? Number(e.target.value) : null; setModal((m) => m ? { ...m, limite_galerias: v } : m); }} placeholder="em branco = ilimitado" />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Limite de armazenamento (GB)</div>
                <input style={inputStyle} type="number" step="0.5" value={modal.limite_armazenamento_gb ?? ""} onChange={(e) => { const v = e.target.value ? Number(e.target.value) : null; setModal((m) => m ? { ...m, limite_armazenamento_gb: v } : m); }} placeholder="em branco = ilimitado" />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Forma de pagamento</div>
                <select style={{ ...inputStyle, cursor: "pointer" }} value={modal.forma_pagamento ?? "pix"} onChange={(e) => { const v = e.target.value; setModal((m) => m ? { ...m, forma_pagamento: v } : m); }}>
                  <option value="pix">PIX (QR Code)</option>
                  <option value="boleto">Boleto bancário</option>
                  <option value="livre">Livre — cliente escolhe (PIX / boleto / cartão)</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Válido até (em branco = sem prazo)</div>
                <input style={inputStyle} type="date" value={modal.valido_ate ?? ""} onChange={(e) => { const v = e.target.value || null; setModal((m) => m ? { ...m, valido_ate: v } : m); }} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Descrição</div>
                <textarea style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} rows={2} value={modal.descricao ?? ""} onChange={(e) => { const v = e.target.value; setModal((m) => m ? { ...m, descricao: v } : m); }} placeholder="Descrição opcional" />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--color-text-primary)", cursor: "pointer" }}>
                <input type="checkbox" checked={modal.eh_campanha ?? false} onChange={(e) => { const v = e.target.checked; setModal((m) => m ? { ...m, eh_campanha: v } : m); }} />
                Marcar como campanha promocional
              </label>
            </div>
            {msg && <div style={{ fontSize: 12, marginTop: 12, color: msg.startsWith("❌") ? "#EF4444" : "#059669" }}>{msg}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button
                onClick={() => { setModal(null); setMsg(""); }}
                disabled={salvando}
                style={{ flex: 1, padding: "9px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando || !modal.nome?.trim()}
                style={{ flex: 2, padding: "9px", borderRadius: 8, border: "none", background: salvando || !modal.nome?.trim() ? "rgba(37,99,235,0.3)" : "#2563EB", color: "#fff", fontSize: 13, fontWeight: 700, cursor: salvando || !modal.nome?.trim() ? "default" : "pointer" }}
              >
                {salvando ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
