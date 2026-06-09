"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { Field } from "@/components/ui/Field";
import { inputStyle } from "@/lib/styles";
import { ClienteSelect } from "../_components/ClienteSelect";
import type { Cliente } from "@/lib/supabase/types";

const PRAZOS_FIXOS = [15, 30, 60, 120];

function addDias(n: number): Date {
  const d = new Date(); d.setDate(d.getDate() + n); return d;
}

function formatarData(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function NovaEntregaPage() {
  const router = useRouter();
  const { fotografo } = useFotografo();

  const [titulo,      setTitulo]     = useState("");
  const [clienteId,   setClienteId]  = useState("");
  const [cliente,     setCliente]    = useState<Cliente | null>(null);
  const [dataEvento,  setDataEvento] = useState("");
  const [driveLink,   setDriveLink]  = useState("");
  const [prazoFixo,   setPrazoFixo]  = useState<number | "custom">(30);
  const [prazoCustom, setPrazoCustom]= useState("");
  const [renovacao,   setRenovacao]  = useState("");
  const [mensagem,    setMensagem]   = useState("");
  const [saving,      setSaving]     = useState(false);

  // Pré-preencher mensagem padrão quando o fotografo carrega
  useEffect(() => {
    if (fotografo?.mensagem_padrao_entrega && !mensagem) {
      setMensagem(fotografo.mensagem_padrao_entrega);
    }
  }, [fotografo]);

  const diasEfetivos = prazoFixo === "custom"
    ? (parseInt(prazoCustom) || 0)
    : prazoFixo;

  const dataExpiracao = diasEfetivos > 0 ? addDias(diasEfetivos) : null;

  async function handlePublicar() {
    if (!titulo.trim() || !fotografo) return;
    setSaving(true);
    const supabase = createClient();
    const expires_at = dataExpiracao ? dataExpiracao.toISOString() : null;

    await supabase.from("galerias_entrega").insert({
      fotografo_id: fotografo.id,
      cliente_id:   clienteId || null,
      titulo:       titulo.trim(),
      data_evento:  dataEvento || null,
      drive_link:   driveLink.trim() || null,
      expires_at,
      renewal_fee:  renovacao ? parseFloat(renovacao) : null,
      mensagem:     mensagem.trim() || null,
    });

    router.push("/entrega");
  }

  return (
    <div style={{ padding: "26px 30px", maxWidth: 640 }}>
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--color-text-secondary)", padding: 0, marginBottom: 10 }}
        >
          ← Voltar
        </button>
        <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>
          Nova galeria de entrega
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
          Configure o link de acesso para o cliente baixar as fotos editadas
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        <Field label="Título da galeria">
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Casamento Ana & Pedro"
            style={inputStyle}
          />
        </Field>

        <Field label="Cliente">
          <ClienteSelect
            value={clienteId}
            onChange={(id, c) => { setClienteId(id); setCliente(c); }}
          />
        </Field>

        <Field label="Data do evento">
          <input
            type="date"
            value={dataEvento}
            onChange={(e) => setDataEvento(e.target.value)}
            style={inputStyle}
          />
        </Field>

        <Field label="Link do Google Drive">
          <input
            type="url"
            value={driveLink}
            onChange={(e) => setDriveLink(e.target.value)}
            placeholder="https://drive.google.com/drive/folders/…"
            style={inputStyle}
          />
          <div style={{
            marginTop: 7,
            background: "rgba(245,158,11,0.08)",
            border: "0.5px solid rgba(245,158,11,0.3)",
            borderRadius: 7, padding: "8px 12px",
            fontSize: 12, color: "#92400E", lineHeight: 1.5,
          }}>
            ℹ️ Certifique-se de que o link esteja configurado como <strong>"Qualquer pessoa com o link pode visualizar"</strong> no Google Drive.
          </div>
        </Field>

        {/* Prazo de acesso */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Prazo de acesso
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {PRAZOS_FIXOS.map((d) => (
              <button key={d} type="button" onClick={() => setPrazoFixo(d)} style={{
                padding: "9px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: `0.5px solid ${prazoFixo === d ? "var(--color-text-primary)" : "var(--color-border-secondary)"}`,
                background: prazoFixo === d ? "var(--color-text-primary)" : "var(--color-background-secondary)",
                color: prazoFixo === d ? "var(--color-background-primary)" : "var(--color-text-secondary)",
                transition: "all 0.15s",
              }}>
                {d} dias
              </button>
            ))}
            <button type="button" onClick={() => setPrazoFixo("custom")} style={{
              padding: "9px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: `0.5px solid ${prazoFixo === "custom" ? "var(--color-text-primary)" : "var(--color-border-secondary)"}`,
              background: prazoFixo === "custom" ? "var(--color-text-primary)" : "var(--color-background-secondary)",
              color: prazoFixo === "custom" ? "var(--color-background-primary)" : "var(--color-text-secondary)",
              transition: "all 0.15s",
            }}>
              Personalizado
            </button>
          </div>

          {prazoFixo === "custom" && (
            <input
              type="number" min={1} placeholder="Número de dias"
              value={prazoCustom} onChange={(e) => setPrazoCustom(e.target.value)}
              style={{ ...inputStyle, marginTop: 8, width: 180 }}
            />
          )}

          {dataExpiracao && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-secondary)" }}>
              <span>📅</span>
              <span>
                Expira em <strong style={{ color: "var(--color-text-primary)" }}>{formatarData(dataExpiracao)}</strong>
                <span style={{ fontSize: 11, marginLeft: 6 }}>({diasEfetivos} dias a partir de hoje)</span>
              </span>
            </div>
          )}
        </div>

        <Field label="Taxa de renovação (R$)">
          <input
            type="number" min={0} step={0.01}
            value={renovacao} onChange={(e) => setRenovacao(e.target.value)}
            placeholder="Ex: 29.90"
            style={{ ...inputStyle, width: 200 }}
          />
          <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
            Valor cobrado para prorrogar o prazo de acesso por mais 30 dias.
          </p>
        </Field>

        <Field label="Mensagem para o cliente">
          <textarea
            value={mensagem} onChange={(e) => setMensagem(e.target.value)}
            placeholder="Olá! Suas fotos estão prontas 🎉 Acesse o link abaixo para baixar…"
            rows={4}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
          />
          {fotografo?.mensagem_padrao_entrega && mensagem !== fotografo.mensagem_padrao_entrega && (
            <button
              type="button"
              onClick={() => setMensagem(fotografo.mensagem_padrao_entrega!)}
              style={{
                marginTop: 6, background: "none", border: "none", padding: 0,
                fontSize: 11, color: "var(--color-text-secondary)", cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              ↺ Restaurar mensagem padrão
            </button>
          )}
        </Field>

        <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
          <button
            onClick={handlePublicar}
            disabled={saving || !titulo.trim()}
            style={{
              padding: "10px 24px", borderRadius: 9, border: "none",
              background: saving || !titulo.trim() ? "var(--color-background-secondary)" : "var(--color-text-primary)",
              color: saving || !titulo.trim() ? "var(--color-text-secondary)" : "var(--color-background-primary)",
              fontSize: 13, fontWeight: 600, cursor: saving || !titulo.trim() ? "default" : "pointer",
            }}
          >
            {saving ? "Publicando…" : "Publicar galeria"}
          </button>
          <button
            onClick={() => router.back()}
            style={{
              padding: "10px 18px", borderRadius: 9,
              border: "0.5px solid var(--color-border-secondary)",
              background: "transparent", fontSize: 13,
              color: "var(--color-text-secondary)", cursor: "pointer",
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
