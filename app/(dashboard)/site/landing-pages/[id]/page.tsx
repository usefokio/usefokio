"use client";

// EDITOR da landing page — 2 COLUNAS (regra de UI do sistema): à esquerda os controles
// (identificação/SEO + EditorBlocos compartilhado com a Aparência), à direita a PRÉVIA AO
// VIVO usando os MESMOS componentes do site real, com barra PC/Tablet/Celular.
// A landing não mostra o header do site → a prévia usa semHeader.
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { useFotografo } from "@/lib/context/FotografoContext";
import { useUnsavedGuard } from "@/lib/hooks/useUnsavedGuard";
import { useWindowWidth } from "@/lib/hooks/useWindowWidth";
import { dadosParaBlocos, type SiteBloco } from "@/lib/site/blocos";
import { EditorBlocos } from "@/app/(dashboard)/site/_components/EditorBlocos";
import { PreviewSite, BarraDispositivo, type Dispositivo } from "@/app/(dashboard)/site/_components/PreviewSite";
import { Chave } from "@/app/(dashboard)/site/_components/ControlesUI";
import { RenderBlocos, type ContextoBlocos } from "@/app/sites/[fid]/_components/RenderBlocos";
import { getTema } from "@/lib/site/temas";
import { normalizarDesign, DESIGN_PADRAO, type ConfigDesign } from "@/lib/site/design";
import { nomeCategoria } from "@/lib/site/categorias";
import { urlPublicaSite, type ConfigUrl } from "@/lib/site/urlPublica";
import { ConfigPaginaModal } from "@/app/(dashboard)/site/_components/ConfigPaginaModal";
import type { ConfigPaginaValores } from "@/lib/site/seo";
import type { SiteLandingPage, SiteLandingDados, SiteDepoimento } from "@/lib/supabase/types";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 11px", borderRadius: 8, boxSizing: "border-box",
  border: "1px solid var(--color-border-secondary)", fontSize: 13,
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)",
  textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4,
};
const btnPeq: React.CSSProperties = {
  padding: "6px 11px", borderRadius: 8, border: "1px solid var(--color-border-secondary)",
  background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer",
};

