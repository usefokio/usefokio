import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const url       = new URL(request.url);
  const code      = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type      = url.searchParams.get("type") as "email" | "recovery" | "invite" | "magiclink" | null;
  const next      = url.searchParams.get("next") ?? "/dashboard";

  if (!code && !tokenHash) {
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

  let user: import("@supabase/supabase-js").User | null = null;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      return NextResponse.redirect(new URL("/login?erro=link-invalido", request.url));
    }
    user = data.user;
  } else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error || !data.user) {
      return NextResponse.redirect(new URL("/login?erro=link-invalido", request.url));
    }
    user = data.user;
  } else {
    return NextResponse.redirect(new URL("/login?erro=link-invalido", request.url));
  }

  if (!user) {
    return NextResponse.redirect(new URL("/login?erro=link-invalido", request.url));
  }

  // ── Garante que o perfil do fotógrafo existe ─────────────────────────────
  // Caso de uso: primeiro login via Google (perfil ainda não foi criado)
  const { data: perfil } = await supabase
    .from("fotografos")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil) {
    // Extrai dados do Google ou do cadastro manual (user_metadata)
    const meta         = user.user_metadata ?? {};
    const nomeCompleto = meta.nome_completo ?? meta.full_name ?? meta.name ?? user.email?.split("@")[0] ?? "Fotógrafo";
    const nomeEmpresa  = meta.nome_empresa  ?? nomeCompleto;
    const email        = user.email ?? "";

    // Cria o perfil via service_role. A overload com p_user_id não é executável
    // pelo papel `authenticated` (hardening de segurança contra spoofing de id),
    // então usamos o admin client. p_user_id vem da sessão já verificada (user.id).
    const admin = createAdminClient();
    const { error: perfilError } = await admin.rpc("criar_perfil_fotografo", {
      p_nome_completo: nomeCompleto,
      p_nome_empresa:  nomeEmpresa,
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
      p_user_id:       user.id,
    });

    if (perfilError) {
      console.error("[auth/callback] Erro ao criar perfil do fotógrafo:", perfilError);
      return NextResponse.redirect(new URL("/login?erro=perfil", request.url));
    }

    // Notifica o webmaster sobre o novo cadastro (fire-and-forget — não bloqueia o fluxo)
    fetch(new URL("/api/email/novo-fotografo", request.url), {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nomeCompleto, nomeEmpresa, email }),
    }).catch(() => { /* silencioso */ });
  }

  const WEBMASTER_EMAIL = process.env.WEBMASTER_EMAIL ?? "";
  const WEBMASTER_ID    = process.env.NEXT_PUBLIC_WEBMASTER_ID ?? "";

  // Webmaster → painel webmaster
  if (
    (WEBMASTER_EMAIL && user.email === WEBMASTER_EMAIL) ||
    (WEBMASTER_ID    && user.id    === WEBMASTER_ID)
  ) {
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
