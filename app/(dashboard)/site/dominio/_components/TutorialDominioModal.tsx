"use client";

// Tutorial de configuração de endereço (popup) — guia escrito passo a passo +
// botão para o vídeo do YouTube (URL a definir; sem URL, mostra "em breve").
// Overlay/card no padrão dos modais do sistema (ver ConfigPaginaModal).
import { useState } from "react";
import { youtubeEmbedUrl } from "@/lib/utils/youtube";
import { CNAME_TARGET_DOMINIO } from "@/lib/site/publico";

// URL do vídeo-tutorial de domínio (YouTube). Definir quando o vídeo for gravado.
const VIDEO_TUTORIAL_URL = "";

const h3: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: "var(--color-text-primary)", margin: "18px 0 8px" };
const p: React.CSSProperties = { fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.7, margin: "0 0 8px" };
const passo: React.CSSProperties = { display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 };
const num: React.CSSProperties = { flex: "0 0 auto", width: 20, height: 20, borderRadius: "50%", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 };
const cod: React.CSSProperties = { fontFamily: "var(--font-mono)", fontSize: 12, background: "var(--color-background-secondary)", border: "1px solid var(--color-border-tertiary)", borderRadius: 6, padding: "1px 6px" };

function Passo({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={passo}>
      <span style={num}>{n}</span>
      <div style={{ ...p, margin: 0, flex: 1 }}>{children}</div>
    </div>
  );
}

export function TutorialDominioModal({ onFechar }: { onFechar: () => void }) {
  const [video, setVideo] = useState(false);
  const embed = VIDEO_TUTORIAL_URL ? youtubeEmbedUrl(VIDEO_TUTORIAL_URL) : null;

  return (
    <div onClick={onFechar} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", borderRadius: 14, width: "100%", maxWidth: 680, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", overflow: "hidden" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--color-border-tertiary)" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)" }}>Como configurar o endereço do seu site</div>
          <button onClick={onFechar} aria-label="Fechar" style={{ border: "none", background: "transparent", fontSize: 20, color: "var(--color-text-secondary)", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {/* corpo */}
        <div style={{ padding: "16px 20px 22px", overflowY: "auto" }}>
          {/* vídeo */}
          <div style={{ marginBottom: 4 }}>
            {embed && video ? (
              <div style={{ position: "relative", paddingBottom: "56.25%", borderRadius: 10, overflow: "hidden", background: "#000" }}>
                <iframe src={embed} title="Tutorial de domínio" allowFullScreen
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} />
              </div>
            ) : (
              <button onClick={() => embed && setVideo(true)} disabled={!embed}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 9, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12.5, fontWeight: 700, color: "var(--color-text-primary)", cursor: embed ? "pointer" : "default", opacity: embed ? 1 : 0.6 }}>
                ▶ {embed ? "Assistir ao vídeo-tutorial" : "Vídeo-tutorial em breve"}
              </button>
            )}
          </div>

          <h3 style={h3}>O que é o quê?</h3>
          <p style={p}>
            <strong>Subdomínio UseFokio</strong> (ex.: <span style={cod}>seunome.usefokio.com.br</span>) — endereço gratuito,
            fica no ar na hora, sem nenhuma configuração externa. Ideal para começar.
          </p>
          <p style={p}>
            <strong>Domínio próprio</strong> (ex.: <span style={cod}>www.seudominio.com.br</span>) — o endereço da sua marca,
            registrado no seu nome (Registro.br, GoDaddy, Hostinger…). O site abre no <em>seu</em> domínio, com cadeado
            (HTTPS) do seu domínio. Seu e-mail e tudo mais que usa o domínio continuam intactos — só o site passa a
            ser servido pelo UseFokio.
          </p>

          <h3 style={h3}>Ativar o subdomínio (grátis)</h3>
          <Passo n={1}>Digite o subdomínio desejado (só letras minúsculas, números e hífen) e veja se está disponível.</Passo>
          <Passo n={2}>Marque <strong>Site publicado</strong> e clique em <strong>Salvar</strong>.</Passo>
          <Passo n={3}>Pronto — seu site já abre em <span style={cod}>seunome.usefokio.com.br</span>.</Passo>

          <h3 style={h3}>Conectar o domínio próprio</h3>
          <Passo n={1}>Digite seu domínio (recomendamos com <span style={cod}>www</span>, ex.: <span style={cod}>www.seudominio.com.br</span>) e clique em <strong>Conectar domínio</strong>.</Passo>
          <Passo n={2}>
            Abra o painel DNS do seu provedor (onde você registrou o domínio) e crie o registro que mostramos:
            um <strong>CNAME</strong> com nome <span style={cod}>www</span> apontando para <span style={cod}>{CNAME_TARGET_DOMINIO}</span>.
          </Passo>
          <Passo n={3}>
            Se o seu provedor pedir mais registros (mostrados na tela), crie todos exatamente como exibidos —
            eles servem para emitir o <strong>certificado de segurança (HTTPS)</strong> do seu domínio.
          </Passo>
          <Passo n={4}>Volte aqui e clique em <strong>Verificar agora</strong>. A propagação do DNS pode levar de minutos até 24h.</Passo>
          <Passo n={5}>Quando o status ficar <strong>Ativo</strong>, seu site abre no seu domínio. 🎉</Passo>

          <h3 style={h3}>Dicas e dúvidas comuns</h3>
          <p style={p}>• <strong>CNAME</strong> é um tipo de registro DNS que diz “este endereço aponta para aquele outro”. Todo painel de provedor tem (pode estar em “DNS”, “Zona DNS” ou “Gerenciar DNS”).</p>
          <p style={p}>• <strong>Raiz sem www</strong> (<span style={cod}>seudominio.com.br</span>): configure no seu provedor um redirecionamento da raiz para o <span style={cod}>www</span> — a maioria tem essa opção pronta (“redirecionamento” ou “forwarding”).</p>
          <p style={p}>• <strong>E-mail não muda:</strong> não mexa nos registros MX — o apontamento do site não afeta seu e-mail.</p>
          <p style={p}>• <strong>Demorou?</strong> Alterações de DNS podem levar até 24–48h para propagar no mundo todo. Use “Verificar agora” para checar.</p>
        </div>
      </div>
    </div>
  );
}