function slugifyUrl(v: string) {
  return v.normalize("NFD").replace(/[^\x20-\x7E]/g, "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export default function EditorLandingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idRota } = use(params);
  const router = useRouter();
  const { fotografo } = useFotografo();

  // Modo CRIAÇÃO: /site/landing-pages/nova abre o editor em branco e só grava no primeiro
  // Salvar. (Antes o botão "+ Nova" já inseria no banco, e sair sem salvar deixava rascunho.)
  const ehNova = idRota === "nova";
  // id definitivo já aqui: serve de pasta de upload antes do primeiro save, e vira o id da linha.
  const [id] = useState(() => (ehNova ? crypto.randomUUID() : idRota));
  const [criada, setCriada] = useState(!ehNova); // false enquanto a linha não existe no banco

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [dadosOriginais, setDadosOriginais] = useState<SiteLandingDados>({});
  const [baseline, setBaseline] = useState("");   // snapshot do estado salvo (detecção de "não salvo")
  const [saiu, setSaiu] = useState(false);         // desliga o guard após salvar+sair/excluir

  const [titulo, setTitulo] = useState("");
  const [slug, setSlug] = useState("");
  const [publicado, setPublicado] = useState(false);
  const [identificacao, setIdentificacao] = useState(false);  // exige nome/WhatsApp/e-mail para abrir
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [seoKw, setSeoKw] = useState("");
  const [seoNoindex, setSeoNoindex] = useState(true);   // landing nasce fora do Google (opt-in a indexar)
  const [ogTitle, setOgTitle] = useState("");
  const [ogDesc, setOgDesc] = useState("");
  const [ogImage, setOgImage] = useState<string | null>(null);
  const [configAberto, setConfigAberto] = useState(false);
  const [dominio, setDominio] = useState("seusite.usefokio.com.br");

  const [blocos, setBlocos] = useState<SiteBloco[]>([]);
  const [cfgSite, setCfgSite] = useState<ConfigUrl | null>(null);

  // ── Prévia ao vivo: tema/design do site + contexto dos blocos (o mesmo do público) ──
  const [disp, setDisp] = useState<Dispositivo>("pc");
  const [design, setDesign] = useState<ConfigDesign>(DESIGN_PADRAO);
  const [temaId, setTemaId] = useState<string | null>(null);
  const [ctx, setCtx] = useState<ContextoBlocos | null>(null);
  const largura = useWindowWidth();
  const duasColunas = largura >= 1100;

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    supabase.from("site_config").select("subdominio, dominio_customizado, publicado, design, tema").eq("fotografo_id", fotografo.id).maybeSingle().then(({ data }) => {
      setCfgSite((data as ConfigUrl) ?? null);
      if (data) {
        setDominio(data.dominio_customizado || (data.subdominio ? `${data.subdominio}.usefokio.com.br` : "seusite.usefokio.com.br"));
        setDesign(normalizarDesign((data as { design?: unknown }).design));
        setTemaId((data as { tema?: string | null }).tema ?? null);
      }
    });

    // Contexto dos blocos igual ao do site público (contextoBlocos é server; aqui monta no client).
    (async () => {
      const [{ data: f }, deps, trabalhos, { data: catsConta }] = await Promise.all([
        supabase.from("fotografos").select("whatsapp").eq("id", fotografo.id).maybeSingle(),
        fetchAllRows<SiteDepoimento>((s, from, to) =>
          s.from("site_depoimentos").select("*").eq("fotografo_id", fotografo.id).eq("publicado", true)
            .order("ordem").range(from, to), supabase),
        fetchAllRows<{ categoria: string }>((s, from, to) =>
          s.from("site_trabalhos").select("categoria").eq("fotografo_id", fotografo.id).eq("publicado", true).range(from, to), supabase),
        supabase.from("site_categorias").select("slug, nome").eq("fotografo_id", fotografo.id),
      ]);
      // Nome da categoria vem da conta (mesma regra do público: nomeCategoria(slug, map))
      const map: Record<string, string> = {};
      for (const c of (catsConta ?? []) as { slug: string; nome: string }[]) map[c.slug] = c.nome;
      const cats = [...new Set(trabalhos.map((t) => t.categoria).filter(Boolean))];
      setCtx({
        base: "",
        fid: fotografo.id,
        depoimentos: deps.slice(0, 4),
        whatsappFallback: (f as { whatsapp?: string | null } | null)?.whatsapp ?? null,
        categorias: cats.map((c) => ({ valor: c, label: nomeCategoria(c, map) })),
      });
    })();

    // Landing nova: nada a carregar — abre em branco, com baseline vazio (nada "não salvo").
    if (ehNova) {
      setBaseline(snapshot("", "", false, snapSeo("", "", "", true, "", "", null), [], false));
      setCarregando(false);
      return;
    }

    supabase.from("site_landing_pages").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (!data) { setMsg("Erro: landing não encontrada."); setCarregando(false); return; }
      const lp = data as SiteLandingPage;
      setTitulo(lp.titulo); setSlug(lp.slug); setPublicado(lp.publicado);
      setIdentificacao(lp.identificacao_obrigatoria ?? false);
      setSeoTitle(lp.seo_title ?? ""); setSeoDesc(lp.seo_description ?? "");
      setSeoKw(lp.seo_keywords ?? ""); setSeoNoindex(lp.seo_noindex ?? true);
      setOgTitle(lp.og_title ?? ""); setOgDesc(lp.og_description ?? ""); setOgImage(lp.og_image_url);
      const d = (lp.dados ?? {}) as SiteLandingDados;
      setDadosOriginais(d);
      const bl = d.blocos && d.blocos.length > 0 ? d.blocos : dadosParaBlocos(d);
      setBlocos(bl);
      setBaseline(snapshot(lp.titulo, lp.slug, lp.publicado, snapSeo(lp.seo_title ?? "", lp.seo_description ?? "", lp.seo_keywords ?? "", lp.seo_noindex ?? true, lp.og_title ?? "", lp.og_description ?? "", lp.og_image_url), bl, lp.identificacao_obrigatoria ?? false));
      setCarregando(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, fotografo, ehNova]);

  // Snapshot do estado editável → string, para comparar e detectar alterações não salvas.
  function snapSeo(st: string, sd: string, kw: string, ni: boolean, ot: string, od: string, oi: string | null) {
    return { st, sd, kw, ni, ot, od, oi };
  }
  function snapshot(t: string, s: string, pub: boolean, seo: ReturnType<typeof snapSeo>, bl: SiteBloco[], ident: boolean) {
    return JSON.stringify({ t, s, pub, seo, bl, ident });
  }
  const estadoAtual = snapshot(titulo, slug, publicado, snapSeo(seoTitle, seoDesc, seoKw, seoNoindex, ogTitle, ogDesc, ogImage), blocos, identificacao);
  const temAlteracoes = !saiu && !carregando && estadoAtual !== baseline;
  const { modalAberto, setModalAberto, pedirSaida, irParaDestino } = useUnsavedGuard(temAlteracoes);

  // Persiste no banco. Retorna true em sucesso (para o fluxo "salvar e sair").
  // Primeiro Salvar de uma landing nova = INSERT (com o id gerado no cliente); depois, UPDATE.
  async function salvar(): Promise<boolean> {
    if (!fotografo) return false;
    // O NOME é obrigatório: é ele que dá título à página e gera o endereço (/nome-da-pagina).
    if (!titulo.trim()) { setMsg("Erro: dê um nome para a página antes de salvar."); return false; }
    const s = slugifyUrl(slug) || slugifyUrl(titulo);
    if (!s) { setMsg("Erro: o nome precisa ter letras ou números (é ele que vira o endereço)."); return false; }
    setSalvando(true); setMsg(null);
    const supabase = createClient();
    const campos = {
      titulo: titulo.trim(),
      slug: s,
      publicado,
      identificacao_obrigatoria: identificacao,
      dados: { ...dadosOriginais, blocos },
      seo_title: seoTitle.trim() || null,
      seo_description: seoDesc.trim() || null,
      seo_keywords: seoKw.trim() || null,
      seo_noindex: seoNoindex,
      og_title: ogTitle.trim() || null,
      og_description: ogDesc.trim() || null,
      og_image_url: ogImage,
      updated_at: new Date().toISOString(),
    };
    const { error } = criada
      ? await supabase.from("site_landing_pages").update(campos).eq("id", id)
      : await supabase.from("site_landing_pages").insert({ id, fotografo_id: fotografo.id, ...campos });
    setSalvando(false);
    if (error) { setMsg("Erro: " + error.message); return false; }
    if (!criada) {
      setCriada(true);
      // troca a URL /nova → /{id} sem recarregar (o editor já está com o estado certo)
      window.history.replaceState(null, "", `/site/landing-pages/${id}`);
    }
    setSlug(s);
    setTitulo(titulo.trim());
    setBaseline(snapshot(titulo.trim(), s, publicado, snapSeo(seoTitle, seoDesc, seoKw, seoNoindex, ogTitle, ogDesc, ogImage), blocos, identificacao)); // zera o "não salvo"
    setMsg("Página salva!");
    return true;
  }

  async function salvarESair() {
    if (await salvar()) { setSaiu(true); irParaDestino("/site/landing-pages"); }
  }

  function handleSair() {
    if (temAlteracoes) pedirSaida("/site/landing-pages");
    else router.push("/site/landing-pages");
  }

  async function excluir() {
    // Ainda não salva: não há o que excluir no banco — só descarta e volta.
    if (!criada) { setSaiu(true); router.push("/site/landing-pages"); return; }
    if (!confirm("Excluir esta landing page? A URL dela deixará de existir.")) return;
    const supabase = createClient();
    await supabase.from("site_landing_pages").delete().eq("id", id);
    setSaiu(true);
    router.push("/site/landing-pages");
  }

  // Ponte para o modal de Configurações (SEO/redes/indexação) — mesmo componente de posts/páginas.
  const valores: ConfigPaginaValores = {
    slug, mostrar_data: false, modo_exibicao: "lista",
    seo_title: seoTitle, seo_description: seoDesc, seo_keywords: seoKw, seo_noindex: seoNoindex,
    og_title: ogTitle, og_description: ogDesc, og_image_url: ogImage,
  };
  const setValores = (patch: Partial<ConfigPaginaValores>) => {
    if (patch.slug !== undefined) setSlug(patch.slug);
    if (patch.seo_title !== undefined) setSeoTitle(patch.seo_title);
    if (patch.seo_description !== undefined) setSeoDesc(patch.seo_description);
    if (patch.seo_keywords !== undefined) setSeoKw(patch.seo_keywords);
    if (patch.seo_noindex !== undefined) setSeoNoindex(patch.seo_noindex);
    if (patch.og_title !== undefined) setOgTitle(patch.og_title);
    if (patch.og_description !== undefined) setOgDesc(patch.og_description);
    if (patch.og_image_url !== undefined) setOgImage(patch.og_image_url);
  };

  if (carregando) return <div style={{ padding: 60, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;

  // Botão Salvar reflete o estado: destacado quando há alterações; "Salvo ✓" (esmaecido) quando limpo.
  // Sem nome não dá para salvar (é ele que gera o endereço) — o botão explica o porquê.
  const semNome = !titulo.trim();
  const podeSalvar = temAlteracoes && !semNome;
  const btnSalvar = (
    <button onClick={() => salvar()} disabled={salvando || !podeSalvar}
      title={semNome ? "Dê um nome para a página antes de salvar" : undefined}
      style={{
        padding: "10px 22px", borderRadius: 9, border: "none", fontSize: 13, fontWeight: 700,
        cursor: salvando || !podeSalvar ? "default" : "pointer",
        background: podeSalvar ? "#2563EB" : "var(--color-background-tertiary)",
        color: podeSalvar ? "#fff" : "var(--color-text-secondary)",
      }}>
      {salvando ? "Salvando…" : semNome ? "Dê um nome à página" : temAlteracoes ? "Salvar alterações" : "Salvo ✓"}
    </button>
  );

  // Selo de estado (não salvo / tudo salvo)
  const seloEstado = (
    <span style={{
      fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
      background: temAlteracoes ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.12)",
      color: temAlteracoes ? "#B45309" : "#059669",
    }}>
      {temAlteracoes ? "● Alterações não salvas" : "✓ Tudo salvo"}
    </span>
  );

  const tema = getTema(temaId);
  const nomeSite = fotografo?.nome_empresa || "Seu Estúdio";

  // Prévia ao vivo — mesmo chassi da Aparência, mas SEM header (landing não tem menu do site)
  const previa = (
    <>
      <BarraDispositivo disp={disp} onChange={setDisp} />
      <PreviewSite design={design} menu={[]} nome={nomeSite} logoUrl={design.logo_url ?? null}
        disp={disp} tema={tema} semHeader>
        {ctx
          ? <RenderBlocos blocos={blocos} ctx={ctx} />
          : <div style={{ padding: 40, textAlign: "center", fontSize: 13, opacity: 0.6 }}>Carregando prévia…</div>}
      </PreviewSite>
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 8, textAlign: "center" }}>
        Prévia ao vivo — é assim que a página fica publicada.
      </div>
    </>
  );

  return (
    <div style={{ maxWidth: duasColunas ? 1500 : 860, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, gap: 10, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
          {criada ? "Editor da landing page" : "Nova landing page"}
        </h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {seloEstado}
          {/* Só existe link público depois de salva E publicada — em rascunho a rota pública
              devolve 404 (ela filtra por publicado), então o botão fica travado em vez de
              mandar o fotógrafo para uma página de erro. */}
          {fotografo && criada && (
            publicado && !temAlteracoes ? (
              <a href={urlPublicaSite(cfgSite, fotografo.id, `/${slugifyUrl(slug)}`)} target="_blank" rel="noopener noreferrer" style={{ ...btnPeq, textDecoration: "none" }}>
                👁 Ver página
              </a>
            ) : (
              <span title={publicado ? "Salve as alterações para ver a página no ar" : "A página está como rascunho — publique para abrir no navegador"}
                style={{ ...btnPeq, opacity: 0.5, cursor: "default" }}>
                👁 Ver página
              </span>
            )
          )}
          <button onClick={() => setConfigAberto(true)} title="Configurações da página (SEO, redes sociais, indexação)" style={btnPeq}>
            ⚙ Configurações
          </button>
          {btnSalvar}
        </div>
      </div>
      <button onClick={handleSair} style={{ border: "none", background: "transparent", color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 14 }}>
        ← Voltar para a lista
      </button>

      {/* NOME — obrigatório e é ele que gera o endereço (/nome-da-pagina). Numa landing já
          salva o endereço NÃO muda sozinho: link publicado nunca quebra por renomear (SEO). */}
      <div style={{ background: "var(--color-background-primary)", border: "1px solid var(--color-border-tertiary)", borderRadius: 12, padding: "16px 18px", marginBottom: 18 }}>
        <label style={labelStyle}>Nome da página *</label>
        <input
          value={titulo}
          onChange={(e) => {
            const v = e.target.value;
            setTitulo(v);
            // enquanto não foi salva, o endereço acompanha o nome; depois, só muda no ⚙ Configurações
            if (!criada) setSlug(slugifyUrl(v));
          }}
          placeholder="Ex.: Orçamento de Casamento 2026"
          autoFocus={!criada}
          style={{ ...inputStyle, fontSize: 15, fontWeight: 600 }}
        />
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 8, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span>Endereço:</span>
          <code style={{ background: "var(--color-background-secondary)", padding: "2px 7px", borderRadius: 6, fontSize: 12 }}>
            {dominio}/{slugifyUrl(slug) || slugifyUrl(titulo) || "…"}
          </code>
          {criada
            ? <button onClick={() => setConfigAberto(true)} style={{ background: "none", border: "none", color: "#2563EB", fontSize: 12, cursor: "pointer", padding: 0 }}>alterar</button>
            : <span style={{ opacity: 0.75 }}>— gerado a partir do nome</span>}
        </div>

        {/* PUBLICAÇÃO — enquanto está como rascunho o endereço acima devolve 404. A troca só vai
            ao ar no Salvar explícito (nunca auto-publica ao clicar na chave). */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--color-border-tertiary)" }}>
          <Chave on={publicado} onChange={setPublicado} titulo="Publicar esta página" />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>
              {publicado ? "Publicada — o endereço acima abre no navegador" : "Rascunho — o endereço acima ainda não abre"}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
              {publicado
                ? "A página fica acessível por quem tem o link. Ela continua fora do Google enquanto “não indexar” estiver ligado em ⚙ Configurações."
                : "Ligue a chave e clique em Salvar para colocar a página no ar."}
            </div>
          </div>
        </div>

        {/* IDENTIFICAÇÃO — capta quem abriu a proposta (nome/WhatsApp/e-mail) antes de revelar o conteúdo. */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--color-border-tertiary)" }}>
          <Chave on={identificacao} onChange={setIdentificacao} titulo="Exigir identificação" />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>
              {identificacao ? "Pede nome, WhatsApp e e-mail para abrir" : "Acesso livre (sem pedir dados)"}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
              Quando ligado, quem abrir o link se identifica antes de ver a proposta e você recebe a lista de contatos em <strong>“Quem acessou”</strong> na lista de páginas.
            </div>
          </div>
        </div>
      </div>

      {/* Coluna estreita: prévia ACIMA dos controles (para ver o resultado sem rolar até o fim) */}
      {!duasColunas && <div style={{ marginBottom: 22 }}>{previa}</div>}

      <div style={duasColunas
        ? { display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 28, alignItems: "start" }
        : undefined}>

        {/* ── COLUNA ESQUERDA: controles ── */}
        <div style={{ minWidth: 0 }}>
          {/* Lista de blocos + paleta (componente compartilhado com a Aparência) */}
          {fotografo && (
            <EditorBlocos
              blocos={blocos}
              onChange={setBlocos}
              fotografoId={fotografo.id}
              pasta={`landing/${id}`}
              acaoBloco={
                <button onClick={() => salvar()} disabled={salvando || !podeSalvar}
                  title={semNome ? "Dê um nome para a página antes de salvar" : undefined}
                  style={{ padding: "6px 16px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 700,
                    cursor: salvando || !podeSalvar ? "default" : "pointer",
                    background: podeSalvar ? "#2563EB" : "var(--color-background-tertiary)",
                    color: podeSalvar ? "#fff" : "var(--color-text-secondary)" }}>
                  {salvando ? "Salvando…" : semNome ? "Falta o nome" : temAlteracoes ? "Salvar" : "Salvo ✓"}
                </button>
              }
            />
          )}

          {/* SEO/redes/indexação ficam no modal ⚙ Configurações (cabeçalho) — mesmo padrão de posts/páginas. */}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, gap: 10, flexWrap: "wrap" }}>
            <button onClick={excluir} style={{ ...btnPeq, color: "#DC2626", borderColor: "#DC2626" }}>
              {criada ? "Excluir landing" : "Descartar"}
            </button>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {msg && <span style={{ fontSize: 13, fontWeight: 600, color: msg.startsWith("Erro") ? "#DC2626" : "#059669" }}>{msg}</span>}
              {btnSalvar}
            </div>
          </div>
        </div>

        {/* ── COLUNA DIREITA: prévia ao vivo (acompanha a rolagem) ── */}
        {duasColunas && (
          <div style={{ minWidth: 0, position: "sticky", top: 20 }}>{previa}</div>
        )}
      </div>

      {/* Modal de Configurações da página (SEO, redes sociais, indexação) */}
      {configAberto && fotografo && (
        <ConfigPaginaModal
          onFechar={() => setConfigAberto(false)}
          onSalvar={async () => { if (await salvar()) setConfigAberto(false); }}
          valores={valores}
          onChange={setValores}
          recursos={{ url: true }}
          urlPublica={`/${slug}`}
          dominio={dominio}
          tituloFallback={titulo}
          descricaoFallback={seoDesc}
          imagemFallback={ogImage}
          fotografoId={fotografo.id}
          salvando={salvando}
        />
      )}

      {/* Modal de alterações não salvas (ao tentar sair) */}
      {modalAberto && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
          onClick={() => setModalAberto(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: 24, maxWidth: 420, width: "100%", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 8 }}>⚠️ Alterações não salvas</div>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 20px", lineHeight: 1.6 }}>
              Você fez alterações nesta landing page que ainda não foram salvas. O que deseja fazer?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={salvarESair} disabled={salvando}
                style={{ padding: "11px", borderRadius: 9, border: "none", background: "#2563EB", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {salvando ? "Salvando…" : "Salvar e sair"}
              </button>
              <button onClick={() => { setSaiu(true); irParaDestino("/site/landing-pages"); }}
                style={{ padding: "11px", borderRadius: 9, border: "1px solid var(--color-border-secondary)", background: "transparent", color: "#DC2626", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Sair sem salvar
              </button>
              <button onClick={() => setModalAberto(false)}
                style={{ padding: "11px", borderRadius: 9, border: "none", background: "transparent", color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer" }}>
                Continuar editando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
