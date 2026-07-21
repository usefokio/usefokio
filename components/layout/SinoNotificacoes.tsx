"use client";

// Sino de notificações do header. MECANISMO apenas: lê a tabela `notificacoes` do fotógrafo,
// mostra o nº de não-lidas, permite abrir (marca lida + navega) e "marcar todas como lidas".
// Os GERADORES de notificação (galerias expirando etc.) serão definidos depois.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { Notificacao } from "@/lib/supabase/types";

function formatarQuando(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  return mesmoDia
    ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function SinoNotificacoes() {
  const router = useRouter();
  const { fotografo } = useFotografo();
  const [aberto, setAberto] = useState(false);
  const [notifs, setNotifs] = useState<Notificacao[]>([]);
  const [acaoEmCurso, setAcaoEmCurso] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fotografo) return;
    createClient()
      .from("notificacoes")
      .select("*")
      .eq("fotografo_id", fotografo.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setNotifs((data as Notificacao[]) ?? []));
  }, [fotografo]);

  // Fecha ao clicar fora
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const naoLidas = notifs.filter((n) => !n.lida).length;

  async function abrirNotif(n: Notificacao) {
    if (!n.lida) {
      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, lida: true } : x)));
      await createClient().from("notificacoes").update({ lida: true, lida_em: new Date().toISOString() }).eq("id", n.id);
    }
    setAberto(false);
    if (n.href) router.push(n.href);
  }

  async function marcarTodas() {
    if (!fotografo || naoLidas === 0) return;
    setNotifs((prev) => prev.map((x) => ({ ...x, lida: true })));
    await createClient().from("notificacoes").update({ lida: true, lida_em: new Date().toISOString() }).eq("fotografo_id", fotografo.id).eq("lida", false);
  }

  // Ação embutida "Enviar ao funil": reinicia o ciclo de campanha da galeria e marca a notificação lida.
  async function enviarAoFunil(n: Notificacao) {
    if (!n.acao_ref || acaoEmCurso) return;
    setAcaoEmCurso(n.id);
    try {
      const res = await fetch(`/api/campanha/galeria/${n.acao_ref}/reset`, { method: "POST" });
      if (!res.ok) throw new Error();
      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, lida: true } : x)));
      await createClient().from("notificacoes").update({ lida: true, lida_em: new Date().toISOString() }).eq("id", n.id);
    } catch {
      alert("Não foi possível enviar ao funil. Tente novamente.");
    } finally {
      setAcaoEmCurso(null);
    }
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setAberto((o) => !o)}
        title="Notificações"
        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", position: "relative", padding: 6, borderRadius: 8, color: "var(--color-text-secondary)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-background-secondary)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {naoLidas > 0 && (
          <span style={{ position: "absolute", top: 2, right: 2, minWidth: 15, height: 15, padding: "0 3px", borderRadius: 8, background: "#EF4444", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0, width: 300,
            background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 100, overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>Notificações</span>
            {naoLidas > 0 && (
              <button onClick={marcarTodas} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 11, color: "#2563EB", fontWeight: 600 }}>
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {notifs.length === 0 ? (
              <div style={{ padding: "28px 16px", textAlign: "center", fontSize: 12, color: "var(--color-text-secondary)" }}>Nenhuma notificação</div>
            ) : (
              notifs.map((n) => (
                <div
                  key={n.id}
                  style={{ borderBottom: "0.5px solid var(--color-border-tertiary)", background: n.lida ? "transparent" : "rgba(37,99,235,0.05)" }}
                >
                  <button
                    onClick={() => abrirNotif(n)}
                    style={{
                      display: "block", width: "100%", textAlign: "left", border: "none", cursor: "pointer",
                      padding: "10px 14px 8px", background: "transparent",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {!n.lida && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2563EB", flexShrink: 0 }} />}
                      <span style={{ fontSize: 13, fontWeight: n.lida ? 500 : 700, color: "var(--color-text-primary)", flex: 1 }}>{n.titulo}</span>
                      <span style={{ fontSize: 10, color: "var(--color-text-secondary)", flexShrink: 0 }}>{formatarQuando(n.created_at)}</span>
                    </div>
                    {n.corpo && <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 3, lineHeight: 1.4 }}>{n.corpo}</div>}
                  </button>
                  {n.acao_tipo === "enviar_funil" && n.acao_ref && (
                    <div style={{ padding: "0 14px 10px" }}>
                      <button
                        onClick={() => enviarAoFunil(n)}
                        disabled={acaoEmCurso === n.id}
                        style={{
                          border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)",
                          color: "#2563EB", cursor: acaoEmCurso === n.id ? "default" : "pointer", fontSize: 11, fontWeight: 700,
                          padding: "5px 12px", borderRadius: 7, opacity: acaoEmCurso === n.id ? 0.6 : 1,
                        }}
                      >
                        {acaoEmCurso === n.id ? "Enviando…" : "📢 Enviar ao funil"}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
