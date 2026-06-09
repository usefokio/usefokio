"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { Field } from "@/components/ui/Field";
import { inputStyle } from "@/lib/styles";
import { ClienteSelect } from "../../_components/ClienteSelect";
import { MOCK_ENTREGA } from "@/lib/mock-data";
import type { Cliente } from "@/lib/supabase/types";

const PRAZOS_FIXOS = [15, 30, 60, 120];

function addDias(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

function formatarData(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

// Modal de confirmação de exclusão
function ModalExcluir({ nome, onConfirmar, onFechar }: { nome: string; onConfirmar: () => void; onFechar: () => void }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}
      onClick={onFechar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 30px", width: 380, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}
      >
        <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "#EF4444" }}>Excluir galeria</h3>
        <p style={{ margin: "0 0 22px", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          Tem certeza que deseja excluir <strong style={{ color: "var(--color-text-primary)" }}>{nome}</strong>?
          <br />Esta ação não pode ser desfeita.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onFechar}
            style={{ flex: 1, padding: "9px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "#EF4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EditarEntregaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { fotografo } = useFotografo();

  // Mock ainda usado para pré-preencher dados (futuro: buscar do Supabase)
  const original = MOCK_ENTREGA.find((g) => g.id === parseInt(id));

  const [titulo,      setTitulo]     = useState(original?.name     ?? "");
  const [clienteId,   setClienteId]  = useState("");
  const [cliente,     setCliente]    = useState<Cliente | null>(null);
  const [dataEvento,  setDataEvento] = useState("");
  const [driveLink,   setDriveLink]  = useState(original?.driveLink ?? "");
  const [renovacao,   setRenovacao]  = useState(original ? String(original.renewalFee) : "");
  const [mensagem,    setMensagem]   = useState(original?.message   ?? "");
  const [saving,      setSaving]     = useState(false);
  const [modalExcluir, setModalExcluir] = useState(false);

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

  // Pré-preencher mensagem padrão se vazia
  useEffect(() => {
    if (fotografo?.mensagem_padrao_entrega && !mensagem) {
      setMensagem(fotografo.mensagem_padrao_entrega);
    }
  }, [fotografo]);

  function aplicarProrrogacao() {
    if (novaDataProrrogada) {
      setExpiresAt(novaDataProrrogada);
      setProrogarDias(null);
      setProrogarCustom("");
    }
  }

  async function handleSalvar() {
    setSaving(true);
    // TODO: salvar no Supabase quando tabela galerias_entrega estiver mapeada
    await new Promise((r) => setTimeout(r, 600));
    router.push("/entrega");
  }

  async function handleExcluir() {
    // TODO: deletar do Supabase quando tabela estiver mapeada
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
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
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
        <button
          onClick={() => setModalExcluir(true)}
          style={{
            padding: "8px 14px", borderRadius: 8,
            border: "0.5px solid rgba(239,68,68,0.4)",
            background: "rgba(239,68,68,0.06)",
            color: "#EF4444",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            marginTop: 28,
          }}
        >
          Excluir galeria
        </button>
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
          <ClienteSelect
            value={clienteId}
            onChange={(id, c) => { setClienteId(id); setCliente(c); }}
          />
          {!clienteId && original.client && (
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
              Cliente atual: <strong>{original.client}</strong>
            </div>
          )}
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

      {modalExcluir && (
        <ModalExcluir
          nome={original.name}
          onConfirmar={handleExcluir}
          onFechar={() => setModalExcluir(false)}
        />
      )}
    </div>
  );
}
