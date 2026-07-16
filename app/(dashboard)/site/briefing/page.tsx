"use client";

// BRIEFING de marca — conceito, história, nichos, público, regiões e diferenciais do fotógrafo.
// Alimenta as sugestões automáticas de SEO (por template hoje; assistente de IA depois).
// Refazível a qualquer momento. Grava em site_config.briefing (jsonb).
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { useEditorEstado, SeloEstado, BotaoSalvarEstado, ModalNaoSalvo } from "@/app/(dashboard)/_components/EditorEstado";
import { normalizarBriefing, type Briefing } from "@/lib/site/briefing";
import { gerarSugestoes } from "@/lib/site/briefingConfig";
import { gerarPromptEntrevista, ROTULOS_BRIEFING as R } from "@/lib/site/briefingPrompt";
import { ModalPromptIA } from "./_components/ModalPromptIA";
import type { SiteCategoria } from "@/lib/supabase/types";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8, boxSizing: "border-box",
  border: "1px solid var(--color-border-secondary)", fontSize: 13,
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)",
  textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5,
};
const hint: React.CSSProperties = { fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4, lineHeight: 1.5 };

// "a, b, c" ↔ ["a","b","c"]
const paraLista = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const deLista = (l: string[]) => l.join(", ");

export default function BriefingPage() {
  const { fotografo } = useFotografo();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [b, setB] = useState<Briefing>(normalizarBriefing(null));
  const [nichosTxt, setNichosTxt] = useState("");
  const [regioesTxt, setRegioesTxt] = useState("");
  const [sementesTxt, setSementesTxt] = useState("");
  const [cats, setCats] = useState<string[]>([]);
  const [modalIA, setModalIA] = useState(false);

  const snapshotAtual = JSON.stringify([b.conceito, b.historia, nichosTxt, b.publico_alvo, regioesTxt, b.diferenciais, b.tom_voz, sementesTxt]);
  const estado = useEditorEstado(snapshotAtual, "/site");

  useEffect(() => {
    if (!fotografo) return;
    const sb = createClient();
    (async () => {
      const [{ data: cfg }, { data: cats }] = await Promise.all([
        sb.from("site_config").select("briefing").eq("fotografo_id", fotografo.id).maybeSingle(),
        sb.from("site_categorias").select("*").eq("fotografo_id", fotografo.id).order("ordem"),
      ]);
      const br = normalizarBriefing(cfg?.briefing);
      // Semeia os nichos com as categorias do site quando o briefing ainda não tem
      const nomesCats = ((cats as SiteCategoria[]) ?? []).filter((c) => c.ativo).map((c) => c.nome);
      const nichos = br.nichos.length ? br.nichos : nomesCats;
      setCats(nomesCats);
      setB({ ...br, nichos });
      setNichosTxt(deLista(nichos));
      setRegioesTxt(deLista(br.regioes));
      setSementesTxt(deLista(br.palavras_semente));
      estado.inicializar(JSON.stringify([br.conceito, br.historia, deLista(nichos), br.publico_alvo, deLista(br.regioes), br.diferenciais, br.tom_voz, deLista(br.palavras_semente)]));
      setCarregando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotografo]);

  const briefingAtual: Briefing = {
    ...b, nichos: paraLista(nichosTxt), regioes: paraLista(regioesTxt), palavras_semente: paraLista(sementesTxt),
  };
  const sugestoes = gerarSugestoes(briefingAtual, { nome_empresa: fotografo?.nome_empresa, cidade: fotografo?.cidade });
  const promptIA = gerarPromptEntrevista({
    nome_empresa: fotografo?.nome_empresa, cidade: fotografo?.cidade, categorias: cats, briefingAtual: b,
  });

  async function salvar(): Promise<boolean> {
    if (!fotografo) return false;
    setSalvando(true); setMsg(null);
    const payload: Briefing = { ...briefingAtual, preenchido_em: new Date().toISOString() };
    const { error } = await createClient().from("site_config")
      .upsert({ fotografo_id: fotografo.id, briefing: payload, updated_at: new Date().toISOString() }, { onConflict: "fotografo_id" });
    setSalvando(false);
    if (error) { setMsg("Erro: " + error.message); return false; }
    setB(payload);
    estado.marcarSalvo(snapshotAtual);
    setMsg("Briefing salvo! Veja as sugestões em Site → SEO.");
    return true;
  }

  if (carregando) return <div style={{ padding: 60, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Briefing da sua marca</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setModalIA(true)}
            style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(37,99,235,0.4)", background: "rgba(37,99,235,0.06)", fontSize: 12.5, fontWeight: 700, color: "#2563EB", cursor: "pointer", whiteSpace: "nowrap" }}>
            ✨ Preencher com ajuda de IA
          </button>
          <SeloEstado temAlteracoes={estado.temAlteracoes} />
          <BotaoSalvarEstado temAlteracoes={estado.temAlteracoes} salvando={salvando} onClick={() => salvar()} />
        </div>
      </div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 24px", lineHeight: 1.6 }}>
        Conte quem você é e para quem fotografa — usamos isso para gerar sugestões de SEO (título, descrição,
        palavras-chave e o texto do Sobre). Pode refazer quando quiser.{" "}
        <strong style={{ color: "var(--color-text-primary)" }}>Não sabe o que escrever?</strong>{" "}
        <button onClick={() => setModalIA(true)}
          style={{ border: "none", background: "transparent", padding: 0, font: "inherit", color: "#2563EB", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>
          Deixe uma IA te entrevistar
        </button>{" "}— leva uns 10 minutos e funciona com o ChatGPT, Gemini ou Claude que você já usa.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={labelStyle}>{R.conceito}</label>
          <input value={b.conceito} onChange={(e) => setB({ ...b, conceito: e.target.value })} style={inputStyle}
            placeholder="Ex.: fotografia documental e espontânea, com luz natural" />
          <div style={hint}>Como você descreveria o seu olhar em uma frase.</div>
        </div>
        <div>
          <label style={labelStyle}>{R.historia}</label>
          <textarea value={b.historia} onChange={(e) => setB({ ...b, historia: e.target.value })} rows={4} style={{ ...inputStyle, resize: "vertical" }}
            placeholder="Ex.: Fotografo casamentos há 12 anos. Comecei registrando a família e me apaixonei por…" />
          <div style={hint}>Vira a base do texto da página <strong>Sobre</strong> — escreva como contaria a um cliente.</div>
        </div>
        <div>
          <label style={labelStyle}>{R.nichos} (separados por vírgula)</label>
          <input value={nichosTxt} onChange={(e) => setNichosTxt(e.target.value)} style={inputStyle} placeholder="Casamentos, Ensaios, Gestantes" />
          <div style={hint}>Já sugerimos as categorias do seu site — ajuste a ordem: a primeira é o seu foco principal.</div>
        </div>
        <div>
          <label style={labelStyle}>{R.publico_alvo}</label>
          <input value={b.publico_alvo} onChange={(e) => setB({ ...b, publico_alvo: e.target.value })} style={inputStyle}
            placeholder="Ex.: casais que valorizam fotos naturais e sem poses forçadas" />
        </div>
        <div>
          <label style={labelStyle}>{R.regioes} (separadas por vírgula)</label>
          <input value={regioesTxt} onChange={(e) => setRegioesTxt(e.target.value)} style={inputStyle} placeholder="Ourinhos, interior de SP" />
          <div style={hint}>Fundamental pro SEO local — “fotógrafo de casamento em {"{cidade}"}” é o que mais converte.</div>
        </div>
        <div>
          <label style={labelStyle}>{R.diferenciais}</label>
          <input value={b.diferenciais} onChange={(e) => setB({ ...b, diferenciais: e.target.value })} style={inputStyle}
            placeholder="Ex.: entrega em 15 dias, álbuns artesanais, cobertura com drone" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>{R.tom_voz}</label>
            <input value={b.tom_voz} onChange={(e) => setB({ ...b, tom_voz: e.target.value })} style={inputStyle} placeholder="Ex.: próximo e informal" />
          </div>
          <div>
            <label style={labelStyle}>{R.palavras_semente}</label>
            <input value={sementesTxt} onChange={(e) => setSementesTxt(e.target.value)} style={inputStyle} placeholder="fotógrafo de casamento ourinhos…" />
          </div>
        </div>

        {/* Prévia das sugestões geradas */}
        {(sugestoes.seo_title || sugestoes.sobre_html) && (
          <div style={{ border: "1px solid rgba(37,99,235,0.3)", borderRadius: 12, padding: "16px 18px", background: "rgba(37,99,235,0.04)" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 8 }}>✨ O que este briefing gera automaticamente</div>
            <div style={{ fontSize: 12.5, color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
              {sugestoes.seo_title && <div><strong>Título da home:</strong> {sugestoes.seo_title}</div>}
              {sugestoes.seo_description && <div><strong>Descrição de busca:</strong> {sugestoes.seo_description}</div>}
              {sugestoes.seo_keywords && <div><strong>Palavras-chave:</strong> {sugestoes.seo_keywords}</div>}
              {sugestoes.sobre_html && <div style={{ marginTop: 4 }}><strong>Rascunho do Sobre:</strong> {sugestoes.sobre_html.replace(/<[^>]+>/g, " ").trim().slice(0, 160)}…</div>}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--color-text-secondary)", marginTop: 10 }}>
              Depois de salvar, aplique as sugestões em <Link href="/site/seo" style={{ color: "#2563EB", fontWeight: 700 }}>Site → SEO</Link> e no editor da página <Link href="/site/menu" style={{ color: "#2563EB", fontWeight: 700 }}>Sobre</Link> — você revisa antes de publicar.
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center" }}>
          {msg && <span style={{ fontSize: 13, fontWeight: 600, color: msg.startsWith("Erro") ? "#DC2626" : "#059669" }}>{msg}</span>}
          <BotaoSalvarEstado temAlteracoes={estado.temAlteracoes} salvando={salvando} onClick={() => salvar()} />
        </div>
      </div>

      {modalIA && <ModalPromptIA prompt={promptIA} onFechar={() => setModalIA(false)} />}

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
