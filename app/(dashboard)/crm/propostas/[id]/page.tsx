"use client";

// EDITOR DA PROPOSTA — dados, opções (pacotes/adicionais com valor), texto padrão da
// mensagem ({{VARIAVEIS}}) e página pública (motor de blocos). Regras de sistema:
// estado de salvamento claro (EditorEstado), Salvar no topo e rodapé, valor com máscara.
import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { useFotografo } from "@/lib/context/FotografoContext";
import { useEditorEstado, SeloEstado, BotaoSalvarEstado, ModalNaoSalvo } from "@/app/(dashboard)/_components/EditorEstado";
import { RichTextEditor } from "@/app/(dashboard)/crm/_components/RichTextEditor";
import { EditorBlocos } from "@/app/(dashboard)/site/_components/EditorBlocos";
import { ModalCopiarTexto } from "../_components/ModalCopiarTexto";
import { uploadFileClient } from "@/lib/storage/uploadClient";
import { processarImagemEntrega } from "@/lib/imageResize";
import { mascaraValor, parsearValor, formatNum } from "@/lib/utils/format";
import { slugifySite } from "@/lib/site/seo";
import { urlPublicaSite, type ConfigUrl } from "@/lib/site/urlPublica";
import { VARIAVEIS_PROPOSTA, TEXTO_MENSAGEM_PADRAO } from "@/lib/crm/proposta";
import type { SiteBloco } from "@/lib/site/blocos";
import type { CrmProposta, CrmPropostaCategoria, CrmPropostaOpcao } from "@/lib/supabase/types";

type OpcaoLocal = {
  tmpId: string;
  id: string | null;         // id no banco (null = nova)
  nome: string;
  itensTexto: string;        // um item por linha
  valor: string;             // mascarado ("1.500,00")
  tipo: "pacote" | "adicional";
  imagem_url: string | null;
};

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8,
  border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)",
  fontSize: 13, color: "var(--color-text-primary)",
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)",
  textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5,
};
const btn: React.CSSProperties = {
  padding: "7px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)",
  background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer",
};
const secao: React.CSSProperties = {
  background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)",
  borderRadius: 12, padding: "20px 22px", marginBottom: 16,
};

function opcaoDoBanco(o: CrmPropostaOpcao): OpcaoLocal {
  return {
    tmpId: o.id, id: o.id, nome: o.nome,
    itensTexto: o.itens.join("\n"),
    valor: o.valor != null ? formatNum(o.valor) : "",
    tipo: o.tipo, imagem_url: o.imagem_url,
  };
}

