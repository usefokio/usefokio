"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { ModalEmailCliente } from "../_components/ModalEmailCliente";
import type { EstagioFunil, GaleriaEntrega } from "@/lib/supabase/types";

type CampanhaItem = {
  id: string;
  token: string;
  estagio: EstagioFunil;
  resposta: "renovar" | "tem_arquivos" | null;
  respondido_em: string | null;
  email_1_em: string | null;
  email_2_em: string | null;
  whatsapp_em: string | null;
  created_at: string;
  galeria: {
    id: string;
    titulo: string;
    foto_capa_url: string | null;
    cover_color: string | null;
    data_evento: string | null;
    cliente_nome: string | null;
    cliente_email: string | null;
    cliente_telefone: string | null;
    cliente_whatsapp: string | null;
  };
};

type Coluna = {
  id: string;
  label: string;
  icone: string;
  cor: string;
  bg: string;
  estagios: (EstagioFunil | "respondeu")[];
};

const COLUNAS: Coluna[] = [
  { id: "sem_contato", label: "Sem contato",  icone: "⏳", cor: "#6B7280", bg: "rgba(107,114,128,0.07)", estagios: ["nao_contatado"] },
  { id: "email_1",     label: "1º Email",     icone: "📧", cor: "#7C3AED", bg: "rgba(124,58,237,0.07)", estagios: ["email_1"] },
  { id: "email_2",     label: "2º Email",     icone: "📧", cor: "#2563EB", bg: "rgba(37,99,235,0.07)",  estagios: ["email_2"] },
  { id: "whatsapp",    label: "WhatsApp",     icone: "📱", cor: "#15803D", bg: "rgba(34,197,94,0.07)",  estagios: ["whatsapp"] },
  { id: "concluido",   label: "Concluído",    icone: "✓",  cor: "#059669", bg: "rgba(16,185,129,0.07)", estagios: ["encerrado", "respondeu"] },
];

function diasDesde(iso: string | null): string {
  if (!iso) return "";
  const dias = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias === 0) return "hoje";
  if (dias === 1) return "há 1 dia";
  return `há ${dias} dias`;
}

const CORES_CAPA = ["#7C6E5A","#5A6E7C","#6E5A7C","#5A7C6E","#7C5A6E","#6E7C5A"];

