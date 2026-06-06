import { type NextRequest, NextResponse } from "next/server";

/**
 * Proxy (antigo middleware) do Next.js 16+.
 * Pass-through puro — a sessão do Supabase é gerenciada
 * pelo cliente browser via localStorage/cookies automáticos.
 */
export function proxy(request: NextRequest) {
  return NextResponse.next();
}
