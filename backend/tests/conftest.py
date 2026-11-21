import os
import sys
import pytest

# Ensure backend and shared modules are on sys.path
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

# Set test environment variables by default
os.environ["AWS_ENDPOINT_URL"] = "http://localhost:4566"
os.environ["AWS_REGION"] = "us-east-1"
os.environ["AWS_ACCESS_KEY_ID"] = "test"
os.environ["AWS_SECRET_ACCESS_KEY"] = "test"
os.environ["USUARIOS_TABLE_NAME"] = "Usuarios"
os.environ["INSTRUMENTOS_TABLE_NAME"] = "Instrumentos"
os.environ["PRESTAMOS_TABLE_NAME"] = "Prestamos"
os.environ["INSTRUMENTS_BUCKET_NAME"] = "musicshare-instrument-images"
os.environ["DANOS_QUEUE_URL"] = "http://localhost:4566/000000000000/musicshare-danos-queue"
os.environ["NOTIFICACIONES_TOPIC_ARN"] = "arn:aws:sns:us-east-1:000000000000:musicshare-notificaciones"
