"use client";

// Integração das avaliações do Google no painel: busca o negócio, salva o place_id
// e mostra a prévia. As avaliações aparecem no site/landing automaticamente (atualiza sozinho ~12h).
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { GoogleReview } from "@/lib/supabase/types";

type Candidato = { place_id: string; nome: string; endereco: string };
type Resumo = { rating: number | null; total: number | null; reviews: GoogleReview[] };

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8, boxSizing: "border-box",
  border: "1px solid var(--color-border-secondary)", fontSize: 13,
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};

export function GoogleConfig() {
  const { fotografo } = useFotografo();
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [busca, setBusca] = useState("");
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [naoConfig, setNaoConfig] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    supabase.from("site_config").select("google_place_id, google_rating, google_total, google_reviews").eq("fotografo_id", fotografo.id).maybeSingle()
      .then(({ data }) => {
        if (data?.google_place_id) {
          setPlaceId(data.google_place_id);
          setResumo({ rating: data.google_rating, total: data.google_total, reviews: (data.google_reviews as GoogleReview[]) ?? [] });
        }
      });
  }, [fotografo]);

  // Busca com debounce
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (busca.trim().length < 3) { setCandidatos([]); return; }
    timer.current = setTimeout(async () => {
      setBuscando(true); setMsg(null);
      try {
        const r = await fetch(`/api/site/google/buscar?q=${encodeURIComponent(busca)}`);
        if (r.status === 503) { setNaoConfig(true); setCandidatos([]); return; }
        const j = await r.json();
        setCandidatos(j.resultados ?? []);
      } catch { setCandidatos([]); }
      finally { setBuscando(false); }
    }, 450);
  }, [busca]);

  async function selecionar(c: Candidato) {
    setSalvando(true); setMsg(null); setCandidatos([]); setBusca(c.nome);
    try {
      const r = await fetch("/api/site/google/atualizar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: c.place_id }),
      });
      const j = await r.json();
      if (!r.ok) { setMsg("Erro: " + (j.erro ?? "falha ao salvar")); return; }
      setPlaceId(c.place_id);
      setResumo(j.resumo);
      setMsg("Avaliações conectadas!");
    } catch { setMsg("Erro de rede."); }
    finally { setSalvando(false); }
  }

  async function atualizar() {
    if (!placeId) return;
    setSalvando(true); setMsg(null);
    try {
      const r = await fetch("/api/site/google/atualizar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId }),
      });
      const j = await r.json();
      if (!r.ok) { setMsg("Erro: " + (j.erro ?? "")); return; }
      setResumo(j.resumo);
      setMsg("Avaliações atualizadas!");
    } catch { setMsg("Erro de rede."); }
    finally { setSalvando(false); }
  }

  async function desconectar() {
    if (!fotografo || !confirm("Desconectar as avaliações do Google?")) return;
    const supabase = createClient();
    await supabase.from("site_config").update({ google_place_id: null, google_rating: null, google_total: null, google_reviews: null }).eq("fotografo_id", fotografo.id);
    setPlaceId(null); setResumo(null); setBusca(""); setMsg("Desconectado.");
  }

  return (
    <div style={{ border: "1px solid var(--color-border-tertiary)", borderRadius: 12, padding: "18px 20px", marginBottom: 26, background: "var(--color-background-secondary)" }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 4 }}>Avaliações do Google</div>
      <p style={{ fontSize: 12.5, color: "var(--color-text-secondary)", margin: "0 0 14px", lineHeight: 1.6 }}>
        Busque seu negócio no Google e conecte — as avaliações aparecem no seu site e nas landing pages, e se
        atualizam sozinhas (novas avaliações entram em algumas horas).
      </p>

      {naoConfig && (
        <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(245,158,11,0.12)", color: "#B45309", fontSize: 12.5, marginBottom: 12 }}>
          A integração do Google ainda não foi configurada no servidor (falta a chave da API). Assim que a chave estiver ativa, a busca funciona aqui.
        </div>
      )}

      {!placeId ? (
        <div style={{ position: "relative" }}>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome do seu negócio no Google (ex.: Fernando Agrela Fotografia)" style={inputStyle} />
          {buscando && <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>Buscando…</div>}
          {candidatos.length > 0 && (
            <div style={{ marginTop: 6, border: "1px solid var(--color-border-secondary)", borderRadius: 8, overflow: "hidden", background: "var(--color-background-primary)" }}>
              {candidatos.map((c) => (
                <button key={c.place_id} onClick={() => selecionar(c)} disabled={salvando}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", border: "none", borderBottom: "1px solid var(--color-border-tertiary)", background: "transparent", cursor: "pointer" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{c.nome}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{c.endereco}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
            {resumo?.rating != null && (
              <span style={{ fontSize: 14, color: "var(--color-text-primary)" }}>
                <strong>{resumo.rating.toFixed(1).replace(".", ",")}</strong> <span style={{ color: "#f5b400" }}>{"★".repeat(Math.round(resumo.rating))}</span>
                {resumo.total != null && <span style={{ color: "var(--color-text-secondary)" }}> · {resumo.total} avaliações</span>}
                <span style={{ color: "var(--color-text-secondary)" }}> · {resumo?.reviews?.length ?? 0} em destaque</span>
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={atualizar} disabled={salvando}
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
              {salvando ? "Atualizando…" : "Atualizar agora"}
            </button>
            <button onClick={desconectar} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #DC2626", background: "transparent", fontSize: 12, color: "#DC2626", cursor: "pointer" }}>
              Desconectar
            </button>
          </div>
        </div>
      )}
      {msg && <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 600, color: msg.startsWith("Erro") ? "#DC2626" : "#059669" }}>{msg}</div>}
    </div>
  );
}
