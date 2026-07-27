"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { IcoMail, IcoWhatsApp } from "@/app/(dashboard)/crm/_components/Icons";
import { EmailModal } from "@/app/(dashboard)/crm/_components/EmailModal";
import { linkWhatsApp } from "@/lib/site/whatsapp";

type ClienteContato = { id: string; nome: string; email: string | null; telefone: string | null; whatsapp: string | null } | null | undefined;

// Botão "Entrar em contato" da listagem de oportunidades: abre um menu com WhatsApp e/ou E-mail,
// conforme o cliente vinculado tenha número/e-mail. Sem cliente ou sem contato → desabilitado.
// O menu é renderizado em portal (a tabela tem overflow:hidden e cortaria um dropdown normal).
export function ContatoOportunidade({ cliente, titulo }: { cliente: ClienteContato; titulo: string }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  const [emailAberto, setEmailAberto] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const zap = (cliente?.whatsapp?.trim() || cliente?.telefone?.trim() || "");
  const mail = (cliente?.email?.trim() || "");
  const temContato = !!(zap || mail);
  const primeiro = (cliente?.nome ?? "").trim().split(/\s+/)[0] || "";

  // Fecha o menu ao clicar fora (ignora cliques no próprio botão e no menu).
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || boxRef.current?.contains(t)) return;
      setMenu(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menu]);

  function abrirMenu() {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ left: Math.max(8, r.right - 180), top: r.bottom + 4 });
    setMenu(true);
  }

  function abrirWhats() {
    const url = linkWhatsApp(zap, primeiro ? `Olá ${primeiro}, tudo bem?` : "Olá, tudo bem?");
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    setMenu(false);
  }

  const itemSt: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 12px",
    fontSize: 13, background: "none", border: "none", cursor: "pointer",
    color: "var(--color-text-primary)", textAlign: "left", borderRadius: 7,
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); if (temContato) abrirMenu(); }}
        disabled={!temContato}
        title={temContato ? "Entrar em contato" : "Sem e-mail/WhatsApp cadastrado no cliente"}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", color: temContato ? "#059669" : "var(--color-text-secondary)", background: "transparent", cursor: temContato ? "pointer" : "default", opacity: temContato ? 1 : 0.4 }}
      >
        {/* balão de conversa */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
        </svg>
      </button>

      {menu && pos && typeof document !== "undefined" && createPortal(
        <div ref={boxRef} onClick={(e) => e.stopPropagation()}
          style={{ position: "fixed", left: pos.left, top: pos.top, width: 180, zIndex: 1000, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: 10, boxShadow: "0 8px 28px rgba(0,0,0,0.18)", padding: 4 }}>
          {zap && (
            <button style={itemSt} onClick={abrirWhats}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-background-secondary)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
              <span style={{ display: "flex", color: "#25D366" }}><IcoWhatsApp /></span> WhatsApp
            </button>
          )}
          {mail && (
            <button style={itemSt} onClick={() => { setMenu(false); setEmailAberto(true); }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-background-secondary)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
              <span style={{ display: "flex", color: "#2563EB" }}><IcoMail /></span> Enviar e-mail
            </button>
          )}
        </div>,
        document.body,
      )}

      {emailAberto && (
        <EmailModal
          para={mail}
          nomeDestinatario={cliente?.nome ?? null}
          assuntoInicial={`Contato — ${titulo}`}
          corpoInicial={`Olá${primeiro ? " " + primeiro : ""},\n\n`}
          onClose={() => setEmailAberto(false)}
        />
      )}
    </>
  );
}
