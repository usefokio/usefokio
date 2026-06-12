"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { gerarSenhaAcesso } from "@/lib/utils";
import { Field } from "@/components/ui/Field";
import { inputStyle } from "@/lib/styles";

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const DRAFT_KEY = "novo-cliente-draft";

type Draft = {
  nome: string; email: string; telefone: string; cpf: string; senha: string;
  dataNascimento: string; rg: string; sexo: string;
  cep: string; logradouro: string; numero: string; complemento: string;
  bairro: string; cidade: string; estado: string;
};

// Lazy initializer — só executa no cliente, nunca no SSR
function draftOr(key: keyof Draft, fallback: string): () => string {
  return () => {
    try {
      const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "{}") as Partial<Draft>;
      return d[key] ?? fallback;
    } catch { return fallback; }
  };
}

export default function NovoClientePage() {
  const router = useRouter();
  const { fotografo } = useFotografo();

  const [nome, setNome]         = useState(draftOr("nome", ""));
  const [email, setEmail]       = useState(draftOr("email", ""));
  const [telefone, setTelefone] = useState(draftOr("telefone", ""));
  const [cpf, setCpf]           = useState(draftOr("cpf", ""));
  const [senha, setSenha]       = useState(() => draftOr("senha", "")() || gerarSenhaAcesso());
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [copiado, setCopiado]   = useState(false);

  const [dataNascimento, setDataNascimento] = useState(draftOr("dataNascimento", ""));
  const [rg, setRg]                         = useState(draftOr("rg", ""));
  const [sexo, setSexo]                     = useState(draftOr("sexo", ""));
  const [cep, setCep]                       = useState(draftOr("cep", ""));
  const [logradouro, setLogradouro]         = useState(draftOr("logradouro", ""));
  const [numero, setNumero]                 = useState(draftOr("numero", ""));
  const [complemento, setComplemento]       = useState(draftOr("complemento", ""));
  const [bairro, setBairro]                 = useState(draftOr("bairro", ""));
  const [cidade, setCidade]                 = useState(draftOr("cidade", ""));
  const [estado, setEstado]                 = useState(draftOr("estado", ""));
  const [buscandoCep, setBuscandoCep]       = useState(false);

  useEffect(() => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
      nome, email, telefone, cpf, senha,
      dataNascimento, rg, sexo, cep, logradouro, numero,
      complemento, bairro, cidade, estado,
    }));
  }, [nome, email, telefone, cpf, senha, dataNascimento, rg, sexo,
      cep, logradouro, numero, complemento, bairro, cidade, estado]);

  const buscarCep = async (v: string) => {
    setCep(v);
    const limpo = v.replace(/\D/g, "");
    if (limpo.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setLogradouro(data.logradouro ?? "");
        setBairro(data.bairro ?? "");
        setCidade(data.localidade ?? "");
        setEstado(data.uf ?? "");
      }
    } catch { /* ignora */ }
    setBuscandoCep(false);
  };

  const handleSave = async () => {
    if (!nome.trim()) { setError("Nome é obrigatório."); return; }
    if (!fotografo)   { setError("Sessão expirada."); return; }

    setSaving(true);
    setError("");

    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("clientes")
      .insert({
        fotografo_id:    fotografo.id,
        nome:            nome.trim(),
        email:           email.trim()          || null,
        telefone:        telefone.trim()       || null,
        cpf:             cpf.trim()            || null,
        senha_acesso:    senha,
        data_nascimento: dataNascimento        || null,
        rg:              rg.trim()             || null,
        sexo:            sexo                  || null,
        cep:             cep.replace(/\D/g,"") || null,
        logradouro:      logradouro.trim()     || null,
        numero:          numero.trim()         || null,
        complemento:     complemento.trim()    || null,
        bairro:          bairro.trim()         || null,
        cidade:          cidade.trim()         || null,
        estado:          estado                || null,
      })
      .select()
      .single();

    setSaving(false);

    if (err) { setError(err.message); return; }
    if (!data) { setError("Cliente salvo, mas houve um erro ao redirecionar."); return; }
    sessionStorage.removeItem(DRAFT_KEY);
    router.push(`/clientes/${data.id}`);
    router.refresh();
  };

  const secaoHeader = (label: string) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14, marginTop: 8 }}>
      {label}
    </div>
  );

  return (
    <div style={{ padding: "26px 30px", maxWidth: 640 }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: 0 }}>
            ← Voltar
          </button>
          <span style={{ color: "var(--color-border-secondary)" }}>/</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>Novo cliente</span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !nome.trim()}
          style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: saving || !nome.trim() ? "#93C5FD" : "#2563EB", color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving || !nome.trim() ? "default" : "pointer", flexShrink: 0 }}
        >
          {saving ? "Salvando…" : "Cadastrar"}
        </button>
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#EF4444" }}>
          {error}
        </div>
      )}

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px" }}>

        {/* ── Contato ── */}
        {secaoHeader("Contato")}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Nome completo *">
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Maria Oliveira" style={inputStyle} autoFocus />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" style={inputStyle} />
            </Field>
            <Field label="Telefone / WhatsApp">
              <input type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" style={inputStyle} />
            </Field>
          </div>
        </div>

        {/* ── Dados pessoais ── */}
        <div style={{ marginTop: 24, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
          {secaoHeader("Dados pessoais")}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="CPF / CNPJ">
                <input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" style={inputStyle} />
              </Field>
              <Field label="RG">
                <input value={rg} onChange={(e) => setRg(e.target.value)} placeholder="00.000.000-0" style={inputStyle} />
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Data de nascimento">
                <input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Sexo">
                <select value={sexo} onChange={(e) => setSexo(e.target.value)} style={inputStyle}>
                  <option value="">Selecionar…</option>
                  <option value="feminino">Feminino</option>
                  <option value="masculino">Masculino</option>
                  <option value="outro">Outro</option>
                  <option value="nao_declarar">Não declarar</option>
                </select>
              </Field>
            </div>
          </div>
        </div>

        {/* ── Endereço ── */}
        <div style={{ marginTop: 24, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
          {secaoHeader("Endereço")}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 14 }}>
              <Field label={buscandoCep ? "CEP (buscando…)" : "CEP"}>
                <input value={cep} onChange={(e) => buscarCep(e.target.value)} placeholder="00000-000" maxLength={9} style={{ ...inputStyle, opacity: buscandoCep ? 0.6 : 1 }} />
              </Field>
              <Field label="Logradouro">
                <input value={logradouro} onChange={(e) => setLogradouro(e.target.value)} placeholder="Rua, Av., etc." style={inputStyle} />
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 14 }}>
              <Field label="Número">
                <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="123" style={inputStyle} />
              </Field>
              <Field label="Complemento">
                <input value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Apto, Bloco, etc." style={inputStyle} />
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 14 }}>
              <Field label="Bairro">
                <input value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Bairro" style={inputStyle} />
              </Field>
              <Field label="Cidade">
                <input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Cidade" style={inputStyle} />
              </Field>
              <Field label="Estado">
                <select value={estado} onChange={(e) => setEstado(e.target.value)} style={inputStyle}>
                  <option value="">UF</option>
                  {ESTADOS_BR.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </Field>
            </div>
          </div>
        </div>

        {/* ── Senha de acesso ── */}
        <div style={{ marginTop: 24, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
          {secaoHeader("Acesso às galerias")}
          <Field label="Senha de acesso">
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ ...inputStyle, flex: 1, display: "flex", alignItems: "center", fontFamily: "monospace", fontSize: 15, letterSpacing: "0.12em", fontWeight: 600, color: "var(--color-text-primary)", background: "var(--color-background-secondary)", userSelect: "all" }}>
                {senha}
              </div>
              <button type="button" onClick={() => setSenha(gerarSenhaAcesso())} title="Gerar nova senha" style={{ padding: "0 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", cursor: "pointer", fontSize: 16, flexShrink: 0, color: "var(--color-text-secondary)" }}>
                🔄
              </button>
              <button type="button" onClick={async () => { await navigator.clipboard.writeText(senha); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }} title="Copiar senha" style={{ padding: "0 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: copiado ? "rgba(16,185,129,0.1)" : "var(--color-background-secondary)", cursor: "pointer", fontSize: 13, fontWeight: 600, flexShrink: 0, color: copiado ? "#059669" : "var(--color-text-secondary)", transition: "all 0.15s" }}>
                {copiado ? "✓ Copiado" : "Copiar"}
              </button>
            </div>
            <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "6px 0 0" }}>
              Gerada automaticamente. Anote antes de salvar — você poderá consultá-la depois na página do cliente.
            </p>
          </Field>
        </div>

        <div style={{ marginTop: 28, display: "flex", gap: 10 }}>
          <button onClick={handleSave} disabled={saving || !nome.trim()} style={{ padding: "10px 28px", borderRadius: 8, background: saving || !nome.trim() ? "#93C5FD" : "#2563EB", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: saving || !nome.trim() ? "not-allowed" : "pointer" }}>
            {saving ? "Salvando…" : "Cadastrar cliente"}
          </button>
          <button onClick={() => router.back()} style={{ padding: "10px 18px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
