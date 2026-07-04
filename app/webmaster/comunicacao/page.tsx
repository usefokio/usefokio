"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  VARIAVEIS_COMUNICACAO,
  substituirVarsComunicacao,
  varsDeFotografo,
  VARS_AMOSTRA,
} from "@/lib/email/comunicacao";

type Foto = {
  id: string;
  nome_completo: string;
  nome_empresa: string;
  email: string;
  plano: string;
  total_galerias: number;
  total_clientes: number;
  total_fotos: number;
};

type Lista = {
  id: string;
  nome: string;
  descricao: string | null;
  created_at: string;
  total_membros: number;
};

type Campanha = {
  id: string;
  list_nome: string | null;
  assunto: string;
  total_destinatarios: number | null;
  total_enviados: number | null;
  total_falhas: number;
  enviado_em: string;
};

type ModalLista = { id?: string; nome: string; descricao: string; selecionados: Set<string> };

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await createClient().auth.getSession();
  return { Authorization: `Bearer ${session?.access_token ?? ""}` };
}

const CARD: React.CSSProperties = {
  background: "var(--color-background-primary)",
  border: "0.5px solid var(--color-border-tertiary)",
  borderRadius: 12,
};

const INPUT: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  boxSizing: "border-box",
  border: "0.5px solid var(--color-border-secondary)",
  background: "var(--color-background-primary)",
  fontSize: 13,
  color: "var(--color-text-primary)",
  outline: "none",
};

