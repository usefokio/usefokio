"use client";

// Aparência do site: par de fontes (pré-configurado), logo do site + tamanho,
// cor/transparência/altura do header e do rodapé. Salva em site_config.design (jsonb).
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { uploadFileClient } from "@/lib/storage/uploadClient";
import { useEditorEstado, SeloEstado, BotaoSalvarEstado, ModalNaoSalvo } from "@/app/(dashboard)/_components/EditorEstado";
import {
  PARES_FONTE, CATEGORIA_LABEL, FONTE_NOME, normalizarDesign, DESIGN_PADRAO,
  type ConfigDesign, type BarraConfig, type CategoriaFonte,
} from "@/lib/site/design";

const CATS: CategoriaFonte[] = ["minimalista", "serifada", "elegante"];

// <link> do Google Fonts só para o PREVIEW no painel (o site público self-hospeda via next/font).
const FONTES_UNICAS = [...new Set(PARES_FONTE.flatMap((p) => [p.titulo, p.texto]))];
const GOOGLE_HREF =
  "https://fonts.googleapis.com/css2?" +
  FONTES_UNICAS.map((id) => `family=${FONTE_NOME[id].replace(/ /g, "+")}`).join("&") +
  "&display=swap";

const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, display: "block" };
const card: React.CSSProperties = { border: "1px solid var(--color-border-tertiary)", borderRadius: 12, padding: 20, background: "var(--color-background-primary)", marginBottom: 18 };

