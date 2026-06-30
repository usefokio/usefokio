#!/usr/bin/env python3
"""
Limpeza de arquivos orfaos no bucket Supabase Storage 'galerias'.

Identifica arquivos cujos fotografos ou galerias nao existem mais no banco
e os deleta para liberar espaco.

Uso:
  python limpar_storage_orfaos.py            # dry-run (mostra o que seria deletado)
  python limpar_storage_orfaos.py --delete   # deleta de verdade
"""

import os, sys, time
from supabase import create_client

SUPABASE_URL = "https://fhsoqlttxggjpgrupjse.supabase.co"
SERVICE_KEY  = os.environ.get("SUPABASE_SERVICE_KEY", "")
BUCKET       = "galerias"
DRY_RUN      = "--delete" not in sys.argv

# ─── Inicializar cliente ──────────────────────────────────────────────────────

if not SERVICE_KEY:
    SERVICE_KEY = input("Cole aqui o Service Role Key do Supabase prod: ").strip()

sb = create_client(SUPABASE_URL, SERVICE_KEY)

# ─── Helpers de listagem ──────────────────────────────────────────────────────

def listar_nivel(prefix: str) -> list:
    """Lista itens em um prefixo (1 nivel). Retorna lista de dicts."""
    todos = []
    offset = 0
    while True:
        items = sb.storage.from_(BUCKET).list(prefix, {"limit": 1000, "offset": offset, "sortBy": {"column": "name", "order": "asc"}})
        if not items:
            break
        todos.extend(items)
        if len(items) < 1000:
            break
        offset += len(items)
    return todos


def listar_recursivo(prefix: str, profundidade: int = 0) -> list[str]:
    """Retorna caminhos de todos os arquivos (nao pastas) abaixo de um prefixo."""
    if profundidade > 5:
        return []
    arquivos = []
    items = listar_nivel(prefix)
    for item in items:
        nome = item.get("name", "")
        if not nome:
            continue
        caminho = f"{prefix}/{nome}" if prefix else nome
        if item.get("id") is None:
            # e uma pasta virtual - recursionar
            arquivos.extend(listar_recursivo(caminho, profundidade + 1))
        else:
            arquivos.append(caminho)
    return arquivos

# ─── Carregar dados do banco ──────────────────────────────────────────────────

def ids_do_banco(tabela: str, coluna: str = "id") -> set[str]:
    todos = []
    offset = 0
    while True:
        resp = sb.table(tabela).select(coluna).range(offset, offset + 999).execute()
        if not resp.data:
            break
        todos.extend(row[coluna] for row in resp.data)
        if len(resp.data) < 1000:
            break
        offset += 1000
    return set(todos)

# ─── Logica principal ─────────────────────────────────────────────────────────

