"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { Field } from "@/components/ui/Field";
import { inputStyle } from "@/lib/styles";
import { useEditorEstado, SeloEstado, BotaoSalvarEstado, ModalNaoSalvo } from "@/app/(dashboard)/_components/EditorEstado";

// Configurações › Usuário › Editar dados — só os dados da PESSOA (nome e preferência de e-mails).
// Dados do estúdio: Configurações › Empresa. Senha: Configurações › Usuário › Segurança.
export default function EditarMeusDadosPage() {
  const { fotografo, reload } = useFotografo();
  const [nome, setNome] = useState("");
  const [aceitaEmails, setAceitaEmails] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const snapshot = JSON.stringify([nome, aceitaEmails]);
  const estado = useEditorEstado(snapshot, "/configuracoes/usuario");

  useEffect(() => {
    if (!fotografo) return;
    setNome(fotografo.nome_completo ?? "");
    setAceitaEmails(!!fotografo.aceita_emails);
    estado.inicializar(JSON.stringify([fotografo.nome_completo ?? "", !!fotografo.aceita_emails]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotografo?.id]);

  async function salvar(): Promise<boolean> {
    if (!fotografo) return false;
    if (!nome.trim()) { setMsg("Erro: informe seu nome completo."); return false; }
    setSalvando(true); setMsg(null);
    const { error } = await createClient().from("fotografos")
      .update({ nome_completo: nome.trim(), aceita_emails: aceitaEmails, updated_at: new Date().toISOString() })
      .eq("id", fotografo.id);
    setSalvando(false);
    if (error) { setMsg("Erro: " + error.message); return false; }
    estado.marcarSalvo(snapshot);
    setMsg("Dados salvos!");
    reload();
    return true;
  }

  if (!fotografo) return <div style={{ padding: "26px 30px", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;

  return (
    <div style={{ padding: "26px 30px", maxWidth: 680 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={estado.sair} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: 0 }}>← Meus dados</button>
          <span style={{ color: "var(--color-border-secondary)" }}>/</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>Editar dados</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <SeloEstado temAlteracoes={estado.temAlteracoes} />
          <BotaoSalvarEstado temAlteracoes={estado.temAlteracoes} salvando={salvando} onClick={() => salvar()} compacto />
        </div>
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
        <Field label="Nome completo *">
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome completo" style={inputStyle} />
        </Field>

        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: "var(--color-text-primary)" }}>
          <input type="checkbox" checked={aceitaEmails} onChange={(e) => setAceitaEmails(e.target.checked)} style={{ width: 16, height: 16 }} />
          Receber novidades e ofertas por e-mail
        </label>

        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          O e-mail de acesso é o do seu login. Dados do estúdio (nome da empresa, contato, endereço, redes e logo) ficam em{" "}
          <Link href="/configuracoes/empresa" style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>Configurações › Empresa</Link>;
          a senha, em <Link href="/configuracoes/usuario/seguranca" style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>Segurança</Link>.
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
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
