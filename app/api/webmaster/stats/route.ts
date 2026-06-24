import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("fotografos")
      .select(`
        id, nome_completo, nome_empresa, email, plano, aprovado, created_at, total_fotos_usadas,
        clientes(id),
        galerias_selecao(id, galerias_selecao_fotos(tamanho_bytes))
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[webmaster/stats] query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const stats = (data ?? []).map((f: any) => ({
      id:             f.id,
      nome_completo:  f.nome_completo,
      nome_empresa:   f.nome_empresa,
      email:          f.email,
      plano:          f.plano,
      aprovado:       f.aprovado,
      created_at:     f.created_at,
      total_clientes: f.clientes?.length ?? 0,
      total_galerias: f.galerias_selecao?.length ?? 0,
      total_fotos:    f.total_fotos_usadas ?? 0,
      total_bytes:    f.galerias_selecao?.reduce((sum: number, g: any) =>
        sum + (g.galerias_selecao_fotos?.reduce((s: number, foto: any) => s + (foto.tamanho_bytes ?? 0), 0) ?? 0), 0) ?? 0,
    }));

    return NextResponse.json({ data: stats });
  } catch (err) {
    console.error("[webmaster/stats] exception:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
