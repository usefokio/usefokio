// Uso do plano do fotógrafo logado — fotos e ARMAZENAMENTO (GB). Fonte no banco
// (planos_config + overrides do fotógrafo + fotografo_bytes_usados), nada hardcoded.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { limiteEfetivoMax } from "@/lib/planos";

const DEV_ID = "00000000-0000-0000-0000-000000000001";

export async function GET() {
  let userId: string | null = null;
  if (process.env.NODE_ENV === "development") {
    userId = DEV_ID;
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    userId = user.id;
  }

  const admin = createAdminClient();
  const { data: foto } = await admin
    .from("fotografos")
    .select("plano, total_fotos_usadas, limite_fotos_custom, limite_armazenamento_gb_custom")
    .eq("id", userId)
    .maybeSingle();
  if (!foto) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [{ data: pc }, { data: usadoBytes }] = await Promise.all([
    admin.from("planos_config")
      .select("limite_fotos, limite_armazenamento_gb")
      .eq("codigo", foto.plano).eq("ativo", true).maybeSingle(),
    admin.rpc("fotografo_bytes_usados", { fid: userId }),
  ]);

  return NextResponse.json({
    fotos_usadas: foto.total_fotos_usadas ?? 0,
    limite_fotos: limiteEfetivoMax(foto.limite_fotos_custom, pc?.limite_fotos ?? null),
    bytes_usados: Number(usadoBytes) || 0,
    limite_gb:    limiteEfetivoMax(foto.limite_armazenamento_gb_custom, pc?.limite_armazenamento_gb ?? null),
  });
}
