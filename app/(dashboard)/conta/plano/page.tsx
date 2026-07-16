"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { PLANOS, pctUso, corBarra, limiteEfetivo, formatarBytes, type PlanoId } from "@/lib/planos";

type UsoPorRecurso = {
  selecao: number;
  entrega: number;
};

type PixData = {
  assinaturaId:  string;
  invoiceUrl:    string;
  pixCopiaECola: string | null;
  pixQrCodeUrl:  string | null;
  expiresAt:     string | null;
};

type PlanoPublico = {
  id?: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  preco: number;
  preco_anual: number | null;
  limite_fotos: number | null;
  limite_galerias: number | null;
  duracao_dias: number | null;
  eh_campanha: boolean;
  valido_ate: string | null;
  cor: string;
  features: string[];
  ordem: number;
};

function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  function toast(m: string) { setMsg(m); setTimeout(() => setMsg(null), 3500); }
  return { msg, toast };
}

// ─── Barra de uso por recurso ─────────────────────────────────────────────────
function BarraRecurso({ label, icone, qtd, total, cor, unit = "foto" }: {
  label: string; icone: string; qtd: number; total: number; cor: string; unit?: string;
}) {
  const pct = total > 0 ? Math.round((qtd / total) * 100) : 0;
  const unitLabel = qtd !== 1 ? (unit === "foto" ? "fotos" : unit + "s") : unit;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${cor}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
        {icone}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>{label}</span>
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
            {qtd.toLocaleString("pt-BR")} {unitLabel}
            {total > 0 && <span style={{ color: "var(--color-text-secondary)", opacity: 0.6 }}> · {pct}%</span>}
          </span>
        </div>
        <div style={{ height: 5, background: "rgba(0,0,0,0.07)", borderRadius: 3, overflow: "hidden" }}>
          {total > 0 && <div style={{ height: "100%", borderRadius: 3, background: cor, width: `${pct}%`, transition: "width 0.5s ease" }} />}
        </div>
      </div>
    </div>
  );
}

