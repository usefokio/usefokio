"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type App = {
  id: string;
  nome: string;
  descricao: string | null;
  logo_url: string | null;
  link: string;
  categoria: string | null;
  ordem: number;
  ativo: boolean;
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

export default function WebmasterAppsPage() {
  const [apps,     setApps]     = useState<App[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState<Partial<App> | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [msg,      setMsg]      = useState("");

  const modalRef = useRef<Partial<App> | null>(null);
  useEffect(() => { modalRef.current = modal; }, [modal]);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/webmaster/apps-recomendados", {
      headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
    });
    if (res.ok) setApps((await res.json()).apps ?? []);
    setLoading(false);
  }

  async function salvar() {
    const current = modalRef.current;
    if (!current) return;
    setSalvando(true); setMsg("");
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const isNovo = !current.id;
    const res = await fetch(
      isNovo ? "/api/webmaster/apps-recomendados" : `/api/webmaster/apps-recomendados/${current.id}`,
      {
        method: isNovo ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify(current),
      }
    );
    const json = await res.json();
    if (!res.ok) { setMsg("❌ " + (json.error ?? "Erro ao salvar")); setSalvando(false); return; }
    setModal(null);
    await carregar();
    setMsg("✅ App salvo com sucesso");
    setTimeout(() => setMsg(""), 3000);
    setSalvando(false);
  }

  async function toggleAtivo(a: App) {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/webmaster/apps-recomendados/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ ativo: !a.ativo }),
    });
    await carregar();
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
          Apps / Boas Práticas
        </div>
        <button
          onClick={() => setModal({ ordem: apps.length * 10 })}
          style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#2563EB", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
        >
          + Novo App
        </button>
      </div>
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 24 }}>
        Apps indicados na aba Boas Práticas. Use o campo Link para o seu código de afiliado.
      </div>

      {msg && <div style={{ fontSize: 12, marginBottom: 14, color: msg.startsWith("❌") ? "#EF4444" : "#059669" }}>{msg}</div>}

      {loading ? (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : apps.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Nenhum app cadastrado.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {apps.map((a) => (
            <div key={a.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: 10,
              opacity: a.ativo ? 1 : 0.5,
            }}>
              {a.logo_url ? (
                <img src={a.logo_url} alt={a.nome} width={32} height={32} style={{ borderRadius: 7, flexShrink: 0, display: "block" }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: 7, flexShrink: 0, background: "var(--color-background-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "var(--color-text-secondary)" }}>
                  {a.nome.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text-primary)" }}>
                  {a.nome}
                  {a.categoria && (
                    <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 500, color: "var(--color-text-secondary)" }}>
                      {a.categoria}
                    </span>
                  )}
                  <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 500, color: "var(--color-text-secondary)" }}>
                    ordem {a.ordem}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.link}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => setModal({ ...a })}
                  style={{ padding: "5px 14px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}
                >
                  Editar
                </button>
                <button
                  onClick={() => toggleAtivo(a)}
                  style={{ padding: "5px 14px", borderRadius: 7, border: "none", background: a.ativo ? "rgba(239,68,68,0.1)" : "rgba(5,150,105,0.1)", fontSize: 11, fontWeight: 600, color: a.ativo ? "#EF4444" : "#059669", cursor: "pointer" }}
                >
                  {a.ativo ? "Desativar" : "Ativar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
          onClick={(e) => { if (e.target === e.currentTarget && !salvando) { setModal(null); setMsg(""); } }}
        >
          <div style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: "28px 30px", width: 460, boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 20 }}>
              {modal.id ? "Editar App" : "Novo App"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Nome</div>
                <input style={inputStyle} value={modal.nome ?? ""} onChange={(e) => { const v = e.target.value; setModal((m) => m ? { ...m, nome: v } : m); }} placeholder="Ex: JPEGmini" />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Link (afiliado)</div>
                <input style={inputStyle} value={modal.link ?? ""} onChange={(e) => { const v = e.target.value; setModal((m) => m ? { ...m, link: v } : m); }} placeholder="https://…" />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Logo (URL)</div>
                <input style={inputStyle} value={modal.logo_url ?? ""} onChange={(e) => { const v = e.target.value; setModal((m) => m ? { ...m, logo_url: v } : m); }} placeholder="/apps/exemplo.svg ou https://…" />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Categoria</div>
                <input style={inputStyle} value={modal.categoria ?? ""} onChange={(e) => { const v = e.target.value; setModal((m) => m ? { ...m, categoria: v } : m); }} placeholder="Ex: Compactação, IA / Edição, Seleção" />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Descrição (opcional)</div>
                <textarea style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} rows={2} value={modal.descricao ?? ""} onChange={(e) => { const v = e.target.value; setModal((m) => m ? { ...m, descricao: v } : m); }} placeholder="Breve descrição do app" />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Ordem</div>
                <input style={inputStyle} type="number" value={modal.ordem ?? 0} onChange={(e) => { const v = Number(e.target.value); setModal((m) => m ? { ...m, ordem: v } : m); }} />
              </div>
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
                disabled={salvando || !modal.nome?.trim() || !modal.link?.trim()}
                style={{ flex: 2, padding: "9px", borderRadius: 8, border: "none", background: salvando || !modal.nome?.trim() || !modal.link?.trim() ? "rgba(37,99,235,0.3)" : "#2563EB", color: "#fff", fontSize: 13, fontWeight: 700, cursor: salvando || !modal.nome?.trim() || !modal.link?.trim() ? "default" : "pointer" }}
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
