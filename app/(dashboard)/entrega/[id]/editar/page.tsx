"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { inputStyle } from "@/lib/styles";
import { MOCK_CLIENTS, MOCK_ENTREGA } from "@/lib/mock-data";

const PRAZOS_FIXOS = [15, 30, 60, 120];

function addDias(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

function formatarData(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function EditarEntregaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const original = MOCK_ENTREGA.find((g) => g.id === parseInt(id));

  const [titulo,      setTitulo]     = useState(original?.name     ?? "");
  const [clienteId,   setClienteId]  = useState("");
  const [dataEvento,  setDataEvento] = useState("");
  const [driveLink,   setDriveLink]  = useState(original?.driveLink ?? "");
  const [renovacao,   setRenovacao]  = useState(original ? String(original.renewalFee) : "");
  const [mensagem,    setMensagem]   = useState(original?.message   ?? "");
  const [saving,      setSaving]     = useState(false);

  // Estado do prazo atual (pode ser prorrogado)
  const [expiresAt, setExpiresAt] = useState<Date>(
    original ? new Date(original.expiresAt) : addDias(new Date(), 30)
  );

  // Prorrogação
  const [prorogarDias,    setProrogarDias]   = useState<number | "custom" | null>(null);
  const [prorogarCustom,  setProrogarCustom] = useState("");

  const diasProrrogar = prorogarDias === "custom"
    ? (parseInt(prorogarCustom) || 0)
    : (prorogarDias ?? 0);

  const novaDataProrrogada = diasProrrogar > 0 ? addDias(expiresAt, diasProrrogar) : null;

  function aplicarProrrogacao() {
    if (novaDataProrrogada) {
      setExpiresAt(novaDataProrrogada);
      setProrogarDias(null);
      setProrogarCustom("");
    }
  }

  async function handleSalvar() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    router.push("/entrega");
  }

  if (!original) {
    return (
      <div style={{ padding: "40px 30px", textAlign: "center", fontSize: 14, color: "var(--color-text-secondary)" }}>
        Galeria não encontrada.
      </div>
    );
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
          Editar galeria
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
          {original.name}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        <Field label="Título da galeria">
          <input
            type="text" value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            style={inputStyle}
          />
        </Field>

        <Field label="Cliente">
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} style={inputStyle}>
            <option value="">{original.client}</option>
            {MOCK_CLIENTS.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Data do evento">
          <input
            type="date" value={dataEvento}
            onChange={(e) => setDataEvento(e.target.value)}
            style={inputStyle}
          />
        </Field>

        <Field label="Link do Google Drive">
          <input
            type="url" value={driveLink}
            onChange={(e) => setDriveLink(e.target.value)}
            placeholder="https://drive.google.com/drive/folders/…"
            style={inputStyle}
          />
          <div style={{
            marginTop: 7, background: "rgba(245,158,11,0.08)",
            border: "0.5px solid rgba(245,158,11,0.3)",
            borderRadius: 7, padding: "8px 12px",
            fontSize: 12, color: "#92400E", lineHeight: 1.5,
          }}>
            ℹ️ Certifique-se de que o link esteja configurado como <strong>"Qualquer pessoa com o link pode visualizar"</strong> no Google Drive.
          </div>
        </Field>

        <Field label="Taxa de renovação (R$)">
          <input
            type="number" min={0} step={0.01}
            value={renovacao} onChange={(e) => setRenovacao(e.target.value)}
            style={{ ...inputStyle, width: 200 }}
          />
        </Field>

        <Field label="Mensagem para o cliente">
          <textarea
            value={mensagem} onChange={(e) => setMensagem(e.target.value)}
            rows={4}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
          />
        </Field>

        {/* ── Seção prorrogar prazo ── */}
        <div style={{
          background: "var(--color-background-secondary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: 12, padding: "20px 22px",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
            Prorrogar prazo de acesso
          </div>

          <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 3 }}>Prazo atual</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>
                {formatarData(expiresAt)}
              </div>
            </div>
            {novaDataProrrogada && (
              <div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 3 }}>Novo prazo</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#059669" }}>
                  {formatarData(novaDataProrrogada)}
                  <span style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 400, marginLeft: 6 }}>
                    +{diasProrrogar}d
                  </span>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: prorogarDias === "custom" ? 10 : 12 }}>
            {PRAZOS_FIXOS.map((d) => (
              <button key={d} type="button"
                onClick={() => { setProrogarDias(d); setProrogarCustom(""); }}
                style={{
                  padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: `0.5px solid ${prorogarDias === d ? "var(--color-text-primary)" : "var(--color-border-secondary)"}`,
                  background: prorogarDias === d ? "var(--color-text-primary)" : "var(--color-background-primary)",
                  color: prorogarDias === d ? "var(--color-background-primary)" : "var(--color-text-secondary)",
                  transition: "all 0.15s",
                }}
              >
                +{d}d
              </button>
            ))}
            <button type="button"
              onClick={() => setProrogarDias("custom")}
              style={{
                padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: `0.5px solid ${prorogarDias === "custom" ? "var(--color-text-primary)" : "var(--color-border-secondary)"}`,
                background: prorogarDias === "custom" ? "var(--color-text-primary)" : "var(--color-background-primary)",
                color: prorogarDias === "custom" ? "var(--color-background-primary)" : "var(--color-text-secondary)",
                transition: "all 0.15s",
              }}
            >
              Outro
            </button>
          </div>

          {prorogarDias === "custom" && (
            <input
              type="number" min={1} placeholder="Quantos dias?"
              value={prorogarCustom} onChange={(e) => setProrogarCustom(e.target.value)}
              style={{ ...inputStyle, width: 160, marginBottom: 10 }}
            />
          )}

          <button
            onClick={aplicarProrrogacao}
            disabled={diasProrrogar <= 0}
            style={{
              padding: "8px 18px", borderRadius: 8, border: "none",
              background: diasProrrogar > 0 ? "#059669" : "var(--color-border-secondary)",
              color: diasProrrogar > 0 ? "#fff" : "var(--color-text-secondary)",
              fontSize: 12, fontWeight: 600,
              cursor: diasProrrogar > 0 ? "pointer" : "default",
              transition: "all 0.15s",
            }}
          >
            Aplicar prorrogação
          </button>
        </div>

        {/* Ações */}
        <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
          <button
            onClick={handleSalvar}
            disabled={saving}
            style={{
              padding: "10px 24px", borderRadius: 9, border: "none",
              background: saving ? "var(--color-background-secondary)" : "var(--color-text-primary)",
              color: saving ? "var(--color-text-secondary)" : "var(--color-background-primary)",
              fontSize: 13, fontWeight: 600, cursor: saving ? "default" : "pointer",
            }}
          >
            {saving ? "Salvando…" : "Salvar alterações"}
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
