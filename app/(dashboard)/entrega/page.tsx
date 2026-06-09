"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { useFotografo } from "@/lib/context/FotografoContext";
import { MOCK_ENTREGA, type EntregaGaleria } from "@/lib/mock-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function diasRestantes(expiresAt: Date): number {
  return Math.round((expiresAt.getTime() - Date.now()) / 86_400_000);
}

function statusDerivado(dias: number): "Ativo" | "Expirando" | "Expirado" {
  if (dias < 0)  return "Expirado";
  if (dias <= 7) return "Expirando";
  return "Ativo";
}

function formatarExpiracao(dias: number): string {
  if (dias === 0)  return "hoje";
  if (dias === 1)  return "amanhã";
  if (dias === -1) return "ontem";
  if (dias > 0)   return `em ${dias} dias`;
  return `há ${Math.abs(dias)} dias`;
}

function formatarData(d: Date): string {
  return d.toLocaleDateString("pt-BR");
}

function addDias(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

// ─── Badge de status ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: "Ativo" | "Expirando" | "Expirado" }) {
  const cfg = {
    Ativo:     { bg: "rgba(16,185,129,0.1)",  color: "#059669" },
    Expirando: { bg: "rgba(245,158,11,0.12)", color: "#B45309" },
    Expirado:  { bg: "rgba(239,68,68,0.1)",   color: "#EF4444" },
  }[status];
  return (
    <span style={{
      display: "inline-block", padding: "2px 9px", borderRadius: 20,
      fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color,
    }}>
      {status}
    </span>
  );
}

// ─── Ícones SVG ───────────────────────────────────────────────────────────────
const IcoWhatsapp = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);

const IcoEmail = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const IcoClock = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const IcoEdit = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

