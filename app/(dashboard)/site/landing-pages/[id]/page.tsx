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
import { dadosParaBlocos, CATALOGO_BLOCOS, type SiteBloco } from "@/lib/site/blocos";
import { EditorBlocos } from "@/app/(dashboard)/site/_components/EditorBlocos";
import { PreviewSite, BarraDispositivo, type Dispositivo } from "@/app/(dashboard)/site/_components/PreviewSite";
import { Chave, Seg } from "@/app/(dashboard)/site/_components/ControlesUI";
import { RenderBlocos, type ContextoBlocos } from "@/app/sites/[fid]/_components/RenderBlocos";
import { getTema } from "@/lib/site/temas";
import { normalizarDesign, DESIGN_PADRAO, type ConfigDesign } from "@/lib/site/design";
import { nomeCategoria } from "@/lib/site/categorias";
import { urlPublicaSite, type ConfigUrl } from "@/lib/site/urlPublica";
import { ConfigPaginaModal } from "@/app/(dashboard)/site/_components/ConfigPaginaModal";
import type { ConfigPaginaValores } from "@/lib/site/seo";
import type { SiteLandingPage, SiteLandingDados, SiteDepoimento } from "@/lib/supabase/types";

// Blocos que não fazem sentido no papel — vêm desmarcados na hora de gerar o PDF.
const SEM_SENTIDO_NO_PDF = new Set(["formulario", "botao", "whatsapp", "video"]);

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
  // Identificação: 'nenhum' (livre) · 'pagina' (identifica p/ ver a página inteira) · 'valores' (página aberta, só os preços atrás do gate)
  const [identificacaoModo, setIdentificacaoModo] = useState<"nenhum" | "pagina" | "valores">("nenhum");
  // Proposta em PDF vinculada à landing (é ela que vai por e-mail no modo "valores")
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfGeradoEm, setPdfGeradoEm] = useState<string | null>(null);
  const [pdfDesatualizado, setPdfDesatualizado] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [escolherBlocos, setEscolherBlocos] = useState(false);       // modal "o que entra no PDF"
  const [blocosPdf, setBlocosPdf] = useState<Set<string>>(new Set()); // ids marcados
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
      setBaseline(snapshot("", "", false, snapSeo("", "", "", true, "", "", null), [], "nenhum"));
      setCarregando(false);
      return;
    }

    supabase.from("site_landing_pages").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (!data) { setMsg("Erro: landing não encontrada."); setCarregando(false); return; }
      const lp = data as SiteLandingPage;
      setTitulo(lp.titulo); setSlug(lp.slug); setPublicado(lp.publicado);
      setIdentificacaoModo(lp.identificacao_modo ?? (lp.identificacao_obrigatoria ? "pagina" : "nenhum"));
      setSeoTitle(lp.seo_title ?? ""); setSeoDesc(lp.seo_description ?? "");
      setSeoKw(lp.seo_keywords ?? ""); setSeoNoindex(lp.seo_noindex ?? true);
      setOgTitle(lp.og_title ?? ""); setOgDesc(lp.og_description ?? ""); setOgImage(lp.og_image_url);
      setPdfUrl(lp.pdf_url ?? null); setPdfGeradoEm(lp.pdf_gerado_em ?? null);
      // O PDF envelhece quando a página é salva depois dele.
      setPdfDesatualizado(!!lp.pdf_gerado_em && new Date(lp.updated_at) > new Date(lp.pdf_gerado_em));
      const d = (lp.dados ?? {}) as SiteLandingDados;
      setDadosOriginais(d);
      const bl = d.blocos && d.blocos.length > 0 ? d.blocos : dadosParaBlocos(d);
      setBlocos(bl);
      setBaseline(snapshot(lp.titulo, lp.slug, lp.publicado, snapSeo(lp.seo_title ?? "", lp.seo_description ?? "", lp.seo_keywords ?? "", lp.seo_noindex ?? true, lp.og_title ?? "", lp.og_description ?? "", lp.og_image_url), bl, lp.identificacao_modo ?? (lp.identificacao_obrigatoria ? "pagina" : "nenhum")));
      setCarregando(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, fotografo, ehNova]);

  // Snapshot do estado editável → string, para comparar e detectar alterações não salvas.
  function snapSeo(st: string, sd: string, kw: string, ni: boolean, ot: string, od: string, oi: string | null) {
    return { st, sd, kw, ni, ot, od, oi };
  }
  function snapshot(t: string, s: string, pub: boolean, seo: ReturnType<typeof snapSeo>, bl: SiteBloco[], ident: string) {
    return JSON.stringify({ t, s, pub, seo, bl, ident });
  }
  const estadoAtual = snapshot(titulo, slug, publicado, snapSeo(seoTitle, seoDesc, seoKw, seoNoindex, ogTitle, ogDesc, ogImage), blocos, identificacaoModo);
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
      identificacao_modo: identificacaoModo,
      identificacao_obrigatoria: identificacaoModo !== "nenhum", // legado sincronizado
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
    setBaseline(snapshot(titulo.trim(), s, publicado, snapSeo(seoTitle, seoDesc, seoKw, seoNoindex, ogTitle, ogDesc, ogImage), blocos, identificacaoModo)); // zera o "não salvo"
    if (pdfGeradoEm) setPdfDesatualizado(true); // a página mudou depois do PDF
    setMsg("Página salva!");
    return true;
  }

  // Gera a proposta em PDF com os blocos escolhidos e vincula à landing (é o arquivo que vai
  // por e-mail a quem pede os valores). Exige a página salva: o PDF sai do que está no banco.
  async function gerarPdf() {
    if (!criada) { setMsg("Erro: salve a página antes de gerar o PDF."); return; }
    setEscolherBlocos(false);
    setGerandoPdf(true); setMsg(null);
    try {
      const res = await fetch("/api/site/landing-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ landing_id: id, blocos: [...blocosPdf] }),
      });
      const json = await res.json();
      if (!res.ok) { setMsg("Erro: " + (json.erro ?? "não foi possível gerar o PDF.")); return; }
      setPdfUrl(json.pdf_url ?? null);
      setPdfGeradoEm(json.pdf_gerado_em ?? new Date().toISOString());
      setPdfDesatualizado(false);
      setMsg("Proposta em PDF gerada!");
    } catch {
      setMsg("Erro de conexão ao gerar o PDF.");
    } finally {
      setGerandoPdf(false);
    }
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

        {/* IDENTIFICAÇÃO — capta quem abriu a proposta (nome/WhatsApp/e-mail). A lista aparece em
            "👥 Quem acessou" na listagem de landings. */}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--color-border-tertiary)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 8 }}>Identificação do visitante</div>
          <Seg
            value={identificacaoModo}
            onChange={(v) => setIdentificacaoModo(v)}
            options={[
              { v: "nenhum", l: "Sem pedir" },
              { v: "valores", l: "Só os valores" },
              { v: "pagina", l: "Página inteira" },
            ]}
          />
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 8, lineHeight: 1.6 }}>
            {identificacaoModo === "nenhum" && "Acesso livre — a página abre sem pedir dados."}
            {identificacaoModo === "valores" && <>A página abre normalmente (ótimo para o Google), mas os <strong>valores</strong> (blocos Pacote, Pacotes e Formas de pagamento) aparecem como <strong>R$ ?????</strong> com um botão <strong>“Ver valores”</strong>. Quem clicar informa nome, WhatsApp e e-mail (os três obrigatórios) e <strong>recebe a proposta em PDF por e-mail</strong> — os valores <strong>não</strong> aparecem na tela, é isso que garante um e-mail válido. Você recebe um aviso na hora e o contato entra em <strong>“Quem acessou”</strong>.</>}
            {identificacaoModo === "pagina" && <>Para <strong>ver a proposta</strong>, o visitante se identifica antes (nome, WhatsApp, e-mail opcional). Bom para propostas privadas enviadas por link. <strong>Não combine com indexação no Google</strong> — o buscador veria só o formulário; para indexar, use “Só os valores”.</>}
          </div>

          {/* PROPOSTA EM PDF — o arquivo enviado a quem pede os valores */}
          {identificacaoModo === "valores" && (
            <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 6 }}>📄 Proposta em PDF</div>

              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.55, marginBottom: 10 }}>
                {!pdfGeradoEm ? (
                  <span style={{ color: "#B45309", fontWeight: 600 }}>⚠ Nenhum PDF gerado — gere para quem pedir os valores receber a proposta.</span>
                ) : pdfDesatualizado ? (
                  <span style={{ color: "#B45309", fontWeight: 600 }}>⚠ PDF desatualizado — a página mudou depois que ele foi gerado. Gere de novo.</span>
                ) : (
                  <>✓ PDF gerado em {new Date(pdfGeradoEm).toLocaleDateString("pt-BR")} às {new Date(pdfGeradoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.</>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  onClick={() => { setBlocosPdf(new Set(blocos.filter((b) => !SEM_SENTIDO_NO_PDF.has(b.tipo)).map((b) => b.id))); setEscolherBlocos(true); }}
                  disabled={gerandoPdf || temAlteracoes || !criada}
                  title={temAlteracoes ? "Salve as alterações antes de gerar" : "Escolher o que entra e gerar o PDF"}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: gerandoPdf || temAlteracoes || !criada ? "var(--color-border-secondary)" : "#111", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: gerandoPdf || temAlteracoes || !criada ? "default" : "pointer" }}
                >
                  {gerandoPdf ? "Gerando…" : pdfGeradoEm ? "Gerar novamente" : "Gerar PDF"}
                </button>
                {pdfUrl && (
                  <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                    style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", fontSize: 12.5, fontWeight: 600, color: "var(--color-text-primary)", textDecoration: "none" }}>
                    👁 Abrir PDF
                  </a>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-secondary)", marginTop: 6, lineHeight: 1.5 }}>
                {temAlteracoes
                  ? "Salve a página primeiro — o PDF sai do conteúdo salvo."
                  : "Ao gerar, você escolhe quais blocos entram na proposta (a galeria de fotos, por exemplo, pode ficar de fora)."}
              </div>
            </div>
          )}
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

      {/* O que entra no PDF — o fotógrafo escolhe os blocos antes de abrir a impressão */}
      {escolherBlocos && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
          onClick={() => setEscolherBlocos(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", borderRadius: 14, width: "100%", maxWidth: 460, maxHeight: "84vh", display: "flex", flexDirection: "column", boxShadow: "0 10px 40px rgba(0,0,0,0.2)", overflow: "hidden" }}>
            <div style={{ padding: "18px 20px 10px" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)" }}>📄 O que entra no PDF</div>
              <div style={{ fontSize: 12.5, color: "var(--color-text-secondary)", marginTop: 4, lineHeight: 1.5 }}>
                Desmarque o que não deve aparecer na proposta (ex.: galeria de fotos). Os valores entram sempre.
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 20px" }}>
              {blocos.map((b) => {
                const rot = CATALOGO_BLOCOS.find((c) => c.tipo === b.tipo);
                const d = b.dados;
                const resumo = d.titulo || d.nome || d.texto || (d.html ? d.html.replace(/<[^>]+>/g, " ").trim().slice(0, 50) : "") || "";
                const marcado = blocosPdf.has(b.id);
                return (
                  <label key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--color-border-tertiary)", cursor: "pointer" }}>
                    <input type="checkbox" checked={marcado}
                      onChange={() => setBlocosPdf((prev) => {
                        const n = new Set(prev);
                        if (n.has(b.id)) n.delete(b.id); else n.add(b.id);
                        return n;
                      })} />
                    <span style={{ fontSize: 15 }}>{rot?.icone ?? "▪"}</span>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{rot?.label ?? b.tipo}</span>
                      {resumo && <span style={{ display: "block", fontSize: 11.5, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{resumo}</span>}
                    </span>
                  </label>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "12px 20px", borderTop: "1px solid var(--color-border-tertiary)" }}>
              <button onClick={() => setBlocosPdf(new Set(blocos.map((b) => b.id)))}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12.5, color: "var(--color-text-primary)", cursor: "pointer" }}>
                Marcar todos
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setEscolherBlocos(false)}
                  style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12.5, color: "var(--color-text-secondary)", cursor: "pointer" }}>
                  Cancelar
                </button>
                <button onClick={gerarPdf} disabled={blocosPdf.size === 0}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: blocosPdf.size === 0 ? "var(--color-border-secondary)" : "#111", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: blocosPdf.size === 0 ? "default" : "pointer" }}>
                  Gerar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
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
