"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANOS } from "@/lib/planos";

const MOCK_PREVIEW_COLORS = [
  "#c9b99a","#9ab3c9","#b99ac9","#9ac9b9","#c99a9a","#aac99a",
  "#c9aab3","#9abac9","#c9b39a","#a9c99a","#c99ab9","#9ac9c9",
];
const SELECTED_INDICES = [0, 2, 4, 5, 8, 11];

type Section = "home" | "features" | "plans" | "blog";

export default function LandingPage() {
  const [nav, setNav] = useState<Section>("home");

  return (
    <div style={{ fontFamily: "system-ui,sans-serif", color: "#111", background: "#fff", minHeight: "100vh" }}>
      {/* Banner beta */}
      <div style={{
        background: "rgba(245,158,11,0.1)", borderBottom: "1px solid rgba(245,158,11,0.3)",
        padding: "8px 24px", textAlign: "center",
        fontSize: 13, color: "#92400E", fontWeight: 500,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        <span>🧪</span>
        <span>Sistema em <strong>fase de testes beta</strong> — acesso mediante aprovação. Cadastre-se e aguarde liberação.</span>
      </div>

      {/* Navbar */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", borderBottom: "1px solid #f0f0f0", padding: "0 32px", display: "flex", alignItems: "center", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", marginRight: 36 }}>
          <img src="/usefokio-logo.svg" alt="UseFokio" style={{ height: 26, width: "auto", display: "block" }} />
        </div>
        <div style={{ display: "flex", gap: 2, flex: 1 }}>
          {(["home","features","plans","blog"] as const).map((id) => (
            <button key={id} onClick={() => setNav(id)} style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: nav === id ? "#f4f4f5" : "transparent", color: nav === id ? "#111" : "#555", fontSize: 13, fontWeight: nav === id ? 500 : 400, cursor: "pointer" }}>
              {({ home: "Início", features: "Funcionalidades", plans: "Planos", blog: "Blog" })[id]}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/login" style={{ padding: "7px 14px", borderRadius: 7, border: "none", background: "transparent", color: "#555", fontSize: 13, textDecoration: "none" }}>Entrar</Link>
          <Link href="/cadastro" style={{ padding: "7px 16px", borderRadius: 7, background: "#111", color: "#fff", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>Solicitar acesso beta</Link>
        </div>
      </nav>

      {/* ── HOME ── */}
      {nav === "home" && (
        <>
          {/* Hero */}
          <section style={{ textAlign: "center", padding: "88px 32px 72px", maxWidth: 720, margin: "0 auto" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 20, padding: "3px 13px", fontSize: 12, color: "#15803d", fontWeight: 500, marginBottom: 24 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
              Galeria de entrega HD disponível
            </div>
            <h1 style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.04em", margin: "0 0 22px", color: "#0a0a0a" }}>
              A galeria de seleção<br /><span style={{ color: "#2563EB" }}>que seus clientes vão amar</span>
            </h1>
            <p style={{ fontSize: 17, color: "#555", lineHeight: 1.7, margin: "0 auto 36px", maxWidth: 500 }}>
              Publique, deixe o cliente selecionar online e entregue com qualidade profissional. Sem WhatsApp, sem planilha.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <Link href="/cadastro" style={{ padding: "12px 28px", borderRadius: 9, background: "#2563EB", color: "#fff", fontSize: 15, fontWeight: 600, textDecoration: "none" }}>Solicitar acesso beta</Link>
              <button onClick={() => setNav("features")} style={{ padding: "12px 28px", borderRadius: 9, background: "transparent", color: "#374151", border: "1px solid #d1d5db", fontSize: 15, cursor: "pointer" }}>Ver como funciona</button>
            </div>
            <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 14 }}>Fase beta — acesso gratuito, liberado manualmente.</p>
          </section>

          {/* UI Preview */}
          <section style={{ maxWidth: 860, margin: "0 auto 88px", padding: "0 32px" }}>
            <div style={{ background: "#f8f9fa", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", boxShadow: "0 16px 48px rgba(0,0,0,0.07)" }}>
              <div style={{ background: "#f1f3f5", borderBottom: "1px solid #e5e7eb", padding: "9px 14px", display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#fc5c65" }} />
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#fd9644" }} />
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#2ecc71" }} />
                <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: 10 }}>app.usefokio.com.br/s/casamento-ana-pedro</span>
              </div>
              <div style={{ padding: 22 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>Casamento Ana & Pedro</div>
                    <div style={{ fontSize: 12, color: "#6B7280" }}>Selecione até 100 · 347 disponíveis</div>
                  </div>
                  <div style={{ background: "#2563EB", color: "#fff", padding: "6px 15px", borderRadius: 7, fontSize: 12, fontWeight: 600 }}>89 selecionadas ✓</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 5 }}>
                  {MOCK_PREVIEW_COLORS.map((color, i) => {
                    const sel = SELECTED_INDICES.includes(i);
                    return (
                      <div key={i} style={{ aspectRatio: "4/3", borderRadius: 5, background: color, position: "relative", border: sel ? "2.5px solid #2563EB" : "2.5px solid transparent" }}>
                        {sel && (
                          <div style={{ position: "absolute", top: 3, right: 3, width: 15, height: 15, borderRadius: "50%", background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: 8, color: "#fff", fontWeight: 700 }}>✓</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Features grid */}
          <section style={{ background: "#f8f9fa", padding: "72px 32px", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb" }}>
            <div style={{ maxWidth: 860, margin: "0 auto" }}>
              <h2 style={{ fontSize: 30, fontWeight: 700, textAlign: "center", marginBottom: 10, letterSpacing: "-0.03em" }}>Tudo que você precisa</h2>
              <p style={{ fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 48 }}>Feito por fotógrafos, para fotógrafos profissionais.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 16 }}>
                {[
                  ["🖼","Galeria de seleção","O cliente acessa um link, visualiza as fotos e seleciona as favoritas com um clique."],
                  ["📦","Galeria de entrega","Entregue as fotos finais editadas em alta resolução direto pela plataforma."],
                  ["⏰","Prazo automático","Defina um prazo e o sistema envia lembretes automáticos por email para o cliente."],
                  ["🔒","Link privado e seguro","Cada galeria tem link exclusivo. Apenas o cliente com o acesso consegue visualizar."],
                  ["💧","Marca d'água","Proteja suas fotos na prévia. A entrega final é sempre sem marca d'água."],
                  ["📱","100% responsivo","Funciona perfeitamente no celular, tablet e computador do seu cliente."],
                ].map(([icon, title, desc], i) => (
                  <div key={i} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 11, padding: "20px 18px" }}>
                    <div style={{ fontSize: 26, marginBottom: 10 }}>{icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111", marginBottom: 5 }}>{title}</div>
                    <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.6 }}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Fase beta */}
          <section style={{ padding: "72px 32px" }}>
            <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
              <span style={{ display: "inline-block", background: "#eff6ff", color: "#2563EB", fontSize: 12, fontWeight: 700, padding: "4px 14px", borderRadius: 20, letterSpacing: "0.04em", marginBottom: 16 }}>FASE BETA</span>
              <h2 style={{ fontSize: 30, fontWeight: 700, marginBottom: 12, letterSpacing: "-0.03em" }}>Estamos em fase beta</h2>
              <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.7, margin: 0 }}>
                O UseFokio está em período de testes com uso gratuito. Crie sua conta, use à vontade e nos ajude a construir a melhor plataforma de galerias para fotógrafos.
              </p>
            </div>
          </section>

          {/* CTA */}
          <section style={{ background: "#0a0a0a", padding: "72px 32px", textAlign: "center" }}>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: "#fff", marginBottom: 14, letterSpacing: "-0.03em" }}>Pronto para simplificar suas entregas?</h2>
            <p style={{ fontSize: 15, color: "#9CA3AF", marginBottom: 32 }}>Crie sua conta grátis e publique sua primeira galeria em minutos.</p>
            <Link href="/cadastro" style={{ padding: "12px 32px", borderRadius: 9, background: "#2563EB", color: "#fff", fontSize: 15, fontWeight: 600, textDecoration: "none" }}>
              Criar conta grátis →
            </Link>
          </section>

          {/* Footer */}
          <footer style={{ padding: "28px 32px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#9CA3AF" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, background: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="9" height="9" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="4" stroke="#fff" strokeWidth="1.5"/><circle cx="7" cy="7" r="1.5" fill="#fff"/></svg>
              </div>
              <span style={{ fontWeight: 600, color: "#374151" }}>UseFokio</span>
              <span>© 2025</span>
            </div>
            <div style={{ display: "flex", gap: 18 }}>
              {["Termos","Privacidade","Contato"].map((l) => (
                <a key={l} href="#" style={{ color: "#9CA3AF", textDecoration: "none" }}>{l}</a>
              ))}
            </div>
          </footer>
        </>
      )}

      {/* ── FEATURES ── */}
      {nav === "features" && (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "64px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.04em", margin: 0 }}>Funcionalidades</h1>
            <span style={{ background: "#eff6ff", color: "#2563EB", fontSize: 11, fontWeight: 700, padding: "3px 11px", borderRadius: 20, letterSpacing: "0.04em" }}>FASE BETA</span>
          </div>
          <p style={{ fontSize: 15, color: "#6B7280", marginBottom: 48 }}>Tudo que um fotógrafo profissional precisa.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
            {[
              ["🖼","Galeria de seleção inteligente","Publique suas fotos e crie um link privado para o cliente. Ele visualiza em grade, seleciona com um clique e você vê em tempo real o progresso. Recebe notificação ao concluir."],
              ["📦","Galeria de entrega profissional","Suba as fotos editadas e gere o link de entrega. O cliente baixa em HD. Controle se permite download individual ou ZIP, e defina expiração do link."],
              ["⏰","Prazos e lembretes automáticos","Defina quantos dias o cliente tem para selecionar. O sistema envia lembretes automáticos 3 dias e 1 dia antes do prazo."],
              ["📋","Relatório de seleção","Quando o cliente finaliza, você recebe um email com a lista de arquivos escolhidos e vê o relatório completo dentro do sistema."],
            ].map(([e, title, desc], i) => (
              <div key={i} style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
                <div style={{ fontSize: 32, width: 56, height: 56, background: "#f4f4f5", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{e}</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 7 }}>{title}</div>
                  <div style={{ fontSize: 13, color: "#555", lineHeight: 1.8 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PLANS ── */}
      {nav === "plans" && (
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "64px 32px" }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 10, textAlign: "center" }}>Planos</h1>
          <div style={{ maxWidth: 560, margin: "0 auto 48px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "16px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#2563EB", marginBottom: 4 }}>🚀 Estamos em fase beta</div>
            <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>Durante o período de testes o uso é gratuito. Os valores dos planos serão divulgados em breve.</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 14 }}>
            {Object.values(PLANOS).map((p) => {
              const isPopular = p.badge === "Popular";
              const cta       = "Começar grátis";
              return (
                <div key={p.id} style={{ border: isPopular ? `2px solid ${p.cor}` : "1px solid #e5e7eb", borderRadius: 14, padding: "26px 22px", position: "relative", background: isPopular ? p.corBg : "#fff" }}>
                  {p.badge && <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: p.cor, color: "#fff", fontSize: 11, fontWeight: 600, padding: "2px 13px", borderRadius: 20, whiteSpace: "nowrap" }}>{p.badge}</div>}
                  <div style={{ fontSize: 12, fontWeight: 600, color: p.cor, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.05em" }}>{p.nome}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 4 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", color: "#2563EB" }}>Fase beta</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 18 }}>{p.descricao}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 24 }}>
                    {p.features.map((f) => (
                      <div key={f} style={{ display: "flex", gap: 7, fontSize: 12, color: "#374151" }}>
                        <span style={{ color: p.cor, fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                      </div>
                    ))}
                  </div>
                  <Link href="/cadastro" style={{ display: "block", width: "100%", padding: "9px", borderRadius: 7, border: isPopular ? "none" : "1px solid #d1d5db", background: isPopular ? p.cor : "transparent", color: isPopular ? "#fff" : "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "center", textDecoration: "none" }}>
                    {cta}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── BLOG ── */}
      {nav === "blog" && (
        <div style={{ maxWidth: 780, margin: "0 auto", padding: "64px 32px" }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 10 }}>Blog</h1>
          <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 40 }}>Dicas de negócios, produtividade e técnica para fotógrafos.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { tag: "Produtividade", title: "Como automatizar a entrega de fotos e ganhar 5h por semana", date: "02 Jun 2025", read: "4 min", cover: "#7C6E5A" },
              { tag: "Negócios",      title: "Precificação para fotógrafos: o guia definitivo para 2025",  date: "25 Mai 2025", read: "8 min", cover: "#5A6E7C" },
              { tag: "Dicas",         title: "Como criar uma experiência premium na entrega das fotos",    date: "18 Mai 2025", read: "5 min", cover: "#6E5A7C" },
            ].map((p, i) => (
              <div key={i} style={{ display: "flex", gap: 20, border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", cursor: "pointer" }}>
                <div style={{ width: 130, height: 100, background: p.cover, flexShrink: 0 }} />
                <div style={{ padding: "18px 18px 18px 0", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ display: "flex", gap: 7, marginBottom: 7 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", background: "#eff6ff", padding: "2px 8px", borderRadius: 10 }}>{p.tag}</span>
                    <span style={{ fontSize: 11, color: "#9CA3AF" }}>{p.date} · {p.read} de leitura</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#111", lineHeight: 1.4 }}>{p.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
