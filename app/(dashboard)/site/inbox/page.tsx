"use client";

// Inbox do site: leads recebidos pelo formulário de contato (site_leads).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { useFotografo } from "@/lib/context/FotografoContext";
import { nomeCategoria } from "@/lib/site/categorias";
import { mascaraTelefone } from "@/lib/utils/format";
import { gerarSenhaAcesso } from "@/lib/utils";
import type { SiteLead, SiteCategoria } from "@/lib/supabase/types";

export default function InboxPage() {
  const router = useRouter();
  const { fotografo } = useFotografo();
  const [leads, setLeads] = useState<SiteLead[]>([]);
  const [catMap, setCatMap] = useState<Record<string, string>>({});
  const [categoriasCrm, setCategoriasCrm] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [aberto, setAberto] = useState<string | null>(null);
  const [gerando, setGerando] = useState<string | null>(null);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    async function carregar() {
      const [rows, { data: cats }] = await Promise.all([
        fetchAllRows<SiteLead>(
          (sb, from, to) => sb.from("site_leads").select("*").eq("fotografo_id", fotografo!.id).order("created_at", { ascending: false }).range(from, to),
          supabase,
        ),
        supabase.from("site_categorias").select("slug, nome").eq("fotografo_id", fotografo!.id),
      ]);
      setLeads(rows ?? []);
      setCatMap(Object.fromEntries(((cats ?? []) as Pick<SiteCategoria, "slug" | "nome">[]).map((c) => [c.slug, c.nome])));
      // Categorias do CRM: só mando a categoria pré-preenchida se o nome bater com uma delas
      // (o site usa slug próprio, o CRM tem vocabulário separado).
      const { data: catsCrm } = await supabase.from("crm_oportunidade_categorias").select("nome").eq("fotografo_id", fotografo!.id);
      setCategoriasCrm(((catsCrm ?? []) as { nome: string }[]).map((c) => c.nome));
      setLoading(false);
    }
    carregar();
  }, [fotografo]);

  // Resolve o cliente do contato: reaproveita o existente (por e-mail ou WhatsApp) ou cria um novo.
  // Regra "cliente único" — nunca base paralela. Devolve null se nem der para criar.
  async function resolverCliente(lead: SiteLead): Promise<string | null> {
    if (!fotografo) return null;
    const sb = createClient();
    const fid = fotografo.id;
    const email = (lead.email ?? "").trim();
    // A coluna whatsapp guarda a string MASCARADA — comparar dígitos crus não acha nada.
    const tel = lead.telefone ? mascaraTelefone(lead.telefone) : "";

    if (email) {
      const { data } = await sb.from("clientes").select("id").eq("fotografo_id", fid).eq("email", email).maybeSingle();
      if (data) return (data as { id: string }).id;
    }
    if (tel) {
      const { data } = await sb.from("clientes").select("id").eq("fotografo_id", fid).eq("whatsapp", tel).maybeSingle();
      if (data) return (data as { id: string }).id;
    }
    const { data: novo } = await sb.from("clientes").insert({
      fotografo_id: fid,
      nome:         lead.nome,
      email:        email || null,
      telefone:     tel || null,
      whatsapp:     tel || null,
      senha_acesso: gerarSenhaAcesso(),
    }).select("id").single();
    return novo ? (novo as { id: string }).id : null;
  }

  // Leva os dados do contato para a tela de nova oportunidade (mesmo padrão de oportunidade → pedido).
  async function gerarOportunidade(lead: SiteLead) {
    if (gerando) return;
    setGerando(lead.id);
    const clienteId = await resolverCliente(lead);

    const tipo = lead.tipo_evento ? nomeCategoria(lead.tipo_evento, catMap) : "";
    // Observações: mensagem + campos extras do formulário (as chaves dos extras são o rótulo
    // digitado pelo fotógrafo, sem equivalente no CRM — vão como texto).
    const extras = lead.dados ? Object.entries(lead.dados).map(([k, v]) => `${k}: ${v}`).join("\n") : "";
    const observacoes = [lead.mensagem ?? "", extras].filter(Boolean).join("\n\n");

    const p = new URLSearchParams();
    p.set("titulo", tipo ? `${tipo} — ${lead.nome}` : lead.nome);
    p.set("canal_origem", "Site");
    p.set("lead_id", lead.id);
    if (clienteId) p.set("cliente_id", clienteId);
    if (lead.data_evento) p.set("data_evento", lead.data_evento);
    if (observacoes) p.set("observacoes", observacoes);
    if (tipo && categoriasCrm.includes(tipo)) p.set("categoria", tipo);

    router.push(`/crm/oportunidades/nova?${p.toString()}`);
  }

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
                      {l.tipo_evento && <div>🏷️ Tipo do evento: {nomeCategoria(l.tipo_evento, catMap)}</div>}
                      {l.dados && Object.entries(l.dados).map(([k, v]) => <div key={k}><strong style={{ fontWeight: 600 }}>{k}:</strong> {v}</div>)}
                    </div>
                  )}
                  {l.mensagem || <span style={{ color: "var(--color-text-secondary)", fontStyle: "italic" }}>(sem mensagem)</span>}
                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
                    {l.email && (
                      <a href={`mailto:${l.email}`}
                        style={{ fontSize: 12, fontWeight: 600, color: "#2563EB", textDecoration: "none" }}>✉️ Responder por email</a>
                    )}
                    {l.oportunidade_id ? (
                      <a href={`/crm/oportunidades/${l.oportunidade_id}`}
                        style={{ fontSize: 12, fontWeight: 600, color: "#059669", textDecoration: "none" }}>✅ Oportunidade gerada — abrir</a>
                    ) : (
                      <button onClick={() => gerarOportunidade(l)} disabled={gerando === l.id}
                        style={{ padding: "6px 12px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: gerando === l.id ? "default" : "pointer", opacity: gerando === l.id ? 0.6 : 1 }}>
                        {gerando === l.id ? "Abrindo…" : "🎯 Gerar oportunidade"}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 4, fontSize: 12, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {l.mensagem || [l.tipo_evento && nomeCategoria(l.tipo_evento, catMap), l.data_evento && new Date(l.data_evento + "T12:00:00").toLocaleDateString("pt-BR")].filter(Boolean).join(" · ") || "(sem mensagem)"}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
