"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Arquivo = {
  id: string;
  nome: string;
  descricao: string | null;
  arquivo_url: string;
  arquivo_nome: string | null;
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

export default function WebmasterArquivosPage() {
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState<Partial<Arquivo> | null>(null);
  const [file,     setFile]     = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [msg,      setMsg]      = useState("");

  const modalRef = useRef<Partial<Arquivo> | null>(null);
  useEffect(() => { modalRef.current = modal; }, [modal]);
  const fileRef = useRef<File | null>(null);
  useEffect(() => { fileRef.current = file; }, [file]);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/webmaster/arquivos-download", {
      headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
    });
    if (res.ok) setArquivos((await res.json()).arquivos ?? []);
    setLoading(false);
  }

  function abrir(a?: Arquivo) {
    setFile(null);
    setMsg("");
    setModal(a ? { ...a } : { ordem: arquivos.length * 10 });
  }

  async function salvar() {
    const current = modalRef.current;
    if (!current) return;
    const isNovo = !current.id;
    if (!current.nome?.trim()) { setMsg("❌ Nome obrigatório"); return; }
    if (isNovo && !fileRef.current) { setMsg("❌ Selecione o arquivo"); return; }

    setSalvando(true); setMsg("");
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const fd = new FormData();
    fd.append("nome", current.nome ?? "");
    fd.append("descricao", current.descricao ?? "");
    fd.append("ordem", String(current.ordem ?? 0));
    if (fileRef.current) fd.append("file", fileRef.current);

    const res = await fetch(
      isNovo ? "/api/webmaster/arquivos-download" : `/api/webmaster/arquivos-download/${current.id}`,
      {
        method: isNovo ? "POST" : "PATCH",
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: fd,
      }
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg("❌ " + (json.error ?? "Erro ao salvar")); setSalvando(false); return; }
    setModal(null); setFile(null);
    await carregar();
    setMsg("✅ Arquivo salvo com sucesso");
    setTimeout(() => setMsg(""), 3000);
    setSalvando(false);
  }

  async function toggleAtivo(a: Arquivo) {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/webmaster/arquivos-download/${a.id}`, {
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
          Materiais / Downloads
        </div>
        <button
          onClick={() => abrir()}
          style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#2563EB", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
        >
          + Novo Arquivo
        </button>
      </div>
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 24 }}>
        Arquivos que o fotógrafo baixa na aba Boas Práticas (preset do Lightroom, PDFs, qualquer material).
      </div>

      {msg && <div style={{ fontSize: 12, marginBottom: 14, color: msg.startsWith("❌") ? "#EF4444" : "#059669" }}>{msg}</div>}

      {loading ? (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : arquivos.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Nenhum arquivo cadastrado.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {arquivos.map((a) => (
            <div key={a.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: 10,
              opacity: a.ativo ? 1 : 0.5,
            }}>
              <div style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>📎</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text-primary)" }}>
                  {a.nome}
                  <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 500, color: "var(--color-text-secondary)" }}>
                    ordem {a.ordem}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <a href={a.arquivo_url} target="_blank" rel="noopener" style={{ color: "#2563EB", textDecoration: "none" }}>
                    {a.arquivo_nome ?? "arquivo"}
                  </a>
                  {a.descricao && <span> · {a.descricao}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => abrir(a)}
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
          onClick={(e) => { if (e.target === e.currentTarget && !salvando) { setModal(null); setFile(null); setMsg(""); } }}
        >
          <div style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: "28px 30px", width: 460, boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 20 }}>
              {modal.id ? "Editar Arquivo" : "Novo Arquivo"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Nome</div>
                <input style={inputStyle} value={modal.nome ?? ""} onChange={(e) => { const v = e.target.value; setModal((m) => m ? { ...m, nome: v } : m); }} placeholder="Ex: Preset de Exportação — Lightroom" />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>
                  Arquivo {modal.id && <span style={{ fontWeight: 400 }}>(deixe vazio para manter o atual)</span>}
                </div>
                <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ fontSize: 12, color: "var(--color-text-secondary)" }} />
                {modal.id && modal.arquivo_nome && !file && (
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>Atual: {modal.arquivo_nome}</div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Descrição (opcional)</div>
                <textarea style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} rows={2} value={modal.descricao ?? ""} onChange={(e) => { const v = e.target.value; setModal((m) => m ? { ...m, descricao: v } : m); }} placeholder="Breve descrição do material" />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Ordem</div>
                <input style={inputStyle} type="number" value={modal.ordem ?? 0} onChange={(e) => { const v = Number(e.target.value); setModal((m) => m ? { ...m, ordem: v } : m); }} />
              </div>
            </div>
            {msg && <div style={{ fontSize: 12, marginTop: 12, color: msg.startsWith("❌") ? "#EF4444" : "#059669" }}>{msg}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button
                onClick={() => { setModal(null); setFile(null); setMsg(""); }}
                disabled={salvando}
                style={{ flex: 1, padding: "9px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando}
                style={{ flex: 2, padding: "9px", borderRadius: 8, border: "none", background: salvando ? "rgba(37,99,235,0.3)" : "#2563EB", color: "#fff", fontSize: 13, fontWeight: 700, cursor: salvando ? "default" : "pointer" }}
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