export default function AparenciaPage() {
  const { fotografo } = useFotografo();
  const [design, setDesign] = useState<ConfigDesign>(DESIGN_PADRAO);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const inputLogo = useRef<HTMLInputElement>(null);

  const snapshot = JSON.stringify(design);
  const estado = useEditorEstado(snapshot, "/site");

  useEffect(() => {
    if (!fotografo) return;
    createClient().from("site_config").select("design").eq("fotografo_id", fotografo.id).maybeSingle()
      .then(({ data }) => {
        const d = normalizarDesign((data as { design?: unknown } | null)?.design);
        setDesign(d);
        estado.inicializar(JSON.stringify(d));
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotografo]);

  // Atualiza uma barra (header/rodapé) de forma type-safe (sem chave computada).
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
    setMsg("Aparência salva!");
    return true;
  }

  // Bloco de configuração de uma barra (header/rodapé): cor, transparência, altura.
  function barraUI(qual: "header" | "rodape", titulo: string, corTemaLabel: string) {
    const b = design[qual];
    const usaTema = b.cor === null;
    return (
      <div style={card}>
        <label style={lbl}>{titulo}</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Cor de fundo</div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer", marginBottom: 8 }}>
              <input type="checkbox" checked={usaTema} onChange={(e) => setBarra(qual, { cor: e.target.checked ? null : "#f4f1ea" })} style={{ accentColor: "#2563EB" }} />
              Usar a cor do tema ({corTemaLabel})
            </label>
            {!usaTema && (
              <input type="color" value={b.cor ?? "#f4f1ea"} onChange={(e) => setBarra(qual, { cor: e.target.value })}
                style={{ width: 44, height: 32, border: "1px solid var(--color-border-secondary)", borderRadius: 6, cursor: "pointer", background: "none" }} />
            )}
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Transparência: <strong>{100 - b.opacidade}%</strong></div>
            <input type="range" min={40} max={100} value={b.opacidade} onChange={(e) => setBarra(qual, { opacidade: Number(e.target.value) })} style={{ width: 180, accentColor: "#2563EB" }} />
            <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 2 }}>{b.opacidade}% opaco</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Altura (respiro): <strong>{b.altura}px</strong></div>
            <input type="range" min={qual === "header" ? 8 : 16} max={qual === "header" ? 48 : 96} value={b.altura} onChange={(e) => setBarra(qual, { altura: Number(e.target.value) })} style={{ width: 180, accentColor: "#2563EB" }} />
          </div>
        </div>
      </div>
    );
  }

  const logo = design.logo_url;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>
      {/* Fontes do preview (só o painel; o site público self-hospeda) */}
      <link rel="stylesheet" href={GOOGLE_HREF} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Aparência</h1>
        <SeloEstado temAlteracoes={estado.temAlteracoes} />
      </div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 24px" }}>Fontes, logo e as barras (topo e rodapé) do seu site.</p>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : (
        <>
          {/* Par de fontes */}
          <div style={card}>
            <label style={lbl}>Fontes (combinações prontas)</label>
            {CATS.map((cat) => (
              <div key={cat} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 8 }}>{CATEGORIA_LABEL[cat]}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                  {PARES_FONTE.filter((p) => p.categoria === cat).map((p) => {
                    const sel = design.par === p.id;
                    return (
                      <button key={p.id} onClick={() => setDesign((d) => ({ ...d, par: p.id }))}
                        style={{ textAlign: "left", cursor: "pointer", borderRadius: 10, padding: "12px 14px", background: "var(--color-background-primary)",
                          border: sel ? "2px solid #2563EB" : "1px solid var(--color-border-tertiary)" }}>
                        <div style={{ fontFamily: `'${FONTE_NOME[p.titulo]}', serif`, fontSize: 26, lineHeight: 1.1, color: "var(--color-text-primary)" }}>Aa</div>
                        <div style={{ fontFamily: `'${FONTE_NOME[p.texto]}', serif`, fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 6px" }}>Texto de exemplo do site.</div>
                        <div style={{ fontSize: 12, fontWeight: sel ? 700 : 600, color: sel ? "#2563EB" : "var(--color-text-primary)" }}>{p.nome}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Logo do site */}
          <div style={card}>
            <label style={lbl}>Logo do site</label>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ width: 160, height: 72, borderRadius: 8, border: "1px dashed var(--color-border-secondary)", display: "flex", alignItems: "center", justifyContent: "center", background: "repeating-conic-gradient(#0000000d 0% 25%, transparent 0% 50%) 50% / 16px 16px" }}>
                {logo
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={logo} alt="" style={{ maxHeight: 56, maxWidth: 148, objectFit: "contain" }} />
                  : <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Sem logo do site</span>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button onClick={() => inputLogo.current?.click()} disabled={enviandoLogo}
                  style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
                  {enviandoLogo ? "Enviando…" : logo ? "Trocar logo" : "+ Enviar logo (PNG com transparência)"}
                </button>
                {logo && <button onClick={() => setDesign((d) => ({ ...d, logo_url: null }))} style={{ padding: "4px 6px", border: "none", background: "transparent", fontSize: 11, color: "#DC2626", cursor: "pointer", textAlign: "left" }}>Remover (usar logo geral do fotógrafo)</button>}
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Sem logo do site, o site usa a logo geral da sua conta.</div>
              </div>
              <input ref={inputLogo} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => enviarLogo(e.target.files)} />
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Tamanho da logo no topo: <strong>{design.logo_altura}px</strong> <span style={{ color: "var(--color-text-secondary)" }}>(o header se ajusta sozinho)</span></div>
              <input type="range" min={24} max={120} value={design.logo_altura} onChange={(e) => setDesign((d) => ({ ...d, logo_altura: Number(e.target.value) }))} style={{ width: 240, accentColor: "#2563EB" }} />
            </div>
          </div>

          {barraUI("header", "Barra do topo (header)", "off-white")}
          {barraUI("rodape", "Barra do rodapé", "cinza claro")}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, alignItems: "center" }}>
            {msg && <span style={{ fontSize: 13, fontWeight: 600, color: msg.startsWith("Erro") ? "#DC2626" : "#059669" }}>{msg}</span>}
            <BotaoSalvarEstado temAlteracoes={estado.temAlteracoes} salvando={salvando} onClick={() => salvar()} />
          </div>
        </>
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
