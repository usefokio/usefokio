"use client";

import { useState } from "react";

export type DownloadStatus = "idle" | "baixando" | "compactando" | "concluido" | "erro";

export type FotoParaDownload = {
  url: string;
  nome: string;
};

/**
 * Hook para baixar fotos como ZIP no browser.
 * Usa JSZip para compactar e dispara o download automaticamente.
 */
export function useDownloadFotos() {
  const [status, setStatus]     = useState<DownloadStatus>("idle");
  const [progresso, setProgresso] = useState(0); // 0-100
  const [erro, setErro]         = useState<string | null>(null);

  async function baixar(fotos: FotoParaDownload[], nomeArquivo: string) {
    if (!fotos.length) return;

    setStatus("baixando");
    setProgresso(0);
    setErro(null);

    try {
      const JSZip = (await import("jszip")).default;
      const zip   = new JSZip();

      // Baixa cada foto com controle de progresso
      let concluidas = 0;
      await Promise.all(
        fotos.map(async ({ url, nome }) => {
          const resp = await fetch(url);
          if (!resp.ok) throw new Error(`Erro ao baixar ${nome}`);
          const blob = await resp.blob();
          zip.file(nome, blob);
          concluidas++;
          setProgresso(Math.round((concluidas / fotos.length) * 80));
        })
      );

      setStatus("compactando");
      setProgresso(85);

      const blob = await zip.generateAsync(
        { type: "blob", compression: "DEFLATE", compressionOptions: { level: 3 } },
        (meta) => setProgresso(85 + Math.round(meta.percent * 0.15)),
      );

      setProgresso(100);

      // Dispara download
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = nomeArquivo.endsWith(".zip") ? nomeArquivo : `${nomeArquivo}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 60_000);

      setStatus("concluido");
      setTimeout(() => { setStatus("idle"); setProgresso(0); }, 3000);
    } catch (err: any) {
      setErro(err?.message ?? "Erro ao gerar download");
      setStatus("erro");
      setTimeout(() => { setStatus("idle"); setErro(null); }, 5000);
    }
  }

  return { baixar, status, progresso, erro };
}