export default function EditorPropostaPage() {
  const { id: idRota } = useParams<{ id: string }>();
  // Modo CRIAÇÃO: /crm/propostas/nova abre em branco e só grava no primeiro Salvar
  // (antes o botão "+ Nova" já inseria, e sair sem salvar deixava proposta solta).
  const ehNova = idRota === "nova";
  const [id] = useState(() => (ehNova ? crypto.randomUUID() : idRota)); // id definitivo (pasta de upload + linha)
  const [criada, setCriada] = useState(!ehNova);
  const { fotografo } = useFotografo();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [naoEncontrada, setNaoEncontrada] = useState(false);

  const [categorias, setCategorias] = useState<CrmPropostaCategoria[]>([]);
  const [cfgSite, setCfgSite] = useState<ConfigUrl | null>(null);

  const [titulo, setTitulo] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [descricaoHtml, setDescricaoHtml] = useState("");
  const [validadeDias, setValidadeDias] = useState("");
  const [textoMensagem, setTextoMensagem] = useState("");
  const [slug, setSlug] = useState("");
  const [publicado, setPublicado] = useState(false);
  const [blocos, setBlocos] = useState<SiteBloco[]>([]);
  const [opcoes, setOpcoes] = useState<OpcaoLocal[]>([]);
  const [enviandoImg, setEnviandoImg] = useState<string | null>(null);
  const [modalCopiar, setModalCopiar] = useState(false);

  const snapshot = useMemo(() => JSON.stringify({
    titulo, categoriaId, descricaoHtml, validadeDias, textoMensagem, slug, publicado, blocos, opcoes,
  }), [titulo, categoriaId, descricaoHtml, validadeDias, textoMensagem, slug, publicado, blocos, opcoes]);

  const estado = useEditorEstado(snapshot, "/crm/propostas");

  const carregar = useCallback(async () => {
    if (!fotografo || !id) return;
    const sb = createClient();
    const [{ data: p }, cats, ops, { data: cfg }] = await Promise.all([
      sb.from("crm_propostas").select("*").eq("id", id).maybeSingle(),
      fetchAllRows<CrmPropostaCategoria>((s, from, to) =>
        s.from("crm_proposta_categorias").select("*").eq("fotografo_id", fotografo.id)
          .order("ordem").order("nome").range(from, to), sb),
      fetchAllRows<CrmPropostaOpcao>((s, from, to) =>
        s.from("crm_proposta_opcoes").select("*").eq("proposta_id", id).order("ordem").range(from, to), sb),
      sb.from("site_config").select("subdominio, dominio_customizado, publicado").eq("fotografo_id", fotografo.id).maybeSingle(),
    ]);
    // Proposta nova: nada a carregar (só as categorias e a config do site) — abre em branco.
    if (ehNova) {
      setCategorias(cats);
      setCfgSite((cfg as ConfigUrl) ?? null);
      setTextoMensagem(TEXTO_MENSAGEM_PADRAO);
      estado.inicializar(JSON.stringify({
        titulo: "", categoriaId: "", descricaoHtml: "", validadeDias: "",
        textoMensagem: TEXTO_MENSAGEM_PADRAO, slug: "", publicado: false, blocos: [], opcoes: [],
      }));
      setCarregando(false);
      return;
    }
    if (!p) { setNaoEncontrada(true); setCarregando(false); return; }
    const prop = p as CrmProposta;
    setCategorias(cats);
    setCfgSite((cfg as ConfigUrl) ?? null);
    setTitulo(prop.titulo);
    setCategoriaId(prop.categoria_id ?? "");
    setDescricaoHtml(prop.descricao_html ?? "");
    setValidadeDias(prop.validade_dias != null ? String(prop.validade_dias) : "");
    setTextoMensagem(prop.texto_mensagem ?? TEXTO_MENSAGEM_PADRAO);
    setSlug(prop.slug ?? "");
    setPublicado(prop.publicado);
    setBlocos(Array.isArray(prop.blocos) ? (prop.blocos as SiteBloco[]) : []);
    const locais = ops.map(opcaoDoBanco);
    setOpcoes(locais);
    estado.inicializar(JSON.stringify({
      titulo: prop.titulo, categoriaId: prop.categoria_id ?? "", descricaoHtml: prop.descricao_html ?? "",
      validadeDias: prop.validade_dias != null ? String(prop.validade_dias) : "",
      textoMensagem: prop.texto_mensagem ?? TEXTO_MENSAGEM_PADRAO, slug: prop.slug ?? "",
      publicado: prop.publicado, blocos: Array.isArray(prop.blocos) ? prop.blocos : [], opcoes: locais,
    }));
    setCarregando(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotografo, id]);

  useEffect(() => { carregar(); }, [carregar]);

  async function salvar(): Promise<boolean> {
    if (!fotografo || !id) return false;
    if (!titulo.trim()) { setMsg("Erro: informe o título."); return false; }
    const s = slug.trim() ? slugifySite(slug) : null;
    if (publicado && !s) { setMsg("Erro: para publicar a página, informe o endereço (slug)."); return false; }
    setSalvando(true); setMsg(null);
    const sb = createClient();

    const campos = {
      titulo: titulo.trim(),
      categoria_id: categoriaId || null,
      descricao_html: descricaoHtml.trim() || null,
      validade_dias: validadeDias.trim() ? parseInt(validadeDias) || null : null,
      texto_mensagem: textoMensagem.trim() || null,
      slug: s,
      publicado: publicado && !!s,
      blocos,
      updated_at: new Date().toISOString(),
    };
    // Primeiro Salvar de uma proposta nova = INSERT (id gerado no cliente); depois, UPDATE.
    const { error: e1 } = criada
      ? await sb.from("crm_propostas").update(campos).eq("id", id)
      : await sb.from("crm_propostas").insert({ id, fotografo_id: fotografo.id, ...campos });
    if (e1) { setSalvando(false); setMsg("Erro ao salvar: " + e1.message); return false; }
    if (!criada) {
      setCriada(true);
      window.history.replaceState(null, "", `/crm/propostas/${id}`);
    }

    // Opções: sincroniza a lista inteira (poucas linhas; sem triggers na tabela).
    const { error: eDel } = await sb.from("crm_proposta_opcoes").delete().eq("proposta_id", id);
    if (eDel) { setSalvando(false); setMsg("Erro nas opções: " + eDel.message); return false; }
    const linhas = opcoes
      .filter((o) => o.nome.trim())
      .map((o, i) => ({
        proposta_id: id,
        nome: o.nome.trim(),
        itens: o.itensTexto.split("\n").map((x) => x.trim()).filter(Boolean),
        valor: o.valor.trim() ? parsearValor(o.valor) : null,
        tipo: o.tipo,
        imagem_url: o.imagem_url,
        ordem: i,
      }));
    let opcoesSalvas: OpcaoLocal[] = [];
    if (linhas.length) {
      const { data: novas, error: eIns } = await sb.from("crm_proposta_opcoes").insert(linhas).select("*").order("ordem");
      if (eIns) { setSalvando(false); setMsg("Erro nas opções: " + eIns.message); return false; }
      opcoesSalvas = ((novas ?? []) as CrmPropostaOpcao[]).map(opcaoDoBanco);
    }
    setOpcoes(opcoesSalvas);

    setSalvando(false);
    setSlug(s ?? "");
    setTitulo(titulo.trim());
    setPublicado(publicado && !!s);
    estado.marcarSalvo(JSON.stringify({
      titulo: titulo.trim(), categoriaId, descricaoHtml, validadeDias, textoMensagem, slug: s ?? "",
      publicado: publicado && !!s, blocos, opcoes: opcoesSalvas,
    }));
    setMsg("Salvo.");
    return true;
  }

  function novaOpcao(tipo: "pacote" | "adicional") {
    setOpcoes((prev) => [...prev, {
      tmpId: crypto.randomUUID(), id: null, nome: "",
      itensTexto: "", valor: "", tipo, imagem_url: null,
    }]);
  }

  function mudarOpcao(tmpId: string, patch: Partial<OpcaoLocal>) {
    setOpcoes((prev) => prev.map((o) => (o.tmpId === tmpId ? { ...o, ...patch } : o)));
  }

  function moverOpcao(tmpId: string, dir: -1 | 1) {
    setOpcoes((prev) => {
      const i = prev.findIndex((o) => o.tmpId === tmpId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const novas = [...prev];
      [novas[i], novas[j]] = [novas[j], novas[i]];
      return novas;
    });
  }

  async function subirImagemOpcao(tmpId: string, files: FileList | null) {
    if (!files?.length || !fotografo) return;
    setEnviandoImg(tmpId);
    try {
      const { blob } = await processarImagemEntrega(files[0], 2000, 0.85);
      const nome = files[0].name.replace(/\.[a-z0-9]+$/i, "").normalize("NFD").replace(/[^\x20-\x7E]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-") || "img";
      const path = `site/${fotografo.id}/propostas/${id}/${nome}-${crypto.randomUUID().slice(0, 6)}.jpg`;
      const { url_publica } = await uploadFileClient(path, blob);
      mudarOpcao(tmpId, { imagem_url: url_publica });
    } catch (e) {
      setMsg("Erro no upload: " + (e instanceof Error ? e.message : ""));
    }
    setEnviandoImg(null);
  }

  function inserirVariavel(v: string) {
    setTextoMensagem((prev) => prev + (prev.endsWith("\n") || prev === "" ? "" : "\n") + `{{${v}}}`);
  }

  if (!fotografo) return null;
  if (carregando) return <div style={{ padding: "40px 32px", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;
  if (naoEncontrada) return <div style={{ padding: "40px 32px", fontSize: 13, color: "var(--color-text-secondary)" }}>Proposta não encontrada.</div>;

  const urlPagina = slug ? urlPublicaSite(cfgSite, fotografo.id, `/proposta/${slugifySite(slug)}`) : null;

  const propostaAtual: CrmProposta = {
    id, fotografo_id: fotografo.id, categoria_id: categoriaId || null,
    titulo, descricao_html: descricaoHtml || null, texto_mensagem: textoMensagem || null,
    slug: slug || null, publicado, blocos, imagem_url: null,
    validade_dias: validadeDias.trim() ? parseInt(validadeDias) || null : null,
    ordem: 0, ativo: true, created_at: "", updated_at: "",
  };
  const opcoesAtuais: CrmPropostaOpcao[] = opcoes.filter((o) => o.nome.trim()).map((o, i) => ({
    id: o.tmpId, proposta_id: id, nome: o.nome.trim(),
    itens: o.itensTexto.split("\n").map((x) => x.trim()).filter(Boolean),
    valor: o.valor.trim() ? parsearValor(o.valor) : null,
    tipo: o.tipo, imagem_url: o.imagem_url, ordem: i, created_at: "",
  }));

  return (
    <div style={{ padding: "28px 24px", maxWidth: 900, fontFamily: "var(--font-sans)" }}>
      {/* Header + Salvar no topo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <button onClick={estado.sair} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: 0 }}>
          ← Propostas
        </button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <SeloEstado temAlteracoes={estado.temAlteracoes} />
          <button onClick={() => setModalCopiar(true)} style={btn}>📋 Copiar texto</button>
          <button onClick={() => window.open(`/crm-proposta/${id}`, "_blank")} style={btn}>📄 PDF</button>
          {publicado && urlPagina && (
            <a href={urlPagina} target="_blank" rel="noopener noreferrer" style={{ ...btn, textDecoration: "none", display: "inline-block" }}>
              🔗 Ver página
            </a>
          )}
          <BotaoSalvarEstado temAlteracoes={estado.temAlteracoes} salvando={salvando} onClick={salvar} compacto />
        </div>
      </div>

      {msg && <div style={{ fontSize: 12, color: msg.startsWith("Erro") ? "#EF4444" : "#059669", marginBottom: 12 }}>{msg}</div>}

      {/* Dados */}
      <div style={secao}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 120px", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Título *</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Casamento Civil — Cobertura no cartório" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Categoria</label>
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} style={inputStyle}>
              <option value="">— sem categoria —</option>
              {categorias.filter((c) => c.ativo || c.id === categoriaId).map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Validade (dias)</label>
            <input value={validadeDias} onChange={(e) => setValidadeDias(e.target.value.replace(/\D/g, ""))} placeholder="ex.: 15" inputMode="numeric" style={inputStyle} />
          </div>
        </div>
        <label style={labelStyle}>Descrição</label>
        <RichTextEditor value={descricaoHtml} onChange={setDescricaoHtml} minHeight={140} />
      </div>

      {/* Opções */}
      <div style={secao}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text-primary)", flex: 1 }}>Opções da proposta</div>
          <button onClick={() => novaOpcao("pacote")} style={btn}>+ Opção</button>
          <button onClick={() => novaOpcao("adicional")} style={btn}>+ Adicional</button>
        </div>
        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 14px" }}>
          Opções são os pacotes principais (ex.: “Cobertura no cartório”, “Cartório + jantar”); adicionais são extras (ex.: “Hora adicional”).
        </p>
        {opcoes.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", padding: "10px 0" }}>Nenhuma opção ainda.</div>
        )}
        {opcoes.map((o, i) => (
          <div key={o.tmpId} style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "14px 16px", marginBottom: 10, background: "var(--color-background-secondary)" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: o.tipo === "pacote" ? "rgba(37,99,235,0.1)" : "rgba(217,119,6,0.12)", color: o.tipo === "pacote" ? "#2563EB" : "#B45309" }}>
                {o.tipo === "pacote" ? "OPÇÃO" : "ADICIONAL"}
              </span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                <button onClick={() => moverOpcao(o.tmpId, -1)} disabled={i === 0} style={{ ...btn, padding: "4px 9px", opacity: i === 0 ? 0.35 : 1 }}>↑</button>
                <button onClick={() => moverOpcao(o.tmpId, 1)} disabled={i === opcoes.length - 1} style={{ ...btn, padding: "4px 9px", opacity: i === opcoes.length - 1 ? 0.35 : 1 }}>↓</button>
                <button onClick={() => setOpcoes((prev) => prev.filter((x) => x.tmpId !== o.tmpId))} style={{ ...btn, padding: "4px 9px", color: "#EF4444" }}>✕</button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 140px 130px", gap: 12, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>Nome</label>
                <input value={o.nome} onChange={(e) => mudarOpcao(o.tmpId, { nome: e.target.value })} placeholder={o.tipo === "pacote" ? "Ex.: Cobertura no cartório" : "Ex.: Hora adicional"} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Valor (R$)</label>
                <input value={o.valor} onChange={(e) => mudarOpcao(o.tmpId, { valor: mascaraValor(e.target.value) })} placeholder="0,00" inputMode="numeric" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Tipo</label>
                <select value={o.tipo} onChange={(e) => mudarOpcao(o.tmpId, { tipo: e.target.value as "pacote" | "adicional" })} style={inputStyle}>
                  <option value="pacote">Opção</option>
                  <option value="adicional">Adicional</option>
                </select>
              </div>
            </div>
            <label style={labelStyle}>O que inclui (um item por linha)</label>
            <textarea value={o.itensTexto} onChange={(e) => mudarOpcao(o.tmpId, { itensTexto: e.target.value })} rows={3}
              placeholder={"Cobertura fotográfica da cerimônia\nFotos em alta resolução\nGaleria online"}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
              {o.imagem_url
                ? <img src={o.imagem_url} alt="" style={{ width: 64, height: 44, objectFit: "cover", borderRadius: 6 }} />
                : <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Sem imagem</span>}
              <label style={{ ...btn, display: "inline-block" }}>
                {enviandoImg === o.tmpId ? "Enviando…" : o.imagem_url ? "Trocar imagem" : "Enviar imagem"}
                <input type="file" accept="image/*" style={{ display: "none" }}
                  onChange={(e) => subirImagemOpcao(o.tmpId, e.target.files)} />
              </label>
              {o.imagem_url && (
                <button onClick={() => mudarOpcao(o.tmpId, { imagem_url: null })} style={{ ...btn, color: "#EF4444" }}>Remover</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Texto da mensagem */}
      <div style={secao}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 4 }}>Texto da mensagem (WhatsApp)</div>
        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 10px" }}>
          Modelo usado no “Copiar texto”. As variáveis são preenchidas na hora, com os dados acima.
        </p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {VARIAVEIS_PROPOSTA.map((v) => (
            <button key={v} onClick={() => inserirVariavel(v)} style={{ ...btn, padding: "4px 10px", fontSize: 11 }}>
              {`{{${v}}}`}
            </button>
          ))}
        </div>
        <textarea value={textoMensagem} onChange={(e) => setTextoMensagem(e.target.value)} rows={12}
          style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.55 }} />
      </div>

      {/* Página pública */}
      <div style={secao}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text-primary)", flex: 1 }}>Página pública da proposta</div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer" }}>
            <input type="checkbox" checked={publicado} onChange={(e) => setPublicado(e.target.checked)} />
            Publicada
          </label>
        </div>
        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 12px" }}>
          O link fica em <strong>/proposta/{slug ? slugifySite(slug) : "…"}</strong> no seu site. As opções acima entram
          automaticamente como pacotes no fim da página; os blocos abaixo são a apresentação (fotos, textos).
        </p>
        <div style={{ marginBottom: 14, maxWidth: 380 }}>
          <label style={labelStyle}>Endereço (slug)</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} onBlur={() => setSlug((s) => slugifySite(s))}
            placeholder="ex.: casamento-civil" style={inputStyle} />
        </div>
        <EditorBlocos blocos={blocos} onChange={setBlocos} fotografoId={fotografo.id} pasta={`propostas/${id}`} />
      </div>

      {/* Salvar no rodapé */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center" }}>
        <SeloEstado temAlteracoes={estado.temAlteracoes} />
        <BotaoSalvarEstado temAlteracoes={estado.temAlteracoes} salvando={salvando} onClick={salvar} />
      </div>

      {modalCopiar && (
        <ModalCopiarTexto
          proposta={propostaAtual}
          opcoes={opcoesAtuais}
          nomeEmpresa={fotografo.nome_empresa ?? ""}
          link={publicado && urlPagina ? urlPagina : null}
          onFechar={() => setModalCopiar(false)}
        />
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
