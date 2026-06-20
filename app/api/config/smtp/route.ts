import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptKey } from "@/lib/asaas";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { host, port, user: smtpUser, pass, from, ativo } = await req.json().catch(() => ({}));

  const admin = createAdminClient();

  const { data: atual } = await admin
    .from("fotografos")
    .select("smtp_pass_enc")
    .eq("id", user.id)
    .single();

  const passEnc = pass
    ? encryptKey(pass)
    : (atual?.smtp_pass_enc ?? null);

  const { error } = await admin.from("fotografos").update({
    smtp_host:     host ?? null,
    smtp_port:     port ?? 587,
    smtp_user:     smtpUser ?? null,
    smtp_pass_enc: passEnc,
    smtp_from:     from || null,
    smtp_ativo:    ativo ?? false,
  }).eq("id", user.id);

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const admin = createAdminClient();
  await admin.from("fotografos").update({
    smtp_host: null, smtp_port: 587, smtp_user: null,
    smtp_pass_enc: null, smtp_from: null, smtp_ativo: false,
  }).eq("id", user.id);

  return NextResponse.json({ ok: true });
}
