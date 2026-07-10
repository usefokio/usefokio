import { NextResponse } from "next/server";
import { resend, FROM_DEFAULT, APP_URL } from "@/lib/email/resend";
import { templateAlbumRevisao } from "@/lib/email/templates";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";

// Notifica o fotógrafo por email quando o CLIENTE (lado público, sem sessão)
// envia observações ou aprova o álbum. Espelha /api/email/selecao-enviada.
export async function POST(request: Request) {
  try {
    // Rate limit por IP (rota pública) — evita disparo em massa (10 por minuto)
    if (!(await rateLimitOk(`album-revisao:${clientIp(request)}`, 10, 60))) {
      return NextResponse.json({ error: "Muitas requisições. Tente novamente em instantes." }, { status: 429 });
    }

    const body = await request.json();
    const { albumId, aprovado } = body as { albumId: string; aprovado: boolean };
    if (!albumId) return NextResponse.json({ error: "albumId obrigatório" }, { status: 400 });

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

    // Álbum — valida que existe e está num status coerente com a ação (evita disparo forjado)
    const { data: album } = await supabase
      .from("album_selecoes")
      .select("titulo, fotografo_id, cliente_id, status, versao")
      .eq("id", albumId)
      .in("status", ["aguardando_revisao", "aprovado"])
      .maybeSingle();

    if (!album) return NextResponse.json({ error: "Álbum não encontrado" }, { status: 404 });

    // Email do fotógrafo (destinatário)
    const { data: fotografo } = await supabase
      .from("fotografos")
      .select("nome_completo, email")
      .eq("id", album.fotografo_id)
      .single();

    if (!fotografo?.email) {
      return NextResponse.json({ skipped: true, reason: "Fotógrafo sem email" });
    }

    // Nome do cliente
    let clienteNome = "Seu cliente";
    if (album.cliente_id) {
      const { data: cli } = await supabase.from("clientes").select("nome").eq("id", album.cliente_id).single();
      if (cli?.nome) clienteNome = cli.nome;
    }

    // Nº de observações não resolvidas da VERSÃO CORRENTE (não misturar versões antigas)
    let totalComentarios = 0;
    if (!aprovado) {
      const { count } = await supabase
        .from("album_comentarios")
        .select("id", { count: "exact", head: true })
        .eq("selecao_id", albumId)
        .eq("versao", (album as { versao?: number }).versao ?? 1)
        .eq("resolvido", false);
      totalComentarios = count ?? 0;
    }

    const { subject, html } = templateAlbumRevisao({
      fotografoNome:    fotografo.nome_completo,
      clienteNome,
      albumTitulo:      album.titulo,
      aprovado:         !!aprovado,
      totalComentarios,
      albumAdminUrl:    `${APP_URL}/album/${albumId}/revisao`,
    });

    const { error } = await resend.emails.send({ from: FROM_DEFAULT, to: [fotografo.email], subject, html });
    if (error) {
      console.error("[email/album-revisao] Resend error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[email/album-revisao]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