def main():
    print(f"{'='*60}")
    print(f"Limpeza de storage orfao — {'DRY-RUN' if DRY_RUN else 'DELETE'}")
    print(f"{'='*60}\n")

    print("Carregando IDs ativos do banco...")
    fotografos     = ids_do_banco("fotografos")
    gal_entrega    = ids_do_banco("galerias_entrega")
    gal_selecao    = ids_do_banco("galerias_selecao")
    album_selecoes = ids_do_banco("album_selecoes")
    print(f"  {len(fotografos)} fotografos | {len(gal_entrega)} galerias entrega | "
          f"{len(gal_selecao)} galerias selecao | {len(album_selecoes)} album selecoes\n")

    orfaos: list[str] = []

    # Prefixos raiz e a tabela de galerias correspondente para verificacao
    # (prefix_no_storage, prefixo_path, ids_de_galerias_validos)
    escopos = [
        ("entrega", gal_entrega),
        ("selecao", gal_selecao),
        ("album",   album_selecoes),
    ]

    for prefixo_raiz, ids_galerias in escopos:
        print(f"Escaneando '{prefixo_raiz}/'...")
        items_fid = listar_nivel(prefixo_raiz)

        for item_fid in items_fid:
            fid = item_fid.get("name", "").rstrip("/")
            if not fid:
                continue
            caminho_fid = f"{prefixo_raiz}/{fid}"

            if fid not in fotografos:
                # Fotografo deletado → todos os arquivos sao orfaos
                arquivos = listar_recursivo(caminho_fid)
                if arquivos:
                    print(f"  orfao (fotografo inexistente): {caminho_fid}/ → {len(arquivos)} arquivo(s)")
                    orfaos.extend(arquivos)
            else:
                # Fotografo ativo → verificar cada galeria
                items_gid = listar_nivel(caminho_fid)
                for item_gid in items_gid:
                    gid = item_gid.get("name", "").rstrip("/")
                    if not gid:
                        continue
                    caminho_gid = f"{caminho_fid}/{gid}"

                    if gid not in ids_galerias:
                        arquivos = listar_recursivo(caminho_gid)
                        if arquivos:
                            print(f"  orfao (galeria inexistente): {caminho_gid}/ → {len(arquivos)} arquivo(s)")
                            orfaos.extend(arquivos)

    # Verificar UUIDs soltos na raiz (formato novo, sem prefixo de tipo)
    print("\nEscaneando raiz (UUIDs sem prefixo)...")
    items_raiz = listar_nivel("")
    for item in items_raiz:
        nome = item.get("name", "").rstrip("/")
        # Ignorar pastas de tipo conhecidas
        if nome in ("entrega", "selecao", "album"):
            continue
        # Verificar se parece UUID de fotografo
        if len(nome) == 36 and nome.count("-") == 4:
            if nome not in fotografos:
                arquivos = listar_recursivo(nome)
                if arquivos:
                    print(f"  orfao (fotografo inexistente, raiz): {nome}/ → {len(arquivos)} arquivo(s)")
                    orfaos.extend(arquivos)
            else:
                # Fotografo ativo — verificar galerias
                items_gid = listar_nivel(nome)
                for item_gid in items_gid:
                    gid = item_gid.get("name", "").rstrip("/")
                    if not gid:
                        continue
                    # Sem prefixo de tipo, nao sabemos a tabela — verificar em todas
                    if gid not in (gal_entrega | gal_selecao | album_selecoes):
                        arquivos = listar_recursivo(f"{nome}/{gid}")
                        if arquivos:
                            print(f"  orfao (galeria inexistente, raiz): {nome}/{gid}/ → {len(arquivos)} arquivo(s)")
                            orfaos.extend(arquivos)

    # ─── Resultado ───────────────────────────────────────────────────────────

    print(f"\n{'='*60}")
    if not orfaos:
        print("Nenhum arquivo orfao encontrado. Storage esta limpo.")
        return

    # Estimativa de tamanho (nao disponivel pela API de listagem sem metadados extras)
    total = len(orfaos)
    print(f"Total de arquivos orfaos: {total}")

    if DRY_RUN:
        print(f"\nPrimeiros {min(30, total)} caminhos:")
        for p in orfaos[:30]:
            print(f"  {p}")
        if total > 30:
            print(f"  ... e mais {total - 30} arquivos")
        print("\nRode com --delete para deletar de verdade.")
        return

    # ─── Deletar ─────────────────────────────────────────────────────────────

    print(f"\nDeletando {total} arquivo(s)...")
    BATCH = 100
    deletados = 0
    erros = 0
    for i in range(0, total, BATCH):
        lote = orfaos[i:i + BATCH]
        try:
            sb.storage.from_(BUCKET).remove(lote)
            deletados += len(lote)
        except Exception as e:
            print(f"\n  Erro no lote {i}-{i+len(lote)}: {e}")
            erros += len(lote)
        print(f"  {deletados}/{total} deletados", end="\r", flush=True)
        time.sleep(0.05)

    print(f"\n\nFeito! {deletados} arquivo(s) deletado(s). {erros} erro(s).")


if __name__ == "__main__":
    main()
