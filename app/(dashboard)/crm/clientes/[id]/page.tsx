"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { isValidDate, mascaraTelefone } from "@/lib/utils/format";
import type { Cliente, CrmOrder, GaleriaEntrega, GaleriaSelecao } from "@/lib/supabase/types";

const TIPO_MAP: Record<string, { label: string; color: string; bg: string }> = {
  cliente:      { label: "Cliente",      color: "#2563EB", bg: "rgba(37,99,235,0.08)"  },
  oportunidade: { label: "Oportunidade", color: "#D97706", bg: "rgba(217,119,6,0.08)"  },
  fornecedor:   { label: "Fornecedor",   color: "#7C3AED", bg: "rgba(124,58,237,0.08)" },
  parceiro:     { label: "Parceiro",     color: "#059669", bg: "rgba(16,185,129,0.08)" },
  fotografo:    { label: "Fotógrafo",   color: "#0891B2", bg: "rgba(8,145,178,0.08)"  },
  videografo:   { label: "Videógrafo",  color: "#7C3AED", bg: "rgba(124,58,237,0.08)" },
};

const field = (label: string, value: string | null | undefined) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>{label}</div>
    <div style={{ fontSize: 14, color: value ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>{value || "—"}</div>
  </div>
);

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "0.5px solid var(--color-border-secondary)",
  background: "var(--color-background-primary)",
  fontSize: 13, color: "var(--color-text-primary)", outline: "none",
  boxSizing: "border-box",
};

const label = (text: string) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{text}</div>
);

