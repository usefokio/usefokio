"use client";

// Aparência do site: par de fontes (pré-configurado), logo do site + tamanho,
// cor/transparência/altura do header e do rodapé. Salva em site_config.design (jsonb).
// Layout em 2 colunas: controles à esquerda + PREVIEW ao vivo (sticky) à direita.
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { uploadFileClient } from "@/lib/storage/uploadClient";
import { getTema } from "@/lib/site/temas";
import { useEditorEstado, SeloEstado, BotaoSalvarEstado, ModalNaoSalvo } from "@/app/(dashboard)/_components/EditorEstado";
import {
  PARES_FONTE, CATEGORIA_LABEL, FONTE_NOME, getPar, normalizarDesign, DESIGN_PADRAO,
  type ConfigDesign, type BarraConfig, type CategoriaFonte,
} from "@/lib/site/design";

const CATS: CategoriaFonte[] = ["minimalista", "serifada", "elegante"];

// <link> do Google Fonts só para o PREVIEW no painel (o site público self-hospeda via next/font).
const FONTES_UNICAS = [...new Set(PARES_FONTE.flatMap((p) => [p.titulo, p.texto]))];
const GOOGLE_HREF =
  "https://fonts.googleapis.com/css2?" +
  FONTES_UNICAS.map((id) => `family=${FONTE_NOME[id].replace(/ /g, "+")}`).join("&") +
  "&display=swap";

// Paleta de cores para as barras (neutros + tons do site). "null" = usar a cor do tema.
const PALETA = ["#FFFFFF", "#F8F7F4", "#F1EFEA", "#E8E2D6", "#5E6E5F", "#463F37", "#2B2B2B", "#1C1A17"];

const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10, display: "block" };
const card: React.CSSProperties = { border: "1px solid var(--color-border-tertiary)", borderRadius: 12, padding: 18, background: "var(--color-background-primary)", marginBottom: 16 };
const mini: React.CSSProperties = { fontSize: 12, color: "var(--color-text-secondary)" };

