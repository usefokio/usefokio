"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { GaleriaEntrega } from "@/lib/supabase/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function diasRestantes(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.round((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}

function statusDerivado(dias: number | null): "Ativo" | "Expirando" | "Expirado" | "Sem prazo" {
  if (dias === null) return "Sem prazo";
  if (dias < 0)     return "Expirado";
  if (dias <= 7)    return "Expirando";
  return "Ativo";
}

function formatarExpiracao(dias: number | null): string {
  if (dias === null) return "—";
  if (dias === 0)    return "hoje";
  if (dias === 1)    return "amanhã";
  if (dias === -1)   return "ontem";
  if (dias > 0)     return `em ${dias} dias`;
  return `há ${Math.abs(dias)} dias`;
}

function formatarData(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function iniciais(nome: string): string {
  return nome.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

// ─── Badges ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ReturnType<typeof statusDerivado> }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    Ativo:      { bg: "rgba(16,185,129,0.1)",  color: "#059669" },
    Expirando:  { bg: "rgba(245,158,11,0.12)", color: "#B45309" },
    Expirado:   { bg: "rgba(239,68,68,0.1)",   color: "#EF4444" },
    "Sem prazo":{ bg: "rgba(107,114,128,0.1)", color: "#6B7280" },
  };
  const c = cfg[status] ?? cfg["Sem prazo"];
  return (
    <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color }}>
      {status}
    </span>
  );
}

// ─── Ícones ───────────────────────────────────────────────────────────────────
const IcoWhatsapp = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);
const IcoEmail = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);
const IcoClock = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IcoEdit = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IcoTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

