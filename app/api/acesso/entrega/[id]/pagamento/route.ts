import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const { data: galeria } = await admin
    .from("galerias_entrega")
    .select("fotografo_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!galeria) return NextResponse.json({ asaas_ativo: false });

  const { data: foto } = await admin
    .from("fotografos")
    .select("asaas_ativo")
    .eq("id", galeria.fotografo_id)
    .maybeSingle();

  return NextResponse.json({ asaas_ativo: foto?.asaas_ativo ?? false });
}
