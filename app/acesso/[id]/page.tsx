"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type GaleriaPublica = {
  id: string;
  titulo: string;
  mensagem: string | null;
  drive_link: string | null;
  expires_at: string | null;
  renewal_fee: number | null;
  fotografos: {
    nome_empresa: string;
    whatsapp: string | null;
    email: string;
  } | null;
  clientes: {
    nome: string;
  } | null;
};

type Estado = "carregando" | "ativo" | "expirado" | "sem_link" | "nao_encontrado";

/**
 * Analisa o link do Google Drive e retorna:
 * - tipo: "file" | "folder" | "unknown"
 * - downloadUrl: URL de download direto (só para arquivos)
 */
function parseDriveLink(url: string): { tipo: "file" | "folder" | "unknown"; downloadUrl: string } {
  // Pasta: /drive/folders/FOLDER_ID
  if (/\/drive\/folders\//.test(url)) {
    return { tipo: "folder", downloadUrl: url };
  }

  // Arquivo view: /file/d/FILE_ID/view  ou  /file/d/FILE_ID/
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    return {
      tipo: "file",
      downloadUrl: `https://drive.usercontent.google.com/download?id=${fileMatch[1]}&export=download&confirm=t`,
    };
  }

  // open?id= ou ?id=  (sem /folders/)
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) {
    return {
      tipo: "file",
      downloadUrl: `https://drive.usercontent.google.com/download?id=${idMatch[1]}&export=download&confirm=t`,
    };
  }

  return { tipo: "unknown", downloadUrl: url };
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