// ─── Modal de checkout PIX ─────────────────────────────────────────────────────
function ModalCheckout({ planoNome, planoPreco, planoConfigId, periodo, onClose }: {
  planoNome: string;
  planoPreco: number;
  planoConfigId?: string;
  periodo?: "mensal" | "anual";
  onClose: () => void;
}) {
  const [etapa, setEtapa]     = useState<"carregando" | "pix" | "erro">("carregando");
  const [pix,   setPix]       = useState<PixData | null>(null);
  const [erro,  setErro]      = useState("");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const body: Record<string, unknown> = {};
        if (planoConfigId) body.plano_config_id = planoConfigId;
        if (periodo) body.periodo = periodo;
        const res  = await fetch("/api/assinaturas/criar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) { setErro(json.error ?? "Erro ao gerar cobrança."); setEtapa("erro"); return; }
        setPix(json);
        setEtapa("pix");
      } catch {
        setErro("Falha de conexão. Tente novamente.");
        setEtapa("erro");
      }
    })();
  }, []);

  async function copiar() {
    if (!pix?.pixCopiaECola) return;
    await navigator.clipboard.writeText(pix.pixCopiaECola);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 30px", width: 420, maxWidth: "calc(100vw - 40px)", boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
              {planoNome}
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>
              {periodo === "anual"
                ? `R$${Number(planoPreco).toFixed(2).replace(".", ",")}/mês · Total: R$${(Number(planoPreco) * 12).toFixed(2).replace(".", ",")}/ano`
                : `R$${Number(planoPreco).toFixed(2).replace(".", ",")}/mês`}
              {planoConfigId ? " · campanha" : ""}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-secondary)", padding: 4, lineHeight: 1 }}>✕</button>
        </div>

        {etapa === "carregando" && (
          <div style={{ textAlign: "center", padding: "32px 0", color: "var(--color-text-secondary)", fontSize: 13 }}>
            Gerando cobrança…
          </div>
        )}

        {etapa === "erro" && (
          <div>
            <div style={{ padding: "14px 16px", background: "rgba(239,68,68,0.07)", borderRadius: 10, border: "0.5px solid rgba(239,68,68,0.2)", fontSize: 13, color: "#DC2626", marginBottom: 16, lineHeight: 1.5 }}>
              {erro}
            </div>
            <button onClick={onClose} style={{ width: "100%", padding: "10px", borderRadius: 9, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}>
              Fechar
            </button>
          </div>
        )}

        {etapa === "pix" && pix && (
          <>
            {pix.pixQrCodeUrl && (
              <div style={{ textAlign: "center", marginBottom: 18 }}>
                <img src={pix.pixQrCodeUrl} alt="QR Code PIX" style={{ width: 200, height: 200, borderRadius: 10, border: "0.5px solid var(--color-border-secondary)", padding: 8, background: "#fff" }} />
              </div>
            )}

            {pix.pixCopiaECola && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                  PIX Copia e Cola
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    readOnly
                    value={pix.pixCopiaECola}
                    style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 11, fontFamily: "monospace", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis" }}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button onClick={copiar} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: copiado ? "#059669" : "#2563EB", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0, transition: "background 0.15s" }}>
                    {copiado ? "✓ Copiado" : "Copiar"}
                  </button>
                </div>
              </div>
            )}

            {pix.invoiceUrl && (
              <a href={pix.invoiceUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: "block", textAlign: "center", padding: "10px", borderRadius: 9, background: "#2563EB", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", marginBottom: 12 }}>
                Pagar via link Asaas
              </a>
            )}

            <div style={{ padding: "10px 14px", background: "var(--color-background-secondary)", borderRadius: 8, fontSize: 11, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
              Após o pagamento, seu plano será ativado automaticamente em alguns segundos.
              {pix.expiresAt && pix.pixQrCodeUrl && ` PIX válido até ${new Date(pix.expiresAt).toLocaleString("pt-BR")}.`}
            </div>

            <button onClick={onClose} style={{ width: "100%", padding: "10px", borderRadius: 9, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer", marginTop: 12 }}>
              Fechar e pagar depois
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function PlanoPage() {
  const router           = useRouter();
  const { fotografo }    = useFotografo();
  const { msg, toast }   = useToast();

  const [uso,              setUso]              = useState<UsoPorRecurso | null>(null);
  const [carregandoUso,    setCarregandoUso]    = useState(true);
  const [planoExpiraEm,    setPlanoExpiraEm]    = useState<string | null>(null);
  // Uso de ARMAZENAMENTO (bytes + limite em GB) — planos por espaço; valores do banco.
  const [usoStorage,       setUsoStorage]       = useState<{ bytes_usados: number; limite_gb: number | null } | null>(null);

  useEffect(() => {
    if (!fotografo) return;
    fetch("/api/conta/uso")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j && typeof j.bytes_usados === "number") setUsoStorage({ bytes_usados: j.bytes_usados, limite_gb: j.limite_gb ?? null }); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotografo?.id]);
  const [modalCheckout,    setModalCheckout]    = useState(false);
  const [planosDB,         setPlanosDB]         = useState<PlanoPublico[]>([]);
  const [planoSelecionado, setPlanoSelecionado] = useState<{ id?: string; nome: string; preco: number; periodo?: "mensal" | "anual" } | null>(null);
  const [periodoGlobal, setPeriodoGlobal] = useState<"mensal" | "anual">("mensal");

  useEffect(() => {
    fetch("/api/planos-publicos")
      .then((r) => r.json())
      .then((j) => setPlanosDB(j.planos ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();

    Promise.all([
      supabase
        .from("galerias_selecao")
        .select("id", { count: "exact", head: true })
        .eq("fotografo_id", fotografo.id),

      supabase
        .from("galerias_entrega")
        .select("id", { count: "exact", head: true })
        .eq("fotografo_id", fotografo.id),

      supabase
        .from("fotografos")
        .select("plano_expira_em")
        .eq("id", fotografo.id)
        .maybeSingle(),
    ]).then(([sel, ent, expRow]) => {
      setUso({ selecao: sel.count ?? 0, entrega: ent.count ?? 0 });
      const row = expRow.data as { plano_expira_em: string | null } | null;
      setPlanoExpiraEm(row?.plano_expira_em ?? null);
      setCarregandoUso(false);
    });
  }, [fotografo]);

  if (!fotografo) return (
    <div style={{ padding: "40px 30px", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
  );

  const planoAtual    = PLANOS[fotografo.plano as PlanoId] ?? PLANOS.gratuito;
  const usadas        = fotografo.total_fotos_usadas ?? 0;
  const limiteAtual   = limiteEfetivo(planoAtual, fotografo.limite_fotos_custom);
  const pct           = pctUso(usadas, planoAtual, fotografo.limite_fotos_custom);
  const barCor        = pct !== null ? corBarra(pct) : "#2563EB";
  const planoDBAtual  = planosDB.find(p => p.codigo === fotografo.plano);
  const limiteGalerias = planoDBAtual?.limite_galerias ?? null;

  const diasParaExpirar = planoExpiraEm
    ? Math.ceil((new Date(planoExpiraEm).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div style={{ padding: "26px 30px", maxWidth: 860 }}>

      {msg && (
        <div style={{ position: "fixed", top: 20, right: 24, zIndex: 999, background: "var(--color-text-primary)", color: "var(--color-background-primary)", padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", animation: "fadeIn 0.2s ease" }}>
          {msg}
        </div>
      )}

      {modalCheckout && planoSelecionado && (
        <ModalCheckout
          planoNome={planoSelecionado.nome}
          planoPreco={planoSelecionado.preco}
          planoConfigId={planoSelecionado.id}
          periodo={planoSelecionado.periodo}
          onClose={() => { setModalCheckout(false); setPlanoSelecionado(null); }}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: 0, marginBottom: 16 }}>
          ← Voltar
        </button>
        <h1 style={{ fontSize: 19, fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 4px", letterSpacing: "-0.02em" }}>Plano e uso</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>Gerencie seu plano e acompanhe o uso de fotos</p>
      </div>

      {/* ── Card: Plano atual + uso total ── */}
      <div style={{ background: planoAtual.corBg, border: `1px solid ${planoAtual.cor}30`, borderRadius: 14, padding: "22px 26px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: planoAtual.cor, letterSpacing: "-0.02em" }}>{planoAtual.nome}</span>
              {planoAtual.badge && (
                <span style={{ padding: "2px 9px", borderRadius: 20, background: planoAtual.cor, color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: "0.05em" }}>
                  {planoAtual.badge.toUpperCase()}
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              {planoAtual.descricao} · ativo desde {new Date(fotografo.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            {planoAtual.preco === 0 ? (
              <div style={{ fontSize: 18, fontWeight: 800, color: "#059669", letterSpacing: "-0.02em" }}>Gratuito</div>
            ) : (
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#2563EB", letterSpacing: "-0.02em" }}>
                  R${planoAtual.preco}/mês
                </div>
                {diasParaExpirar !== null && (
                  <div style={{ fontSize: 12, fontWeight: 600, color: diasParaExpirar <= 7 ? "#EF4444" : "var(--color-text-secondary)", marginTop: 4 }}>
                    {diasParaExpirar > 0
                      ? `Ativo por mais ${diasParaExpirar} dia${diasParaExpirar !== 1 ? "s" : ""}`
                      : "Expirado"}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Barra total */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total de fotos</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: pct !== null && pct >= 80 ? barCor : "var(--color-text-primary)" }}>
              {usadas.toLocaleString("pt-BR")}
              {limiteAtual !== null
                ? ` / ${limiteAtual.toLocaleString("pt-BR")}`
                : " (ilimitado)"}
            </span>
          </div>
          {pct !== null && (
            <>
              <div style={{ height: 8, background: "rgba(0,0,0,0.08)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 4, background: barCor, width: `${pct}%`, transition: "width 0.5s ease" }} />
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 5 }}>
                {pct}% utilizado
                {pct >= 95 && <span style={{ color: "#EF4444", fontWeight: 600, marginLeft: 8 }}>⚠️ Limite quase atingido!</span>}
                {pct >= 80 && pct < 95 && <span style={{ color: "#F59E0B", fontWeight: 600, marginLeft: 8 }}>Atenção: uso elevado</span>}
              </div>
            </>
          )}
        </div>

        {/* Barra de ARMAZENAMENTO (GB) — some se o plano não tem limite de espaço */}
        {usoStorage && (() => {
          const limiteGb = usoStorage.limite_gb;
          const pctS = limiteGb !== null ? Math.min(100, Math.round((usoStorage.bytes_usados / (limiteGb * 1024 ** 3)) * 100)) : null;
          const bcS = pctS !== null ? corBarra(pctS) : "#2563EB";
          return (
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Armazenamento</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: pctS !== null && pctS >= 80 ? bcS : "var(--color-text-primary)" }}>
                  {formatarBytes(usoStorage.bytes_usados)}
                  {limiteGb !== null ? ` / ${limiteGb} GB` : " (ilimitado)"}
                </span>
              </div>
              {pctS !== null && (
                <>
                  <div style={{ height: 8, background: "rgba(0,0,0,0.08)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 4, background: bcS, width: `${pctS}%`, transition: "width 0.5s ease" }} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 5 }}>
                    {pctS}% utilizado
                    {pctS >= 95 && <span style={{ color: "#EF4444", fontWeight: 600, marginLeft: 8 }}>⚠️ Espaço quase esgotado — novos uploads serão bloqueados</span>}
                    {pctS >= 80 && pctS < 95 && <span style={{ color: "#F59E0B", fontWeight: 600, marginLeft: 8 }}>Atenção: espaço quase no limite</span>}
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* Breakdown por recurso */}
        <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: 10, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
            Detalhamento por recurso
          </div>
          {carregandoUso ? (
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Calculando…</div>
          ) : (
            <>
              <BarraRecurso label="Galerias de Seleção" icone="🖼" qtd={uso?.selecao ?? 0} total={0} cor="#2563EB" unit="galeria" />
              <BarraRecurso label="Galerias de Entrega"  icone="📦" qtd={uso?.entrega ?? 0} total={limiteGalerias ?? 0} cor="#059669" unit="galeria" />
            </>
          )}
        </div>
      </div>

      {/* ── Cards dos planos ── */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 16 }}>
          {planosDB.some((p) => p.eh_campanha) ? "Planos e campanhas disponíveis" : "Todos os planos"}
        </div>
        {/* Toggle global mensal/anual */}
        {planosDB.some((p) => p.preco_anual != null && !p.eh_campanha) && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 20 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: periodoGlobal === "mensal" ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>
              Mensal
            </span>
            <button
              onClick={() => setPeriodoGlobal((v) => v === "mensal" ? "anual" : "mensal")}
              aria-label="Alternar entre mensal e anual"
              style={{ width: 46, height: 24, borderRadius: 12, border: "none", cursor: "pointer", position: "relative", background: periodoGlobal === "anual" ? "#2563EB" : "var(--color-border-secondary)", transition: "background 0.2s", flexShrink: 0 }}
            >
              <span style={{ position: "absolute", top: 3, left: periodoGlobal === "anual" ? 25 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: periodoGlobal === "anual" ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>
              Anual
            </span>
            {periodoGlobal === "anual" && (() => {
              const pAnual = planosDB.find((p) => p.preco_anual != null && !p.eh_campanha);
              if (!pAnual?.preco_anual) return null;
              const pct = Math.round((1 - Number(pAnual.preco_anual) / Number(pAnual.preco)) * 100);
              const economiaAno = Math.round((Number(pAnual.preco) - Number(pAnual.preco_anual)) * 12);
              return (
                <span style={{ fontSize: 11, fontWeight: 700, color: "#059669", background: "rgba(5,150,105,0.1)", padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
                  Economize {pct}% · R${economiaAno.toLocaleString("pt-BR")}/ano
                </span>
              );
            })()}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          {(planosDB.length > 0 ? planosDB : Object.values(PLANOS).map((p) => ({
            id: undefined,
            codigo: p.id,
            nome: p.nome,
            descricao: p.descricao,
            preco: p.preco,
            preco_anual: null,
            limite_fotos: p.limite_fotos ?? null,
            limite_galerias: null,
            duracao_dias: null,
            eh_campanha: false,
            valido_ate: null,
            cor: p.cor,
            features: p.features,
            ordem: 0,
          } as PlanoPublico & { id?: string }))).map((p) => {
            const isAtual   = fotografo.plano === p.codigo;
            const isUpgrade = Number(p.preco) > Number(planoAtual.preco);
            const cor       = p.cor ?? "#2563EB";
            const temAnual   = p.preco_anual != null && !p.eh_campanha;
            const precoExibido = temAnual && periodoGlobal === "anual" ? Number(p.preco_anual) : Number(p.preco);
            const precoFmt = precoExibido === 0 ? "Gratuito" : `R$${precoExibido.toFixed(2).replace(".", ",")}`;

            function abrirCheckout() {
              setPlanoSelecionado({ id: p.id, nome: p.nome, preco: precoExibido, periodo: temAnual ? periodoGlobal : "mensal" });
              setModalCheckout(true);
            }

            return (
              <div key={p.codigo} style={{ background: "var(--color-background-primary)", border: isAtual ? `2px solid ${cor}` : "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "22px 22px 20px", display: "flex", flexDirection: "column", position: "relative", transition: "border 0.15s" }}>
                {p.eh_campanha && (
                  <div style={{ position: "absolute", top: -1, right: 20, background: "#F59E0B", color: "#fff", fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", padding: "3px 9px", borderRadius: "0 0 8px 8px" }}>
                    PROMOÇÃO
                  </div>
                )}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>{p.nome}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 10 }}>
                    {p.descricao}
                    {p.valido_ate && <span style={{ color: "#B45309", fontWeight: 600 }}> · até {new Date(p.valido_ate + "T12:00:00").toLocaleDateString("pt-BR")}</span>}
                  </div>

                  <div style={{ fontSize: 22, fontWeight: 800, color: cor, letterSpacing: "-0.02em", lineHeight: 1 }}>
                    {precoFmt}
                    {precoExibido > 0 && <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>/mês</span>}
                  </div>
                  {temAnual && periodoGlobal === "anual" && p.preco_anual != null && (
                    <div style={{ marginTop: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#059669", background: "rgba(5,150,105,0.1)", padding: "2px 8px", borderRadius: 12 }}>
                        {Math.round((1 - Number(p.preco_anual) / Number(p.preco)) * 100)}% off · economize R${Math.round((Number(p.preco) - Number(p.preco_anual)) * 12).toLocaleString("pt-BR")}/ano
                      </span>
                    </div>
                  )}
                  {temAnual && periodoGlobal === "anual" && (
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
                      Pagamento único anual — parcele em até 12× sem juros no cartão
                    </div>
                  )}
                  {p.duracao_dias && periodoGlobal !== "anual" && (
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 3 }}>{p.duracao_dias} dias de acesso</div>
                  )}
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
                    {p.limite_fotos != null ? `${p.limite_fotos.toLocaleString("pt-BR")} fotos` : "Fotos ilimitadas"}
                    {" · "}
                    {p.limite_galerias != null
                      ? `${p.limite_galerias} galeria${p.limite_galerias === 1 ? "" : "s"} de entrega`
                      : "Galerias de entrega ilimitadas"}
                  </div>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 18px", flex: 1 }}>
                  {(Array.isArray(p.features) ? p.features : []).map((f: string) => (
                    <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "var(--color-text-primary)", marginBottom: 7, lineHeight: 1.4 }}>
                      <span style={{ color: cor, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                {isAtual && !isUpgrade ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ textAlign: "center", padding: "9px", borderRadius: 9, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)" }}>
                      ✓ Plano atual
                    </div>
                    {fotografo.plano !== "gratuito" && (
                      <button
                        onClick={abrirCheckout}
                        style={{ padding: "9px", borderRadius: 9, border: `0.5px solid ${cor}`, background: "transparent", color: cor, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                      >
                        Renovar
                      </button>
                    )}
                  </div>
                ) : isUpgrade ? (
                  <button
                    onClick={abrirCheckout}
                    style={{ padding: "9px", borderRadius: 9, border: "none", background: cor, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "opacity 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    {p.eh_campanha ? `🏷 Aproveitar — ${precoFmt}` : `↑ Fazer upgrade — ${precoFmt}/mês`}
                  </button>
                ) : (
                  <button
                    onClick={() => toast("Para fazer downgrade, entre em contato com o suporte.")}
                    style={{ padding: "9px", borderRadius: 9, background: "transparent", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    Fazer downgrade
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
