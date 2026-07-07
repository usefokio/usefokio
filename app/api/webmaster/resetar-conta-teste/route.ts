import { createClient } from "@supabase/supabase-js";

const TEST_EMAIL = "fernando.agrelaws@gmail.com";

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token && process.env.NODE_ENV !== "development") return Response.json({ error: "unauthorized" }, { status: 401 });

  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: { user } } = await userClient.auth.getUser();
  if (user?.email !== process.env.WEBMASTER_EMAIL && process.env.NODE_ENV !== "development") {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: foto } = await adminClient
    .from("fotografos").select("id").eq("email", TEST_EMAIL).maybeSingle();
  if (!foto) return Response.json({ error: "conta não encontrada" }, { status: 404 });

  await adminClient.from("categorias").delete().eq("fotografo_id", foto.id);
  await adminClient.from("fotografos").update({
    onboarding_concluido: false,
    renewal_fee_padrao: null,
    mensagem_padrao_entrega: null,
  }).eq("id", foto.id);

  return Response.json({ ok: true });
}
