"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { Field } from "@/components/ui/Field";
import { inputStyle } from "@/lib/styles";
import { REDES, linkRede, type RedeSocial } from "@/lib/empresa/redes";
import { useEditorEstado, SeloEstado, BotaoSalvarEstado, ModalNaoSalvo } from "@/app/(dashboard)/_components/EditorEstado";

// Configurações › Empresa › Redes sociais — fonte única das redes (site, e-mails, propostas…).
type Redes = Record<RedeSocial, string>;
const VAZIO: Redes = { instagram: "", facebook: "", tiktok: "", youtube: "" };

export default function RedesEmpresaPage() {
  const { fotografo, reload } = useFotografo();
  const [r, setR] = useState<Redes>(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const snapshot = JSON.stringify(r);
  const estado = useEditorEstado(snapshot, "/configuracoes");

  useEffect(() => {
    if (!fotografo) return;
    const f = fotografo as unknown as Record<string, string | null>;
    const ini = Object.fromEntries(REDES.map((x) => [x.chave, f[x.chave] ?? ""])) as Redes;
    setR(ini);
    estado.inicializar(JSON.stringify(ini));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotografo?.id]);

  async function salvar(): Promise<boolean> {
    if (!fotografo) return false;
    setSalvando(true); setMsg(null);
    const payload = Object.fromEntries(REDES.map((x) => [x.chave, r[x.chave].trim() || null]));
    const { error } = await createClient().from("fotografos")
      .update({ ...payload, updated_at: new Date().toISOString() }).eq("id", fotografo.id);
    setSalvando(false);
    if (error) { setMsg("Erro: " + error.message); return false; }
    estado.marcarSalvo(snapshot);
    setMsg("Redes sociais salvas!");
    reload();
    return true;
  }

  if (!fotografo) return <div style={{ padding: "26px 30px", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;

  return (
    <div style={{ padding: "26px 30px", maxWidth: 760 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>Redes sociais</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>Um lugar só: aparecem no rodapé e na página de contato do site e onde mais forem usadas.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <SeloEstado temAlteracoes={estado.temAlteracoes} />
          <BotaoSalvarEstado temAlteracoes={estado.temAlteracoes} salvando={salvando} onClick={() => salvar()} compacto />
        </div>
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "24px 28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {REDES.map((x) => {
            const link = linkRede(x.chave, r[x.chave]);
            return (
              <Field key={x.chave} label={x.label}>
                <input value={r[x.chave]} onChange={(e) => setR((v) => ({ ...v, [x.chave]: e.target.value }))}
                  placeholder="@seu.perfil ou o link completo" style={inputStyle} />
                <div style={{ fontSize: 11, marginTop: 4, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {link ? <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: "#2563EB", textDecoration: "none" }}>{link}</a> : "Não informado"}
                </div>
              </Field>
            );
          })}
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
