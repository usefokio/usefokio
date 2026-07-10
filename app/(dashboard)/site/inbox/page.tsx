"use client";

// Inbox do site: leads recebidos pelo formulário de contato (site_leads).
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { useFotografo } from "@/lib/context/FotografoContext";
import { CATEGORIA_LABEL } from "@/lib/site/publico";
import type { SiteLead } from "@/lib/supabase/types";

export default function InboxPage() {
  const { fotografo } = useFotografo();
  const [leads, setLeads] = useState<SiteLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [aberto, setAberto] = useState<string | null>(null);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    async function carregar() {
      const rows = await fetchAllRows<SiteLead>(
        (sb, from, to) => sb.from("site_leads").select("*").eq("fotografo_id", fotografo!.id).order("created_at", { ascending: false }).range(from, to),
        supabase,
      );
      setLeads(rows ?? []);
      setLoading(false);
    }
    carregar();
  }, [fotografo]);

  async function abrir(lead: SiteLead) {
    setAberto(aberto === lead.id ? null : lead.id);
    if (!lead.lido) {
      const supabase = createClient();
      setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, lido: true } : l));
      await supabase.from("site_leads").update({ lido: true }).eq("id", lead.id);
    }
  }

  const naoLidos = leads.filter((l) => !l.lido).length;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
        Inbox {naoLidos > 0 && <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 12, background: "rgba(37,99,235,0.1)", color: "#2563EB", verticalAlign: "middle", marginLeft: 8 }}>{naoLidos} não lida{naoLidos !== 1 ? "s" : ""}</span>}
      </h1>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 24px" }}>Mensagens recebidas pelo formulário de contato do seu site.</p>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : leads.length === 0 ? (
        <div style={{ padding: "40px 20px", borderRadius: 12, border: "1px dashed var(--color-border-secondary)", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)" }}>
          Nenhuma mensagem ainda.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {leads.map((l) => (
            <div key={l.id} onClick={() => abrir(l)}
              style={{ border: "1px solid var(--color-border-tertiary)", borderRadius: 10, padding: "12px 16px", cursor: "pointer", background: l.lido ? "var(--color-background-primary)" : "var(--color-background-secondary)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {!l.lido && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2563EB", flexShrink: 0 }} />}
                  <span style={{ fontSize: 14, fontWeight: l.lido ? 500 : 700, color: "var(--color-text-primary)" }}>{l.nome}</span>
                  {l.email && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{l.email}</span>}
                </div>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                  {new Date(l.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {aberto === l.id ? (
                <div style={{ marginTop: 10, fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {(l.telefone || l.data_evento || l.tipo_evento || (l.dados && Object.keys(l.dados).length > 0)) && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 10, paddingBottom: 10, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                      {l.telefone && <div>📞 {l.telefone}</div>}
                      {l.data_evento && <div>📅 Data do evento: {new Date(l.data_evento + "T12:00:00").toLocaleDateString("pt-BR")}</div>}
                      {l.tipo_evento && <div>🏷️ Tipo do evento: {CATEGORIA_LABEL[l.tipo_evento] ?? l.tipo_evento}</div>}
                      {l.dados && Object.entries(l.dados).map(([k, v]) => <div key={k}><strong style={{ fontWeight: 600 }}>{k}:</strong> {v}</div>)}
                    </div>
                  )}
                  {l.mensagem || <span style={{ color: "var(--color-text-secondary)", fontStyle: "italic" }}>(sem mensagem)</span>}
                  {l.email && (
                    <div style={{ marginTop: 12 }}>
                      <a href={`mailto:${l.email}`} onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: 12, fontWeight: 600, color: "#2563EB", textDecoration: "none" }}>✉️ Responder por email</a>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ marginTop: 4, fontSize: 12, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {l.mensagem || [l.tipo_evento && (CATEGORIA_LABEL[l.tipo_evento] ?? l.tipo_evento), l.data_evento && new Date(l.data_evento + "T12:00:00").toLocaleDateString("pt-BR")].filter(Boolean).join(" · ") || "(sem mensagem)"}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