export default function CampanhaPage() {
  const router = useRouter();
  const { fotografo } = useFotografo();
  const [itens,          setItens]          = useState<CampanhaItem[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [modalGaleriaId, setModalGaleriaId] = useState<string | null>(null);
  const [recarregarKey,  setRecarregarKey]  = useState(0);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    supabase
      .from("respostas_campanha")
      .select("id, token, estagio, resposta, respondido_em, email_1_em, email_2_em, whatsapp_em, created_at, galerias_entrega(id, titulo, foto_capa_url, cover_color, data_evento, clientes(nome, email, telefone, whatsapp))")
      .eq("fotografo_id", fotografo.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!data) { setLoading(false); return; }
        const mapped: CampanhaItem[] = (data as any[]).map((r) => ({
          id:            r.id,
          token:         r.token,
          estagio:       r.estagio as EstagioFunil,
          resposta:      r.resposta,
          respondido_em: r.respondido_em,
          email_1_em:    r.email_1_em,
          email_2_em:    r.email_2_em,
          whatsapp_em:   r.whatsapp_em,
          created_at:    r.created_at,
          galeria: {
            id:               r.galerias_entrega?.id ?? "",
            titulo:           r.galerias_entrega?.titulo ?? "—",
            foto_capa_url:    r.galerias_entrega?.foto_capa_url ?? null,
            cover_color:      r.galerias_entrega?.cover_color ?? null,
            data_evento:      r.galerias_entrega?.data_evento ?? null,
            cliente_nome:     r.galerias_entrega?.clientes?.nome ?? null,
            cliente_email:    r.galerias_entrega?.clientes?.email ?? null,
            cliente_telefone: r.galerias_entrega?.clientes?.telefone ?? null,
            cliente_whatsapp: r.galerias_entrega?.clientes?.whatsapp ?? null,
          },
        }));
        setItens(mapped);
        setLoading(false);
      });
  }, [fotografo, recarregarKey]);

  function colunaDeItem(item: CampanhaItem): string {
    if (item.resposta === "tem_arquivos" || item.estagio === "encerrado") return "concluido";
    return COLUNAS.find((c) => c.estagios.includes(item.estagio))?.id ?? "sem_contato";
  }

  const itensPorColuna = COLUNAS.reduce<Record<string, CampanhaItem[]>>((acc, col) => {
    acc[col.id] = itens.filter((i) => colunaDeItem(i) === col.id);
    return acc;
  }, {});

  // Atualiza o estágio do item diretamente no estado local (move o card imediatamente)
  function atualizarEstagio(galeriaId: string, patch: Partial<CampanhaItem>) {
    setItens((prev) => prev.map((i) => i.galeria.id === galeriaId ? { ...i, ...patch } : i));
  }

  function fecharModal() {
    setModalGaleriaId(null);
    setRecarregarKey((k) => k + 1);
  }

  return (
    <div style={{ padding: "26px 30px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <button
            onClick={() => router.push("/entrega")}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--color-text-secondary)", padding: 0, marginBottom: 6, display: "block" }}
          >
            ← Galerias de entrega
          </button>
          <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>
            Campanha de Reativação
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            {loading ? "Carregando…" : `${itens.length} galeria${itens.length !== 1 ? "s" : ""} na campanha`}
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "60px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : itens.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📢</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 8 }}>Nenhuma galeria na campanha ainda</div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
            Abra o email de uma galeria e selecione o template "Campanha de reativação" para começar.
          </div>
        </div>
      ) : (
        /* Pipeline */
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", overflowX: "auto", paddingBottom: 16 }}>
          {COLUNAS.map((col) => {
            const items = itensPorColuna[col.id] ?? [];
            return (
              <div
                key={col.id}
                style={{
                  minWidth: 220, width: 220, flexShrink: 0,
                  background: col.bg,
                  border: `0.5px solid ${col.cor}22`,
                  borderRadius: 12, padding: "14px 12px",
                }}
              >
                {/* Cabeçalho da coluna */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <span style={{ fontSize: 14 }}>{col.icone}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: col.cor }}>{col.label}</span>
                  <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: col.cor, background: `${col.cor}18`, padding: "1px 7px", borderRadius: 20 }}>
                    {items.length}
                  </span>
                </div>

                {/* Cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {items.length === 0 ? (
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textAlign: "center", padding: "16px 0", opacity: 0.5 }}>
                      Nenhuma
                    </div>
                  ) : (
                    items.map((item, idx) => {
                      const ultimoContato = item.whatsapp_em ?? item.email_2_em ?? item.email_1_em ?? null;
                      const corCapa = item.galeria.cover_color ?? CORES_CAPA[idx % CORES_CAPA.length];
                      return (
                        <div
                          key={item.id}
                          style={{
                            background: "var(--color-background-primary)",
                            border: "0.5px solid var(--color-border-tertiary)",
                            borderRadius: 10, padding: "10px 11px",
                          }}
                        >
                          {/* Capa + título */}
                          <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
                            {item.galeria.foto_capa_url ? (
                              <img src={item.galeria.foto_capa_url} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: 32, height: 32, borderRadius: 6, background: corCapa, flexShrink: 0 }} />
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {item.galeria.titulo}
                              </div>
                              {item.galeria.cliente_nome && (
                                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {item.galeria.cliente_nome}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Info */}
                          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 8 }}>
                            {item.resposta === "tem_arquivos" && (
                              <span style={{ color: "#059669", fontWeight: 600 }}>✅ Confirmou que tem os arquivos</span>
                            )}
                            {item.estagio === "encerrado" && !item.resposta && (
                              <span style={{ color: "#6B7280" }}>Encerrado sem resposta</span>
                            )}
                            {ultimoContato && !item.resposta && item.estagio !== "encerrado" && (
                              <span>Último contato {diasDesde(ultimoContato)}</span>
                            )}
                            {!ultimoContato && !item.resposta && (
                              <span>Aguardando 1º contato</span>
                            )}
                          </div>

                          {/* Ação rápida */}
                          {col.id !== "concluido" && (
                            <button
                              onClick={() => setModalGaleriaId(item.galeria.id)}
                              style={{
                                width: "100%", padding: "6px 0", borderRadius: 7, fontSize: 11, fontWeight: 600,
                                border: `0.5px solid ${col.cor}55`,
                                background: `${col.cor}0a`,
                                color: col.cor, cursor: "pointer",
                              }}
                            >
                              Enviar contato →
                            </button>
                          )}
                          {col.id === "concluido" && (
                            <button
                              onClick={() => router.push(`/entrega/${item.galeria.id}`)}
                              style={{
                                width: "100%", padding: "6px 0", borderRadius: 7, fontSize: 11, fontWeight: 600,
                                border: "0.5px solid var(--color-border-secondary)",
                                background: "transparent",
                                color: "var(--color-text-secondary)", cursor: "pointer",
                              }}
                            >
                              Ver galeria →
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal email */}
      {modalGaleriaId && (() => {
        const item = itens.find((i) => i.galeria.id === modalGaleriaId);
        if (!item) return null;
        const galeriaFake = {
          id: item.galeria.id,
          titulo: item.galeria.titulo,
          foto_capa_url: item.galeria.foto_capa_url,
          cover_color: item.galeria.cover_color,
          data_evento: item.galeria.data_evento,
          expires_at: null,
          clientes: item.galeria.cliente_nome
            ? {
                nome: item.galeria.cliente_nome,
                email: item.galeria.cliente_email,
                telefone: item.galeria.cliente_telefone,
                whatsapp: item.galeria.cliente_whatsapp,
              }
            : null,
        } as unknown as GaleriaEntrega;
        return (
          <ModalEmailCliente
            galeria={galeriaFake}
            onFechar={fecharModal}
            templateInicial="campanha"
            onEstagioAvancado={(patch) => atualizarEstagio(item.galeria.id, patch)}
          />
        );
      })()}
    </div>
  );
}
