"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { Cliente, GaleriaSelecao } from "@/lib/supabase/types";
import { DoacaoDev } from "../_components/DoacaoDev";

type Stats = {
  totalClientes:         number;
  clientesEsteMes:       number;
  totalGalerias:         number;
  galeriasAtivas:        number;
  totalEntregas:         number;
  entregasAtivas:        number;
};

const STORAGE_BASE = "https://fhsoqlttxggjpgrupjse.supabase.co/storage/v1/object/public/galerias/";

function resolveThumb(raw: string | null | undefined, fallback?: string | null): string | null {
  if (!raw) return fallback ?? null;
  return raw.startsWith("http") ? raw : STORAGE_BASE + raw;
}

type GaleriaRevisao = Pick<GaleriaSelecao, "id" | "titulo" | "selecao_enviada_em"> & {
  cliente?:  { nome: string } | null;
  thumbUrl?: string | null;
};

type AtividadeItem = {
  id:    string;
  texto: string;
  tempo: string;
  cor:   string;
  href:  string;
};

function tempoRelativo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min  = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const dias = Math.floor(diff / 86400000);
  if (min < 2)    return "agora mesmo";
  if (min < 60)   return `há ${min} min`;
  if (hrs < 24)   return `há ${hrs}h`;
  if (dias === 1) return "ontem";
  if (dias < 7)   return `há ${dias} dias`;
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