// ─── Modal prorrogar ──────────────────────────────────────────────────────────
function ModalProrrogar({
  galeria, onConfirmar, onFechar,
}: {
  galeria: GaleriaEntrega;
  onConfirmar: (novaData: Date) => void;
  onFechar: () => void;
}) {
  const [dias, setDias]           = useState<number | null>(30);
  const [personalizado, setPersonalizado] = useState("");

  const diasEfetivos  = dias !== null ? dias : (parseInt(personalizado) || 0);
  const baseDate      = galeria.expires_at ? new Date(galeria.expires_at) : new Date();
  const novaData      = new Date(baseDate.getTime() + diasEfetivos * 86_400_000);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px", width: 380, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" }}>Prorrogar prazo</h3>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--color-text-secondary)" }}>{galeria.titulo} · {galeria.clientes?.nome ?? "—"}</p>

        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 12 }}>
          Prazo atual: <strong style={{ color: "var(--color-text-primary)" }}>{galeria.expires_at ? new Date(galeria.expires_at).toLocaleDateString("pt-BR") : "Sem prazo"}</strong>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[15, 30, 60].map((d) => (
            <button key={d} onClick={() => { setDias(d); setPersonalizado(""); }} style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, border: `0.5px solid ${dias === d ? "var(--color-text-primary)" : "var(--color-border-secondary)"}`, background: dias === d ? "var(--color-text-primary)" : "transparent", color: dias === d ? "var(--color-background-primary)" : "var(--color-text-secondary)", cursor: "pointer" }}>+{d}d</button>
          ))}
          <button onClick={() => setDias(null)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, border: `0.5px solid ${dias === null ? "var(--color-text-primary)" : "var(--color-border-secondary)"}`, background: dias === null ? "var(--color-text-primary)" : "transparent", color: dias === null ? "var(--color-background-primary)" : "var(--color-text-secondary)", cursor: "pointer" }}>Outro</button>
        </div>

        {dias === null && (
          <input type="number" min={1} placeholder="Quantos dias?" value={personalizado} onChange={(e) => setPersonalizado(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 13, color: "var(--color-text-primary)", boxSizing: "border-box", marginBottom: 14 }} />
        )}

        {diasEfetivos > 0 && (
          <div style={{ background: "rgba(16,185,129,0.07)", border: "0.5px solid rgba(16,185,129,0.25)", borderRadius: 8, padding: "10px 14px", marginBottom: 18, fontSize: 13 }}>
            Novo prazo: <strong style={{ color: "#059669" }}>{novaData.toLocaleDateString("pt-BR")}</strong>
            <span style={{ color: "var(--color-text-secondary)", fontSize: 12 }}> (+{diasEfetivos} dias)</span>
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onFechar} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}>Cancelar</button>
          <button onClick={() => diasEfetivos > 0 && onConfirmar(novaData)} disabled={diasEfetivos <= 0} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: diasEfetivos > 0 ? "#059669" : "var(--color-background-secondary)", color: diasEfetivos > 0 ? "#fff" : "var(--color-text-secondary)", fontSize: 13, fontWeight: 600, cursor: diasEfetivos > 0 ? "pointer" : "default" }}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function EntregaPage() {
  const router = useRouter();
  const { fotografo } = useFotografo();

  const [galerias,  setGalerias]  = useState<GaleriaEntrega[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [modalId,   setModalId]   = useState<string | null>(null);
  const [deletarId, setDeletarId] = useState<string | null>(null);
  const [deletando, setDeletando] = useState(false);

  async function carregar() {
    if (!fotografo) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("galerias_entrega")
      .select("*, clientes(nome, email, telefone, whatsapp)")
      .eq("fotografo_id", fotografo.id)
      .order("created_at", { ascending: false });
    setGalerias((data as GaleriaEntrega[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, [fotografo]);

  async function prorrogar(id: string, novaData: Date) {
    const supabase = createClient();
    await supabase
      .from("galerias_entrega")
      .update({ expires_at: novaData.toISOString() })
      .eq("id", id);
    setGalerias((prev) => prev.map((g) => g.id === id ? { ...g, expires_at: novaData.toISOString() } : g));
    setModalId(null);
  }

  async function deletar(id: string) {
    setDeletando(true);
    const supabase = createClient();
    await supabase.from("galerias_entrega").delete().eq("id", id);
    setGalerias((prev) => prev.filter((g) => g.id !== id));
    setDeletarId(null);
    setDeletando(false);
  }

  function gerarMsgWhatsapp(g: GaleriaEntrega, dias: number | null): string {
    const nome   = g.clientes?.nome ?? "cliente";
    const expStr = dias === null ? "" : dias >= 0 ? ` expira ${formatarExpiracao(dias)}` : ` expirou ${formatarExpiracao(dias)}`;
    const fee    = g.renewal_fee ? `\n\nPara renovar o acesso, o valor é R$ ${g.renewal_fee.toFixed(2).replace(".", ",")}.` : "";
    return `Olá ${nome}! Sua galeria "${g.titulo}"${expStr}.${fee}${g.drive_link ? `\n\nLink: ${g.drive_link}` : ""}`;
  }

  const galeriaModal = galerias.find((g) => g.id === modalId) ?? null;
  const wha = fotografo?.whatsapp;

  // Cores de capa pré-definidas (ciclo)
  const CORES = ["#7C6E5A","#5A6E7C","#6E5A7C","#5A7C6E","#7C5A6E","#6E7C5A"];

  return (
    <div style={{ padding: "26px 30px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>Galerias de Entrega</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>Fotos editadas em alta resolução para o cliente baixar</p>
        </div>
        <Link href="/entrega/nova" style={{ padding: "8px 16px", borderRadius: 8, background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
          + Nova entrega
        </Link>
      </div>

      {/* Tabela */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "48px 24px", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
        ) : galerias.length === 0 ? (
          <div style={{ padding: "52px 24px", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>
            Nenhuma galeria de entrega criada ainda.{" "}
            <Link href="/entrega/nova" style={{ color: "var(--color-text-primary)", fontWeight: 600, textDecoration: "underline" }}>Criar agora</Link>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--color-background-secondary)" }}>
                {["Capa", "Galeria", "Cliente", "Downloads", "Status", "Expira em", "Ações"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "0.5px solid var(--color-border-tertiary)", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {galerias.map((g, i) => {
                const dias   = diasRestantes(g.expires_at);
                const status = statusDerivado(dias);
                const cor    = g.cover_color ?? CORES[i % CORES.length];

                const rowBg = status === "Expirando" ? "rgba(245,158,11,0.06)" : "transparent";
                const rowOp = status === "Expirado" ? 0.55 : 1;

                const msgWpp   = gerarMsgWhatsapp(g, dias);
                const telefone = g.clientes?.whatsapp ?? g.clientes?.telefone ?? "";
                const email    = g.clientes?.email ?? "";
                const subject  = encodeURIComponent(`Sua galeria "${g.titulo}" expira em breve`);
                const body     = encodeURIComponent(msgWpp);

                return (
                  <tr key={g.id} style={{ background: rowBg, opacity: rowOp, borderBottom: i < galerias.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>

                    {/* Capa */}
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ width: 44, height: 34, borderRadius: 6, background: cor, flexShrink: 0 }} />
                    </td>

                    {/* Nome */}
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ fontWeight: 600, color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>{g.titulo}</div>
                      {g.data_evento && <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{new Date(g.data_evento).toLocaleDateString("pt-BR")}</div>}
                    </td>

                    {/* Cliente */}
                    <td style={{ padding: "10px 14px" }}>
                      {g.clientes ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <Avatar initials={iniciais(g.clientes.nome)} size={22} />
                          <span style={{ color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{g.clientes.nome}</span>
                        </div>
                      ) : (
                        <span style={{ color: "var(--color-border-secondary)", fontSize: 12 }}>—</span>
                      )}
                    </td>

                    {/* Downloads */}
                    <td style={{ padding: "10px 14px", textAlign: "center", color: "var(--color-text-primary)", fontWeight: 500 }}>{g.downloads}</td>

                    {/* Status */}
                    <td style={{ padding: "10px 14px" }}><StatusBadge status={status} /></td>

                    {/* Expira em */}
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: 12, color: status === "Expirado" ? "#EF4444" : status === "Expirando" ? "#B45309" : "var(--color-text-secondary)" }}>
                        {formatarExpiracao(dias)}
                      </span>
                      {g.expires_at && <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{formatarData(g.expires_at)}</div>}
                    </td>

                    {/* Ações */}
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        {/* WhatsApp */}
                        <a
                          href={wha && telefone ? `https://wa.me/55${wha}?text=${encodeURIComponent(msgWpp)}` : undefined}
                          target="_blank" rel="noopener noreferrer"
                          title={wha ? "Enviar WhatsApp" : "Configure seu WhatsApp em Conta → Editar"}
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", color: wha ? "#25D366" : "var(--color-text-secondary)", background: "transparent", textDecoration: "none", opacity: wha ? 1 : 0.4, cursor: wha ? "pointer" : "default" }}
                          onClick={(e) => !wha && e.preventDefault()}
                        ><IcoWhatsapp /></a>

                        {/* Email */}
                        <a
                          href={email ? `mailto:${email}?subject=${subject}&body=${body}` : undefined}
                          title={email ? "Enviar e-mail" : "Sem e-mail cadastrado"}
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)", background: "transparent", textDecoration: "none", opacity: email ? 1 : 0.4, cursor: email ? "pointer" : "default" }}
                          onClick={(e) => !email && e.preventDefault()}
                        ><IcoEmail /></a>

                        {/* Prorrogar */}
                        <button onClick={() => setModalId(g.id)} title="Prorrogar prazo" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", color: status === "Expirado" ? "#059669" : "var(--color-text-secondary)", background: "transparent", cursor: "pointer" }}><IcoClock /></button>

                        {/* Editar */}
                        <button onClick={() => router.push(`/entrega/${g.id}/editar`)} title="Editar galeria" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)", background: "transparent", cursor: "pointer" }}><IcoEdit /></button>

                        {/* Excluir */}
                        <button
                          onClick={() => setDeletarId(g.id)}
                          title="Excluir galeria"
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 7, border: "0.5px solid rgba(239,68,68,0.3)", color: "#EF4444", background: "transparent", cursor: "pointer", opacity: 0.7 }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
                        ><IcoTrash /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal prorrogar */}
      {galeriaModal && (
        <ModalProrrogar
          galeria={galeriaModal}
          onConfirmar={(novaData) => prorrogar(galeriaModal.id, novaData)}
          onFechar={() => setModalId(null)}
        />
      )}

      {/* Modal excluir */}
      {deletarId !== null && (() => {
        const g = galerias.find((g) => g.id === deletarId);
        if (!g) return null;
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setDeletarId(null)}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 30px", width: 380, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "#EF4444" }}>Excluir galeria</h3>
              <p style={{ margin: "0 0 22px", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                Tem certeza que deseja excluir <strong style={{ color: "var(--color-text-primary)" }}>{g.titulo}</strong>?<br />Esta ação não pode ser desfeita.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setDeletarId(null)} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}>Cancelar</button>
                <button onClick={() => deletar(g.id)} disabled={deletando} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "#EF4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: deletando ? "default" : "pointer" }}>
                  {deletando ? "Excluindo…" : "Excluir"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
