import { createAdminClient } from "@/lib/supabase/admin";
import type { Metadata } from "next";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: g } = await supabase
    .from("galerias_entrega")
    .select("titulo, foto_capa_url, clientes(nome)")
    .eq("id", id)
    .maybeSingle();

  if (!g) return { title: "Galeria de fotos" };

  const titulo    = g.titulo ?? "Galeria de fotos";
  const cliente   = (g.clientes as any)?.nome as string | undefined;
  const descricao = cliente ? `Fotos para ${cliente}` : "Acesse suas fotos";
  const imagens   = g.foto_capa_url ? [{ url: g.foto_capa_url, width: 1200, height: 630 }] : [];

  return {
    title: titulo,
    description: descricao,
    openGraph: {
      title: titulo,
      description: descricao,
      type: "website",
      images: imagens,
    },
    twitter: {
      card: imagens.length ? "summary_large_image" : "summary",
      title: titulo,
      description: descricao,
      images: imagens.map((i) => i.url),
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
