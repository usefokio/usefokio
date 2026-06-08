import { NextResponse } from "next/server";
import { resend, FROM_DEFAULT, APP_URL } from "@/lib/email/resend";
import { templateSelecaoEnviada } from "@/lib/email/templates";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { galeriaId, totalSelecionadas } = body as {
      galeriaId: string;
      totalSelecionadas: number;
    };

    if (!galeriaId) {
      return NextResponse.json({ error: "galeriaId obrigatório" }, { status: 400 });
    }

    // Usa service key para buscar dados sem precisar de sessão
    // (o cliente não tem sessão — é o lado público)
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll()   { return cookieStore.getAll(); },
          setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
        },
      }
    );

    // Galeria + fotógrafo + cliente (via RPC pública)
    const { data: galeria } = await supabase
      .from("galerias_selecao")
      .select("titulo, fotografo_id, cliente_id")
      .eq("id", galeriaId)
      .single();

    if (!galeria) return NextResponse.json({ error: "Galeria não encontrada" }, { status: 404 });

    // Email do fotógrafo
    const { data: fotografo } = await supabase
      .from("fotografos")
      .select("nome_completo, email")
      .eq("id", galeria.fotografo_id)
      .single();

    if (!fotografo?.email) {
      return NextResponse.json({ skipped: true, reason: "Fotógrafo sem email" });
    }

    // Nome do cliente
    let clienteNome = "Cliente";
    if (galeria.cliente_id) {
      const { data: cli } = await supabase
        .from("clientes")
        .select("nome")
        .eq("id", galeria.cliente_id)
        .single();
      if (cli) clienteNome = cli.nome;
    }

    const galeriaAdminUrl = `${APP_URL}/selecao/${galeriaId}`;

    const { subject, html } = templateSelecaoEnviada({
      fotografoNome:     fotografo.nome_completo,
      clienteNome,
      galeriaTitulo:     galeria.titulo,
      totalSelecionadas: totalSelecionadas ?? 0,
      galeriaAdminUrl,
    });

    const { error } = await resend.emails.send({
      from:    FROM_DEFAULT,
      to:      [fotografo.email],
      subject,
      html,
    });

    if (error) {
      console.error("[email/selecao-enviada] Resend error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[email/selecao-enviada]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
