"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { Field } from "@/components/ui/Field";
import { inputStyle } from "@/lib/styles";
import { buscarCep } from "@/lib/utils/cep";
import { useEditorEstado, SeloEstado, BotaoSalvarEstado, ModalNaoSalvo } from "@/app/(dashboard)/_components/EditorEstado";

// Configurações › Empresa › Dados da empresa — dados PÚBLICOS do estúdio (fotografos.*), usados no site,
// galerias, propostas, contratos e e-mails. O e-mail aqui é o de CONTATO da empresa (o de acesso fica em Usuário).

const ESTADOS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA",
  "MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN",
  "RS","RO","RR","SC","SP","SE","TO",
];

type Dados = {
  nome_empresa: string; telefone: string; whatsapp: string; email: string; site: string;
  cep: string; rua: string; numero: string; complemento: string; bairro: string; cidade: string; estado: string;
};
const VAZIO: Dados = { nome_empresa: "", telefone: "", whatsapp: "", email: "", site: "", cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "" };
const CAMPOS = Object.keys(VAZIO) as (keyof Dados)[];

function Secao({ titulo }: { titulo: string }) {
  return (
    <div style={{ gridColumn: "1 / -1", borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 8, marginTop: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{titulo}</span>
    </div>
  );
}

export default function DadosEmpresaPage() {
  const { fotografo, reload } = useFotografo();
  const [d, setD] = useState<Dados>(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const snapshot = JSON.stringify(d);
  const estado = useEditorEstado(snapshot, "/configuracoes");

  useEffect(() => {
    if (!fotografo) return;
    const f = fotografo as unknown as Record<string, string | null>;
    const ini = Object.fromEntries(CAMPOS.map((k) => [k, f[k] ?? ""])) as Dados;
    setD(ini);
    estado.inicializar(JSON.stringify(ini));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotografo?.id]);

  const upd = (k: keyof Dados, v: string) => setD((x) => ({ ...x, [k]: v }));
  const inp = (k: keyof Dados, placeholder = "", type = "text") => (
    <input type={type} value={d[k]} onChange={(e) => upd(k, e.target.value)} placeholder={placeholder} style={inputStyle} />
  );

  async function salvar(): Promise<boolean> {
    if (!fotografo) return false;
    if (!d.nome_empresa.trim()) { setMsg("Erro: informe o nome da empresa."); return false; }
    if (!d.email.trim()) { setMsg("Erro: informe o e-mail de contato."); return false; }
    setSalvando(true); setMsg(null);
    const payload = Object.fromEntries(CAMPOS.map((k) => [k, d[k].trim() || null]));
    const { error } = await createClient().from("fotografos")
      .update({ ...payload, updated_at: new Date().toISOString() }).eq("id", fotografo.id);
    setSalvando(false);
    if (error) { setMsg("Erro: " + error.message); return false; }
    estado.marcarSalvo(snapshot);
    setMsg("Dados da empresa salvos!");
    reload();
    return true;
  }

  if (!fotografo) return <div style={{ padding: "26px 30px", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;

  return (
    <div style={{ padding: "26px 30px", maxWidth: 760 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>Dados da empresa</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>Aparecem no site, nas galerias, propostas, contratos e e-mails.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <SeloEstado temAlteracoes={estado.temAlteracoes} />
          <BotaoSalvarEstado temAlteracoes={estado.temAlteracoes} salvando={salvando} onClick={() => salvar()} compacto />
        </div>
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "24px 28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Secao titulo="Empresa" />
          <div style={{ gridColumn: "1 / -1" }}><Field label="Nome da empresa *">{inp("nome_empresa", "Ex: Rafael Fotografia")}</Field></div>

          <Secao titulo="Contato" />
          <Field label="Telefone">{inp("telefone", "(00) 0000-0000", "tel")}</Field>
          <Field label="WhatsApp">{inp("whatsapp", "(00) 00000-0000", "tel")}</Field>
          <Field label="E-mail de contato *">{inp("email", "contato@suaempresa.com.br", "email")}</Field>
          <Field label="Site">{inp("site", "https://suaempresa.com.br", "url")}</Field>

          <Secao titulo="Endereço" />
          <Field label="CEP">
            <input type="text" value={d.cep} onChange={(e) => upd("cep", e.target.value)} placeholder="00000-000" style={inputStyle}
              onBlur={async (e) => {
                const end = await buscarCep(e.target.value);
                if (end) setD((x) => ({ ...x, rua: end.logradouro || x.rua, bairro: end.bairro || x.bairro, cidade: end.cidade || x.cidade, estado: end.estado || x.estado }));
              }} />
          </Field>
          <Field label="Estado">
            <select value={d.estado} onChange={(e) => upd("estado", e.target.value)} style={inputStyle}>
              <option value="">Selecione</option>
              {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </Field>
          <div style={{ gridColumn: "1 / -1" }}><Field label="Rua / Avenida">{inp("rua", "Nome da rua")}</Field></div>
          <Field label="Número">{inp("numero", "Nº")}</Field>
          <Field label="Complemento">{inp("complemento", "Sala, andar…")}</Field>
          <Field label="Bairro">{inp("bairro", "Bairro")}</Field>
          <Field label="Cidade">{inp("cidade", "Cidade")}</Field>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 22 }}>
          {msg && <span style={{ fontSize: 13, fontWeight: 600, color: msg.startsWith("Erro") ? "#DC2626" : "#059669" }}>{msg}</span>}
          <BotaoSalvarEstado temAlteracoes={estado.temAlteracoes} salvando={salvando} onClick={() => salvar()} />
        </div>
      </div>

      <ModalNaoSalvo
        aberto={estado.modalAberto}
        salvando={salvando}
        onSalvarESair={async () => { if (await salvar()) estado.sairAgora(); }}
        onSairSemSalvar={estado.sairAgora}
        onContinuar={estado.fecharModal}
      />
    </div>
  );
}
