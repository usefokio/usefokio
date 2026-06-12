import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const createArchive: (...args: any[]) => import("archiver").Archiver = require("archiver");
import { PassThrough } from "stream";

export const maxDuration = 300; // 5 min — large galleries may take a while

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return streamZip(id, null);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const fotoIds: string[] | null = Array.isArray(body.fotoIds) && body.fotoIds.length > 0
    ? body.fotoIds
    : null;
  return streamZip(id, fotoIds);
}

async function streamZip(galeriaId: string, fotoIds: string[] | null) {
  const supabase = await createClient();

  // Fetch gallery to get the title
  const { data: galeria } = await supabase
    .from("galerias_entrega")
    .select("titulo, rascunho, suspensa")
    .eq("id", galeriaId)
    .maybeSingle();

  if (!galeria || galeria.rascunho || galeria.suspensa) {
    return new Response("Galeria não disponível", { status: 404 });
  }

  // Fetch photos
  let query = supabase
    .from("galerias_entrega_fotos")
    .select("nome_arquivo, url_publica")
    .eq("galeria_id", galeriaId)
    .order("ordem")
    .order("created_at");

  if (fotoIds) {
    query = query.in("id", fotoIds);
  }

  const { data: fotos, error } = await query;
  if (error || !fotos || fotos.length === 0) {
    return new Response("Sem fotos", { status: 404 });
  }

  // Stream the ZIP
  const pass = new PassThrough();
  const archive = createArchive("zip", { zlib: { level: 1 } });

  archive.on("error", (err: Error) => {
    console.error("[download-zip] archiver error:", err);
    pass.destroy(err);
  });

  archive.pipe(pass);

  // Add photos sequentially to avoid overwhelming memory
  (async () => {
    const usedNames = new Map<string, number>();
    for (const foto of fotos) {
      try {
        const res = await fetch(foto.url_publica);
        if (!res.ok || !res.body) continue;

        let nome = foto.nome_arquivo ?? "foto.jpg";
        // Ensure unique filenames
        const count = usedNames.get(nome) ?? 0;
        usedNames.set(nome, count + 1);
        if (count > 0) {
          const dot = nome.lastIndexOf(".");
          nome = dot > 0 ? `${nome.slice(0, dot)}_${count}${nome.slice(dot)}` : `${nome}_${count}`;
        }

        const nodeStream = require("stream").Readable.fromWeb(res.body as ReadableStream<Uint8Array>);
        archive.append(nodeStream, { name: nome });
        await new Promise<void>((resolve) => nodeStream.on("end", resolve).on("error", resolve));
      } catch {
        // Skip failed photos
      }
    }
    archive.finalize();
  })();

  const nomeArquivo = `${galeria.titulo.replace(/[^a-zA-Z0-9À-ÿ\s_-]/g, "").trim() || "fotos"}.zip`;

  const readable = new ReadableStream({
    start(controller) {
      pass.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
      pass.on("end", () => controller.close());
      pass.on("error", (err) => controller.error(err));
    },
    cancel() {
      archive.abort();
      pass.destroy();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(nomeArquivo)}"`,
      "Transfer-Encoding": "chunked",
    },
  });
}