export default function AcessoPage() {
  const { id } = useParams<{ id: string }>();
  const [galeria,   setGaleria]   = useState<GaleriaPublica | null>(null);
  const [estado,    setEstado]    = useState<Estado>("carregando");
  const [baixando,  setBaixando]  = useState(false);
  const [baixado,   setBaixado]   = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("galerias_entrega")
      .select("id, titulo, mensagem, drive_link, expires_at, renewal_fee, fotografos(nome_empresa, whatsapp, email), clientes(nome)")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setEstado("nao_encontrado"); return; }
        const g = data as unknown as GaleriaPublica;
        setGaleria(g);

        if (!g.drive_link) { setEstado("sem_link"); return; }

        if (g.expires_at && new Date(g.expires_at) < new Date()) {
          setEstado("expirado");
        } else {
          setEstado("ativo");
        }
      });
  }, [id]);

  const driveInfo = galeria?.drive_link ? parseDriveLink(galeria.drive_link) : null;

  async function handleDownload() {
    if (!galeria?.drive_link || !driveInfo) return;
    setBaixando(true);

    // Incrementar contador
    await fetch(`/api/entrega/${id}/download`, { method: "POST" }).catch(() => {});

    if (driveInfo.tipo === "file") {
      // Download direto — usa <a download> para forçar o download
      const a = document.createElement("a");
      a.href = driveInfo.downloadUrl;
      a.rel  = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Pasta — abre no Drive (limitação do Google)
      window.open(galeria.drive_link, "_blank", "noopener,noreferrer");
    }

    setBaixando(false);
    setBaixado(true);
  }

  // ── Layout base ──────────────────────────────────────────────────────────────
  const wrapper: React.CSSProperties = {
    minHeight: "100vh",
    background: "#F9FAFB",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 20px",
    fontFamily: "'Inter', system-ui, sans-serif",
  };

  const card: React.CSSProperties = {
    background: "#fff",
    border: "0.5px solid #E5E7EB",
    borderRadius: 20,
    padding: "40px 44px",
    maxWidth: 480,
    width: "100%",
    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
    textAlign: "center",
  };

  // ── Carregando ───────────────────────────────────────────────────────────────
  if (estado === "carregando") {
    return (
      <div style={wrapper}>
        <div style={card}>
          <div style={{ fontSize: 13, color: "#6B7280" }}>Carregando…</div>
        </div>
      </div>
    );
  }

  // ── Não encontrado ───────────────────────────────────────────────────────────
  if (estado === "nao_encontrado") {
    return (
      <div style={wrapper}>
        <div style={card}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🔍</div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 10px" }}>
            Galeria não encontrada
          </h1>
          <p style={{ fontSize: 14, color: "#6B7280", margin: 0, lineHeight: 1.6 }}>
            O link que você acessou é inválido ou foi removido.
          </p>
        </div>
      </div>
    );
  }

  const studio   = galeria!.fotografos?.nome_empresa ?? "Fotógrafo";
  const cliente  = galeria!.clientes?.nome;
  const wppFoto  = galeria!.fotografos?.whatsapp;
  const emailFoto= galeria!.fotografos?.email;
  const fee      = galeria!.renewal_fee;

  // ── Expirado ─────────────────────────────────────────────────────────────────
  if (estado === "expirado") {
    const msgRenovacao = `Olá! Gostaria de renovar o acesso à galeria "${galeria!.titulo}". Poderia me ajudar?`;
    return (
      <div style={wrapper}>
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {studio}
          </span>
        </div>

        <div style={{ ...card, borderTop: "4px solid #EF4444" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⏰</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>
            Acesso expirado
          </h1>
          <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 6px", lineHeight: 1.6 }}>
            <strong style={{ color: "#111827" }}>{galeria!.titulo}</strong>
            {cliente && <span> · {cliente}</span>}
          </p>
          <p style={{ fontSize: 13, color: "#9CA3AF", margin: "0 0 28px" }}>
            Expirou em {galeria!.expires_at ? formatarData(galeria!.expires_at) : "—"}
          </p>

          {fee && fee > 0 && (
            <div style={{ background: "#FEF3C7", border: "0.5px solid #FDE68A", borderRadius: 10, padding: "14px 18px", marginBottom: 24, fontSize: 13, color: "#92400E", lineHeight: 1.6 }}>
              Para renovar o acesso por mais 30 dias, o valor é{" "}
              <strong>R$ {fee.toFixed(2).replace(".", ",")}</strong>.
            </div>
          )}

          <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>
            Entre em contato com o fotógrafo para renovar:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {wppFoto && (
              <a
                href={`https://wa.me/55${wppFoto.replace(/\D/g, "")}?text=${encodeURIComponent(msgRenovacao)}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 20px", borderRadius: 10, background: "#25D366", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                </svg>
                Contatar via WhatsApp
              </a>
            )}
            {emailFoto && (
              <a
                href={`mailto:${emailFoto}?subject=${encodeURIComponent(`Renovação de acesso — ${galeria!.titulo}`)}&body=${encodeURIComponent(msgRenovacao)}`}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 20px", borderRadius: 10, background: "#F3F4F6", color: "#374151", fontSize: 13, fontWeight: 600, textDecoration: "none", border: "0.5px solid #E5E7EB" }}
              >
                Enviar e-mail
              </a>
            )}
          </div>
        </div>

        <p style={{ marginTop: 24, fontSize: 11, color: "#D1D5DB" }}>
          Powered by UseFokio
        </p>
      </div>
    );
  }

  // ── Sem link configurado ─────────────────────────────────────────────────────
  if (estado === "sem_link") {
    return (
      <div style={wrapper}>
        <div style={card}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🔗</div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 10px" }}>
            Link ainda não disponível
          </h1>
          <p style={{ fontSize: 14, color: "#6B7280", margin: 0, lineHeight: 1.6 }}>
            O fotógrafo ainda está preparando o link de download. Tente novamente em breve.
          </p>
        </div>
      </div>
    );
  }

  // ── Ativo ────────────────────────────────────────────────────────────────────
  const diasRestantes = galeria!.expires_at
    ? Math.round((new Date(galeria!.expires_at).getTime() - Date.now()) / 86_400_000)
    : null;

  const urgente = diasRestantes !== null && diasRestantes <= 7;

  return (
    <div style={wrapper}>
      {/* Nome do estúdio */}
      <div style={{ marginBottom: 28, textAlign: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {studio}
        </span>
      </div>

      <div style={{ ...card, borderTop: "4px solid #10B981" }}>

        {/* Ícone */}
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 28 }}>
          📷
        </div>

        {/* Título */}
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 6px", lineHeight: 1.3 }}>
          {galeria!.titulo}
        </h1>
        {cliente && (
          <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 20px" }}>Olá, <strong style={{ color: "#111827" }}>{cliente}</strong>!</p>
        )}

        {/* Mensagem do fotógrafo */}
        {galeria!.mensagem && (
          <div style={{ background: "#F9FAFB", border: "0.5px solid #E5E7EB", borderRadius: 10, padding: "14px 16px", marginBottom: 24, fontSize: 13, color: "#374151", lineHeight: 1.7, textAlign: "left", whiteSpace: "pre-wrap" }}>
            {galeria!.mensagem}
          </div>
        )}

        {/* Prazo */}
        {galeria!.expires_at && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 20, marginBottom: 28,
            background: urgente ? "#FEF3C7" : "#F0FDF4",
            border: `0.5px solid ${urgente ? "#FDE68A" : "#BBF7D0"}`,
            fontSize: 12, fontWeight: 600,
            color: urgente ? "#92400E" : "#065F46",
          }}>
            {urgente ? "⚠️" : "📅"}
            {diasRestantes === 0
              ? "Acesso expira hoje!"
              : diasRestantes === 1
              ? "Acesso expira amanhã"
              : urgente
              ? `Acesso expira em ${diasRestantes} dias`
              : `Disponível até ${formatarData(galeria!.expires_at)}`}
          </div>
        )}

        {/* Botão de download */}
        <button
          onClick={handleDownload}
          disabled={baixando}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            width: "100%", padding: "16px 24px", borderRadius: 12, border: "none",
            background: baixado ? "#059669" : baixando ? "#34D399" : "#10B981",
            color: "#fff", fontSize: 15, fontWeight: 700, cursor: baixando ? "default" : "pointer",
            transition: "background 0.2s",
            boxShadow: "0 4px 16px rgba(16,185,129,0.3)",
          }}
        >
          {baixando ? (
            "Iniciando download…"
          ) : baixado ? (
            <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            {driveInfo?.tipo === "folder" ? "Álbum aberto!" : "Download iniciado!"}</>
          ) : (
            <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Baixar minhas fotos</>
          )}
        </button>

        {/* Instrução extra para pasta do Drive */}
        {baixado && driveInfo?.tipo === "folder" && (
          <div style={{ marginTop: 16, background: "#EFF6FF", border: "0.5px solid #BFDBFE", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#1E40AF", lineHeight: 1.7, textAlign: "left" }}>
            <strong>Como baixar todas as fotos:</strong>
            <ol style={{ margin: "6px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 2 }}>
              <li>Na página do Google Drive que abriu, clique em <strong>"Download tudo"</strong></li>
              <li>Ou selecione as fotos desejadas e clique em <strong>⋮ → Fazer download</strong></li>
            </ol>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#3B82F6" }}>
              As fotos serão baixadas como um arquivo ZIP.
            </p>
          </div>
        )}

        {baixado && driveInfo?.tipo === "file" && (
          <p style={{ fontSize: 12, color: "#6B7280", marginTop: 12 }}>
            O download deve iniciar automaticamente. Se não iniciar,{" "}
            <a href={driveInfo.downloadUrl} style={{ color: "#10B981", fontWeight: 600 }}>clique aqui</a>.
          </p>
        )}
      </div>

      <p style={{ marginTop: 24, fontSize: 11, color: "#D1D5DB" }}>
        Powered by UseFokio
      </p>
    </div>
  );
}