// ─── Modal prorrogar ──────────────────────────────────────────────────────────
function ModalProrrogar({
  galeria,
  expiresAt,
  onConfirmar,
  onFechar,
}: {
  galeria: EntregaGaleria;
  expiresAt: Date;
  onConfirmar: (novaData: Date) => void;
  onFechar: () => void;
}) {
  const [dias, setDias]           = useState<number | null>(30);
  const [personalizado, setPersonalizado] = useState("");

  const diasEfetivos = dias !== null ? dias : (parseInt(personalizado) || 0);
  const novaData     = addDias(expiresAt, diasEfetivos);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }}
      onClick={onFechar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: 14, padding: "28px 32px", width: 380,
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        }}
      >
        <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" }}>
          Prorrogar prazo
        </h3>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--color-text-secondary)" }}>
          {galeria.name} · {galeria.client}
        </p>

        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 12 }}>
          Prazo atual: <strong style={{ color: "var(--color-text-primary)" }}>{formatarData(expiresAt)}</strong>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[15, 30, 60].map((d) => (
            <button
              key={d}
              onClick={() => { setDias(d); setPersonalizado(""); }}
              style={{
                flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: `0.5px solid ${dias === d ? "var(--color-text-primary)" : "var(--color-border-secondary)"}`,
                background: dias === d ? "var(--color-text-primary)" : "transparent",
                color: dias === d ? "var(--color-background-primary)" : "var(--color-text-secondary)",
                cursor: "pointer",
              }}
            >
              +{d}d
            </button>
          ))}
          <button
            onClick={() => setDias(null)}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: `0.5px solid ${dias === null ? "var(--color-text-primary)" : "var(--color-border-secondary)"}`,
              background: dias === null ? "var(--color-text-primary)" : "transparent",
              color: dias === null ? "var(--color-background-primary)" : "var(--color-text-secondary)",
              cursor: "pointer",
            }}
          >
            Outro
          </button>
        </div>

        {dias === null && (
          <input
            type="number"
            min={1}
            placeholder="Quantos dias?"
            value={personalizado}
            onChange={(e) => setPersonalizado(e.target.value)}
            style={{
              width: "100%", padding: "9px 12px", borderRadius: 8,
              border: "0.5px solid var(--color-border-secondary)",
              background: "var(--color-background-secondary)",
              fontSize: 13, color: "var(--color-text-primary)",
              boxSizing: "border-box", marginBottom: 14,
            }}
          />
        )}

        {diasEfetivos > 0 && (
          <div style={{
            background: "rgba(16,185,129,0.07)", border: "0.5px solid rgba(16,185,129,0.25)",
            borderRadius: 8, padding: "10px 14px", marginBottom: 18, fontSize: 13,
          }}>
            Novo prazo: <strong style={{ color: "#059669" }}>{formatarData(novaData)}</strong>
            <span style={{ color: "var(--color-text-secondary)", fontSize: 12 }}> (+{diasEfetivos} dias)</span>
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onFechar}
            style={{
              flex: 1, padding: "9px", borderRadius: 8,
              border: "0.5px solid var(--color-border-secondary)",
              background: "transparent", fontSize: 13,
              color: "var(--color-text-secondary)", cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => diasEfetivos > 0 && onConfirmar(novaData)}
            disabled={diasEfetivos <= 0}
            style={{
              flex: 1, padding: "9px", borderRadius: 8, border: "none",
              background: diasEfetivos > 0 ? "#059669" : "var(--color-background-secondary)",
              color: diasEfetivos > 0 ? "#fff" : "var(--color-text-secondary)",
              fontSize: 13, fontWeight: 600, cursor: diasEfetivos > 0 ? "pointer" : "default",
            }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function EntregaPage() {
  const router = useRouter();
  const { fotografo } = useFotografo();

  // Estado local das galerias (para simular prorrogação)
  const [galerias, setGalerias] = useState(() =>
    MOCK_ENTREGA.map((g) => ({ ...g, expiresAt: new Date(g.expiresAt) }))
  );
  const [modalId, setModalId] = useState<number | null>(null);

  const galeriaModal = galerias.find((g) => g.id === modalId);

  function prorrogar(id: number, novaData: Date) {
    setGalerias((prev) => prev.map((g) => g.id === id ? { ...g, expiresAt: novaData } : g));
    setModalId(null);
  }

  function gerarMsgWhatsapp(g: typeof galerias[0], dias: number): string {
    const expStr = dias >= 0 ? `expira ${formatarExpiracao(dias)}` : `expirou ${formatarExpiracao(dias)}`;
    return `Olá ${g.client}! Sua galeria "${g.name}" ${expStr}.\n\nPara renovar o acesso por mais 30 dias, o valor é R$ ${g.renewalFee.toFixed(2).replace(".", ",")}.\n\nLink: ${g.driveLink}`;
  }

  function gerarMsgEmail(g: typeof galerias[0], dias: number) {
    const subject = `Sua galeria "${g.name}" expira em breve`;
    const body    = gerarMsgWhatsapp(g, dias);
    return { subject, body };
  }

  return (
    <div style={{ padding: "26px 30px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>
            Galerias de Entrega
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            Fotos editadas em alta resolução para o cliente baixar
          </p>
        </div>
        <Link
          href="/entrega/nova"
          style={{ padding: "8px 16px", borderRadius: 8, background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 500, textDecoration: "none" }}
        >
          + Nova entrega
        </Link>
      </div>

      {/* Tabela */}
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 12, overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--color-background-secondary)" }}>
              {["Capa", "Galeria", "Cliente", "Tamanho", "Downloads", "Status", "Expira em", "Ações"].map((h) => (
                <th key={h} style={{
                  padding: "10px 14px", textAlign: "left",
                  fontSize: 10, fontWeight: 700,
                  color: "var(--color-text-secondary)",
                  textTransform: "uppercase", letterSpacing: "0.05em",
                  borderBottom: "0.5px solid var(--color-border-tertiary)",
                  whiteSpace: "nowrap",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {galerias.map((g, i) => {
              const dias   = diasRestantes(g.expiresAt);
              const status = statusDerivado(dias);
              const wha    = fotografo?.whatsapp;

              const rowBg = status === "Expirando"
                ? "rgba(245,158,11,0.06)"
                : "transparent";
              const rowOp = status === "Expirado" ? 0.55 : 1;

              const msgWpp   = gerarMsgWhatsapp(g, dias);
              const { subject, body } = gerarMsgEmail(g, dias);

              return (
                <tr
                  key={g.id}
                  style={{
                    background: rowBg,
                    opacity: rowOp,
                    borderBottom: i < galerias.length - 1
                      ? "0.5px solid var(--color-border-tertiary)"
                      : "none",
                  }}
                >
                  {/* Capa */}
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{
                      width: 44, height: 34, borderRadius: 6,
                      background: g.cover, flexShrink: 0,
                    }} />
                  </td>

                  {/* Nome */}
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ fontWeight: 600, color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>
                      {g.name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                      {g.photos} fotos
                    </div>
                  </td>

                  {/* Cliente */}
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <Avatar initials={g.avatar} size={22} />
                      <span style={{ color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{g.client}</span>
                    </div>
                  </td>

                  {/* Tamanho */}
                  <td style={{ padding: "10px 14px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                    {g.size}
                  </td>

                  {/* Downloads */}
                  <td style={{ padding: "10px 14px", textAlign: "center", color: "var(--color-text-primary)", fontWeight: 500 }}>
                    {g.downloads}
                  </td>

                  {/* Status */}
                  <td style={{ padding: "10px 14px" }}>
                    <StatusBadge status={status} />
                  </td>

                  {/* Expira em */}
                  <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                    <span style={{
                      fontSize: 12,
                      color: status === "Expirado" ? "#EF4444"
                           : status === "Expirando" ? "#B45309"
                           : "var(--color-text-secondary)",
                    }}>
                      {formatarExpiracao(dias)}
                    </span>
                    <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
                      {formatarData(g.expiresAt)}
                    </div>
                  </td>

                  {/* Ações */}
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {/* WhatsApp */}
                      <a
                        href={wha
                          ? `https://wa.me/55${wha}?text=${encodeURIComponent(msgWpp)}`
                          : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={wha ? "Enviar WhatsApp" : "Configure seu WhatsApp em Conta → Editar"}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: 30, height: 30, borderRadius: 7,
                          border: "0.5px solid var(--color-border-secondary)",
                          color: wha ? "#25D366" : "var(--color-text-secondary)",
                          background: "transparent", textDecoration: "none",
                          opacity: wha ? 1 : 0.4, cursor: wha ? "pointer" : "default",
                        }}
                        onClick={(e) => !wha && e.preventDefault()}
                      >
                        <IcoWhatsapp />
                      </a>

                      {/* Email */}
                      <a
                        href={`mailto:${g.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
                        title="Enviar e-mail"
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: 30, height: 30, borderRadius: 7,
                          border: "0.5px solid var(--color-border-secondary)",
                          color: "var(--color-text-secondary)",
                          background: "transparent", textDecoration: "none",
                        }}
                      >
                        <IcoEmail />
                      </a>

                      {/* Prorrogar */}
                      <button
                        onClick={() => setModalId(g.id)}
                        title="Prorrogar prazo"
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: 30, height: 30, borderRadius: 7,
                          border: "0.5px solid var(--color-border-secondary)",
                          color: status === "Expirado" ? "#059669" : "var(--color-text-secondary)",
                          background: "transparent", cursor: "pointer",
                        }}
                      >
                        <IcoClock />
                      </button>

                      {/* Editar */}
                      <button
                        onClick={() => router.push(`/entrega/${g.id}/editar`)}
                        title="Editar galeria"
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: 30, height: 30, borderRadius: 7,
                          border: "0.5px solid var(--color-border-secondary)",
                          color: "var(--color-text-secondary)",
                          background: "transparent", cursor: "pointer",
                        }}
                      >
                        <IcoEdit />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {galerias.length === 0 && (
          <div style={{ padding: "52px 24px", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>
            Nenhuma galeria de entrega criada ainda.
          </div>
        )}
      </div>

      {/* Modal prorrogar */}
      {galeriaModal && (
        <ModalProrrogar
          galeria={galeriaModal}
          expiresAt={galeriaModal.expiresAt}
          onConfirmar={(novaData) => prorrogar(galeriaModal.id, novaData)}
          onFechar={() => setModalId(null)}
        />
      )}
    </div>
  );
}
