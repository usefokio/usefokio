// Landing page pública — renderizada pelo MOTOR DE BLOCOS (URL: /{slug} no host do fotógrafo).
// Landings antigas (template fixo) são convertidas para blocos em tempo de render, sem perder nada.
// Rota dinâmica de 1 nível: as rotas estáticas (portfolio, blog, sobre, contato…) têm precedência.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { baseLinks, CATEGORIA_LABEL } from "@/lib/site/publico";
import { dadosParaBlocos } from "@/lib/site/blocos";
import { RenderBlocos } from "../_components/RenderBlocos";
import type { SiteLandingPage, SiteLandingDados, SiteDepoimento } from "@/lib/supabase/types";

async function buscarLanding(fid: string, slug: string): Promise<SiteLandingPage | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("site_landing_pages").select("*")
    .eq("fotografo_id", fid).eq("slug", slug).eq("publicado", true).maybeSingle();
  return (data as SiteLandingPage) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ fid: string; slug: string }> }): Promise<Metadata> {
  const { fid, slug } = await params;
  const lp = await buscarLanding(fid, slug);
  if (!lp) return {};
  return { title: lp.seo_title ?? lp.titulo, description: lp.seo_description ?? undefined };
}

export default async function LandingPage({ params }: { params: Promise<{ fid: string; slug: string }> }) {
  const { fid, slug } = await params;
  const lp = await buscarLanding(fid, slug);
  if (!lp) notFound();

  const admin = createAdminClient();
  const [{ data: fotografo }, { data: depoimentos }, { data: trabalhos }] = await Promise.all([
    admin.from("fotografos").select("whatsapp").eq("id", fid).maybeSingle(),
    admin.from("site_depoimentos").select("*").eq("fotografo_id", fid).eq("publicado", true).order("ordem").limit(4),
    admin.from("site_trabalhos").select("categoria").eq("fotografo_id", fid).eq("publicado", true),
  ]);
  const b = await baseLinks(fid);
  const d = (lp.dados ?? {}) as SiteLandingDados;

  // "Tipo do evento" do bloco formulário = categorias distintas dos trabalhos publicados.
  const categorias = [...new Set(((trabalhos ?? []) as { categoria: string }[]).map((t) => t.categoria))]
    .map((c) => ({ valor: c, label: CATEGORIA_LABEL[c] ?? c }));

  // Motor de blocos: usa a lista salva; landings do formato antigo são convertidas na hora.
  const blocos = d.blocos && d.blocos.length > 0 ? d.blocos : dadosParaBlocos(d);

  return (
    <RenderBlocos
      blocos={blocos}
      ctx={{
        base: b,
        fid,
        depoimentos: (depoimentos ?? []) as SiteDepoimento[],
        whatsappFallback: fotografo?.whatsapp ?? null,
        categorias,
      }}
    />
  );
}
