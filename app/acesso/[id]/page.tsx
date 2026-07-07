"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import type { GaleriaEntregaFoto } from "@/lib/supabase/types";

type GaleriaPublica = {
  id: string;
  titulo: string;
  mensagem: string | null;
  drive_link: string | null;
  expires_at: string | null;
  renewal_fee: number | null;
  fotografos: { nome_empresa: string; whatsapp: string | null; logo_url: string | null } | null;
  clientes:   { nome: string } | null;
};

type Estado = "carregando" | "ativo" | "expirado" | "sem_link" | "nao_encontrado";

function parseDriveLink(url: string): { tipo: "file" | "folder" | "unknown"; downloadUrl: string } {
  if (/\/drive\/folders\//.test(url)) return { tipo: "folder", downloadUrl: url };
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return { tipo: "file", downloadUrl: `https://drive.usercontent.google.com/download?id=${fileMatch[1]}&export=download&confirm=t` };
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return { tipo: "file", downloadUrl: `https://drive.usercontent.google.com/download?id=${idMatch[1]}&export=download&confirm=t` };
  return { tipo: "unknown", downloadUrl: url };
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

// ── Galeria de fotos ──────────────────────────────────────────────────────────
const DOWNLOAD_LIMIT = 5;

function GaleriaFotos({ fotos, galeriaId }: { fotos: GaleriaEntregaFoto[]; galeriaId: string }) {
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [baixando,     setBaixando]     = useState(false);
  const [progresso,    setProgresso]    = useState({ feitos: 0, total: 0 });
  const [lightbox,     setLightbox]     = useState<GaleriaEntregaFoto | null>(null);

  function toggleSelecao(id: string) {
    setSelecionadas((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function selecionarTodas() {
    setSelecionadas(selecionadas.size === fotos.length ? new Set() : new Set(fotos.map((f) => f.id)));
  }

  async function baixarFotos(lista: GaleriaEntregaFoto[]) {
    if (baixando || lista.length === 0) return;
    setBaixando(true);
    setProgresso({ feitos: 0, total: lista.length });

    await fetch(`/api/entrega/${galeriaId}/download`, { method: "POST" }).catch(() => {});

    let feitos = 0;
    const queue = [...lista];
    const workers: Promise<void>[] = [];

    for (let i = 0; i < Math.min(DOWNLOAD_LIMIT, queue.length); i++) {
      workers.push(processarFila());
    }

    async function processarFila() {
      while (queue.length > 0) {
        const foto = queue.shift()!;
        try {
          const resp = await fetch(foto.url_publica);
          const blob = await resp.blob();
          const a    = document.createElement("a");
          a.href     = URL.createObjectURL(blob);
          a.download = foto.nome_arquivo ?? `foto-${foto.id}.jpg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(a.href);
        } catch { /* silencioso */ }
        feitos++;
        setProgresso({ feitos, total: lista.length });
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    await Promise.all(workers);
    setBaixando(false);
    setSelecionadas(new Set());
  }

  const numSelecionadas = selecionadas.size;

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
          {fotos.length} foto{fotos.length !== 1 ? "s" : ""}
          <span style={{ fontSize: 12, fontWeight: 400, color: "#6B7280", marginLeft: 6 }}>
            {numSelecionadas > 0 ? `· ${numSelecionadas} selecionada${numSelecionadas !== 1 ? "s" : ""}` : "· clique para selecionar"}
          </span>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={selecionarTodas}
            style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid #E5E7EB", background: "#F9FAFB", fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer" }}
          >
            {numSelecionadas === fotos.length ? "Desmarcar todas" : "Selecionar todas"}
          </button>

          {numSelecionadas > 0 && (
            <button
              onClick={() => baixarFotos(fotos.filter((f) => selecionadas.has(f.id)))}
              disabled={baixando}
              style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#2563EB", color: "#fff", fontSize: 12, fontWeight: 700, cursor: baixando ? "default" : "pointer" }}
            >
              {baixando ? `Baixando… ${progresso.feitos}/${progresso.total}` : `⬇ Baixar selecionadas (${numSelecionadas})`}
            </button>
          )}

          <button
            onClick={() => baixarFotos(fotos)}
            disabled={baixando}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#10B981", color: "#fff", fontSize: 12, fontWeight: 700, cursor: baixando ? "default" : "pointer" }}
          >
            {baixando ? `Baixando… ${progresso.feitos}/${progresso.total}` : "⬇ Baixar todas"}
          </button>
        </div>
      </div>

      {/* Progresso */}
      {baixando && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ height: 4, background: "#E5E7EB", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", background: "#10B981", borderRadius: 2, width: `${progresso.total > 0 ? (progresso.feitos / progresso.total) * 100 : 0}%`, transition: "width 0.3s" }} />
          </div>
          <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>
            {progresso.feitos} de {progresso.total} fotos baixadas
          </div>
        </div>
      )}

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 6 }}>
        {fotos.map((foto) => {
          const sel = selecionadas.has(foto.id);
          return (
            <div
              key={foto.id}
              onClick={() => toggleSelecao(foto.id)}
              style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", cursor: "pointer", border: `2.5px solid ${sel ? "#2563EB" : "transparent"}`, transition: "border-color 0.15s", background: "#F3F4F6" }}
            >
              <img
                src={foto.url_publica}
                alt={foto.nome_arquivo ?? ""}
                loading="lazy"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "opacity 0.15s", opacity: sel ? 0.82 : 1 }}
              />
              {/* Círculo de seleção — aparece no canto superior esquerdo ao selecionar */}
              <div
                style={{ position: "absolute", top: 7, left: 7, width: 24, height: 24, borderRadius: "50%", background: sel ? "#2563EB" : "rgba(255,255,255,0.75)", border: `2px solid ${sel ? "#2563EB" : "rgba(0,0,0,0.25)"}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", boxShadow: sel ? "0 0 0 2px rgba(37,99,235,0.25)" : "none" }}
              >
                {sel && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><polyline points="2 6 5 9 10 3" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setLightbox(foto); }}
                title="Ver foto"
                style={{ position: "absolute", bottom: 5, left: 5, width: 26, height: 26, borderRadius: 6, background: "rgba(0,0,0,0.45)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); baixarFotos([foto]); }}
                title="Baixar esta foto"
                style={{ position: "absolute", bottom: 5, right: 5, width: 26, height: 26, borderRadius: 6, background: "rgba(0,0,0,0.45)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.93)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox.url_publica}
            alt={lightbox.nome_arquivo ?? ""}
            style={{ maxWidth: "90vw", maxHeight: "88vh", objectFit: "contain", borderRadius: 8 }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", width: 36, height: 36, borderRadius: 8, fontSize: 18, cursor: "pointer" }}
          >✕</button>
          <button
            onClick={(e) => { e.stopPropagation(); baixarFotos([lightbox]); }}
            style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", padding: "10px 20px", borderRadius: 9, background: "#10B981", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Baixar esta foto
          </button>
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function AcessoPage() {
  const { id } = useParams<{ id: string }>();
  const [galeria,        setGaleria]        = useState<GaleriaPublica | null>(null);
  const [fotos,          setFotos]          = useState<GaleriaEntregaFoto[]>([]);
  const [estado,         setEstado]         = useState<Estado>("carregando");
  const [fotosCarregando,setFotosCarregando]= useState(true);
  const [baixandoDrive,  setBaixandoDrive]  = useState(false);
  const [baixadoDrive,   setBaixadoDrive]   = useState(false);
  const [galeriaAberta,  setGaleriaAberta]  = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("galerias_entrega")
      .select("id, titulo, mensagem, drive_link, expires_at, renewal_fee, fotografos(nome_empresa, whatsapp, logo_url), clientes(nome)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) { console.error("[acesso] galeria error:", error); setEstado("nao_encontrado"); return; }
        if (!data) { setEstado("nao_encontrado"); return; }
        const g = data as unknown as GaleriaPublica;
        setGaleria(g);
        const expirou = g.expires_at && new Date(g.expires_at) < new Date();
        if (expirou) { setEstado("expirado"); return; }
        setEstado("ativo");
      });

    fetchAllRows<GaleriaEntregaFoto>(
      (sb, from, to) => sb.from("galerias_entrega_fotos").select("*").eq("galeria_id", id).order("ordem").order("created_at").range(from, to),
      supabase,
    ).then((data) => {
      setFotos(data);
      setFotosCarregando(false);
    });
  }, [id]);

  const driveInfo = galeria?.drive_link ? parseDriveLink(galeria.drive_link) : null;

  async function handleDownloadDrive() {
    if (!galeria?.drive_link || !driveInfo) return;
    setBaixandoDrive(true);
    await fetch(`/api/entrega/${id}/download`, { method: "POST" }).catch(() => {});
    if (driveInfo.tipo === "file") {
      const a = document.createElement("a");
      a.href = driveInfo.downloadUrl; a.rel = "noopener noreferrer";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } else {
      window.open(galeria.drive_link, "_blank", "noopener,noreferrer");
    }
    setBaixandoDrive(false);
    setBaixadoDrive(true);
  }

  const base: React.CSSProperties = {
    minHeight: "calc(100vh - var(--dev-banner-h, 0px))", background: "#F3F4F6",
    display: "flex", flexDirection: "column", alignItems: "center",
    fontFamily: "'Inter', system-ui, sans-serif",
  };

  if (estado === "carregando") {
    return <div style={{ ...base, justifyContent: "center" }}><div style={{ fontSize: 13, color: "#6B7280" }}>Carregando…</div></div>;
  }

  if (estado === "nao_encontrado") {
    return (
      <div style={{ ...base, justifyContent: "center", padding: "32px 20px" }}>
        <div style={{ background: "#fff", border: "0.5px solid #E5E7EB", borderRadius: 20, padding: "40px 44px", maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🔍</div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 10px" }}>Galeria não encontrada</h1>
          <p style={{ fontSize: 14, color: "#6B7280", margin: 0, lineHeight: 1.6 }}>O link que você acessou é inválido ou foi removido.</p>
        </div>
      </div>
    );
  }

  const studio    = galeria!.fotografos?.nome_empresa ?? "Fotógrafo";
  const logoUrl   = galeria!.fotografos?.logo_url;
  const cliente   = galeria!.clientes?.nome;
  const wppFoto   = galeria!.fotografos?.whatsapp;
  const fee       = galeria!.renewal_fee;
  const capaUrl   = fotos[0]?.url_publica ?? null;

  if (estado === "expirado") {
    const msgRenovacao = `Olá! Gostaria de renovar o acesso à galeria "${galeria!.titulo}". Poderia me ajudar?`;
    return (
      <div style={{ ...base, justifyContent: "flex-start" }}>
        {/* Capa desfocada se houver foto */}
        {capaUrl && (
          <div style={{ width: "100%", height: 220, position: "relative", overflow: "hidden", flexShrink: 0 }}>
            <img src={capaUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(8px) brightness(0.4)", transform: "scale(1.05)" }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {logoUrl
                ? <img src={logoUrl} alt={studio} style={{ maxHeight: 52, maxWidth: 200, objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.9 }} />
                : <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.12em", textTransform: "uppercase" }}>{studio}</span>
              }
            </div>
          </div>
        )}

        <div style={{ padding: "32px 20px", width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", alignItems: "center" }}>
          {!capaUrl && (
            <div style={{ marginBottom: 20, textAlign: "center" }}>
              {logoUrl
                ? <img src={logoUrl} alt={studio} style={{ maxHeight: 44, maxWidth: 180, objectFit: "contain" }} />
                : <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" }}>{studio}</span>
              }
            </div>
          )}

          <div style={{ background: "#fff", border: "0.5px solid #E5E7EB", borderTop: "4px solid #EF4444", borderRadius: 20, padding: "36px 40px", width: "100%", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>⏰</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>Acesso expirado</h1>
            <p style={{ fontSize: 14, color: "#374151", margin: "0 0 4px", fontWeight: 600 }}>{galeria!.titulo}</p>
            {cliente && <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 4px" }}>Para: {cliente}</p>}
            <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 24px" }}>
              Expirou em {galeria!.expires_at ? formatarData(galeria!.expires_at) : "—"}
            </p>
            {fee && fee > 0 && (
              <div style={{ background: "#FEF3C7", border: "0.5px solid #FDE68A", borderRadius: 10, padding: "14px 18px", marginBottom: 20, fontSize: 13, color: "#92400E", lineHeight: 1.6 }}>
                Para renovar o acesso por mais 30 dias, o valor é <strong>R$ {fee.toFixed(2).replace(".", ",")}</strong>.
              </div>
            )}
            <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 14 }}>Entre em contato com o fotógrafo para renovar o acesso:</p>
            {wppFoto && (
              <a href={`https://wa.me/55${wppFoto.replace(/\D/g, "")}?text=${encodeURIComponent(msgRenovacao)}`} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 20px", borderRadius: 10, background: "#25D366", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                Contatar via WhatsApp
              </a>
            )}
          </div>
        </div>
        <p style={{ marginBottom: 24, fontSize: 11, color: "#D1D5DB" }}>Powered by UseFokio</p>
      </div>
    );
  }

  const diasRestantes = galeria!.expires_at
    ? Math.round((new Date(galeria!.expires_at).getTime() - Date.now()) / 86_400_000)
    : null;
  const urgente   = diasRestantes !== null && diasRestantes <= 7;
  const temDrive  = !!galeria!.drive_link;
  const temFotos  = fotos.length > 0;
  const ambos     = temDrive && temFotos;

  return (
    <div style={{ ...base, justifyContent: "flex-start" }}>

      {/* ── Capa ── */}
      {capaUrl ? (
        <div style={{ width: "100%", height: 280, position: "relative", overflow: "hidden", flexShrink: 0 }}>
          <img src={capaUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.45)" }} />
          {/* Logo sobre a capa */}
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            {logoUrl && (
              <img src={logoUrl} alt={studio} style={{ maxHeight: 52, maxWidth: 200, objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.95 }} />
            )}
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#fff", textAlign: "center", letterSpacing: "-0.02em", textShadow: "0 2px 12px rgba(0,0,0,0.4)", padding: "0 24px" }}>
              {galeria!.titulo}
            </h1>
            {cliente && (
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>
                Para {cliente}
              </span>
            )}
          </div>
        </div>
      ) : (
        /* Sem capa: header simples */
        <div style={{ width: "100%", background: "#1F2937", padding: "32px 24px 28px", textAlign: "center" }}>
          {logoUrl && (
            <img src={logoUrl} alt={studio} style={{ maxHeight: 44, maxWidth: 180, objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.9, marginBottom: 16 }} />
          )}
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>{galeria!.titulo}</h1>
          {cliente && <p style={{ margin: "8px 0 0", fontSize: 14, color: "rgba(255,255,255,0.65)" }}>Para {cliente}</p>}
          {!logoUrl && <p style={{ margin: "16px 0 0", fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{studio}</p>}
        </div>
      )}

      {/* ── Conteúdo principal ── */}
      <div style={{ width: "100%", maxWidth: 640, padding: "28px 20px 40px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Prazo */}
        {galeria!.expires_at && (
          <div style={{ textAlign: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, background: urgente ? "#FEF3C7" : "#F0FDF4", border: `0.5px solid ${urgente ? "#FDE68A" : "#BBF7D0"}`, fontSize: 12, fontWeight: 600, color: urgente ? "#92400E" : "#065F46" }}>
              {urgente ? "⚠️" : "📅"}
              {diasRestantes === 0
                ? "Acesso expira hoje!"
                : diasRestantes === 1
                  ? "Expira amanhã"
                  : urgente
                    ? `Expira em ${diasRestantes} dias`
                    : `Disponível até ${formatarData(galeria!.expires_at)}`}
            </span>
          </div>
        )}

        {/* Mensagem do fotógrafo */}
        {galeria!.mensagem && (
          <div style={{ background: "#fff", border: "0.5px solid #E5E7EB", borderRadius: 14, padding: "18px 20px", fontSize: 14, color: "#374151", lineHeight: 1.75, whiteSpace: "pre-wrap", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            {galeria!.mensagem.replace(/\{nome\}/gi, cliente ?? "cliente")}
          </div>
        )}

        {/* ── Seção: Drive ── */}
        {temDrive && (
          <div style={{ background: "#fff", border: "0.5px solid #E5E7EB", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ padding: "18px 22px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>📁</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
                    {driveInfo?.tipo === "folder" ? "Álbum no Google Drive" : "Arquivo para download"}
                  </div>
                  <div style={{ fontSize: 12, color: "#6B7280", marginTop: 1 }}>
                    {driveInfo?.tipo === "folder"
                      ? "Todas as fotos em alta resolução em uma pasta compartilhada"
                      : "Arquivo único compactado com todas as fotos em alta qualidade"}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: "14px 22px 20px" }}>
              <button
                onClick={handleDownloadDrive}
                disabled={baixandoDrive}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "14px 20px", borderRadius: 12, border: "none", background: baixadoDrive ? "#059669" : baixandoDrive ? "#34D399" : "#2563EB", color: "#fff", fontSize: 14, fontWeight: 700, cursor: baixandoDrive ? "default" : "pointer", transition: "background 0.2s", boxShadow: "0 4px 12px rgba(37,99,235,0.25)" }}
              >
                {baixandoDrive
                  ? "Aguarde…"
                  : baixadoDrive
                    ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{driveInfo?.tipo === "folder" ? "Pasta aberta no Drive!" : "Download iniciado!"}</>
                    : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>{driveInfo?.tipo === "folder" ? "Abrir pasta no Google Drive" : "Baixar arquivo"}</>
                }
              </button>
              {baixadoDrive && driveInfo?.tipo === "folder" && (
                <div style={{ marginTop: 12, background: "#EFF6FF", border: "0.5px solid #BFDBFE", borderRadius: 10, padding: "12px 16px", fontSize: 12, color: "#1E40AF", lineHeight: 1.7 }}>
                  <strong>Como baixar todas as fotos da pasta:</strong>
                  <ol style={{ margin: "6px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 2 }}>
                    <li>Na página do Google Drive que abriu, clique em <strong>"Download tudo"</strong></li>
                    <li>Ou selecione as fotos e clique em <strong>⋮ → Fazer download</strong></li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading skeleton enquanto fotos carregam */}
        {fotosCarregando && !temDrive && (
          <div style={{ background: "#fff", border: "0.5px solid #E5E7EB", borderRadius: 16, padding: "18px 22px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#F3F4F6", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 14, width: 120, background: "#F3F4F6", borderRadius: 4, marginBottom: 6 }} />
              <div style={{ height: 11, width: 200, background: "#F3F4F6", borderRadius: 4 }} />
            </div>
          </div>
        )}

        {/* ── Seção: Galeria online ── */}
        {temFotos && (
          <div style={{ background: "#fff", border: "0.5px solid #E5E7EB", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            {/* Header clicável */}
            <button
              onClick={() => setGaleriaAberta((v) => !v)}
              style={{ width: "100%", padding: "18px 22px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🖼</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Galeria online</div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 1 }}>
                  {fotos.length} foto{fotos.length !== 1 ? "s" : ""} — visualize, selecione e baixe individualmente
                </div>
              </div>
              {/* Miniaturas */}
              <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                {fotos.slice(0, 3).map((f) => (
                  <img key={f.id} src={f.url_publica} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6, border: "1.5px solid #fff" }} />
                ))}
              </div>
              <svg
                width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ flexShrink: 0, transform: galeriaAberta ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {/* Expandido: botão de abrir + grid */}
            {!galeriaAberta && (
              <div style={{ padding: "0 22px 20px" }}>
                <button
                  onClick={() => setGaleriaAberta(true)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "12px 20px", borderRadius: 12, border: "1.5px solid #10B981", background: "#F0FDF4", color: "#065F46", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  Ver galeria de fotos
                  {ambos && <span style={{ fontSize: 11, background: "#D1FAE5", color: "#065F46", padding: "2px 7px", borderRadius: 20, fontWeight: 600 }}>download individual</span>}
                </button>
              </div>
            )}

            {galeriaAberta && (
              <div style={{ padding: "0 16px 20px", borderTop: "0.5px solid #F3F4F6" }}>
                <div style={{ paddingTop: 16 }}>
                  <GaleriaFotos fotos={fotos} galeriaId={id} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Estado sem nada — só mostra após fotos carregarem */}
        {!temDrive && !temFotos && !fotosCarregando && (
          <div style={{ background: "#fff", border: "0.5px solid #E5E7EB", borderRadius: 16, padding: "40px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📷</div>
            <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.7, margin: 0 }}>
              O fotógrafo ainda está preparando suas fotos.<br/>
              Tente novamente em breve ou entre em contato.
            </p>
            {wppFoto && (
              <a href={`https://wa.me/55${wppFoto.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 16, padding: "10px 18px", borderRadius: 10, background: "#25D366", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                Falar com o fotógrafo
              </a>
            )}
          </div>
        )}
      </div>

      <p style={{ marginBottom: 24, fontSize: 11, color: "#9CA3AF" }}>Powered by UseFokio</p>
    </div>
  );
}
