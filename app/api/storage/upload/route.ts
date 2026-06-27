import { uploadFile } from "@/lib/storage/upload";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && process.env.NODE_ENV !== "development") {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const path = form.get("path") as string | null;
  const contentType = (form.get("contentType") as string | null) ?? "image/jpeg";

  if (!file || !path) {
    return Response.json({ error: "file e path são obrigatórios" }, { status: 400 });
  }

  try {
    const result = await uploadFile(path, file, contentType);
    return Response.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro no upload";
    return Response.json({ error: msg }, { status: 500 });
  }
}
