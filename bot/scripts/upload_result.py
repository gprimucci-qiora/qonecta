"""
Corre al final del GitHub Actions workflow.
Sube el Excel limpio a Supabase Storage y actualiza el estado del job.
"""
import os
import sys
from pathlib import Path

import httpx

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
JOB_ID = os.environ["JOB_ID"]
FECHA = os.environ["FECHA"]

OUTPUT_FILE = Path(__file__).resolve().parent.parent / "output" / f"CIERRE_DIARIO_{FECHA}.xlsx"
STORAGE_PATH = f"ffm/{JOB_ID}/CIERRE_DIARIO_{FECHA}.xlsx"
BUCKET = "bot-downloads"

BASE_HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
}


def update_job(**fields):
    resp = httpx.patch(
        f"{SUPABASE_URL}/rest/v1/bot_jobs?id=eq.{JOB_ID}",
        headers={**BASE_HEADERS, "Content-Type": "application/json", "Prefer": "return=minimal"},
        json=fields,
        timeout=15,
    )
    resp.raise_for_status()


def main():
    if not OUTPUT_FILE.exists():
        update_job(status="error", error_msg=f"Archivo no encontrado: {OUTPUT_FILE}")
        print(f"ERROR: {OUTPUT_FILE} no existe", file=sys.stderr)
        sys.exit(1)

    # 1. Subir archivo a Storage
    print(f"Subiendo {OUTPUT_FILE} → {BUCKET}/{STORAGE_PATH}")
    with open(OUTPUT_FILE, "rb") as f:
        upload = httpx.post(
            f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{STORAGE_PATH}",
            headers={
                **BASE_HEADERS,
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            },
            content=f.read(),
            timeout=60,
        )
    if not upload.is_success:
        msg = f"Storage upload falló: {upload.status_code} {upload.text}"
        update_job(status="error", error_msg=msg)
        print(f"ERROR: {msg}", file=sys.stderr)
        sys.exit(1)

    # 2. Generar URL firmada (válida 24h)
    signed = httpx.post(
        f"{SUPABASE_URL}/storage/v1/object/sign/{BUCKET}/{STORAGE_PATH}",
        headers={**BASE_HEADERS, "Content-Type": "application/json"},
        json={"expiresIn": 86400},
        timeout=15,
    )
    signed.raise_for_status()
    signed_url = SUPABASE_URL + signed.json()["signedURL"]

    # 3. Marcar job como completado
    update_job(status="done", file_url=signed_url)
    print(f"Listo: {signed_url}")


if __name__ == "__main__":
    main()
