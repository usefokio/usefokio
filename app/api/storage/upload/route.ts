import { uploadFile } from "@/lib/storage/upload";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { limiteEfetivoMax } from "@/lib/planos";

// Dá mais tempo para o envio ao R2 (imagens grandes/capa) não estourar o
// tempo-limite padrão da função serverless em conexões lentas.
export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && process.env.NODE_ENV !== "development") {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // Form primeiro: a checagem de armazenamento precisa do tamanho do arquivo.
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const path = form.get("path") as string | null;
  const contentType = (form.get("contentType") as string | null) ?? "image/jpeg";

  if (!file || !path) {
    return Response.json({ error: "file e path são obrigatórios" }, { status: 400 });
  }

  // Verificação de plano (pula em desenvolvimento)
  if (user && process.env.NODE_ENV !== "development") {
    const admin = createAdminClient();
    const { data: foto } = await admin
      .from("fotografos")
      .select("plano, plano_expira_em, total_fotos_usadas, limite_fotos_custom, limite_armazenamento_gb_custom")
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

      // Sempre busca os limites do plano — garante que upgrade nunca fique bloqueado
      // por um limite custom herdado de plano inferior (vale o MAIOR dos dois).
      const { data: pc } = await admin
        .from("planos_config")
        .select("limite_fotos, limite_armazenamento_gb")
        .eq("codigo", foto.plano)
        .eq("ativo", true)
        .maybeSingle();

      // ── Limite de FOTOS (contagem) ─────────────────────────────────────────
      const usadas = foto.total_fotos_usadas ?? 0;
      const limite = limiteEfetivoMax(foto.limite_fotos_custom, pc?.limite_fotos ?? null);
      if (limite !== null && usadas >= limite) {
        return Response.json(
          { error: `Limite de ${limite.toLocaleString("pt-BR")} fotos atingido. Faça upgrade do plano em /conta/plano.`, limitReached: true },
          { status: 403 }
        );
      }

      // ── Limite de ARMAZENAMENTO (GB) ───────────────────────────────────────
      // Só bloqueia NOVOS uploads: o acesso ao que já existe continua normal.
      const limiteGb = limiteEfetivoMax(foto.limite_armazenamento_gb_custom, pc?.limite_armazenamento_gb ?? null);
      if (limiteGb !== null) {
        const { data: usadoBytes } = await admin.rpc("fotografo_bytes_usados", { fid: user.id });
        const limiteBytes = limiteGb * 1024 ** 3;
        if ((Number(usadoBytes) || 0) + file.size > limiteBytes) {
          return Response.json(
            { error: `Limite de armazenamento de ${limiteGb} GB atingido. Faça upgrade do plano em /conta/plano para continuar enviando fotos.`, storageLimitReached: true },
            { status: 403 }
          );
        }
      }
    }
  }

  try {
    const result = await uploadFile(path, file, contentType);
    return Response.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro no upload";
    return Response.json({ error: msg }, { status: 500 });
  }
}