export default function DashboardPage() {
  const router = useRouter();
  const { fotografo } = useFotografo();

  const [stats, setStats]                     = useState<Stats | null>(null);
  const [atividades, setAtividades]           = useState<AtividadeItem[]>([]);
  const [aguardando, setAguardando]           = useState<GaleriaRevisao[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [vendaRecebida, setVendaRecebida]     = useState<{ ids: string[]; total: number } | null>(null);

  // Checa vendas (renovações pagas) ainda não celebradas → modal sugerindo doação
  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    supabase.from("pagamentos")
      .select("id, valor")
      .eq("fotografo_id", fotografo.id)
      .eq("tipo", "renovacao")
      .eq("status", "pago")
      .eq("doacao_sugerida", false)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setVendaRecebida({ ids: data.map((p) => p.id), total: data.reduce((s, p) => s + Number(p.valor), 0) });
        }
      });
  }, [fotografo]);

  async function fecharModalVenda() {
    if (vendaRecebida) {
      // RLS só permite SELECT em pagamentos — a marcação é feita server-side
      await fetch("/api/doacao/sugerida", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: vendaRecebida.ids }),
      }).catch(() => {});
    }
    setVendaRecebida(null);
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const [{ data: clientes }, { data: galerias }, { data: entregas }] = await Promise.all([
        supabase.from("clientes").select("id, nome, created_at").order("created_at", { ascending: false }),
        supabase.from("galerias_selecao")
          .select("id, titulo, status, selecao_enviada_em, created_at, foto_capa_id, cliente:clientes(nome), capa_foto:galerias_selecao_fotos!foto_capa_id(thumbnail_path, url_publica)")
          .order("created_at", { ascending: false }),
        supabase.from("galerias_entrega")
          .select("id, rascunho, suspensa, expires_at")
          .eq("rascunho", false),
      ]);

      const lista    = (clientes ?? []) as Pick<Cliente, "id" | "nome" | "created_at">[];
      const gals     = (galerias ?? []) as unknown as (GaleriaSelecao & { cliente?: { nome: string } | null })[];
      const entList  = (entregas ?? []) as { id: string; rascunho: boolean; suspensa: boolean; expires_at: string | null }[];

      const inicioMes = new Date();
      inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);

      const agora = new Date();
      setStats({
        totalClientes:   lista.length,
        clientesEsteMes: lista.filter((c) => new Date(c.created_at) >= inicioMes).length,
        totalGalerias:   gals.length,
        galeriasAtivas:  gals.filter((g) => g.status === "ativa").length,
        totalEntregas:   entList.length,
        entregasAtivas:  entList.filter((g) => !g.suspensa && (!g.expires_at || new Date(g.expires_at) > agora)).length,
      });

      // Galerias aguardando revisão
      setAguardando(
        gals
          .filter((g) => g.status === "aguardando_revisao")
          .map((g) => {
            const capa = (g as any).capa_foto as { thumbnail_path?: string; url_publica?: string } | null;
            return {
              id:               g.id,
              titulo:           g.titulo,
              selecao_enviada_em: g.selecao_enviada_em,
              cliente:          (g as any).cliente,
              thumbUrl:         resolveThumb(capa?.thumbnail_path, capa?.url_publica),
            };
          })
      );

      // Atividade recente — mistura clientes + galerias, ordena por data
      const atv: AtividadeItem[] = [
        ...lista.slice(0, 5).map((c) => ({
          id:    c.id,
          texto: `Cliente ${c.nome} cadastrado`,
          tempo: tempoRelativo(c.created_at),
          cor:   "#2563EB",
          href:  `/clientes/${c.id}`,
        })),
        ...gals.slice(0, 5).map((g) => ({
          id:    g.id,
          texto: `Galeria "${g.titulo}" criada`,
          tempo: tempoRelativo(g.created_at),
          cor:   "#059669",
          href:  `/selecao/${g.id}`,
        })),
      ]
        .sort((a, b) => {
          // ordena pela proximidade do tempo relativo (simples: por texto de tempo)
          // usa created_at original não disponível aqui — retorna como veio
          return 0;
        })
        .slice(0, 8);

      setAtividades(atv);
      setLoading(false);
    }
    load();
  }, []);

  const saudacao = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };

  const primeiroNome = fotografo?.nome_completo.split(" ")[0] ?? "";

  return (
    <div style={{ padding: "26px 30px", maxWidth: 980 }}>

      {/* Saudação */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>
          {saudacao()}{primeiroNome ? `, ${primeiroNome}` : ""} 👋
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
          Aqui está o resumo da sua operação
        </p>
      </div>

      {/* ── Banner: galerias aguardando revisão ── */}
      {!loading && aguardando.length > 0 && (
        <div style={{
          background: "rgba(245,158,11,0.06)",
          border: "0.5px solid rgba(245,158,11,0.4)",
          borderRadius: 12, marginBottom: 20, overflow: "hidden",
        }}>
          {/* Cabeçalho do bloco */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "14px 18px",
            borderBottom: aguardando.length > 0 ? "0.5px solid rgba(245,158,11,0.2)" : "none",
            background: "rgba(245,158,11,0.06)",
          }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>
                {aguardando.length} galeria{aguardando.length !== 1 ? "s" : ""} aguardando sua revisão
              </span>
              <span style={{ fontSize: 12, color: "#B45309", marginLeft: 8 }}>
                — o cliente já enviou a seleção de fotos
              </span>
            </div>
            <Link
              href="/selecao?filtro=aguardando_revisao"
              style={{ fontSize: 12, fontWeight: 600, color: "#B45309", textDecoration: "none", whiteSpace: "nowrap", padding: "5px 12px", borderRadius: 8, border: "0.5px solid rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.1)" }}
            >
              Ver todas →
            </Link>
          </div>

          {/* Lista de galerias */}
          {aguardando.map((g, i) => (
            <div
              key={g.id}
              onClick={() => router.push(`/selecao/${g.id}`)}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "12px 18px",
                borderBottom: i < aguardando.length - 1 ? "0.5px solid rgba(245,158,11,0.12)" : "none",
                cursor: "pointer",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(245,158,11,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {/* Thumbnail de capa */}
              <div style={{
                width: 44, height: 44, borderRadius: 8, flexShrink: 0,
                background: "rgba(245,158,11,0.12)",
                overflow: "hidden",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18,
              }}>
                {g.thumbUrl
                  ? <img src={g.thumbUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  : "🖼"}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {g.titulo}
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 1 }}>
                  {g.cliente?.nome ?? "Sem cliente"}
                  {g.selecao_enviada_em && (
                    <> · Enviada {tempoRelativo(g.selecao_enviada_em)}</>
                  )}
                </div>
              </div>

              {/* Ação */}
              <div style={{ fontSize: 11, fontWeight: 600, color: "#B45309", flexShrink: 0, display: "flex", alignItems: "center", gap: 5 }}>
                Ver seleção <span>→</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { href: "/clientes/novo",   icon: "👤", bg: "rgba(16,185,129,0.08)",  title: "Novo cliente",             desc: "Cadastre um cliente para vincular galerias" },
          { href: "/selecao/nova",    icon: "🖼", bg: "rgba(37,99,235,0.08)",   title: "Nova galeria de seleção",  desc: "Publique para o cliente escolher as fotos" },
          { href: "/entrega/nova",    icon: "📦", bg: "rgba(139,92,246,0.08)",  title: "Nova galeria de entrega",  desc: "Entregue as fotos finais editadas em HD" },
        ].map((a) => (
          <Link
            key={a.href} href={a.href}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderRadius: 10, flex: 1, minWidth: 200, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", textDecoration: "none" }}
          >
            <div style={{ width: 38, height: 38, borderRadius: 9, background: a.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 }}>{a.icon}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{a.title}</div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{a.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>

        <div
          onClick={() => router.push("/clientes")}
          style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "16px 18px", cursor: "pointer" }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2563EB")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-border-tertiary)")}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Clientes</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.02em", lineHeight: 1 }}>
            {loading ? "—" : stats?.totalClientes ?? 0}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 6 }}>
            {loading ? "" : stats?.clientesEsteMes ? `+${stats.clientesEsteMes} este mês` : "Nenhum novo este mês"}
          </div>
        </div>

        <div
          onClick={() => router.push("/selecao")}
          style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "16px 18px", cursor: "pointer" }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2563EB")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-border-tertiary)")}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Galerias de Seleção</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.02em", lineHeight: 1 }}>
              {loading ? "—" : stats?.totalGalerias ?? 0}
            </div>
            {!loading && aguardando.length > 0 && (
              <div style={{ marginBottom: 3, padding: "2px 8px", borderRadius: 20, background: "rgba(245,158,11,0.15)", color: "#B45309", fontSize: 11, fontWeight: 700 }}>
                ⚠️ {aguardando.length} revisão
              </div>
            )}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 6 }}>
            {loading ? "" : `${stats?.galeriasAtivas ?? 0} ativa${stats?.galeriasAtivas !== 1 ? "s" : ""}`}
          </div>
        </div>

        <div
          onClick={() => router.push("/entrega")}
          style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "16px 18px", cursor: "pointer" }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2563EB")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-border-tertiary)")}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Galerias de Entrega</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.02em", lineHeight: 1 }}>
            {loading ? "—" : stats?.totalEntregas ?? 0}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 6 }}>
            {loading ? "" : `${stats?.entregasAtivas ?? 0} ativa${stats?.entregasAtivas !== 1 ? "s" : ""}`}
          </div>
        </div>

      </div>

      {/* Apoie o desenvolvedor */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
          ❤️ Apoie o desenvolvedor
        </div>
        <DoacaoDev />
      </div>

      {/* Atividade recente */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "18px 20px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
          Atividade recente
        </div>

        {loading ? (
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", padding: "8px 0" }}>Carregando…</div>
        ) : atividades.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12 }}>Nenhuma atividade ainda.</div>
            <Link href="/clientes/novo" style={{ fontSize: 13, color: "#2563EB", fontWeight: 500, textDecoration: "none" }}>Cadastrar primeiro cliente →</Link>
          </div>
        ) : (
          atividades.map((a, i) => (
            <div
              key={a.id + i}
              onClick={() => router.push(a.href)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < atividades.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", cursor: "pointer" }}
            >
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: a.cor, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "var(--color-text-primary)", flex: 1, lineHeight: 1.5 }}>{a.texto}</span>
              <span style={{ fontSize: 11, color: "var(--color-text-secondary)", whiteSpace: "nowrap", flexShrink: 0 }}>{a.tempo}</span>
            </div>
          ))
        )}
      </div>

      {/* Modal pós-venda: sugestão de doação */}
      {vendaRecebida && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80, padding: 20 }} onClick={fecharModalVenda}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 16, padding: "30px 30px", width: 440, maxWidth: "100%", boxShadow: "0 12px 48px rgba(0,0,0,0.25)" }}>
            <div style={{ fontSize: 36, marginBottom: 10, textAlign: "center" }}>🎉</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 800, color: "var(--color-text-primary)", textAlign: "center", letterSpacing: "-0.01em" }}>
              Você recebeu R$ {vendaRecebida.total.toFixed(2).replace(".", ",")} em renovações!
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--color-text-secondary)", textAlign: "center", lineHeight: 1.6 }}>
              O pagamento caiu direto na sua conta Asaas. Se o UseFokio está te ajudando a vender, que tal apoiar o desenvolvimento?
            </p>
            <DoacaoDev compacto />
            <button onClick={fecharModalVenda} style={{ display: "block", margin: "16px auto 0", background: "none", border: "none", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer", textDecoration: "underline" }}>
              Agora não
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