export default function ClienteDetailPage() {
  const { id }        = useParams<{ id: string }>();
  const router        = useRouter();
  const { fotografo } = useFotografo();

  const [cliente,   setCliente]   = useState<Cliente | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState(false);
  const [salvando,  setSalvando]  = useState(false);
  const [erroSalvar, setErroSalvar] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting,  setDeleting]  = useState(false);

  type RelTab = "pedidos" | "entrega" | "selecao";
  const [tab,           setTab]           = useState<RelTab>("pedidos");
  const [pedidos,       setPedidos]       = useState<CrmOrder[]>([]);
  const [entrega,       setEntrega]       = useState<GaleriaEntrega[]>([]);
  const [selecao,       setSelecao]       = useState<GaleriaSelecao[]>([]);
  const [carregandoRel, setCarregandoRel] = useState(false);

  // form state
  const [nome,          setNome]          = useState("");
  const [email,         setEmail]         = useState("");
  const [telefone,      setTelefone]      = useState("");
  const [whatsapp,      setWhatsapp]      = useState("");
  const [empresa,       setEmpresa]       = useState("");
  const [cargo,         setCargo]         = useState("");
  const [instagram,     setInstagram]     = useState("");
  const [cpf,           setCpf]           = useState("");
  const [dataNasc,      setDataNasc]      = useState("");
  const [observacoes,   setObservacoes]   = useState("");
  const [tipoContato,   setTipoContato]   = useState<Cliente["tipo_contato"]>("cliente");
  const [cep,           setCep]           = useState("");
  const [logradouro,    setLogradouro]    = useState("");
  const [numero,        setNumero]        = useState("");
  const [complemento,   setComplemento]   = useState("");
  const [bairro,        setBairro]        = useState("");
  const [cidade,        setCidade]        = useState("");
  const [estado,        setEstado]        = useState("");

  async function carregarRelacionados(clienteId: string) {
    setCarregandoRel(true);
    const sb = createClient();
    const [{ data: p }, { data: e }, { data: s }] = await Promise.all([
      sb.from("crm_orders").select("id, nome, categoria, status, total, data_lancamento, data_evento")
        .eq("cliente_id", clienteId).order("data_lancamento", { ascending: false }),
      sb.from("galerias_entrega").select("id, titulo, data_evento, rascunho, suspensa, total_acessos, created_at")
        .eq("cliente_id", clienteId).order("created_at", { ascending: false }),
      sb.from("galerias_selecao").select("id, titulo, data_evento, status, total_fotos, created_at")
        .eq("cliente_id", clienteId).order("created_at", { ascending: false }),
    ]);
    setPedidos((p ?? []) as CrmOrder[]);
    setEntrega((e ?? []) as GaleriaEntrega[]);
    setSelecao((s ?? []) as GaleriaSelecao[]);
    setCarregandoRel(false);
  }

  async function buscarCep(cepVal: string) {
    const c = cepVal.replace(/\D/g, "");
    if (c.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${c}/json/`);
      const data = await res.json();
      if (data.erro) return;
      setLogradouro(data.logradouro ?? "");
      setBairro(data.bairro ?? "");
      setCidade(data.localidade ?? "");
      setEstado(data.uf ?? "");
    } catch { /* ignora erros de rede */ }
  }

  const carregar = useCallback(async () => {
    if (!fotografo) return;
    setLoading(true);
    const { data } = await createClient()
      .from("clientes")
      .select("*")
      .eq("id", id)
      .eq("fotografo_id", fotografo.id)
      .single();
    if (!data) { router.push("/crm/clientes"); return; }
    const c = data as Cliente;
    setCliente(c);
    carregarRelacionados(c.id);
    setNome(c.nome ?? "");
    setEmail(c.email ?? "");
    setTelefone(mascaraTelefone(c.telefone ?? ""));
    setWhatsapp(mascaraTelefone(c.whatsapp ?? ""));
    setEmpresa(c.empresa ?? "");
    setCargo(c.cargo ?? "");
    setInstagram(c.instagram ?? "");
    setCpf(c.cpf ?? "");
    setDataNasc(c.data_nascimento ?? "");
    setObservacoes(c.observacoes ?? "");
    setTipoContato(c.tipo_contato ?? "cliente");
    setCep(c.cep ?? "");
    setLogradouro(c.logradouro ?? "");
    setNumero(c.numero ?? "");
    setComplemento(c.complemento ?? "");
    setBairro(c.bairro ?? "");
    setCidade(c.cidade ?? "");
    setEstado(c.estado ?? "");
    setLoading(false);
  }, [fotografo, id, router]);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async () => {
    if (!nome.trim()) return;
    if (dataNasc && !isValidDate(dataNasc)) { setErroSalvar("Data de nascimento inválida."); return; }
    setErroSalvar("");
    const sb = createClient();
    const fid = fotografo?.id;
    if (!fid) return;
    if (email.trim()) {
      const { data: dup } = await sb.from("clientes").select("id, nome")
        .eq("fotografo_id", fid).eq("email", email.trim()).neq("id", id).maybeSingle();
      if (dup) { setErroSalvar(`Email já cadastrado para "${(dup as { nome: string }).nome}"`); return; }
    }
    if (whatsapp.replace(/\D/g, "")) {
      const { data: dup } = await sb.from("clientes").select("id, nome")
        .eq("fotografo_id", fid).eq("whatsapp", whatsapp).neq("id", id).maybeSingle();
      if (dup) { setErroSalvar(`WhatsApp já cadastrado para "${(dup as { nome: string }).nome}"`); return; }
    }
    setSalvando(true);
    await sb.from("clientes").update({
      nome: nome.trim(), email: email || null, telefone: telefone || null,
      whatsapp: whatsapp || null, empresa: empresa || null, cargo: cargo || null,
      instagram: instagram || null, cpf: cpf || null,
      data_nascimento: dataNasc || null, observacoes: observacoes || null,
      tipo_contato: tipoContato,
      cep: cep || null, logradouro: logradouro || null, numero: numero || null,
      complemento: complemento || null, bairro: bairro || null,
      cidade: cidade || null, estado: estado || null,
    }).eq("id", id);
    await carregar();
    setEditing(false);
    setSalvando(false);
  };

  const excluir = async () => {
    setDeleting(true);
    await createClient().from("clientes").update({ crm_ativo: false }).eq("id", id);
    router.push("/crm/clientes");
  };

  if (loading) return (
    <div style={{ padding: "28px 32px", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
  );
  if (!cliente) return null;

  const tipo = TIPO_MAP[cliente.tipo_contato] ?? TIPO_MAP.cliente;

  const btnBase: React.CSSProperties = {
    padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: "pointer", border: "none",
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 860, fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => router.push("/crm/clientes")}
            style={{ ...btnBase, background: "none", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)", padding: "7px 12px" }}>
            ← Voltar
          </button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: "0 0 4px" }}>
              {cliente.nome}
            </h1>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: tipo.bg, color: tipo.color }}>
              {tipo.label}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {editing ? (
            <>
              <button onClick={() => { setEditing(false); carregar(); }}
                style={{ ...btnBase, background: "none", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)" }}>
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando || !nome.trim()}
                style={{ ...btnBase, background: "#111", color: "#fff", opacity: salvando ? 0.6 : 1 }}>
                {salvando ? "Salvando…" : "Salvar alterações"}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)}
                style={{ ...btnBase, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-primary)" }}>
                Editar
              </button>
              <button onClick={() => setConfirmDel(true)}
                style={{ ...btnBase, background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", color: "#EF4444" }}>
                Excluir
              </button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        /* ── FORMULÁRIO DE EDIÇÃO ── */
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 28 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            <div style={{ marginBottom: 18 }}>
              {label("Nome *")}
              <input value={nome} onChange={e => setNome(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 18 }}>
              {label("Tipo de contato")}
              <select value={tipoContato} onChange={e => setTipoContato(e.target.value as Cliente["tipo_contato"])}
                style={{ ...inputStyle, cursor: "pointer" }}>
                {Object.entries(TIPO_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 18 }}>
              {label("Email")}
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 18 }}>
              {label("Telefone")}
              <input value={telefone}
                onChange={e => setTelefone(mascaraTelefone(e.target.value))}
                onPaste={e => { e.preventDefault(); setTelefone(mascaraTelefone(e.clipboardData.getData("text"))); }}
                placeholder="55 11 99999-9999" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 18 }}>
              {label("WhatsApp")}
              <input value={whatsapp}
                onChange={e => setWhatsapp(mascaraTelefone(e.target.value))}
                onPaste={e => { e.preventDefault(); setWhatsapp(mascaraTelefone(e.clipboardData.getData("text"))); }}
                placeholder="55 11 99999-9999" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 18 }}>
              {label("Instagram")}
              <input value={instagram} onChange={e => setInstagram(e.target.value)} style={inputStyle} placeholder="@" />
            </div>
            <div style={{ marginBottom: 18 }}>
              {label("Empresa")}
              <input value={empresa} onChange={e => setEmpresa(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 18 }}>
              {label("Cargo")}
              <input value={cargo} onChange={e => setCargo(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 18 }}>
              {label("CPF")}
              <input value={cpf} onChange={e => setCpf(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 18 }}>
              {label("Data de nascimento")}
              <input value={dataNasc} onChange={e => setDataNasc(e.target.value)} type="date" style={inputStyle} />
            </div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "8px 0 16px", paddingTop: 16, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
            Endereço
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 80px", gap: "0 16px" }}>
            <div style={{ marginBottom: 18 }}>
              {label("CEP")}
              <input value={cep}
                onChange={e => setCep(e.target.value)}
                onBlur={e => buscarCep(e.target.value)}
                placeholder="00000-000"
                style={inputStyle} />
            </div>
            <div style={{ marginBottom: 18 }}>
              {label("Logradouro")}
              <input value={logradouro} onChange={e => setLogradouro(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 18 }}>
              {label("Número")}
              <input value={numero} onChange={e => setNumero(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 16px" }}>
            <div style={{ marginBottom: 18 }}>
              {label("Complemento")}
              <input value={complemento} onChange={e => setComplemento(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 18 }}>
              {label("Bairro")}
              <input value={bairro} onChange={e => setBairro(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 18, display: "grid", gridTemplateColumns: "1fr 60px", gap: 12 }}>
              <div>
                {label("Cidade")}
                <input value={cidade} onChange={e => setCidade(e.target.value)} style={inputStyle} />
              </div>
              <div>
                {label("UF")}
                <input value={estado} onChange={e => setEstado(e.target.value)} maxLength={2} style={inputStyle} />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            {label("Observações")}
            <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "var(--font-sans)" }} />
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => { setEditing(false); carregar(); }}
              style={{ ...btnBase, background: "none", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)" }}>
              Cancelar
            </button>
            <button onClick={salvar} disabled={salvando || !nome.trim()}
              style={{ ...btnBase, background: "#111", color: "#fff", opacity: salvando ? 0.6 : 1 }}>
              {salvando ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
          {erroSalvar && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#EF4444", textAlign: "right" }}>{erroSalvar}</div>
          )}
        </div>
      ) : (
        /* ── VISUALIZAÇÃO ── */
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 18 }}>Contato</div>
            {field("Email", cliente.email)}
            {field("Telefone", cliente.telefone)}
            {field("WhatsApp", cliente.whatsapp)}
            {field("Instagram", cliente.instagram)}
            {field("CPF", cliente.cpf)}
            {field("Data de nascimento", cliente.data_nascimento ? new Date(cliente.data_nascimento + "T12:00:00").toLocaleDateString("pt-BR") : null)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 18 }}>Profissional</div>
              {field("Empresa", cliente.empresa)}
              {field("Cargo", cliente.cargo)}
            </div>
            {(cliente.logradouro || cliente.cidade) && (
              <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 18 }}>Endereço</div>
                {field("Logradouro", [cliente.logradouro, cliente.numero, cliente.complemento].filter(Boolean).join(", "))}
                {field("Bairro", cliente.bairro)}
                {field("Cidade / UF", [cliente.cidade, cliente.estado].filter(Boolean).join(" — "))}
                {field("CEP", cliente.cep)}
              </div>
            )}
            {cliente.observacoes && (
              <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Observações</div>
                <div style={{ fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{cliente.observacoes}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Relacionados — Pedidos, Galerias */}
      {!editing && (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: "flex", gap: 2, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            {([
              { key: "pedidos" as RelTab, label: `Pedidos (${pedidos.length})` },
              { key: "entrega" as RelTab, label: `Entrega (${entrega.length})` },
              { key: "selecao" as RelTab, label: `Seleção (${selecao.length})` },
            ]).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ padding: "8px 16px", border: "none", background: "none", fontSize: 13,
                  fontWeight: tab === t.key ? 700 : 500,
                  color: tab === t.key ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  borderBottom: tab === t.key ? "2px solid var(--color-text-primary)" : "2px solid transparent",
                  cursor: "pointer", marginBottom: -1 }}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderTop: "none", borderRadius: "0 0 10px 10px" }}>
            {carregandoRel ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>Carregando…</div>
            ) : tab === "pedidos" ? (
              pedidos.length === 0
                ? <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Nenhum pedido vinculado</div>
                : <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--color-background-secondary)" }}>
                        {["Pedido", "Categoria", "Status", "Total", "Data"].map(h => (
                          <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(pedidos as Array<{ id: string; nome: string | null; categoria: string | null; status: string | null; total: number; data_lancamento: string | null }>).map(p => {
                        const statusMap: Record<string, { label: string; color: string }> = {
                          aguardando_sinal: { label: "Aguardando sinal", color: "#D97706" },
                          em_producao:      { label: "Em produção",      color: "#2563EB" },
                          entregue:         { label: "Entregue",         color: "#059669" },
                          cancelado:        { label: "Cancelado",        color: "#EF4444" },
                          concluido:        { label: "Concluído",        color: "#6B7280" },
                        };
                        const st = statusMap[p.status ?? ""] ?? { label: p.status ?? "—", color: "var(--color-text-secondary)" };
                        return (
                          <tr key={p.id} onClick={() => router.push(`/crm/pedidos/${p.id}`)} style={{ cursor: "pointer" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--color-background-secondary)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "")}>
                            <td style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12 }}>{p.nome ?? "—"}</td>
                            <td style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12 }}>{p.categoria ?? "—"}</td>
                            <td style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12 }}>
                              <span style={{ color: st.color, fontWeight: 600 }}>{st.label}</span>
                            </td>
                            <td style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12 }}>
                              R$ {(p.total ?? 0).toFixed(2).replace(".", ",")}
                            </td>
                            <td style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12, color: "var(--color-text-secondary)" }}>
                              {p.data_lancamento ? new Date(p.data_lancamento + "T12:00").toLocaleDateString("pt-BR") : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
            ) : tab === "entrega" ? (
              entrega.length === 0
                ? <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Nenhuma galeria de entrega vinculada</div>
                : <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--color-background-secondary)" }}>
                        {["Título", "Evento", "Status", "Acessos"].map(h => (
                          <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(entrega as Array<{ id: string; titulo: string | null; data_evento: string | null; rascunho: boolean | null; suspensa: boolean | null; total_acessos: number | null }>).map(g => {
                        const stLabel = g.rascunho ? "Rascunho" : g.suspensa ? "Suspensa" : "Ativa";
                        const stColor = g.rascunho ? "#6B7280" : g.suspensa ? "#EF4444" : "#059669";
                        return (
                          <tr key={g.id} onClick={() => router.push(`/entrega/${g.id}`)} style={{ cursor: "pointer" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--color-background-secondary)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "")}>
                            <td style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12 }}>{g.titulo ?? "—"}</td>
                            <td style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12, color: "var(--color-text-secondary)" }}>
                              {g.data_evento ? new Date(g.data_evento + "T12:00").toLocaleDateString("pt-BR") : "—"}
                            </td>
                            <td style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12 }}>
                              <span style={{ color: stColor, fontWeight: 600 }}>{stLabel}</span>
                            </td>
                            <td style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12, color: "var(--color-text-secondary)" }}>
                              {g.total_acessos ?? 0}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
            ) : (
              selecao.length === 0
                ? <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Nenhuma galeria de seleção vinculada</div>
                : <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--color-background-secondary)" }}>
                        {["Título", "Evento", "Status", "Fotos"].map(h => (
                          <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(selecao as Array<{ id: string; titulo: string | null; data_evento: string | null; status: string | null; total_fotos: number | null }>).map(g => {
                        const selStatusMap: Record<string, { label: string; color: string }> = {
                          rascunho:           { label: "Rascunho",            color: "#6B7280" },
                          ativa:              { label: "Ativa",               color: "#059669" },
                          encerrada:          { label: "Encerrada",           color: "#EF4444" },
                          aguardando_revisao: { label: "Aguardando revisão",  color: "#D97706" },
                        };
                        const ss = selStatusMap[g.status ?? ""] ?? { label: g.status ?? "—", color: "var(--color-text-secondary)" };
                        return (
                          <tr key={g.id} onClick={() => router.push(`/selecao/${g.id}`)} style={{ cursor: "pointer" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--color-background-secondary)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "")}>
                            <td style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12 }}>{g.titulo ?? "—"}</td>
                            <td style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12, color: "var(--color-text-secondary)" }}>
                              {g.data_evento ? new Date(g.data_evento + "T12:00").toLocaleDateString("pt-BR") : "—"}
                            </td>
                            <td style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12 }}>
                              <span style={{ color: ss.color, fontWeight: 600 }}>{ss.label}</span>
                            </td>
                            <td style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12, color: "var(--color-text-secondary)" }}>
                              {g.total_fotos ?? 0}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
            )}
          </div>
        </div>
      )}

      {/* Modal excluir */}
      {confirmDel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          onClick={e => e.target === e.currentTarget && setConfirmDel(false)}>
          <div style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: 28, width: 380, border: "0.5px solid var(--color-border-tertiary)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 8 }}>Remover contato?</div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 24 }}>
              <strong>{cliente.nome}</strong> será removido da listagem do CRM. Os dados não serão apagados permanentemente.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDel(false)}
                style={{ ...btnBase, background: "none", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)" }}>
                Cancelar
              </button>
              <button onClick={excluir} disabled={deleting}
                style={{ ...btnBase, background: "#EF4444", color: "#fff", opacity: deleting ? 0.6 : 1 }}>
                {deleting ? "Removendo…" : "Sim, remover"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
