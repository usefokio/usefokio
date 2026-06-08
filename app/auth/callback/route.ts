import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url  = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/login?erro=link-invalido", request.url));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()             { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(new URL("/login?erro=link-invalido", request.url));
  }

  const user = data.user;

  // ── Garante que o perfil do fotógrafo existe ─────────────────────────────
  // Caso de uso: primeiro login via Google (perfil ainda não foi criado)
  const { data: perfil } = await supabase
    .from("fotografos")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil) {
    // Extrai dados do Google
    const meta        = user.user_metadata ?? {};
    const nomeCompleto = meta.full_name ?? meta.name ?? user.email?.split("@")[0] ?? "Fotógrafo";
    const email        = user.email ?? "";

    // Cria perfil com dados mínimos — o fotógrafo pode completar depois em /conta/editar
    await supabase.rpc("criar_perfil_fotografo", {
      p_nome_completo: nomeCompleto,
      p_nome_empresa:  nomeCompleto,   // pode editar depois
      p_email:         email,
      p_telefone:      null,
      p_whatsapp:      null,
      p_cep:           null,
      p_rua:           null,
      p_numero:        null,
      p_complemento:   null,
      p_bairro:        null,
      p_cidade:        null,
      p_estado:        null,
      p_instagram:     null,
      p_facebook:      null,
      p_tiktok:        null,
      p_youtube:       null,
      p_site:          null,
      p_aceita_emails: false,
    });
  }

  const WEBMASTER_ID = process.env.NEXT_PUBLIC_WEBMASTER_ID ?? "";

  // Webmaster → painel webmaster
  if (WEBMASTER_ID && user.id === WEBMASTER_ID) {
    return NextResponse.redirect(new URL("/webmaster", request.url));
  }

  // Verifica se fotógrafo está aprovado
  const { data: statusPerfil } = await supabase
    .from("fotografos")
    .select("aprovado")
    .eq("id", user.id)
    .maybeSingle();

  if (statusPerfil && !statusPerfil.aprovado) {
    return NextResponse.redirect(new URL("/aguardando-aprovacao", request.url));
  }

  // Aprovado → dashboard (ou rota solicitada)
  return NextResponse.redirect(new URL(next, request.url));
}
