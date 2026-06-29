"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { isValidDate, mascaraTelefone } from "@/lib/utils/format";
import type { Cliente } from "@/lib/supabase/types";

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
              <input value={cep} onChange={e => setCep(e.target.value)} style={inputStyle} />
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
