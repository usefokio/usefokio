"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { isValidDate, mascaraTelefone } from "@/lib/utils/format";
import { gerarSenhaAcesso } from "@/lib/utils";

const TIPO_MAP: Record<string, string> = {
  cliente:      "Cliente",
  oportunidade: "Oportunidade",
  fornecedor:   "Fornecedor",
  parceiro:     "Parceiro",
  fotografo:    "Fotógrafo",
  videografo:   "Videógrafo",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "0.5px solid var(--color-border-secondary)",
  background: "var(--color-background-primary)",
  fontSize: 13, color: "var(--color-text-primary)", outline: "none",
  boxSizing: "border-box",
};

const lbl = (text: string) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{text}</div>
);

export default function NovoClientePage() {
  const router        = useRouter();
  const { fotografo } = useFotografo();

  const [nome,        setNome]        = useState("");
  const [email,       setEmail]       = useState("");
  const [telefone,    setTelefone]    = useState("");
  const [whatsapp,    setWhatsapp]    = useState("");
  const [empresa,     setEmpresa]     = useState("");
  const [cargo,       setCargo]       = useState("");
  const [instagram,   setInstagram]   = useState("");
  const [cpf,         setCpf]         = useState("");
  const [dataNasc,    setDataNasc]    = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [tipoContato, setTipoContato] = useState("cliente");
  const [cep,         setCep]         = useState("");
  const [logradouro,  setLogradouro]  = useState("");
  const [numero,      setNumero]      = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro,      setBairro]      = useState("");
  const [cidade,      setCidade]      = useState("");
  const [estado,      setEstado]      = useState("");
  const [salvando,    setSalvando]    = useState(false);
  const [erro,        setErro]        = useState("");

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

  const salvar = async () => {
    if (!nome.trim() || !fotografo) return;
    if (dataNasc && !isValidDate(dataNasc)) { setErro("Data de nascimento inválida."); return; }
    setErro("");
    const sb = createClient();
    const fid = fotografo.id;
    if (email.trim()) {
      const { data: dup } = await sb.from("clientes").select("id, nome")
        .eq("fotografo_id", fid).eq("email", email.trim()).maybeSingle();
      if (dup) { setErro(`Email já cadastrado para "${(dup as { nome: string }).nome}"`); return; }
    }
    if (whatsapp.replace(/\D/g, "")) {
      const { data: dup } = await sb.from("clientes").select("id, nome")
        .eq("fotografo_id", fid).eq("whatsapp", whatsapp).maybeSingle();
      if (dup) { setErro(`WhatsApp já cadastrado para "${(dup as { nome: string }).nome}"`); return; }
    }
    setSalvando(true);
    const { data, error } = await sb.from("clientes").insert({
      fotografo_id:    fid,
      nome:            nome.trim(),
      email:           email.trim() || null,
      telefone:        telefone || null,
      whatsapp:        whatsapp || telefone || null,
      empresa:         empresa.trim() || null,
      cargo:           cargo.trim() || null,
      instagram:       instagram.trim() || null,
      cpf:             cpf.trim() || null,
      data_nascimento: dataNasc || null,
      observacoes:     observacoes.trim() || null,
      tipo_contato:    tipoContato,
      cep:             cep.trim() || null,
      logradouro:      logradouro.trim() || null,
      numero:          numero.trim() || null,
      complemento:     complemento.trim() || null,
      bairro:          bairro.trim() || null,
      cidade:          cidade.trim() || null,
      estado:          estado.trim() || null,
      senha_acesso:    gerarSenhaAcesso(),
      crm_ativo:       true,
    }).select("id").single();
    if (error || !data) { setErro("Erro ao salvar. Tente novamente."); setSalvando(false); return; }
    router.push(`/crm/clientes/${(data as { id: string }).id}`);
  };

  const btnBase: React.CSSProperties = {
    padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: "pointer", border: "none",
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 860, fontFamily: "var(--font-sans)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <button onClick={() => router.push("/crm/clientes")}
          style={{ ...btnBase, background: "none", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)", padding: "7px 12px" }}>
          ← Voltar
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: 0 }}>
          Novo contato
        </h1>
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 28 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
          <div style={{ marginBottom: 18 }}>
            {lbl("Nome *")}
            <input value={nome} onChange={e => setNome(e.target.value)} style={inputStyle} autoFocus />
          </div>
          <div style={{ marginBottom: 18 }}>
            {lbl("Tipo de contato")}
            <select value={tipoContato} onChange={e => setTipoContato(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}>
              {Object.entries(TIPO_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 18 }}>
            {lbl("Email")}
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 18 }}>
            {lbl("Telefone")}
            <input value={telefone}
              onChange={e => setTelefone(mascaraTelefone(e.target.value))}
              onPaste={e => { e.preventDefault(); setTelefone(mascaraTelefone(e.clipboardData.getData("text"))); }}
              placeholder="55 11 99999-9999" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 18 }}>
            {lbl("WhatsApp")}
            <input value={whatsapp}
              onChange={e => setWhatsapp(mascaraTelefone(e.target.value))}
              onPaste={e => { e.preventDefault(); setWhatsapp(mascaraTelefone(e.clipboardData.getData("text"))); }}
              placeholder="55 11 99999-9999" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 18 }}>
            {lbl("Instagram")}
            <input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 18 }}>
            {lbl("Empresa")}
            <input value={empresa} onChange={e => setEmpresa(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 18 }}>
            {lbl("Cargo")}
            <input value={cargo} onChange={e => setCargo(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 18 }}>
            {lbl("CPF")}
            <input value={cpf} onChange={e => setCpf(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 18 }}>
            {lbl("Data de nascimento")}
            <input value={dataNasc} onChange={e => setDataNasc(e.target.value)} type="date" style={inputStyle} />
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "8px 0 16px", paddingTop: 16, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
          Endereço
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 80px", gap: "0 16px" }}>
          <div style={{ marginBottom: 18 }}>
            {lbl("CEP")}
            <input value={cep}
              onChange={e => setCep(e.target.value)}
              onBlur={e => buscarCep(e.target.value)}
              placeholder="00000-000"
              style={inputStyle} />
          </div>
          <div style={{ marginBottom: 18 }}>
            {lbl("Logradouro")}
            <input value={logradouro} onChange={e => setLogradouro(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 18 }}>
            {lbl("Número")}
            <input value={numero} onChange={e => setNumero(e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 16px" }}>
          <div style={{ marginBottom: 18 }}>
            {lbl("Complemento")}
            <input value={complemento} onChange={e => setComplemento(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 18 }}>
            {lbl("Bairro")}
            <input value={bairro} onChange={e => setBairro(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 18, display: "grid", gridTemplateColumns: "1fr 60px", gap: 12 }}>
            <div>
              {lbl("Cidade")}
              <input value={cidade} onChange={e => setCidade(e.target.value)} style={inputStyle} />
            </div>
            <div>
              {lbl("UF")}
              <input value={estado} onChange={e => setEstado(e.target.value)} maxLength={2} style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          {lbl("Observações")}
          <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "var(--font-sans)" }} />
        </div>

        {erro && (
          <div style={{ marginBottom: 16, fontSize: 13, color: "#EF4444", padding: "10px 14px", background: "rgba(239,68,68,0.07)", borderRadius: 8 }}>
            {erro}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => router.push("/crm/clientes")}
            style={{ ...btnBase, background: "none", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)" }}>
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando || !nome.trim()}
            style={{ ...btnBase, background: "#111", color: "#fff", opacity: (salvando || !nome.trim()) ? 0.5 : 1 }}>
            {salvando ? "Salvando…" : "Criar contato"}
          </button>
        </div>
      </div>
    </div>
  );
}
