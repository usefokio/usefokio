import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const WEBMASTER_EMAIL = process.env.WEBMASTER_EMAIL ?? "usefokio@gmail.com";
const WEBMASTER_ID    = process.env.NEXT_PUBLIC_WEBMASTER_ID ?? "";

const stripBOM = (s: string) => s.replace(/^﻿/, "");

const adminClient = createClient(
  stripBOM(process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""),
  stripBOM(process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""),
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function decodeJwtPayload(token: string): { sub?: string; email?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], "base64").toString("utf-8");
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = stripBOM(authHeader.replace("Bearer ", ""));
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = decodeJwtPayload(token);
  if (!payload) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const isWebmaster =
    (WEBMASTER_ID    && payload.sub   === WEBMASTER_ID) ||
    (WEBMASTER_EMAIL && payload.email === WEBMASTER_EMAIL);
  if (!isWebmaster) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { fotografo_id } = await req.json() as { fotografo_id: string };
  if (!fotografo_id) return NextResponse.json({ error: "missing fotografo_id" }, { status: 400 });

  const { error: delError } = await adminClient.rpc("webmaster_excluir_fotografo", {
    p_fotografo_id: fotografo_id,
  });
  if (delError) {
    console.error("webmaster_excluir_fotografo error:", delError);
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  const { error: authError } = await adminClient.auth.admin.deleteUser(fotografo_id);
  if (authError) {
    console.error("deleteUser error:", authError);
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
