"use client";

// Configurações › Financeiro › Galeria de entrega e funil: prazo inicial de acesso, opções de renovação
// (lista livre), valores e prazo por categoria, e "aplicar às galerias existentes". Prioridade do valor que
// o cliente vê: galeria personalizada > categoria > padrão da opção (lib/entrega/renovacao.ts).
// Também as regras do funil da galeria expirada (dias de cada contato, envio automático e textos dos WhatsApps),
// usadas pelo cron (app/api/cron/funil-entrega) e pelo bloco de Tarefas (lib/campanha/regua.ts).
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { inputStyle } from "@/lib/styles";
import { mascaraMoeda, parseMoeda, formatarMoeda } from "@/lib/moeda";
import { useEditorEstado, SeloEstado, BotaoSalvarEstado, ModalNaoSalvo } from "@/app/(dashboard)/_components/EditorEstado";
import { REGRAS_FUNIL_PADRAO } from "@/lib/campanha/regua";
import { CAMPANHA_WHATSAPP_DEFAULT, CAMPANHA_WHATSAPP2_DEFAULT } from "@/lib/campanha/textos";

type OpcaoForm = { id: string | null; chave: string; rotulo: string; dias: string; valor: string; ativo: boolean };
type CategoriaForm = { id: string; nome: string; prazo: string };
type GaleriaPersonalizada = { id: string; titulo: string; categoria_id: string | null; renovacao_personalizada: Record<string, number | null> };
type UltimaAplicacao = { aplicado_em: string; total: number } | null;
type FunilForm = { entrarAuto: boolean; emailAuto: boolean; d1: string; d2: string; dw1: string; dw2: string; dexc: string; textoW1: string; textoW2: string };

const numOuVazio = (n: number | null | undefined) => (n == null ? "" : String(n));
const FUNIL_INICIAL: FunilForm = {
  entrarAuto: REGRAS_FUNIL_PADRAO.funil_entrar_auto, emailAuto: REGRAS_FUNIL_PADRAO.funil_email_auto,
  d1: numOuVazio(REGRAS_FUNIL_PADRAO.dias_email_1), d2: numOuVazio(REGRAS_FUNIL_PADRAO.dias_email_2),
  dw1: numOuVazio(REGRAS_FUNIL_PADRAO.dias_whatsapp_1), dw2: "", dexc: "",
  textoW1: CAMPANHA_WHATSAPP_DEFAULT, textoW2: CAMPANHA_WHATSAPP2_DEFAULT,
};

const cardStyle: React.CSSProperties = {
  background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)",
  borderRadius: 14, padding: "20px 24px", marginBottom: 16,
};
const tituloCard: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 2px" };
const descCard: React.CSSProperties = { fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 14px", lineHeight: 1.5 };
const celula: React.CSSProperties = { ...inputStyle, padding: "6px 8px", fontSize: 12 };
const thStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textAlign: "left", padding: "0 8px 6px 0", whiteSpace: "nowrap" };

const somenteDigitos = (v: string) => v.replace(/\D/g, "").slice(0, 4);

