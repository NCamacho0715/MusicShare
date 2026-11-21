import os

class Config:
    AWS_ENDPOINT_URL = os.environ.get("AWS_ENDPOINT_URL", "http://localhost:4566")
    # In AWS production Lambda, AWS_ENDPOINT_URL can be set to empty string to use real AWS
    if AWS_ENDPOINT_URL.strip().lower() in ("none", "", "null", "aws"):
        AWS_ENDPOINT_URL = None

    AWS_REGION = os.environ.get("AWS_REGION", os.environ.get("AWS_DEFAULT_REGION", "us-east-1"))
    
    USUARIOS_TABLE = os.environ.get("USUARIOS_TABLE_NAME", "Usuarios")
    INSTRUMENTOS_TABLE = os.environ.get("INSTRUMENTOS_TABLE_NAME", "Instrumentos")
    PRESTAMOS_TABLE = os.environ.get("PRESTAMOS_TABLE_NAME", "Prestamos")
    
    INSTRUMENTS_BUCKET = os.environ.get("INSTRUMENTS_BUCKET_NAME", "musicshare-instrument-images")
    
    DANOS_QUEUE_URL = os.environ.get("DANOS_QUEUE_URL", "")
    NOTIFICACIONES_TOPIC_ARN = os.environ.get("NOTIFICACIONES_TOPIC_ARN", "")
