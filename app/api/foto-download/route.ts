import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const url  = req.nextUrl.searchParams.get("url");
  const nome = req.nextUrl.searchParams.get("nome") ?? "foto.jpg";

  if (!url) return new Response("url obrigatória", { status: 400 });

  // Só permite URLs do Supabase Storage desta aplicação
  if (!url.startsWith("https://fhsoqlttxggjpgrupjse.supabase.co/storage/")) {
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
