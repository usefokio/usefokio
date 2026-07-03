import { uploadFile } from "@/lib/storage/upload";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_BYTES = 20 * 1024 * 1024; // 20MB
const TIPOS_OK = [
  "application/pdf",
  "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif",
];

// Upload de um contrato assinado (PDF/imagem) para o pedido. Guarda no R2.
// Diferente de /api/storage/upload: NÃO tem trava de limite de fotos (contrato não é foto).
export async function POST(req: Request) {
  const isDev = process.env.NODE_ENV === "development";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !isDev) return Response.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const pedidoId = form.get("pedido_id") as string | null;
  if (!file || !pedidoId) {
    return Response.json({ error: "file e pedido_id são obrigatórios" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Arquivo muito grande (máx. 20MB)." }, { status: 400 });
  }
  const contentType = file.type || "application/octet-stream";
  if (!TIPOS_OK.includes(contentType)) {
    return Response.json({ error: "Tipo não permitido. Envie um PDF ou imagem." }, { status: 400 });
  }

  // Descobre o fotógrafo dono do pedido (e valida posse em produção).
  const admin = createAdminClient();
  const { data: pedido } = await admin
    .from("crm_orders")
    .select("fotografo_id")
    .eq("id", pedidoId)
    .maybeSingle();
  if (!pedido) return Response.json({ error: "Pedido não encontrado." }, { status: 404 });
  if (user && !isDev && pedido.fotografo_id !== user.id) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const safeNome = (file.name || "contrato").replace(/[^\w.\-]+/g, "_").slice(-120);
  const path = `contratos/${pedido.fotografo_id}/${pedidoId}/${crypto.randomUUID()}-${safeNome}`;

  try {
    const result = await uploadFile(path, file, contentType);
    return Response.json({ ...result, nome: file.name });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro no upload";
    return Response.json({ error: msg }, { status: 500 });
  }
}
