"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
const DOWNLOAD_LIMIT = 5; // downloads simultâneos máximos

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

    // Incrementar contador de downloads
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
        // Pequeno delay para não sobrecarregar o browser
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    await Promise.all(workers);
    setBaixando(false);
    setSelecionadas(new Set());
  }

  const numSelecionadas = selecionadas.size;

  return (
    <div style={{ marginTop: 32 }}>
      {/* Header da galeria */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>
          📷 Galeria de fotos
          <span style={{ fontSize: 12, fontWeight: 400, color: "#6B7280", marginLeft: 8 }}>{fotos.length} foto{fotos.length !== 1 ? "s" : ""}</span>
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
              style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#2563EB", color: "#fff", fontSize: 12, fontWeight: 600, cursor: baixando ? "default" : "pointer" }}
            >
              {baixando ? `Baixando… ${progresso.feitos}/${progresso.total}` : `Baixar ${numSelecionadas} foto${numSelecionadas !== 1 ? "s" : ""}`}
            </button>
          )}

          <button
            onClick={() => baixarFotos(fotos)}
            disabled={baixando}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#10B981", color: "#fff", fontSize: 12, fontWeight: 600, cursor: baixando ? "default" : "pointer" }}
          >
            {baixando ? `Baixando… ${progresso.feitos}/${progresso.total}` : "Baixar todas"}
          </button>
        </div>
      </div>

      {/* Barra de progresso */}
      {baixando && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ height: 4, background: "#E5E7EB", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", background: "#10B981", borderRadius: 2, width: `${progresso.total > 0 ? (progresso.feitos / progresso.total) * 100 : 0}%`, transition: "width 0.3s" }} />
          </div>
          <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>
            {progresso.feitos} de {progresso.total} fotos baixadas ({DOWNLOAD_LIMIT} por vez)
          </div>
        </div>
      )}

      {/* Grid de fotos */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 6 }}>
        {fotos.map((foto) => {
          const sel = selecionadas.has(foto.id);
          return (
            <div
              key={foto.id}
              style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", cursor: "pointer", border: `2px solid ${sel ? "#2563EB" : "transparent"}`, transition: "border-color 0.15s", background: "#F3F4F6" }}
            >
              <img
                src={foto.url_publica}
                alt={foto.nome_arquivo ?? ""}
                loading="lazy"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                onClick={() => setLightbox(foto)}
              />
              {/* Checkbox */}
              <div
                onClick={(e) => { e.stopPropagation(); toggleSelecao(foto.id); }}
                style={{ position: "absolute", top: 6, left: 6, width: 20, height: 20, borderRadius: 5, background: sel ? "#2563EB" : "rgba(255,255,255,0.85)", border: `2px solid ${sel ? "#2563EB" : "rgba(0,0,0,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}
              >
                {sel && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2 6 5 9 10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              {/* Download individual */}
              <button
                onClick={(e) => { e.stopPropagation(); baixarFotos([foto]); }}
                title="Baixar esta foto"
                style={{ position: "absolute", bottom: 5, right: 5, width: 26, height: 26, borderRadius: 6, background: "rgba(0,0,0,0.55)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}
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
            style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", padding: "10px 20px", borderRadius: 9, background: "#10B981", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
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
  const [galeria,  setGaleria]  = useState<GaleriaPublica | null>(null);
  const [fotos,    setFotos]    = useState<GaleriaEntregaFoto[]>([]);
  const [estado,   setEstado]   = useState<Estado>("carregando");
  const [baixando, setBaixando] = useState(false);
  const [baixado,  setBaixado]  = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("galerias_entrega")
      .select("id, titulo, mensagem, drive_link, expires_at, renewal_fee, fotografos(nome_empresa, whatsapp, logo_url), clientes(nome)")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setEstado("nao_encontrado"); return; }
        const g = data as unknown as GaleriaPublica;
        setGaleria(g);

        const expirou = g.expires_at && new Date(g.expires_at) < new Date();
        if (expirou) { setEstado("expirado"); return; }
        if (!g.drive_link) { setEstado("sem_link"); }
        else { setEstado("ativo"); }
      });

    // Buscar fotos da galeria
    supabase
      .from("galerias_entrega_fotos")
      .select("*")
      .eq("galeria_id", id)
      .order("created_at")
      .then(({ data }) => setFotos((data as GaleriaEntregaFoto[]) ?? []));
  }, [id]);

  const driveInfo = galeria?.drive_link ? parseDriveLink(galeria.drive_link) : null;

  async function handleDownloadDrive() {
    if (!galeria?.drive_link || !driveInfo) return;
    setBaixando(true);
    await fetch(`/api/entrega/${id}/download`, { method: "POST" }).catch(() => {});
    if (driveInfo.tipo === "file") {
      const a = document.createElement("a");
      a.href = driveInfo.downloadUrl; a.rel = "noopener noreferrer";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } else {
      window.open(galeria.drive_link, "_blank", "noopener,noreferrer");
    }
    setBaixando(false); setBaixado(true);
  }

  const wrapper: React.CSSProperties = {
    minHeight: "100vh", background: "#F9FAFB",
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "32px 20px", fontFamily: "'Inter', system-ui, sans-serif",
  };

  if (estado === "carregando") {
    return <div style={wrapper}><div style={{ fontSize: 13, color: "#6B7280" }}>Carregando…</div></div>;
  }

  if (estado === "nao_encontrado") {
    return (
      <div style={wrapper}>
        <div style={{ background: "#fff", border: "0.5px solid #E5E7EB", borderRadius: 20, padding: "40px 44px", maxWidth: 480, width: "100%", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
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

  if (estado === "expirado") {
    const msgRenovacao = `Olá! Gostaria de renovar o acesso à galeria "${galeria!.titulo}". Poderia me ajudar?`;
    return (
      <div style={wrapper}>
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          {logoUrl
            ? <img src={logoUrl} alt={studio} style={{ maxHeight: 48, maxWidth: 180, objectFit: "contain" }} />
            : <span style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" }}>{studio}</span>
          }
        </div>
        <div style={{ background: "#fff", border: "0.5px solid #E5E7EB", borderTop: "4px solid #EF4444", borderRadius: 20, padding: "40px 44px", maxWidth: 480, width: "100%", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⏰</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>Acesso expirado</h1>
          <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 6px", lineHeight: 1.6 }}>
            <strong style={{ color: "#111827" }}>{galeria!.titulo}</strong>
            {cliente && <span> · {cliente}</span>}
          </p>
          <p style={{ fontSize: 13, color: "#9CA3AF", margin: "0 0 28px" }}>
            Expirou em {galeria!.expires_at ? formatarData(galeria!.expires_at) : "—"}
          </p>
          {fee && fee > 0 && (
            <div style={{ background: "#FEF3C7", border: "0.5px solid #FDE68A", borderRadius: 10, padding: "14px 18px", marginBottom: 24, fontSize: 13, color: "#92400E", lineHeight: 1.6 }}>
              Para renovar o acesso por mais 30 dias, o valor é <strong>R$ {fee.toFixed(2).replace(".", ",")}</strong>.
            </div>
          )}
          <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>Entre em contato com o fotógrafo para renovar:</p>
          {wppFoto && (
            <a href={`https://wa.me/55${wppFoto.replace(/\D/g, "")}?text=${encodeURIComponent(msgRenovacao)}`} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 20px", borderRadius: 10, background: "#25D366", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
              Contatar via WhatsApp
            </a>
          )}
        </div>
        <p style={{ marginTop: 24, fontSize: 11, color: "#D1D5DB" }}>Powered by UseFokio</p>
      </div>
    );
  }

  const diasRestantes = galeria!.expires_at
    ? Math.round((new Date(galeria!.expires_at).getTime() - Date.now()) / 86_400_000)
    : null;
  const urgente = diasRestantes !== null && diasRestantes <= 7;
  const temDrive = !!galeria!.drive_link;
  const temFotos = fotos.length > 0;

  return (
    <div style={{ ...wrapper, justifyContent: "flex-start", paddingTop: 40 }}>
      {/* Logo / Nome estúdio */}
      <div style={{ marginBottom: 28, textAlign: "center" }}>
        {logoUrl
          ? <img src={logoUrl} alt={studio} style={{ maxHeight: 56, maxWidth: 200, objectFit: "contain" }} />
          : <span style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" }}>{studio}</span>
        }
      </div>

      <div style={{ background: "#fff", border: "0.5px solid #E5E7EB", borderTop: "4px solid #10B981", borderRadius: 20, padding: "40px 44px", maxWidth: temFotos ? 900 : 480, width: "100%", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>

        {/* Ícone + título */}
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 28 }}>📷</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 6px", lineHeight: 1.3 }}>{galeria!.titulo}</h1>
          {cliente && <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 20px" }}>Olá, <strong style={{ color: "#111827" }}>{cliente}</strong>!</p>}
        </div>

        {/* Mensagem */}
        {galeria!.mensagem && (
          <div style={{ background: "#F9FAFB", border: "0.5px solid #E5E7EB", borderRadius: 10, padding: "14px 16px", marginBottom: 24, fontSize: 13, color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {galeria!.mensagem.replace(/\{nome\}/gi, cliente ?? "cliente")}
          </div>
        )}

        {/* Prazo */}
        {galeria!.expires_at && (
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, background: urgente ? "#FEF3C7" : "#F0FDF4", border: `0.5px solid ${urgente ? "#FDE68A" : "#BBF7D0"}`, fontSize: 12, fontWeight: 600, color: urgente ? "#92400E" : "#065F46" }}>
              {urgente ? "⚠️" : "📅"}
              {diasRestantes === 0 ? "Acesso expira hoje!" : diasRestantes === 1 ? "Expira amanhã" : urgente ? `Expira em ${diasRestantes} dias` : `Disponível até ${formatarData(galeria!.expires_at)}`}
            </span>
          </div>
        )}

        {/* Botão Drive (se tiver) */}
        {temDrive && (
          <div style={{ marginBottom: temFotos ? 32 : 0 }}>
            {temFotos && (
              <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10, textAlign: "center" }}>
                📁 Download do arquivo completo (Google Drive)
              </div>
            )}
            <button
              onClick={handleDownloadDrive}
              disabled={baixando}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "16px 24px", borderRadius: 12, border: "none", background: baixado ? "#059669" : baixando ? "#34D399" : "#10B981", color: "#fff", fontSize: 15, fontWeight: 700, cursor: baixando ? "default" : "pointer", transition: "background 0.2s", boxShadow: "0 4px 16px rgba(16,185,129,0.3)" }}
            >
              {baixando ? "Iniciando download…" : baixado
                ? <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> {driveInfo?.tipo === "folder" ? "Álbum aberto!" : "Download iniciado!"}</>
                : <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Baixar arquivo completo</>
              }
            </button>
            {baixado && driveInfo?.tipo === "folder" && (
              <div style={{ marginTop: 14, background: "#EFF6FF", border: "0.5px solid #BFDBFE", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#1E40AF", lineHeight: 1.7 }}>
                <strong>Como baixar todas as fotos:</strong>
                <ol style={{ margin: "6px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 2 }}>
                  <li>Na página do Google Drive que abriu, clique em <strong>"Download tudo"</strong></li>
                  <li>Ou selecione as fotos e clique em <strong>⋮ → Fazer download</strong></li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Galeria de fotos inline */}
        {temFotos && <GaleriaFotos fotos={fotos} galeriaId={id} />}

        {/* Estado sem link e sem fotos */}
        {!temDrive && !temFotos && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔗</div>
            <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>O fotógrafo ainda está preparando o link de download. Tente novamente em breve.</p>
          </div>
        )}
      </div>

      <p style={{ marginTop: 24, fontSize: 11, color: "#D1D5DB" }}>Powered by UseFokio</p>
    </div>
  );
}
