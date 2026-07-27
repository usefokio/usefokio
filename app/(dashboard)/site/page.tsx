"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { useFotografo } from "@/lib/context/FotografoContext";
import { urlPublicaSite, hostPublicoSite, type ConfigUrl } from "@/lib/site/urlPublica";
import { GraficoContatos, type ContatosMesItem } from "./_components/GraficoContatos";

type TrabRow = { id: string; titulo: string | null; categoria: string | null; views: number | null; likes: number | null; capa_url: string | null };
type LeadRow = { id: string; created_at: string; lido: boolean | null };

type Metricas = {
  views: number; likes: number;
  contatos: number; naoLidos: number;
  nTrabalhos: number; nPortfolios: number; nPosts: number; nVideos: number; nDepoimentos: number;
  porMes: ContatosMesItem[];
  topViews: TrabRow[]; topLikes: TrabRow[];
};

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const fmtInt = (n: number) => n.toLocaleString("pt-BR");

// Card de KPI (mesmo visual dos cards do Resultados/Panorama).
function Card({ label, valor, sub, cor }: { label: string; valor: string; sub?: string; cor?: string }) {
  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "14px 16px", minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: cor ?? "var(--color-text-primary)", marginTop: 4, lineHeight: 1.1 }}>{valor}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

export default function SiteDashboardPage() {
  const { fotografo } = useFotografo();
  const [cfg, setCfg] = useState<ConfigUrl | null>(null);
  const [carregado, setCarregado] = useState(false);
  const [semBriefing, setSemBriefing] = useState(false);
  const [m, setM] = useState<Metricas | null>(null);

  useEffect(() => {
    if (!fotografo) return;
    const sb = createClient();
    const fid = fotografo.id;
    // Primeiro acesso ao Site: garante o esqueleto (Sobre/Contato + menu inicial) — idempotente.
    fetch("/api/site/inicializar", { method: "POST" }).catch(() => {}).finally(() => {
      sb.from("site_config").select("subdominio, dominio_customizado, publicado, briefing").eq("fotografo_id", fid).maybeSingle()
        .then(({ data }) => {
          setCfg((data as ConfigUrl) ?? null);
          const br = (data as { briefing?: { preenchido_em?: string | null } | null } | null)?.briefing;
          setSemBriefing(!br?.preenchido_em);
          setCarregado(true);
        });
    });

    // Métricas do site (agregação client-side; fetchAllRows evita o corte de 1000 linhas).
    (async () => {
      const cnt = (tabela: string) => sb.from(tabela).select("id", { count: "exact", head: true }).eq("fotografo_id", fid);
      const [trab, leads, nPort, nPost, nVid, nDep] = await Promise.all([
        fetchAllRows<TrabRow>((c, from, to) => c.from("site_trabalhos").select("id, titulo, categoria, views, likes, capa_url").eq("fotografo_id", fid).range(from, to), sb),
        fetchAllRows<LeadRow>((c, from, to) => c.from("site_leads").select("id, created_at, lido").eq("fotografo_id", fid).range(from, to), sb),
        cnt("site_portfolios"), cnt("site_posts"), cnt("site_videos"), cnt("site_depoimentos"),
      ]);

      // Últimos 12 meses (rótulo mmm ou mmm/aa quando cruza anos).
      const agora = new Date();
      const buckets: { chave: string; rot: string; contatos: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
        buckets.push({ chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, rot: MESES[d.getMonth()], contatos: 0 });
      }
      const idx = new Map(buckets.map((b, i) => [b.chave, i]));
      for (const l of leads) {
        const k = (l.created_at ?? "").slice(0, 7);
        const i = idx.get(k);
        if (i != null) buckets[i].contatos++;
      }

      const ord = [...trab];
      setM({
        views: trab.reduce((s, t) => s + (t.views ?? 0), 0),
        likes: trab.reduce((s, t) => s + (t.likes ?? 0), 0),
        contatos: leads.length,
        naoLidos: leads.filter((l) => !l.lido).length,
        nTrabalhos: trab.length,
        nPortfolios: nPort.count ?? 0, nPosts: nPost.count ?? 0, nVideos: nVid.count ?? 0, nDepoimentos: nDep.count ?? 0,
        porMes: buckets.map((b) => ({ mes: b.rot, contatos: b.contatos })),
        topViews: [...ord].sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).filter((t) => (t.views ?? 0) > 0).slice(0, 5),
        topLikes: [...ord].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0)).filter((t) => (t.likes ?? 0) > 0).slice(0, 5),
      });
    })().catch(() => setM(null));
  }, [fotografo]);

  const fid = fotografo?.id ?? "";
  const host = hostPublicoSite(cfg);
  const publicado = !!cfg?.publicado && !!host;
  const url = urlPublicaSite(cfg, fid);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 6px", letterSpacing: "-0.02em" }}>Site — Painel</h1>
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "0 0 20px", lineHeight: 1.6 }}>
        Acompanhe os números do seu site e gerencie tudo pelos itens do menu.
      </p>

      {fotografo && carregado && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
          <a href={url} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-block", padding: "11px 22px", borderRadius: 9, background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            🌐 {publicado ? "Ver meu site" : "Visualizar (prévia)"}
          </a>
          {host && (
            <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              {publicado ? "no ar em " : "endereço reservado: "}
              <a href={process.env.NODE_ENV === "development" ? url : `https://${host}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{host}</a>
            </span>
          )}
        </div>
      )}

      {/* KPIs */}
      {m && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
            <Card label="Acessos" valor={fmtInt(m.views)} sub="visitas aos trabalhos" />
            <Card label="Curtidas" valor={fmtInt(m.likes)} sub="em trabalhos e fotos" />
            <Card label="Contatos" valor={fmtInt(m.contatos)} sub={m.naoLidos > 0 ? `${m.naoLidos} não lido(s)` : "todos lidos"} cor={m.naoLidos > 0 ? "#2563EB" : undefined} />
            <Card label="Conteúdo" valor={fmtInt(m.nTrabalhos + m.nPortfolios + m.nPosts + m.nVideos)} sub={`${m.nTrabalhos} trab. · ${m.nPortfolios} portf. · ${m.nPosts} posts · ${m.nVideos} vídeos`} />
          </div>

          {/* Contatos por mês */}
          <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "16px 18px 8px", marginBottom: 20, background: "var(--color-background-primary)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>Contatos recebidos (12 meses)</span>
              <a href="/site/inbox" style={{ fontSize: 12, color: "#2563EB", fontWeight: 600, textDecoration: "none" }}>Ver mensagens →</a>
            </div>
            {m.contatos > 0
              ? <GraficoContatos dados={m.porMes} />
              : <div style={{ fontSize: 13, color: "var(--color-text-secondary)", padding: "16px 0" }}>Nenhum contato recebido ainda pelo formulário do site.</div>}
          </div>

          {/* Top trabalhos */}
          {(m.topViews.length > 0 || m.topLikes.length > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 8 }}>
              {m.topViews.length > 0 && (
                <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "14px 16px", background: "var(--color-background-primary)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 10 }}>Trabalhos mais vistos</div>
                  {m.topViews.map((t) => (
                    <div key={t.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "5px 0", fontSize: 13, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
                      <span style={{ color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.titulo || "(sem título)"}</span>
                      <span style={{ color: "var(--color-text-secondary)", fontWeight: 700, flex: "0 0 auto" }}>{fmtInt(t.views ?? 0)} 👁</span>
                    </div>
                  ))}
                </div>
              )}
              {m.topLikes.length > 0 && (
                <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "14px 16px", background: "var(--color-background-primary)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 10 }}>Trabalhos mais curtidos</div>
                  {m.topLikes.map((t) => (
                    <div key={t.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "5px 0", fontSize: 13, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
                      <span style={{ color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.titulo || "(sem título)"}</span>
                      <span style={{ color: "var(--color-text-secondary)", fontWeight: 700, flex: "0 0 auto" }}>{fmtInt(t.likes ?? 0)} ❤</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Convite ao briefing — some depois de preenchido */}
      {carregado && semBriefing && (
        <a href="/site/briefing" style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20, padding: "16px 18px", borderRadius: 12, border: "1px solid rgba(37,99,235,0.35)", background: "rgba(37,99,235,0.06)", textDecoration: "none" }}>
          <span style={{ fontSize: 22 }}>✨</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>Complete o briefing da sua marca</span>
            <span style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>Conte seu conceito, nichos e cidades — geramos sugestões de SEO e do texto Sobre automaticamente (leva ~3 min).</span>
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#2563EB", whiteSpace: "nowrap" }}>Preencher →</span>
        </a>
      )}

      {/* Saúde do SEO */}
      <a href="/site/saude-seo" style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, padding: "16px 18px", borderRadius: 12, border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", textDecoration: "none" }}>
        <span style={{ fontSize: 22 }}>🔍</span>
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>Saúde do SEO</span>
          <span style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>Análise automática do site: veja o que falta configurar para aparecer melhor no Google.</span>
        </span>
        <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>→</span>
      </a>

      {!publicado && carregado && (
        <div style={{ marginTop: 16, padding: "16px 18px", borderRadius: 12, border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
          {host ? (
            <>Seu endereço <strong>{host}</strong> está reservado, mas o site <strong>não está publicado</strong>. Ative em <strong>Site → Configurações</strong>.</>
          ) : (
            <>Defina um <strong>subdomínio</strong> em <strong>Site → Configurações</strong> e publique para colocar seu site no ar.</>
          )}
        </div>
      )}
    </div>
  );
}
