import { uploadFile } from "@/lib/storage/upload";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { limiteEfetivoMax } from "@/lib/planos";

// Copia uma imagem JÁ existente no storage do site para um novo path (cópia independente).
// Baixa a origem NO SERVIDOR (sem depender de CORS) e regrava via uploadFile — mesma lógica do upload.
export const maxDuration = 60;

// Allowlist anti-SSRF: só copiamos imagens que já são do storage do próprio site.
// cdn.alboompro.com entra como origem de MIGRAÇÃO (conteúdo legado do próprio fotógrafo
// no CDN público do Alboom) — sem risco de alcançar rede interna.
function hostsPermitidos(): Set<string> {
  const hosts = new Set<string>(["cdn.alboompro.com"]);
  for (const u of [process.env.R2_SITE_PUBLIC_URL, process.env.R2_PUBLIC_URL, process.env.NEXT_PUBLIC_SUPABASE_URL]) {
    if (u) { try { hosts.add(new URL(u).host); } catch { /* ignora URL malformada de env */ } }
  }
  return hosts;
}

export async function POST(req: Request) {
  // Auth alternativa por CRON_SECRET (mesmo padrão dos crons): permite operações de
  // migração server-to-server sem sessão de navegador.
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const viaCron = !!process.env.CRON_SECRET && bearer === process.env.CRON_SECRET;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !viaCron && process.env.NODE_ENV !== "development") {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { sourceUrl?: string; path?: string } | null;
  const sourceUrl = body?.sourceUrl;
  const path = body?.path;
  if (!sourceUrl || !path) {
    return Response.json({ error: "sourceUrl e path são obrigatórios" }, { status: 400 });
  }
  if (!path.startsWith("site/") || path.includes("..")) {
    return Response.json({ error: "path inválido" }, { status: 400 });
  }

  // Anti-SSRF: a origem tem que ser um host de storage do próprio site.
  let origem: URL;
  try { origem = new URL(sourceUrl); } catch { return Response.json({ error: "sourceUrl inválida" }, { status: 400 }); }
  if (!/^https?:$/.test(origem.protocol) || !hostsPermitidos().has(origem.host)) {
    return Response.json({ error: "origem não permitida" }, { status: 400 });
  }

  // Baixa a imagem no servidor.
  let blob: Blob;
  try {
    const r = await fetch(origem.toString());
    if (!r.ok) throw new Error(`fonte respondeu ${r.status}`);
    blob = await r.blob();
  } catch {
    return Response.json({ error: "Falha ao baixar a imagem de origem" }, { status: 502 });
  }
  const contentType = blob.type?.startsWith("image/") ? blob.type : "image/jpeg";

  // Verificação de plano/armazenamento (pula em dev) — igual ao upload, usando o tamanho do blob.
  if (user && process.env.NODE_ENV !== "development") {
    const admin = createAdminClient();
    const { data: foto } = await admin
      .from("fotografos")
      .select("plano, plano_expira_em, total_fotos_usadas, limite_fotos_custom, limite_armazenamento_gb_custom")
      .eq("id", user.id)
      .maybeSingle();

    if (foto) {
      if (foto.plano !== "gratuito" && foto.plano !== "estudio" && foto.plano_expira_em && new Date(foto.plano_expira_em) < new Date()) {
        return Response.json({ error: "Plano expirado. Renove sua assinatura em /conta/plano.", expired: true }, { status: 403 });
      }
      const { data: pc } = await admin
        .from("planos_config")
        .select("limite_fotos, limite_armazenamento_gb")
        .eq("codigo", foto.plano)
        .eq("ativo", true)
        .maybeSingle();

      const usadas = foto.total_fotos_usadas ?? 0;
      const limite = limiteEfetivoMax(foto.limite_fotos_custom, pc?.limite_fotos ?? null);
      if (limite !== null && usadas >= limite) {
        return Response.json({ error: `Limite de ${limite.toLocaleString("pt-BR")} fotos atingido. Faça upgrade do plano em /conta/plano.`, limitReached: true }, { status: 403 });
      }

      const limiteGb = limiteEfetivoMax(foto.limite_armazenamento_gb_custom, pc?.limite_armazenamento_gb ?? null);
      if (limiteGb !== null) {
        const { data: usadoBytes } = await admin.rpc("fotografo_bytes_usados", { fid: user.id });
        const limiteBytes = limiteGb * 1024 ** 3;
        if ((Number(usadoBytes) || 0) + blob.size > limiteBytes) {
          return Response.json({ error: `Limite de armazenamento de ${limiteGb} GB atingido. Faça upgrade do plano em /conta/plano.`, storageLimitReached: true }, { status: 403 });
        }
      }
    }
  }

  try {
    const result = await uploadFile(path, blob, contentType);
    return Response.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro na cópia";
    return Response.json({ error: msg }, { status: 500 });
  }
}
