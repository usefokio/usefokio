"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Tutorial = {
  id: string;
  titulo: string;
  url_youtube: string;
  descricao: string | null;
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

export default function TutoriaisPage() {
  const [tutoriais, setTutoriais] = useState<Tutorial[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState<Partial<Tutorial> | null>(null);
  const [salvando,  setSalvando]  = useState(false);
  const [msg,       setMsg]       = useState("");

  const modalRef = useRef<Partial<Tutorial> | null>(null);
  useEffect(() => { modalRef.current = modal; }, [modal]);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/webmaster/tutoriais", {
      headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
    });
    if (res.ok) setTutoriais((await res.json()).tutoriais ?? []);
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
      isNovo ? "/api/webmaster/tutoriais" : `/api/webmaster/tutoriais/${current.id}`,
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
    setMsg("✅ Tutorial salvo com sucesso");
    setTimeout(() => setMsg(""), 3000);
    setSalvando(false);
  }

  async function toggleAtivo(t: Tutorial) {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/webmaster/tutoriais/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ ativo: !t.ativo }),
    });
    await carregar();
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
          Tutoriais
        </div>
        <button
          onClick={() => setModal({ ordem: tutoriais.length * 10 })}
          style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#2563EB", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
        >
          + Novo Tutorial
        </button>
      </div>

      {msg && <div style={{ fontSize: 12, marginBottom: 14, color: msg.startsWith("❌") ? "#EF4444" : "#059669" }}>{msg}</div>}

      {loading ? (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : tutoriais.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Nenhum tutorial cadastrado.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tutoriais.map((t) => (
            <div key={t.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: 10,
              opacity: t.ativo ? 1 : 0.5,
            }}>
              <div style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>🎬</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text-primary)" }}>
                  {t.titulo}
                  <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 500, color: "var(--color-text-secondary)" }}>
                    ordem {t.ordem}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.url_youtube}
                </div>
                {t.descricao && (
                  <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 2, fontStyle: "italic" }}>
                    {t.descricao}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => setModal({ ...t })}
                  style={{ padding: "5px 14px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}
                >
                  Editar
                </button>
                <button
                  onClick={() => toggleAtivo(t)}
                  style={{ padding: "5px 14px", borderRadius: 7, border: "none", background: t.ativo ? "rgba(239,68,68,0.1)" : "rgba(5,150,105,0.1)", fontSize: 11, fontWeight: 600, color: t.ativo ? "#EF4444" : "#059669", cursor: "pointer" }}
                >
                  {t.ativo ? "Desativar" : "Ativar"}
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
              {modal.id ? "Editar Tutorial" : "Novo Tutorial"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Título</div>
                <input style={inputStyle} value={modal.titulo ?? ""} onChange={(e) => { const v = e.target.value; setModal((m) => m ? { ...m, titulo: v } : m); }} placeholder="Ex: Como criar uma galeria de entrega" />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>URL do YouTube</div>
                <input style={inputStyle} value={modal.url_youtube ?? ""} onChange={(e) => { const v = e.target.value; setModal((m) => m ? { ...m, url_youtube: v } : m); }} placeholder="https://www.youtube.com/watch?v=..." />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Descrição (opcional)</div>
                <textarea style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} rows={2} value={modal.descricao ?? ""} onChange={(e) => { const v = e.target.value; setModal((m) => m ? { ...m, descricao: v } : m); }} placeholder="Breve descrição do que é ensinado" />
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
                disabled={salvando || !modal.titulo?.trim() || !modal.url_youtube?.trim()}
                style={{ flex: 2, padding: "9px", borderRadius: 8, border: "none", background: salvando || !modal.titulo?.trim() || !modal.url_youtube?.trim() ? "rgba(37,99,235,0.3)" : "#2563EB", color: "#fff", fontSize: 13, fontWeight: 700, cursor: salvando || !modal.titulo?.trim() || !modal.url_youtube?.trim() ? "default" : "pointer" }}
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