export default function AparenciaPage() {
  const { fotografo } = useFotografo();
  const [design, setDesign] = useState<ConfigDesign>(DESIGN_PADRAO);
  const [temaId, setTemaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const inputLogo = useRef<HTMLInputElement>(null);

  const snapshot = JSON.stringify(design);
  const estado = useEditorEstado(snapshot, "/site");

  useEffect(() => {
    if (!fotografo) return;
    createClient().from("site_config").select("design, tema").eq("fotografo_id", fotografo.id).maybeSingle()
      .then(({ data }) => {
        const row = data as { design?: unknown; tema?: string | null } | null;
        const d = normalizarDesign(row?.design);
        setDesign(d);
        setTemaId(row?.tema ?? null);
        estado.inicializar(JSON.stringify(d));
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotografo]);

  const setBarra = (qual: "header" | "rodape", patch: Partial<BarraConfig>) =>
    setDesign((d) => qual === "header"
      ? { ...d, header: { ...d.header, ...patch } }
      : { ...d, rodape: { ...d.rodape, ...patch } });

  async function enviarLogo(files: FileList | null) {
    if (!files || !files[0] || !fotografo) return;
    setEnviandoLogo(true);
    setMsg(null);
    try {
      const ext = (files[0].name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
      const path = `site/${fotografo.id}/logo/logo-${crypto.randomUUID().slice(0, 6)}.${ext}`;
      const { url_publica } = await uploadFileClient(path, files[0], files[0].type || "image/png");
      setDesign((d) => ({ ...d, logo_url: url_publica }));
    } catch (e) {
      setMsg("Erro no upload da logo: " + (e instanceof Error ? e.message : ""));
    }
    setEnviandoLogo(false);
    if (inputLogo.current) inputLogo.current.value = "";
  }

  async function salvar(): Promise<boolean> {
    if (!fotografo) return false;
    setSalvando(true);
    setMsg(null);
    const { error } = await createClient().from("site_config").upsert(
      { fotografo_id: fotografo.id, design, updated_at: new Date().toISOString() },
      { onConflict: "fotografo_id" },
    );
    setSalvando(false);
    if (error) { setMsg("Erro: " + error.message); return false; }
    estado.marcarSalvo(JSON.stringify(design));
    setMsg("Aparência salva! Recarregue seu site para ver.");
    return true;
  }

  const tema = getTema(temaId);
  const par = getPar(design.par);
  const fTitulo = `'${FONTE_NOME[par.titulo]}', Georgia, serif`;
  const fTexto = `'${FONTE_NOME[par.texto]}', Georgia, serif`;
  const logo = design.logo_url ?? fotografo?.logo_url ?? null;
  const logoProprio = !!design.logo_url;
  const nome = fotografo?.nome_empresa || "Seu Estúdio";
  const corBarra = (b: BarraConfig, base: string) => `color-mix(in srgb, ${b.cor ?? base} ${b.opacidade}%, transparent)`;

  // Círculo de cor: presets + "tema" (auto) + custom (input nativo ancorado no próprio círculo).
  function paleta(b: BarraConfig, set: (patch: Partial<BarraConfig>) => void) {
    const atual = b.cor;
    const ehPreset = atual !== null && PALETA.some((c) => c.toLowerCase() === atual.toLowerCase());
    const ehCustom = atual !== null && !ehPreset;
    const anel = (on: boolean): React.CSSProperties => on
      ? { boxShadow: "0 0 0 2px var(--color-background-primary), 0 0 0 4px #2563EB" }
      : {};
    const circ: React.CSSProperties = { width: 26, height: 26, borderRadius: "50%", cursor: "pointer", border: "1px solid rgba(0,0,0,0.18)", padding: 0, flex: "0 0 auto" };
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
        {/* Tema (automático) */}
        <button type="button" title="Usar a cor do tema" onClick={() => set({ cor: null })}
          style={{ ...circ, background: tema.cores.fundo, borderStyle: "dashed", borderColor: "#9ca3af", ...anel(atual === null) }} />
        {PALETA.map((c) => (
          <button key={c} type="button" title={c} onClick={() => set({ cor: c })}
            style={{ ...circ, background: c, ...anel(ehPreset && atual!.toLowerCase() === c.toLowerCase()) }} />
        ))}
        {/* Custom: círculo com input nativo por cima (o seletor abre ANCORADO no círculo) */}
        <label title="Cor personalizada" style={{ ...circ, position: "relative", overflow: "hidden", display: "inline-block",
          background: ehCustom ? atual! : "conic-gradient(from 0deg, #f43f5e, #f59e0b, #10b981, #3b82f6, #a855f7, #f43f5e)", ...anel(ehCustom) }}>
          <input type="color" value={atual ?? "#ffffff"} onChange={(e) => set({ cor: e.target.value })}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", border: "none", padding: 0 }} />
        </label>
      </div>
    );
  }

  function barraUI(qual: "header" | "rodape", titulo: string) {
    const b = design[qual];
    const set = (patch: Partial<BarraConfig>) => setBarra(qual, patch);
    return (
      <div style={card}>
        <label style={lbl}>{titulo}</label>
        <div style={{ ...mini, marginBottom: 6 }}>Cor</div>
        {paleta(b, set)}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 22, marginTop: 14 }}>
          <div>
            <div style={{ ...mini, marginBottom: 4 }}>Transparência <strong>{100 - b.opacidade}%</strong></div>
            <input type="range" min={40} max={100} value={b.opacidade} onChange={(e) => set({ opacidade: Number(e.target.value) })} style={{ width: 150, accentColor: "#2563EB" }} />
          </div>
          <div>
            <div style={{ ...mini, marginBottom: 4 }}>Altura <strong>{b.altura}px</strong></div>
            <input type="range" min={qual === "header" ? 8 : 16} max={qual === "header" ? 48 : 96} value={b.altura} onChange={(e) => set({ altura: Number(e.target.value) })} style={{ width: 150, accentColor: "#2563EB" }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 24px" }}>
      <link rel="stylesheet" href={GOOGLE_HREF} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Aparência</h1>
        <SeloEstado temAlteracoes={estado.temAlteracoes} />
      </div>
      <p style={{ ...mini, margin: "0 0 22px" }}>Fontes, logo e as barras do site. A prévia ao lado atualiza conforme você edita.</p>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", ...mini }}>Carregando…</div>
      ) : (
        <div className="aparencia-grid">
          {/* ---------- COLUNA ESQUERDA: controles ---------- */}
          <div>
            {/* Fontes */}
            <div style={card}>
              <label style={lbl}>Fontes</label>
              <select value={design.par} onChange={(e) => setDesign((d) => ({ ...d, par: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 14, cursor: "pointer" }}>
                {CATS.map((cat) => (
                  <optgroup key={cat} label={CATEGORIA_LABEL[cat]}>
                    {PARES_FONTE.filter((p) => p.categoria === cat).map((p) => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <div style={{ ...mini, marginTop: 8 }}>
                Título: <strong style={{ fontFamily: fTitulo }}>{FONTE_NOME[par.titulo]}</strong>
                {"  ·  "}Texto: <strong style={{ fontFamily: fTexto }}>{FONTE_NOME[par.texto]}</strong>
              </div>
            </div>

            {/* Logo */}
            <div style={card}>
              <label style={lbl}>Logo do site</label>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ width: 118, height: 56, borderRadius: 8, border: "1px dashed var(--color-border-secondary)", display: "flex", alignItems: "center", justifyContent: "center", background: "repeating-conic-gradient(#0000000d 0% 25%, transparent 0% 50%) 50% / 14px 14px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {logoProprio ? <img src={design.logo_url!} alt="" style={{ maxHeight: 44, maxWidth: 106, objectFit: "contain" }} />
                    : <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{logo ? "logo da conta" : "sem logo"}</span>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button onClick={() => inputLogo.current?.click()} disabled={enviandoLogo}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
                    {enviandoLogo ? "Enviando…" : logoProprio ? "Trocar logo" : "Enviar logo (PNG)"}
                  </button>
                  {logoProprio && <button onClick={() => setDesign((d) => ({ ...d, logo_url: null }))} style={{ padding: 0, border: "none", background: "transparent", fontSize: 11, color: "#DC2626", cursor: "pointer", textAlign: "left" }}>Remover</button>}
                </div>
                <input ref={inputLogo} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => enviarLogo(e.target.files)} />
              </div>
              <div style={{ marginTop: 14 }}>
                <div style={{ ...mini, marginBottom: 4 }}>Tamanho da logo <strong>{design.logo_altura}px</strong></div>
                <input type="range" min={24} max={120} value={design.logo_altura} onChange={(e) => setDesign((d) => ({ ...d, logo_altura: Number(e.target.value) }))} style={{ width: 220, accentColor: "#2563EB" }} />
              </div>
            </div>

            {barraUI("header", "Barra do topo (header)")}
            {barraUI("rodape", "Barra do rodapé")}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, alignItems: "center" }}>
              {msg && <span style={{ fontSize: 12, fontWeight: 600, color: msg.startsWith("Erro") ? "#DC2626" : "#059669" }}>{msg}</span>}
              <BotaoSalvarEstado temAlteracoes={estado.temAlteracoes} salvando={salvando} onClick={() => salvar()} />
            </div>
          </div>

          {/* ---------- COLUNA DIREITA: preview ao vivo ---------- */}
          <div className="aparencia-preview-wrap">
            <div style={{ ...lbl, marginBottom: 8 }}>Prévia</div>
            <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid var(--color-border-secondary)", boxShadow: "0 8px 30px rgba(0,0,0,0.10)", background: tema.cores.fundo }}>
              {/* header */}
              <div style={{ background: corBarra(design.header, tema.cores.fundo), backdropFilter: "blur(4px)", borderBottom: `1px solid ${tema.cores.borda}`, padding: `${Math.round(design.header.altura * 0.7)}px 16px`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {logo ? <img src={logo} alt="" style={{ height: Math.round(design.logo_altura * 0.62), width: "auto", maxWidth: 150, objectFit: "contain" }} />
                  : <span style={{ fontFamily: fTitulo, fontSize: 18, letterSpacing: "0.04em", color: tema.cores.titulo }}>{nome}</span>}
                <span style={{ fontFamily: fTexto, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: tema.cores.titulo }}>Portfólio · Contato</span>
              </div>
              {/* corpo */}
              <div style={{ padding: "30px 22px 34px", color: tema.cores.texto }}>
                <div style={{ fontFamily: fTexto, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: tema.cores.suave, marginBottom: 10 }}>Casamentos</div>
                <div style={{ fontFamily: fTitulo, fontWeight: 500, fontSize: 30, lineHeight: 1.15, color: tema.cores.titulo, marginBottom: 12 }}>Ensaios que viram histórias</div>
                <p style={{ fontFamily: fTexto, fontSize: 14, lineHeight: 1.7, margin: "0 0 18px" }}>
                  Cada casamento tem um ritmo próprio. Registro os detalhes, os gestos e a emoção do dia — com leveza e sem interferir no que é real.
                </p>
                <span style={{ display: "inline-block", fontFamily: fTexto, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: tema.cores.titulo, border: `1px solid ${tema.cores.titulo}`, borderRadius: 4, padding: "9px 20px" }}>Ver portfólio</span>
              </div>
              {/* rodapé */}
              <div style={{ background: corBarra(design.rodape, tema.cores.superficie), borderTop: `1px solid ${tema.cores.borda}`, padding: `${Math.round(design.rodape.altura * 0.7)}px 20px`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontFamily: fTitulo, fontSize: 15, color: tema.cores.titulo }}>{nome}</span>
                <span style={{ fontFamily: fTexto, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: tema.cores.titulo }}>Instagram</span>
              </div>
            </div>
            <div style={{ ...mini, marginTop: 8, textAlign: "center" }}>Exemplo — o site real segue estas escolhas.</div>
          </div>
        </div>
      )}

      <ModalNaoSalvo
        aberto={estado.modalAberto}
        salvando={salvando}
        onSalvarESair={async () => { if (await salvar()) estado.sairAgora(); }}
        onSairSemSalvar={estado.sairAgora}
        onContinuar={estado.fecharModal}
      />
    </div>
  );
}
