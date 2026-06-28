import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const url  = req.nextUrl.searchParams.get("url");
  const nome = req.nextUrl.searchParams.get("nome") ?? "foto.jpg";

  if (!url) return new Response("url obrigatória", { status: 400 });

  const allowedOrigins = [
    "https://fhsoqlttxggjpgrupjse.supabase.co/storage/",
    "https://arquivos.usefokio.com.br/",
    "https://pub-e66279e0a17e4483ab3779c6326d2f65.r2.dev/",
  ];
  if (!allowedOrigins.some((o) => url.startsWith(o))) {
    return new Response("URL não permitida", { status: 403 });
  }

  const upstream = await fetch(url);
  if (!upstream.ok) return new Response("Foto não encontrada", { status: 404 });

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
  // RFC 5987: encode o nome para Content-Disposition funcionar com caracteres especiais
  const nomeSanitizado = nome.replace(/[\r\n"]/g, "");
  const nomeEncoded    = encodeURIComponent(nomeSanitizado);

  return new Response(upstream.body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${nomeSanitizado}"; filename*=UTF-8''${nomeEncoded}`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