export default function ComunicacaoPage() {
  const [aba, setAba]               = useState<"enviar" | "listas" | "historico">("enviar");
  const [fotografos, setFotografos] = useState<Foto[]>([]);
  const [listas, setListas]         = useState<Lista[]>([]);
  const [campanhas, setCampanhas]   = useState<Campanha[]>([]);
  const [loading, setLoading]       = useState(true);

  // modal de lista
  const [modalLista, setModalLista]     = useState<ModalLista | null>(null);
  const [buscaFoto, setBuscaFoto]       = useState("");
  const [salvandoLista, setSalvandoLista] = useState(false);

  // envio
  const [envioListaId, setEnvioListaId] = useState("");
  const [assunto, setAssunto]           = useState("");
  const [corpo, setCorpo]               = useState("");
  const [envioMembros, setEnvioMembros] = useState<Foto[]>([]);
  const [enviando, setEnviando]         = useState(false);
  const [testando, setTestando]         = useState(false);
  const [resultado, setResultado]       = useState<string | null>(null);
  const corpoRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarTudo() {
    setLoading(true);
    await Promise.all([carregarFotografos(), carregarListas(), carregarCampanhas()]);
    setLoading(false);
  }

  async function carregarFotografos() {
    const res = await fetch("/api/webmaster/stats");
    const json = await res.json();
    if (res.ok && json.data) setFotografos(json.data as Foto[]);
  }

  async function carregarListas() {
    const res = await fetch("/api/webmaster/comunicacao/listas", { headers: await authHeaders() });
    const json = await res.json();
    if (res.ok) setListas(json.listas as Lista[]);
  }

  async function carregarCampanhas() {
    const res = await fetch("/api/webmaster/comunicacao/campanhas", { headers: await authHeaders() });
    const json = await res.json();
    if (res.ok) setCampanhas(json.campanhas as Campanha[]);
  }

  // ─── Listas ───────────────────────────────────────────────────────────────
  function abrirNovaLista() {
    setBuscaFoto("");
    setModalLista({ nome: "", descricao: "", selecionados: new Set() });
  }

  async function abrirEditarLista(id: string) {
    setBuscaFoto("");
    const res = await fetch(`/api/webmaster/comunicacao/listas/${id}`, { headers: await authHeaders() });
    if (!res.ok) return;
    const json = await res.json();
    setModalLista({
      id,
      nome: json.lista.nome,
      descricao: json.lista.descricao ?? "",
      selecionados: new Set<string>(json.fotografo_ids ?? []),
    });
  }

  async function salvarLista() {
    if (!modalLista || !modalLista.nome.trim()) return;
    setSalvandoLista(true);
    const payload = {
      nome: modalLista.nome,
      descricao: modalLista.descricao,
      fotografo_ids: [...modalLista.selecionados],
    };
    const url    = modalLista.id ? `/api/webmaster/comunicacao/listas/${modalLista.id}` : "/api/webmaster/comunicacao/listas";
    const method = modalLista.id ? "PATCH" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(payload),
    });
    setSalvandoLista(false);
    setModalLista(null);
    await carregarListas();
    // se a lista editada é a do envio, atualiza os membros do preview
    if (modalLista.id && modalLista.id === envioListaId) selecionarListaEnvio(envioListaId);
  }

  async function excluirLista(l: Lista) {
    if (!confirm(`Excluir a lista "${l.nome}"? Os disparos já feitos são mantidos no histórico.`)) return;
    await fetch(`/api/webmaster/comunicacao/listas/${l.id}`, { method: "DELETE", headers: await authHeaders() });
    if (envioListaId === l.id) { setEnvioListaId(""); setEnvioMembros([]); }
    carregarListas();
  }

  // ─── Envio ────────────────────────────────────────────────────────────────
  async function selecionarListaEnvio(id: string) {
    setEnvioListaId(id);
    setResultado(null);
    if (!id) { setEnvioMembros([]); return; }
    const res = await fetch(`/api/webmaster/comunicacao/listas/${id}`, { headers: await authHeaders() });
    if (!res.ok) { setEnvioMembros([]); return; }
    const json = await res.json();
    const ids = new Set<string>(json.fotografo_ids ?? []);
    setEnvioMembros(fotografos.filter((f) => ids.has(f.id)));
  }

  function inserirVariavel(chave: string) {
    const token = `{${chave}}`;
    const ta = corpoRef.current;
    if (!ta) { setCorpo((c) => c + token); return; }
    const start = ta.selectionStart ?? corpo.length;
    const end   = ta.selectionEnd ?? corpo.length;
    setCorpo(corpo.slice(0, start) + token + corpo.slice(end));
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + token.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  async function enviarTeste() {
    if (!assunto.trim() || !corpo.trim()) { setResultado("Preencha assunto e corpo antes de testar."); return; }
    setTestando(true); setResultado(null);
    const res = await fetch("/api/webmaster/comunicacao/enviar", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ list_id: envioListaId || null, assunto, corpo, teste: true }),
    });
    const json = await res.json();
    setTestando(false);
    setResultado(res.ok ? `✅ Email de teste enviado para ${json.para}.` : `❌ ${json.error ?? "Erro ao enviar teste."}`);
  }

  async function enviarLista() {
    if (!envioListaId) { setResultado("Selecione uma lista."); return; }
    if (!assunto.trim() || !corpo.trim()) { setResultado("Preencha assunto e corpo."); return; }
    const lista = listas.find((l) => l.id === envioListaId);
    const n = envioMembros.length || lista?.total_membros || 0;
    if (n === 0) { setResultado("A lista selecionada não tem fotógrafos."); return; }
    if (!confirm(`Enviar este email para ${n} fotógrafo(s) da lista "${lista?.nome ?? ""}"?`)) return;
    setEnviando(true); setResultado(null);
    const res = await fetch("/api/webmaster/comunicacao/enviar", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ list_id: envioListaId, assunto, corpo }),
    });
    const json = await res.json();
    setEnviando(false);
    if (res.ok) {
      setResultado(`✅ Enviados: ${json.enviados} · Falhas: ${json.falhas}.`);
      carregarCampanhas();
    } else {
      setResultado(`❌ ${json.error ?? "Erro ao enviar."}`);
    }
  }

  const fotoFiltrados = fotografos.filter((f) => {
    const q = buscaFoto.trim().toLowerCase();
    if (!q) return true;
    return (
      f.nome_completo.toLowerCase().includes(q) ||
      f.nome_empresa.toLowerCase().includes(q) ||
      f.email.toLowerCase().includes(q)
    );
  });

  const previewVars    = envioMembros[0] ? varsDeFotografo(envioMembros[0]) : VARS_AMOSTRA;
  const previewAssunto = substituirVarsComunicacao(assunto, previewVars) || "(sem assunto)";
  const previewCorpo   = substituirVarsComunicacao(corpo, previewVars);
  const previewNome    = envioMembros[0]
    ? `${envioMembros[0].nome_completo} · ${envioMembros[0].email}`
    : "amostra (nenhum destinatário selecionado)";

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.02em", margin: 0 }}>
          Comunicação
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
          Crie listas de fotógrafos e envie emails personalizados pelo painel.
        </p>
      </div>

      {/* Abas */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {([
          ["enviar", "✉️ Enviar email"],
          ["listas", "📋 Listas"],
          ["historico", "🕐 Histórico"],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setAba(k)}
            style={{
              padding: "8px 16px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer",
              border: "0.5px solid",
              borderColor: aba === k ? "var(--color-text-primary)" : "var(--color-border-secondary)",
              background: aba === k ? "var(--color-text-primary)" : "transparent",
              color: aba === k ? "var(--color-background-primary)" : "var(--color-text-secondary)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ ...CARD, padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : aba === "enviar" ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 0.9fr)", gap: 20, alignItems: "start" }}>
          {/* Composição */}
          <div style={{ ...CARD, padding: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Lista de destino</div>
            <select
              value={envioListaId}
              onChange={(e) => selecionarListaEnvio(e.target.value)}
              style={{ ...INPUT, marginBottom: 16, cursor: "pointer" }}
            >
              <option value="">— selecione uma lista —</option>
              {listas.map((l) => (
                <option key={l.id} value={l.id}>{l.nome} ({l.total_membros})</option>
              ))}
            </select>
            {envioListaId && (
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: -8, marginBottom: 16 }}>
                {envioMembros.length} destinatário{envioMembros.length !== 1 ? "s" : ""} nesta lista.
              </div>
            )}

            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Assunto</div>
            <input
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              placeholder="Ex.: Como está sendo sua experiência, {nome}?"
              style={{ ...INPUT, marginBottom: 16 }}
            />

            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Corpo do email</div>
            <textarea
              ref={corpoRef}
              value={corpo}
              onChange={(e) => setCorpo(e.target.value)}
              placeholder={"Olá, {nome}!\n\nVi que você ainda não criou nenhuma galeria ({galerias}). Teve alguma dificuldade? Fico à disposição para ajudar."}
              rows={11}
              style={{ ...INPUT, resize: "vertical", lineHeight: 1.6, fontFamily: "var(--font-sans)" }}
            />

            {/* Variáveis */}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 8 }}>
                Variáveis — clique para inserir no corpo
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {VARIAVEIS_COMUNICACAO.map((v) => (
                  <button
                    key={v.chave}
                    onClick={() => inserirVariavel(v.chave)}
                    title={`${v.label} · ex.: ${v.exemplo}`}
                    style={{
                      padding: "5px 10px", borderRadius: 7, cursor: "pointer",
                      border: "0.5px solid var(--color-border-secondary)",
                      background: "var(--color-background-secondary)",
                      fontSize: 12, color: "var(--color-text-primary)", fontWeight: 600,
                    }}
                  >
                    <code style={{ color: "#2563EB" }}>{`{${v.chave}}`}</code>
                    <span style={{ color: "var(--color-text-secondary)", fontWeight: 500, marginLeft: 6 }}>{v.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ações */}
            <div style={{ display: "flex", gap: 10, marginTop: 22, alignItems: "center", flexWrap: "wrap" }}>
              <button
                onClick={enviarTeste}
                disabled={testando}
                style={{
                  padding: "10px 16px", borderRadius: 9, cursor: testando ? "default" : "pointer",
                  border: "0.5px solid var(--color-border-secondary)", background: "transparent",
                  fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)",
                }}
              >
                {testando ? "Enviando…" : "Enviar teste para mim"}
              </button>
              <button
                onClick={enviarLista}
                disabled={enviando || !envioListaId}
                style={{
                  padding: "10px 18px", borderRadius: 9,
                  cursor: (enviando || !envioListaId) ? "default" : "pointer",
                  border: "none",
                  background: (enviando || !envioListaId) ? "rgba(37,99,235,0.35)" : "#2563EB",
                  fontSize: 13, fontWeight: 800, color: "#fff",
                }}
              >
                {enviando ? "Enviando…" : `Enviar para a lista${envioListaId ? ` (${envioMembros.length})` : ""}`}
              </button>
            </div>
            {resultado && (
              <div style={{ marginTop: 14, fontSize: 13, color: resultado.startsWith("✅") ? "#059669" : "#EF4444", fontWeight: 600 }}>
                {resultado}
              </div>
            )}
          </div>

          {/* Preview */}
          <div style={{ position: "sticky", top: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              Pré-visualização
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 10 }}>
              Variáveis preenchidas com: <strong style={{ color: "var(--color-text-primary)" }}>{previewNome}</strong>
            </div>
            <div style={{ borderRadius: 12, overflow: "hidden", border: "0.5px solid var(--color-border-tertiary)", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
              <div style={{ background: "#111", padding: "16px 22px" }}>
                <span style={{ color: "#fff", fontSize: 16, fontWeight: 800, letterSpacing: "-0.03em" }}>UseFokio</span>
              </div>
              <div style={{ background: "#fff", padding: "22px 24px" }}>
                <div style={{ fontSize: 11, color: "#999", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Assunto</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 18 }}>{previewAssunto}</div>
                <div style={{ fontSize: 14, lineHeight: 1.7, color: "#333", whiteSpace: "pre-wrap", minHeight: 60 }}>
                  {previewCorpo || <span style={{ color: "#bbb" }}>O corpo do email aparece aqui…</span>}
                </div>
              </div>
              <div style={{ background: "#f9f9f9", borderTop: "1px solid #eee", padding: "16px 24px", fontSize: 11, color: "#aaa", textAlign: "center" }}>
                <strong style={{ color: "#888" }}>UseFokio</strong> · Plataforma para fotógrafos
              </div>
            </div>
          </div>
        </div>
      ) : aba === "listas" ? (
        <div style={{ ...CARD, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>Listas de fotógrafos</div>
            <button
              onClick={abrirNovaLista}
              style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#2563EB", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              + Nova lista
            </button>
          </div>
          {listas.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>
              Nenhuma lista criada ainda. Crie uma para começar (ex.: "Acesso Beta").
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--color-background-secondary)" }}>
                  {["Nome", "Descrição", "Membros", "Criada em", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listas.map((l, i) => (
                  <tr key={l.id} style={{ borderBottom: i < listas.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-text-primary)" }}>{l.nome}</td>
                    <td style={{ padding: "12px 16px", color: "var(--color-text-secondary)" }}>{l.descricao || "—"}</td>
                    <td style={{ padding: "12px 16px", color: "var(--color-text-primary)", fontWeight: 600 }}>{l.total_membros}</td>
                    <td style={{ padding: "12px 16px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{new Date(l.created_at).toLocaleDateString("pt-BR")}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <button onClick={() => abrirEditarLista(l.id)} style={{ padding: "5px 12px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer", marginRight: 6 }}>Editar</button>
                      <button onClick={() => excluirLista(l)} style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: "rgba(239,68,68,0.08)", color: "#EF4444", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div style={{ ...CARD, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>
            Disparos recentes
          </div>
          {campanhas.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Nenhum email enviado ainda.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--color-background-secondary)" }}>
                  {["Data", "Lista", "Assunto", "Destinatários", "Enviados", "Falhas"].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campanhas.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: i < campanhas.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
                    <td style={{ padding: "12px 16px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{new Date(c.enviado_em).toLocaleString("pt-BR")}</td>
                    <td style={{ padding: "12px 16px", color: "var(--color-text-primary)" }}>{c.list_nome || "—"}</td>
                    <td style={{ padding: "12px 16px", color: "var(--color-text-primary)" }}>{c.assunto}</td>
                    <td style={{ padding: "12px 16px", color: "var(--color-text-primary)", fontWeight: 600 }}>{c.total_destinatarios ?? "—"}</td>
                    <td style={{ padding: "12px 16px", color: "#059669", fontWeight: 700 }}>{c.total_enviados ?? "—"}</td>
                    <td style={{ padding: "12px 16px", color: c.total_falhas > 0 ? "#EF4444" : "var(--color-text-secondary)", fontWeight: 600 }}>{c.total_falhas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal criar/editar lista */}
      {modalLista && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget && !salvandoLista) setModalLista(null); }}
        >
          <div style={{ ...CARD, padding: "26px 28px", width: 560, maxWidth: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 18 }}>
              {modalLista.id ? "Editar lista" : "Nova lista"}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Nome</div>
            <input
              value={modalLista.nome}
              onChange={(e) => setModalLista({ ...modalLista, nome: e.target.value })}
              placeholder="Ex.: Acesso Beta"
              autoFocus
              style={{ ...INPUT, marginBottom: 14 }}
            />
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Descrição (opcional)</div>
            <input
              value={modalLista.descricao}
              onChange={(e) => setModalLista({ ...modalLista, descricao: e.target.value })}
              placeholder="Ex.: Novos usuários convidados para testar"
              style={{ ...INPUT, marginBottom: 16 }}
            />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Fotógrafos ({modalLista.selecionados.size} selecionados)
              </div>
              <button
                onClick={() => {
                  const todosVisiveis = fotoFiltrados.every((f) => modalLista.selecionados.has(f.id));
                  const novo = new Set(modalLista.selecionados);
                  fotoFiltrados.forEach((f) => { if (todosVisiveis) novo.delete(f.id); else novo.add(f.id); });
                  setModalLista({ ...modalLista, selecionados: novo });
                }}
                style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", background: "none", border: "none", cursor: "pointer" }}
              >
                {fotoFiltrados.every((f) => modalLista.selecionados.has(f.id)) && fotoFiltrados.length > 0 ? "Desmarcar todos" : "Selecionar todos"}
              </button>
            </div>
            <input
              value={buscaFoto}
              onChange={(e) => setBuscaFoto(e.target.value)}
              placeholder="Buscar por nome, empresa ou email…"
              style={{ ...INPUT, marginBottom: 10 }}
            />

            <div style={{ flex: 1, overflowY: "auto", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, minHeight: 160 }}>
              {fotoFiltrados.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "var(--color-text-secondary)" }}>Nenhum fotógrafo encontrado.</div>
              ) : fotoFiltrados.map((f) => {
                const sel = modalLista.selecionados.has(f.id);
                return (
                  <label key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", cursor: "pointer", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => {
                        const novo = new Set(modalLista.selecionados);
                        if (sel) novo.delete(f.id); else novo.add(f.id);
                        setModalLista({ ...modalLista, selecionados: novo });
                      }}
                      style={{ width: 15, height: 15, accentColor: "#2563EB", cursor: "pointer", flexShrink: 0 }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {f.nome_completo} <span style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>· {f.plano}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.email}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button
                onClick={() => setModalLista(null)}
                disabled={salvandoLista}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={salvarLista}
                disabled={salvandoLista || !modalLista.nome.trim()}
                style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: (salvandoLista || !modalLista.nome.trim()) ? "rgba(37,99,235,0.35)" : "#2563EB", color: "#fff", fontSize: 13, fontWeight: 700, cursor: (salvandoLista || !modalLista.nome.trim()) ? "default" : "pointer" }}
              >
                {salvandoLista ? "Salvando…" : "Salvar lista"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
