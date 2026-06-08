import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const WEBMASTER_ID = process.env.NEXT_PUBLIC_WEBMASTER_ID ?? "";

// Rotas protegidas (exigem sessão autenticada)
const PROTECTED = ["/dashboard", "/clientes", "/selecao", "/entrega", "/config", "/conta"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verifica se é rota protegida do dashboard
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!isProtected) return NextResponse.next();

  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // Sem sessão → login
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Webmaster tentando acessar dashboard → /webmaster
  if (WEBMASTER_ID && session.user.id === WEBMASTER_ID) {
    return NextResponse.redirect(new URL("/webmaster", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/clientes/:path*",
    "/selecao/:path*",
    "/entrega/:path*",
    "/config/:path*",
    "/conta/:path*",
  ],
};
