import { uploadFile } from "@/lib/storage/upload";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Dá mais tempo para o envio ao R2 (imagens grandes/capa) não estourar o
// tempo-limite padrão da função serverless em conexões lentas.
export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && process.env.NODE_ENV !== "development") {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // Verificação de plano (pula em desenvolvimento)
  if (user && process.env.NODE_ENV !== "development") {
    const admin = createAdminClient();
    const { data: foto } = await admin
      .from("fotografos")
      .select("plano, plano_expira_em, total_fotos_usadas, limite_fotos_custom")
      .eq("id", user.id)
      .maybeSingle();

    if (foto) {
      // Plano expirado: bloqueia uploads
      if (foto.plano !== "gratuito" && foto.plano !== "estudio" && foto.plano_expira_em) {
        if (new Date(foto.plano_expira_em) < new Date()) {
          return Response.json(
            { error: "Plano expirado. Renove sua assinatura em /conta/plano para continuar enviando fotos.", expired: true },
            { status: 403 }
          );
        }
      }

      // Limite de fotos atingido
      const usadas = foto.total_fotos_usadas ?? 0;

      // Sempre busca o limite do plano — garante que upgrade nunca fique bloqueado
      // por um limite_fotos_custom herdado de plano inferior
      const { data: pc } = await admin
        .from("planos_config")
        .select("limite_fotos")
        .eq("codigo", foto.plano)
        .eq("ativo", true)
        .maybeSingle();
      const planLimit: number | null = pc?.limite_fotos ?? null;

      // Limite efetivo: se ambos definidos, usa o maior (plano garante o mínimo)
      // se só custom: usa custom (plano ilimitado mas custom restringe)
      // se só plano: usa plano
      let limite: number | null;
      if (foto.limite_fotos_custom != null && planLimit != null) {
        limite = Math.max(foto.limite_fotos_custom, planLimit);
      } else if (foto.limite_fotos_custom != null) {
        limite = foto.limite_fotos_custom;
      } else {
        limite = planLimit;
      }

      if (limite !== null && usadas >= limite) {
        return Response.json(
          { error: `Limite de ${limite.toLocaleString("pt-BR")} fotos atingido. Faça upgrade do plano em /conta/plano.`, limitReached: true },
          { status: 403 }
        );
      }
    }
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const path = form.get("path") as string | null;
  const contentType = (form.get("contentType") as string | null) ?? "image/jpeg";

  if (!file || !path) {
    return Response.json({ error: "file e path são obrigatórios" }, { status: 400 });
  }

  try {
    const result = await uploadFile(path, file, contentType);
    return Response.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro no upload";
    return Response.json({ error: msg }, { status: 500 });
  }
}
