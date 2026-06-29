import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const WEBMASTER_EMAIL = "usefokio@gmail.com";
const WEBMASTER_ID    = process.env.NEXT_PUBLIC_WEBMASTER_ID ?? "";

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  // Verificar identidade do caller via Bearer token
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: { user } } = await adminClient.auth.getUser(token);
  const isWebmaster = user && (
    (WEBMASTER_ID    && user.id    === WEBMASTER_ID) ||
    (WEBMASTER_EMAIL && user.email === WEBMASTER_EMAIL)
  );
  if (!isWebmaster) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { fotografo_id } = await req.json() as { fotografo_id: string };
  if (!fotografo_id) return NextResponse.json({ error: "missing fotografo_id" }, { status: 400 });

  // Deletar todos os dados via função SQL (ordem correta de FKs)
  const { error: delError } = await adminClient.rpc("webmaster_excluir_fotografo", {
    p_fotografo_id: fotografo_id,
  });
  if (delError) {
    console.error("webmaster_excluir_fotografo error:", delError);
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  // Deletar auth user
  const { error: authError } = await adminClient.auth.admin.deleteUser(fotografo_id);
  if (authError) {
    console.error("deleteUser error:", authError);
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
