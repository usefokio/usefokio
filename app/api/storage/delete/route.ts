import { NextRequest, NextResponse } from "next/server";
import { deleteFile } from "@/lib/storage/delete";

export async function POST(req: NextRequest) {
  const { items } = await req.json() as {
    items: Array<{ storage_path: string; url_publica?: string | null }>;
  };
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ ok: true });
  }
  await Promise.allSettled(
    items.map((item) => deleteFile(item.storage_path, item.url_publica))
  );
  return NextResponse.json({ ok: true });
}
