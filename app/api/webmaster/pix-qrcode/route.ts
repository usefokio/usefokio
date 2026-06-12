// Upload do QR code Pix do webmaster para o Supabase Storage.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getWebmaster() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const WEBMASTER_EMAIL = process.env.WEBMASTER_EMAIL ?? "usefokio@gmail.com";
  const WEBMASTER_ID    = process.env.NEXT_PUBLIC_WEBMASTER_ID ?? "";
  const isWebmaster =
    (WEBMASTER_EMAIL && user.email === WEBMASTER_EMAIL) ||
    (WEBMASTER_ID    && user.id    === WEBMASTER_ID);
  return isWebmaster ? user : null;
}

export async function POST(request: NextRequest) {
  const user = await getWebmaster();
  if (!user) return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ erro: "Arquivo não enviado." }, { status: 400 });

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `pix-qrcode.${ext}`;

  const admin = createAdminClient();
  const { error } = await admin.storage.from("webmaster").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  const { data: { publicUrl } } = admin.storage.from("webmaster").getPublicUrl(path);

  // Salva URL no banco
  await admin.from("webmaster_config").update({
    pix_qrcode_url: publicUrl + `?t=${Date.now()}`,
    updated_at: new Date().toISOString(),
  }).eq("id", 1);

  return NextResponse.json({ ok: true, url: publicUrl });
}

export async function DELETE() {
  const user = await getWebmaster();
  if (!user) return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });

  const admin = createAdminClient();
  await admin.storage.from("webmaster").remove(["pix-qrcode.jpg", "pix-qrcode.png", "pix-qrcode.webp"]);
  await admin.from("webmaster_config").update({ pix_qrcode_url: null, updated_at: new Date().toISOString() }).eq("id", 1);

  return NextResponse.json({ ok: true });
}
