import { NextResponse } from "next/server";
import { resend, FROM_DEFAULT, APP_URL } from "@/lib/email/resend";
import { templateGaleriaCriada } from "@/lib/email/templates";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { galeriaId } = body as { galeriaId: string };

    if (!galeriaId) {
      return NextResponse.json({ error: "galeriaId obrigatório" }, { status: 400 });
    }

    // Busca dados da galeria + cliente + fotógrafo (server-side com sessão)
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll()             { return cookieStore.getAll(); },
          setAll(cs)           { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    // Galeria
    const { data: galeria } = await supabase
      .from("galerias_selecao")
      .select("id, titulo, cliente_id, fotografo_id, data_evento, total_fotos")
      .eq("id", galeriaId)
      .eq("fotografo_id", session.user.id)  // só o dono pode disparar
      .single();

    if (!galeria) return NextResponse.json({ error: "Galeria não encontrada" }, { status: 404 });

    // Fotógrafo
    const { data: fotografo } = await supabase
      .from("fotografos")
      .select("nome_completo, nome_empresa, email, site")
      .eq("id", session.user.id)
      .single();

    // Cliente
    if (!galeria.cliente_id) {
      return NextResponse.json({ skipped: true, reason: "Galeria sem cliente vinculado" });
    }

    const { data: cliente } = await supabase
      .from("clientes")
      .select("nome, email, senha_acesso")
      .eq("id", galeria.cliente_id)
      .single();

    if (!cliente?.email) {
      return NextResponse.json({ skipped: true, reason: "Cliente sem email cadastrado" });
    }

    const galeriaUrl  = `${APP_URL}/galeria/${galeriaId}`;
    const dataEventoFmt = galeria.data_evento
      ? new Date(galeria.data_evento + "T12:00:00").toLocaleDateString("pt-BR")
      : null;

    const { subject, html } = templateGaleriaCriada({
      clienteNome:      cliente.nome,
      fotografoNome:    fotografo?.nome_completo ?? "",
      fotografoEmpresa: fotografo?.nome_empresa ?? "Fotógrafo",
      fotografoEmail:   fotografo?.email ?? null,
      fotografoSite:    fotografo?.site ?? null,
      galeriaTitulo:    galeria.titulo,
      galeriaUrl,
      senhaAcesso:      cliente.senha_acesso,
      totalFotos:       galeria.total_fotos ?? 0,
      dataEvento:       dataEventoFmt,
    });

    const { error } = await resend.emails.send({
      from:    FROM_DEFAULT,
      to:      [cliente.email],
      subject,
      html,
    });

    if (error) {
      console.error("[email/galeria-criada] Resend error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[email/galeria-criada]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
