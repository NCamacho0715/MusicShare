#!/usr/bin/env python3
"""
Script para sincronizar y desplegar los artefactos compilados del Frontend React
hacia el bucket S3 (Hosting Estático) en el emulador local Floci o AWS real.
"""

import mimetypes
import os
import sys

# Asegurar que el directorio backend esté en sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from shared.aws_clients import get_s3_client  # noqa: E402

BUCKET_NAME = os.getenv("MUSICSHARE_FRONTEND_BUCKET", "musicshare-frontend")
REGION = os.getenv("AWS_DEFAULT_REGION", "us-east-1")

def deploy_frontend():
    root_dir = os.path.abspath(os.path.join(backend_path, ".."))
    dist_dir = os.path.join(root_dir, "frontend", "dist")

    if not os.path.exists(dist_dir):
        print(f"[ERROR] No se encontró la carpeta compilada del frontend en: {dist_dir}")
        print("Ejecuta 'npm run build' en la carpeta frontend antes de desplegar a S3.")
        sys.exit(1)

    s3 = get_s3_client()

    # 1. Asegurar que el bucket exista en S3
    try:
        s3.head_bucket(Bucket=BUCKET_NAME)
    except Exception:
        print(f"Creando bucket S3 para Frontend: {BUCKET_NAME}...")
        try:
            if REGION == "us-east-1":
                s3.create_bucket(Bucket=BUCKET_NAME)
            else:
                s3.create_bucket(
                    Bucket=BUCKET_NAME,
                    CreateBucketConfiguration={"LocationConstraint": REGION}
                )
            # Habilitar website hosting
            s3.put_bucket_website(
                Bucket=BUCKET_NAME,
                WebsiteConfiguration={
                    "IndexDocument": {"Suffix": "index.html"},
                    "ErrorDocument": {"Key": "index.html"}
                }
            )
            print(f"[OK] Bucket {BUCKET_NAME} creado y configurado para Static Website.")
        except Exception as e:
            print(f"[WARN] Error al crear bucket o ya existía: {e}")

    # 2. Subir todos los archivos de dist/ recursivamente
    explicit_mime_types = {
        ".html": "text/html; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".mjs": "application/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".svg": "image/svg+xml",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".ico": "image/x-icon",
    }

    total_files = 0
    print(f"Subiendo archivos de {dist_dir} al bucket s3://{BUCKET_NAME}/ ...")
    for root, _, files in os.walk(dist_dir):
        for file in files:
            file_path = os.path.join(root, file)
            # Clave relativa en S3 (usando '/')
            rel_path = os.path.relpath(file_path, dist_dir).replace("\\", "/")
            ext = os.path.splitext(file)[1].lower()
            mime_type = explicit_mime_types.get(ext)
            if not mime_type:
                guessed, _ = mimetypes.guess_type(file_path)
                mime_type = guessed or "application/octet-stream"

            extra_args = {"ContentType": mime_type}

            s3.upload_file(file_path, BUCKET_NAME, rel_path, ExtraArgs=extra_args)
            total_files += 1

    print(f"\n[OK] Despliegue completado: {total_files} archivos subidos exitosamente a S3.")
    s3_url = f"http://localhost:4566/{BUCKET_NAME}/index.html"
    print(f"[OK] Frontend disponible en S3: {s3_url}\n")
    return s3_url

if __name__ == "__main__":
    deploy_frontend()
