// VERSÃO PARA IMPRESSÃO da landing page — é a PRÓPRIA página (mesmo tema, mesmas fontes, mesmos
// blocos), preparada para o "Salvar como PDF" do navegador. O fotógrafo escolhe no editor quais
// blocos entram (?blocos=id1,id2) e salva o arquivo, que depois é anexado à landing.
//
// Protegida: só o dono abre. A landing pode estar no modo "só os valores" (preço escondido no
// site), então esta view — que mostra os VALORES REAIS — nunca pode ser pública.
import { notFound } from "next/navigation";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";
import { createAdminClient } from "@/lib/supabase/admin";
import { carregarSite, contextoBlocos } from "@/lib/site/publico";
import { getTema, temaCssVars } from "@/lib/site/temas";
import { normalizarDesign, getPar } from "@/lib/site/design";
import { classesFontes, FONTE_VAR } from "@/app/sites/[fid]/_fontes";
import { RenderBlocos } from "@/app/sites/[fid]/_components/RenderBlocos";
import { dadosParaBlocos, type SiteBloco } from "@/lib/site/blocos";
import { BarraImpressao } from "./BarraImpressao";
import type { SiteLandingDados } from "@/lib/supabase/types";

export const runtime = "nodejs";

export default async function LandingImprimirPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ blocos?: string }>;
}) {
  const { id } = await params;
  const { blocos: filtro } = await searchParams;

  const fotografoId = await fotografoIdAtual();
  if (!fotografoId) notFound();

  const admin = createAdminClient();
  const { data: lp } = await admin.from("site_landing_pages")
    .select("id, fotografo_id, titulo, dados")
    .eq("id", id).eq("fotografo_id", fotografoId).maybeSingle();
  if (!lp) notFound();

  const d = (lp.dados ?? {}) as SiteLandingDados;
  const todos: SiteBloco[] = d.blocos && d.blocos.length > 0 ? d.blocos : dadosParaBlocos(d);
  // ?blocos=... limita aos escolhidos no editor (na ordem original da página).
  const escolhidos = filtro ? new Set(filtro.split(",").filter(Boolean)) : null;
  const blocos = escolhidos ? todos.filter((b) => escolhidos.has(b.id)) : todos;

  const { config } = await carregarSite(lp.fotografo_id);
  const ctx = await contextoBlocos(lp.fotografo_id);
  const tema = getTema(config?.tema);
  const design = normalizarDesign(config?.design);
  const par = getPar(design.par);

  return (
    <>
      {/* Não usa a classe .site-root de propósito: o site público é bloqueado na impressão
          (globals.css). Aqui a impressão é o objetivo. */}
      <style>{`
        @page { size: A4; margin: 10mm; }
        @media print {
          .no-print { display: none !important; }
          html, body { background: #fff !important; }
          .lp-print-root { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .lp-secao, .lp-duas, .lp-plano, .lp-pgto-linha { break-inside: avoid; page-break-inside: avoid; }
        }
        .lp-print-root img { user-select: auto !important; -webkit-user-drag: auto !important; }
      `}</style>

      <BarraImpressao titulo={lp.titulo} />

      <div
        className={`lp-print-root ${classesFontes}`}
        style={{
          ...temaCssVars(tema),
          "--site-fonte-titulo": `var(${FONTE_VAR[par.titulo] ?? "--f-cormorant"})`,
          "--site-fonte-corpo": `var(${FONTE_VAR[par.texto] ?? "--f-crimson"})`,
          "--site-largura": `${design.largura_maxima}px`,
          "--site-espaco-blocos": `${design.espaco_blocos}px`,
          background: "var(--site-fundo)",
          color: "var(--site-texto)",
          fontFamily: "var(--site-fonte-corpo), Georgia, serif",
        } as React.CSSProperties}
      >
        {/* Valores REAIS: sem mascararValores e sem landingId (nada de botão "Receber os valores"). */}
        <RenderBlocos blocos={blocos} ctx={ctx} />
      </div>
    </>
  );
}