export default function GaleriaEntregaRegrasPage() {
  const { fotografo, reload } = useFotografo();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [prazoPadrao, setPrazoPadrao] = useState("");
  const [opcoes, setOpcoes] = useState<OpcaoForm[]>([]);
  const [categorias, setCategorias] = useState<CategoriaForm[]>([]);
  const [precos, setPrecos] = useState<Record<string, string>>({}); // `${chaveOpcao}|${categoriaId}` → "39,90"
  const [precosOriginais, setPrecosOriginais] = useState<Set<string>>(new Set());
  const [prazosOriginais, setPrazosOriginais] = useState<Record<string, string>>({});

  const [personalizadas, setPersonalizadas] = useState<GaleriaPersonalizada[]>([]);
  const [escopo, setEscopo] = useState("todas");
  const [aplicando, setAplicando] = useState(false);
  const [ultimaAplicacao, setUltimaAplicacao] = useState<UltimaAplicacao>(null);

  const [funil, setFunil] = useState<FunilForm>(FUNIL_INICIAL);
  const [funilDesde, setFunilDesde] = useState<string | null>(null);
  const mudarFunil = (patch: Partial<FunilForm>) => setFunil((f) => ({ ...f, ...patch }));

  const snapshot = JSON.stringify([prazoPadrao, opcoes, categorias, precos, funil]);
  const estado = useEditorEstado(snapshot, "/configuracoes");

  async function carregar() {
    if (!fotografo) return;
    const sb = createClient();
    const fid = fotografo.id;
    const [{ data: ops }, { data: cats }, { data: regras }, { data: pers }, { data: logs }, { data: foto }] = await Promise.all([
      sb.from("renovacao_opcoes").select("id, rotulo, dias, valor_padrao, ativo, ordem").eq("fotografo_id", fid).order("ordem").order("dias"),
      sb.from("categorias").select("id, nome, prazo_inicial_dias").eq("fotografo_id", fid).order("ordem").order("created_at"),
      sb.from("entrega_regras").select("prazo_inicial_dias, funil_entrar_auto, funil_email_auto, funil_email_auto_desde, dias_email_1, dias_email_2, dias_whatsapp_1, dias_whatsapp_2, dias_exclusao").eq("fotografo_id", fid).maybeSingle(),
      sb.from("galerias_entrega").select("id, titulo, categoria_id, renovacao_personalizada").eq("fotografo_id", fid).not("renovacao_personalizada", "is", null).order("titulo"),
      sb.from("renovacao_aplicacoes_log").select("aplicado_em").eq("fotografo_id", fid).order("aplicado_em", { ascending: false }).limit(1000),
      sb.from("fotografos").select("templates_mensagem").eq("id", fid).maybeSingle(),
    ]);

    const listaOps = (ops ?? []) as { id: string; rotulo: string; dias: number; valor_padrao: number | null; ativo: boolean }[];
    const opsForm: OpcaoForm[] = listaOps.map((o) => ({
      id: o.id, chave: o.id, rotulo: o.rotulo, dias: String(o.dias),
      valor: o.valor_padrao != null ? formatarMoeda(Number(o.valor_padrao)) : "", ativo: o.ativo,
    }));
    const catsForm: CategoriaForm[] = ((cats ?? []) as { id: string; nome: string; prazo_inicial_dias: number | null }[])
      .map((c) => ({ id: c.id, nome: c.nome, prazo: c.prazo_inicial_dias ? String(c.prazo_inicial_dias) : "" }));

    const precosMap: Record<string, string> = {};
    if (listaOps.length) {
      const { data: pr } = await sb.from("renovacao_precos_categoria").select("opcao_id, categoria_id, valor").in("opcao_id", listaOps.map((o) => o.id));
      for (const p of (pr ?? []) as { opcao_id: string; categoria_id: string; valor: number }[]) {
        precosMap[`${p.opcao_id}|${p.categoria_id}`] = formatarMoeda(Number(p.valor));
      }
    }
    const prazoForm = regras?.prazo_inicial_dias ? String(regras.prazo_inicial_dias) : "";
    const tpls = (foto?.templates_mensagem ?? null) as Record<string, string> | null;
    const textos = {
      textoW1: tpls?.campanha_whatsapp?.trim() || CAMPANHA_WHATSAPP_DEFAULT,
      textoW2: tpls?.campanha_whatsapp2?.trim() || CAMPANHA_WHATSAPP2_DEFAULT,
    };
    const funilForm: FunilForm = regras ? {
      entrarAuto: regras.funil_entrar_auto, emailAuto: regras.funil_email_auto,
      d1: numOuVazio(regras.dias_email_1), d2: numOuVazio(regras.dias_email_2), dw1: numOuVazio(regras.dias_whatsapp_1),
      dw2: numOuVazio(regras.dias_whatsapp_2), dexc: numOuVazio(regras.dias_exclusao),
      ...textos,
    } : { ...FUNIL_INICIAL, ...textos };

    setOpcoes(opsForm);
    setCategorias(catsForm);
    setPrecos(precosMap);
    setPrecosOriginais(new Set(Object.keys(precosMap)));
    setPrazosOriginais(Object.fromEntries(catsForm.map((c) => [c.id, c.prazo])));
    setPrazoPadrao(prazoForm);
    setFunil(funilForm);
    setFunilDesde(regras?.funil_email_auto ? (regras.funil_email_auto_desde ?? null) : null);
    setPersonalizadas((pers ?? []) as GaleriaPersonalizada[]);

    const listaLogs = (logs ?? []) as { aplicado_em: string }[];
    const ultima = listaLogs[0]?.aplicado_em;
    setUltimaAplicacao(ultima ? { aplicado_em: ultima, total: listaLogs.filter((l) => l.aplicado_em === ultima).length } : null);

    estado.inicializar(JSON.stringify([prazoForm, opsForm, catsForm, precosMap, funilForm]));
    setCarregando(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carregar(); }, [fotografo?.id]);

  function mudarOpcao(chave: string, patch: Partial<OpcaoForm>) {
    setOpcoes((l) => l.map((o) => (o.chave === chave ? { ...o, ...patch } : o)));
  }
  function moverOpcao(i: number, d: number) {
    const j = i + d;
    if (j < 0 || j >= opcoes.length) return;
    setOpcoes((l) => { const n = [...l]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  }
  function adicionarOpcao() {
    setOpcoes((l) => [...l, { id: null, chave: `novo-${Date.now()}`, rotulo: "", dias: "", valor: "", ativo: true }]);
  }

  async function salvar(): Promise<boolean> {
    if (!fotografo) return false;
    setErro(null); setMsg(null);
    for (const o of opcoes) {
      if (!o.rotulo.trim()) { setErro("Dê um nome para cada opção de renovação."); return false; }
      if (!(parseInt(o.dias) > 0)) { setErro(`Informe os dias da opção "${o.rotulo}".`); return false; }
    }
    const d1 = parseInt(funil.d1), d2 = parseInt(funil.d2), dw1 = parseInt(funil.dw1);
    if ([d1, d2, dw1].some((d) => isNaN(d))) { setErro("Informe os dias do 1º e-mail, do 2º e-mail e do 1º WhatsApp."); return false; }
    if (!(d1 <= d2 && d2 <= dw1)) { setErro("Os dias do funil precisam estar em ordem: 1º e-mail ≤ 2º e-mail ≤ 1º WhatsApp."); return false; }
    setSalvando(true);
    const sb = createClient();
    const fid = fotografo.id;
    try {
      const { error: eRegras } = await sb.from("entrega_regras").upsert(
        {
          fotografo_id: fid, prazo_inicial_dias: parseInt(prazoPadrao) > 0 ? parseInt(prazoPadrao) : null,
          funil_entrar_auto: funil.entrarAuto, funil_email_auto: funil.emailAuto,
          funil_email_auto_desde: funil.emailAuto ? (funilDesde ?? new Date().toISOString()) : null,
          dias_email_1: d1, dias_email_2: d2, dias_whatsapp_1: dw1,
          dias_whatsapp_2: parseInt(funil.dw2) > 0 ? parseInt(funil.dw2) : null,
          dias_exclusao: parseInt(funil.dexc) > 0 ? parseInt(funil.dexc) : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "fotografo_id" },
      );
      if (eRegras) throw eRegras;

      // Opções (nunca apaga: desativar tira da tela do cliente)
      const idPorChave: Record<string, string> = {};
      for (const [i, o] of opcoes.entries()) {
        const linha = {
          fotografo_id: fid, rotulo: o.rotulo.trim(), dias: parseInt(o.dias),
          valor_padrao: parseMoeda(o.valor) || null, ativo: o.ativo, ordem: i,
        };
        if (o.id) {
          const { error } = await sb.from("renovacao_opcoes").update(linha).eq("id", o.id);
          if (error) throw error;
          idPorChave[o.chave] = o.id;
        } else {
          const { data, error } = await sb.from("renovacao_opcoes").insert(linha).select("id").single();
          if (error || !data) throw error ?? new Error("Não foi possível criar a opção.");
          idPorChave[o.chave] = data.id;
        }
      }

      // Valores por categoria: preenchido = grava; esvaziado = volta a usar o padrão
      const gravar: { opcao_id: string; categoria_id: string; valor: number }[] = [];
      for (const o of opcoes) {
        for (const c of categorias) {
          const chave = `${o.chave}|${c.id}`;
          const valor = parseMoeda(precos[chave] ?? "") ?? 0;
          if (valor > 0) gravar.push({ opcao_id: idPorChave[o.chave], categoria_id: c.id, valor });
          else if (precosOriginais.has(chave)) {
            const { error } = await sb.from("renovacao_precos_categoria").delete().eq("opcao_id", idPorChave[o.chave]).eq("categoria_id", c.id);
            if (error) throw error;
          }
        }
      }
      if (gravar.length) {
        const { error } = await sb.from("renovacao_precos_categoria").upsert(gravar, { onConflict: "opcao_id,categoria_id" });
        if (error) throw error;
      }

      // Prazo inicial por categoria (só as que mudaram)
      for (const c of categorias) {
        if (c.prazo === (prazosOriginais[c.id] ?? "")) continue;
        const { error } = await sb.from("categorias").update({ prazo_inicial_dias: parseInt(c.prazo) > 0 ? parseInt(c.prazo) : null }).eq("id", c.id);
        if (error) throw error;
      }

      // Compatibilidade: o valor padrão antigo do fotógrafo acompanha a 1ª opção ativa
      const primeira = opcoes.find((o) => o.ativo);
      await sb.from("fotografos").update({ renewal_fee_padrao: primeira ? (parseMoeda(primeira.valor) || null) : null }).eq("id", fid);

      // Textos dos WhatsApps do funil (igual ao padrão = não guarda, segue o padrão do sistema)
      const { data: fAtual } = await sb.from("fotografos").select("templates_mensagem").eq("id", fid).maybeSingle();
      const tpls = { ...((fAtual?.templates_mensagem ?? {}) as Record<string, string>) };
      const guardarTexto = (chave: string, texto: string, padrao: string) => {
        if (texto.trim() && texto.trim() !== padrao.trim()) tpls[chave] = texto; else delete tpls[chave];
      };
      guardarTexto("campanha_whatsapp", funil.textoW1, CAMPANHA_WHATSAPP_DEFAULT);
      guardarTexto("campanha_whatsapp2", funil.textoW2, CAMPANHA_WHATSAPP2_DEFAULT);
      const { error: eTpl } = await sb.from("fotografos").update({ templates_mensagem: Object.keys(tpls).length ? tpls : null }).eq("id", fid);
      if (eTpl) throw eTpl;
      await reload();

      setMsg("Regras salvas.");
      await carregar();
      return true;
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
      return false;
    } finally {
      setSalvando(false);
    }
  }

  const nomeOpcao = useMemo(() => Object.fromEntries(opcoes.filter((o) => o.id).map((o) => [o.id!, o.rotulo])), [opcoes]);
  const noEscopo = personalizadas.filter((g) => escopo === "todas" || g.categoria_id === escopo);

  function resumoPersonalizada(p: Record<string, number | null>) {
    return Object.entries(p)
      .filter(([id]) => nomeOpcao[id])
      .map(([id, v]) => `${nomeOpcao[id]}: ${v != null && v > 0 ? `R$ ${formatarMoeda(Number(v))}` : "não oferece"}`)
      .join(" · ") || "—";
  }

  async function aplicarAsExistentes() {
    if (!fotografo || noEscopo.length === 0) return;
    if (!window.confirm(`${noEscopo.length} galeria(s) vão deixar de ter valores próprios e passar a seguir estas regras. O vencimento não muda. Continuar?`)) return;
    setAplicando(true); setErro(null); setMsg(null);
    const sb = createClient();
    const quando = new Date().toISOString();
    try {
      const { error: eLog } = await sb.from("renovacao_aplicacoes_log").insert(
        noEscopo.map((g) => ({ fotografo_id: fotografo.id, galeria_id: g.id, valor_anterior: g.renovacao_personalizada, aplicado_em: quando })),
      );
      if (eLog) throw eLog;
      const { error } = await sb.from("galerias_entrega").update({ renovacao_personalizada: null }).in("id", noEscopo.map((g) => g.id));
      if (error) throw error;
      setMsg(`${noEscopo.length} galeria(s) agora seguem as regras.`);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao aplicar.");
    } finally {
      setAplicando(false);
    }
  }

  async function desfazerUltima() {
    if (!fotografo || !ultimaAplicacao) return;
    if (!window.confirm(`Devolver os valores próprios das ${ultimaAplicacao.total} galeria(s) da última aplicação?`)) return;
    setAplicando(true); setErro(null); setMsg(null);
    const sb = createClient();
    try {
      const { data: linhas, error: eSel } = await sb.from("renovacao_aplicacoes_log")
        .select("id, galeria_id, valor_anterior").eq("fotografo_id", fotografo.id).eq("aplicado_em", ultimaAplicacao.aplicado_em);
      if (eSel) throw eSel;
      for (const l of (linhas ?? []) as { id: string; galeria_id: string; valor_anterior: Record<string, number | null> | null }[]) {
        const { error } = await sb.from("galerias_entrega").update({ renovacao_personalizada: l.valor_anterior }).eq("id", l.galeria_id);
        if (error) throw error;
      }
      const { error: eDel } = await sb.from("renovacao_aplicacoes_log").delete().eq("fotografo_id", fotografo.id).eq("aplicado_em", ultimaAplicacao.aplicado_em);
      if (eDel) throw eDel;
      setMsg("Última aplicação desfeita.");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao desfazer.");
    } finally {
      setAplicando(false);
    }
  }

  if (carregando) return <div style={{ padding: "26px 30px", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;

  return (
    <div style={{ padding: "26px 30px", maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>Galeria de entrega e funil</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>Regras de prazo e renovação que valem para todas as galerias</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <SeloEstado temAlteracoes={estado.temAlteracoes} />
          <BotaoSalvarEstado temAlteracoes={estado.temAlteracoes} salvando={salvando} onClick={salvar} />
        </div>
      </div>

      {erro && <div style={{ marginBottom: 14, padding: "9px 12px", borderRadius: 8, fontSize: 12, background: "rgba(239,68,68,0.08)", color: "#DC2626", border: "0.5px solid rgba(239,68,68,0.3)" }}>{erro}</div>}
      {msg && <div style={{ marginBottom: 14, padding: "9px 12px", borderRadius: 8, fontSize: 12, background: "rgba(16,185,129,0.08)", color: "#059669", border: "0.5px solid rgba(16,185,129,0.3)" }}>{msg}</div>}

      {/* 1. Prazo de acesso */}
      <div style={cardStyle}>
        <h2 style={tituloCard}>Prazo de acesso</h2>
        <p style={descCard}>Quanto tempo o cliente tem quando a galeria é criada. Pode ser diferente por categoria (tabela abaixo).</p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--color-text-primary)" }}>
          Prazo inicial padrão
          <input value={prazoPadrao} onChange={(e) => setPrazoPadrao(somenteDigitos(e.target.value))} placeholder="sem prazo"
            inputMode="numeric" style={{ ...celula, width: 110 }} />
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>dias {prazoPadrao ? "" : "(vazio = sem prazo)"}</span>
        </div>
      </div>

      {/* 2. Opções de renovação */}
      <div style={cardStyle}>
        <h2 style={tituloCard}>Opções de renovação</h2>
        <p style={descCard}>O que o cliente pode escolher na tela de renovação, nesta ordem. Desativar tira a opção da tela do cliente sem apagar nada.</p>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Ativa</th>
              <th style={thStyle}>Nome</th>
              <th style={thStyle}>Dias</th>
              <th style={thStyle}>Valor padrão</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {opcoes.map((o, i) => (
              <tr key={o.chave}>
                <td style={{ padding: "4px 8px 4px 0" }}>
                  <input type="checkbox" checked={o.ativo} onChange={(e) => mudarOpcao(o.chave, { ativo: e.target.checked })} style={{ width: 16, height: 16, cursor: "pointer" }} />
                </td>
                <td style={{ padding: "4px 8px 4px 0" }}>
                  <input value={o.rotulo} onChange={(e) => mudarOpcao(o.chave, { rotulo: e.target.value })} placeholder="ex.: 90 dias" style={{ ...celula, width: "100%", boxSizing: "border-box" }} />
                </td>
                <td style={{ padding: "4px 8px 4px 0" }}>
                  <input value={o.dias} onChange={(e) => mudarOpcao(o.chave, { dias: somenteDigitos(e.target.value) })} inputMode="numeric" style={{ ...celula, width: 70 }} />
                </td>
                <td style={{ padding: "4px 8px 4px 0" }}>
                  <input value={o.valor} onChange={(e) => mudarOpcao(o.chave, { valor: mascaraMoeda(e.target.value) })} placeholder="R$ 0,00" inputMode="numeric" style={{ ...celula, width: 110, textAlign: "right" }} />
                </td>
                <td style={{ padding: "4px 0", whiteSpace: "nowrap" }}>
                  <button type="button" onClick={() => moverOpcao(i, -1)} disabled={i === 0} title="Subir" style={{ ...botaoMini, opacity: i === 0 ? 0.3 : 1 }}>▲</button>
                  <button type="button" onClick={() => moverOpcao(i, 1)} disabled={i === opcoes.length - 1} title="Descer" style={{ ...botaoMini, opacity: i === opcoes.length - 1 ? 0.3 : 1 }}>▼</button>
                  {!o.id && (
                    <button type="button" onClick={() => setOpcoes((l) => l.filter((x) => x.chave !== o.chave))} title="Remover" style={{ ...botaoMini, color: "#DC2626" }}>×</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={adicionarOpcao} style={{ marginTop: 10, background: "none", border: "none", color: "#2563EB", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}>
          + Adicionar opção
        </button>
      </div>

      {/* 3. Valores por categoria */}
      <div style={cardStyle}>
        <h2 style={tituloCard}>Valores por categoria</h2>
        <p style={descCard}>Vazio usa o padrão. Uma galeria ainda pode ter valores próprios pelo botão Personalizar no formulário dela.</p>
        {categorias.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Nenhuma categoria cadastrada.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", minWidth: "100%" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Categoria</th>
                  <th style={thStyle}>Prazo inicial (dias)</th>
                  {opcoes.map((o) => <th key={o.chave} style={{ ...thStyle, opacity: o.ativo ? 1 : 0.45 }}>{o.rotulo || "Nova opção"}</th>)}
                </tr>
              </thead>
              <tbody>
                {categorias.map((c) => (
                  <tr key={c.id}>
                    <td style={{ padding: "4px 8px 4px 0", fontSize: 13, color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>{c.nome}</td>
                    <td style={{ padding: "4px 8px 4px 0" }}>
                      <input value={c.prazo} placeholder="padrão" inputMode="numeric"
                        onChange={(e) => setCategorias((l) => l.map((x) => (x.id === c.id ? { ...x, prazo: somenteDigitos(e.target.value) } : x)))}
                        style={{ ...celula, width: 90 }} />
                    </td>
                    {opcoes.map((o) => {
                      const chave = `${o.chave}|${c.id}`;
                      return (
                        <td key={o.chave} style={{ padding: "4px 8px 4px 0" }}>
                          <input value={precos[chave] ?? ""} placeholder="padrão" inputMode="numeric"
                            onChange={(e) => setPrecos((p) => ({ ...p, [chave]: mascaraMoeda(e.target.value) }))}
                            style={{ ...celula, width: 100, textAlign: "right", opacity: o.ativo ? 1 : 0.45 }} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Aplicar às galerias existentes */}
      <div style={cardStyle}>
        <h2 style={tituloCard}>Aplicar às galerias existentes</h2>
        <p style={descCard}>
          As galerias sem valores próprios já seguem estas regras automaticamente. Abaixo estão as que têm valores próprios
          (personalizadas): aplicar faz elas voltarem a seguir as regras. O vencimento não muda e dá para desfazer.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <select value={escopo} onChange={(e) => setEscopo(e.target.value)} style={{ ...inputStyle, width: 220, fontSize: 13 }}>
            <option value="todas">Todas as categorias</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{noEscopo.length} galeria(s) personalizada(s)</span>
          <button type="button" onClick={aplicarAsExistentes} disabled={aplicando || estado.temAlteracoes || noEscopo.length === 0}
            title={estado.temAlteracoes ? "Salve as regras antes de aplicar" : undefined}
            style={{ marginLeft: "auto", padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 700,
              cursor: aplicando || estado.temAlteracoes || noEscopo.length === 0 ? "default" : "pointer",
              background: aplicando || estado.temAlteracoes || noEscopo.length === 0 ? "var(--color-background-tertiary)" : "#2563EB",
              color: aplicando || estado.temAlteracoes || noEscopo.length === 0 ? "var(--color-text-secondary)" : "#fff" }}>
            {aplicando ? "Aplicando…" : estado.temAlteracoes ? "Salve antes de aplicar" : `Aplicar a ${noEscopo.length} galeria(s)`}
          </button>
        </div>
        {noEscopo.length > 0 && (
          <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, maxHeight: 260, overflowY: "auto" }}>
            {noEscopo.map((g, i) => (
              <div key={g.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 12px", fontSize: 12,
                borderBottom: i < noEscopo.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
                <a href={`/entrega/${g.id}`} style={{ color: "var(--color-text-primary)", textDecoration: "none", fontWeight: 600 }}>{g.titulo}</a>
                <span style={{ color: "var(--color-text-secondary)", textAlign: "right" }}>{resumoPersonalizada(g.renovacao_personalizada)}</span>
              </div>
            ))}
          </div>
        )}
        {ultimaAplicacao && (
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--color-text-secondary)" }}>
            Última aplicação: {new Date(ultimaAplicacao.aplicado_em).toLocaleString("pt-BR")} ({ultimaAplicacao.total} galeria(s)) —{" "}
            <button type="button" onClick={desfazerUltima} disabled={aplicando} style={{ background: "none", border: "none", color: "#2563EB", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>
              Desfazer
            </button>
          </div>
        )}
      </div>

      {/* 5. Funil da galeria expirada */}
      <div style={cardStyle}>
        <h2 style={tituloCard}>Funil da galeria expirada</h2>
        <p style={descCard}>
          O que acontece depois que a galeria vence. Os e-mails podem sair sozinhos; os WhatsApps e a exclusão das fotos aparecem como
          tarefas para você no funil. O sistema nunca apaga fotos nem mexe em links.
        </p>
        <label style={linhaCheck}>
          <input type="checkbox" checked={funil.entrarAuto} onChange={(e) => mudarFunil({ entrarAuto: e.target.checked })} style={{ width: 16, height: 16 }} />
          Colocar a galeria no funil automaticamente quando vencer
        </label>
        <label style={linhaCheck}>
          <input type="checkbox" checked={funil.emailAuto} onChange={(e) => mudarFunil({ emailAuto: e.target.checked })} style={{ width: 16, height: 16 }} />
          Enviar os e-mails automaticamente
        </label>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 14px 26px", lineHeight: 1.5 }}>
          Saem às 9h, com o nome do seu estúdio; as respostas do cliente chegam em {fotografo?.email ?? "seu e-mail"}.
          Vale para as galerias que entrarem no funil depois de ligar — as que já estão no funil continuam manuais.
          {funil.emailAuto && funilDesde && <> Ligado desde {new Date(funilDesde).toLocaleDateString("pt-BR")}.</>}
        </div>

        <table style={{ borderCollapse: "collapse", marginBottom: 16 }}>
          <tbody>
            {([
              ["1º e-mail", "d1", "dias após vencer"],
              ["2º e-mail", "d2", "dias após vencer"],
              ["1º WhatsApp (tarefa)", "dw1", "dias após vencer"],
              ["2º WhatsApp — aviso de exclusão (tarefa)", "dw2", "dias após o 1º WhatsApp (vazio = não usa)"],
              ["Excluir as fotos (tarefa)", "dexc", "dias após o 2º WhatsApp (vazio = não usa)"],
            ] as const).map(([rotulo, chave, sufixo]) => (
              <tr key={chave}>
                <td style={{ padding: "4px 12px 4px 0", fontSize: 13, color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>{rotulo}</td>
                <td style={{ padding: "4px 8px 4px 0" }}>
                  <input value={funil[chave]} inputMode="numeric" placeholder="—"
                    onChange={(e) => mudarFunil({ [chave]: somenteDigitos(e.target.value) })}
                    style={{ ...celula, width: 70 }} />
                </td>
                <td style={{ padding: "4px 0", fontSize: 12, color: "var(--color-text-secondary)" }}>{sufixo}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 14, lineHeight: 1.5 }}>
          Sem e-mail cadastrado, o cliente vai direto para a tarefa de WhatsApp no dia do 1º e-mail. Os textos dos e-mails ficam em
          Configurações → Mensagens.
        </div>

        {([
          ["Mensagem do 1º WhatsApp", "textoW1", CAMPANHA_WHATSAPP_DEFAULT],
          ["Mensagem do 2º WhatsApp (aviso de exclusão)", "textoW2", CAMPANHA_WHATSAPP2_DEFAULT],
        ] as const).map(([rotulo, chave, padrao]) => (
          <div key={chave} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>{rotulo}</span>
              {funil[chave].trim() !== padrao.trim() && (
                <button type="button" onClick={() => mudarFunil({ [chave]: padrao })}
                  style={{ background: "none", border: "none", color: "var(--color-text-secondary)", fontSize: 11, cursor: "pointer", padding: 0 }}>
                  Restaurar padrão
                </button>
              )}
            </div>
            <textarea value={funil[chave]} onChange={(e) => mudarFunil({ [chave]: e.target.value })} rows={8}
              style={{ ...inputStyle, width: "100%", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6, fontFamily: "inherit", fontSize: 12 }} />
          </div>
        ))}
        <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
          Variáveis: <code>{"{nomeCliente} {titulo} {respostaUrl} {nomeEmpresa} {dataEmail1} {dataEmail2} {emailCliente}"}</code>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 16 }}>
          <SeloEstado temAlteracoes={estado.temAlteracoes} />
          <BotaoSalvarEstado temAlteracoes={estado.temAlteracoes} salvando={salvando} onClick={salvar} />
        </div>
      </div>

      <ModalNaoSalvo
        aberto={estado.modalAberto}
        salvando={salvando}
        onSalvarESair={async () => { if (await salvar()) estado.sairAgora(); }}
        onSairSemSalvar={() => estado.sairAgora()}
        onContinuar={() => estado.fecharModal()}
      />
    </div>
  );
}

const linhaCheck: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--color-text-primary)", marginBottom: 8, cursor: "pointer",
};

const botaoMini: React.CSSProperties = {
  border: "none", background: "transparent", cursor: "pointer", fontSize: 11, color: "var(--color-text-secondary)", padding: "2px 4px",
};
