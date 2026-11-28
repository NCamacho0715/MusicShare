import os
from typing import Optional
from urllib.parse import urlparse, urlunparse


def _is_disabled_endpoint(value: Optional[str]) -> bool:
    if value is None:
        return True
    return value.strip().lower() in ("none", "", "null", "aws")


class Config:
    AWS_ENDPOINT_URL = os.environ.get("AWS_ENDPOINT_URL", "http://localhost:4566")
    # In AWS production Lambda, AWS_ENDPOINT_URL can be set to empty string to use real AWS
    if _is_disabled_endpoint(AWS_ENDPOINT_URL):
        AWS_ENDPOINT_URL = None

    AWS_REGION = os.environ.get("AWS_REGION", os.environ.get("AWS_DEFAULT_REGION", "us-east-1"))

    USUARIOS_TABLE = os.environ.get("USUARIOS_TABLE_NAME", "Usuarios")
    INSTRUMENTOS_TABLE = os.environ.get("INSTRUMENTOS_TABLE_NAME", "Instrumentos")
    PRESTAMOS_TABLE = os.environ.get("PRESTAMOS_TABLE_NAME", "Prestamos")

    INSTRUMENTS_BUCKET = os.environ.get("INSTRUMENTS_BUCKET_NAME", "musicshare-instrument-images")

    DANOS_QUEUE_URL = os.environ.get("DANOS_QUEUE_URL", "")
    NOTIFICACIONES_TOPIC_ARN = os.environ.get("NOTIFICACIONES_TOPIC_ARN", "")

    @classmethod
    def get_aws_region(cls) -> str:
        return os.environ.get("AWS_REGION", os.environ.get("AWS_DEFAULT_REGION", cls.AWS_REGION))

    @classmethod
    def get_aws_endpoint_url(cls) -> Optional[str]:
        raw = os.environ["AWS_ENDPOINT_URL"] if "AWS_ENDPOINT_URL" in os.environ else cls.AWS_ENDPOINT_URL
        if _is_disabled_endpoint(raw):
            return None

        endpoint = raw.strip()
        if os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
            parsed = urlparse(endpoint)
            if parsed.hostname in ("localhost", "127.0.0.1"):
                port = f":{parsed.port}" if parsed.port else ""
                endpoint = urlunparse(parsed._replace(netloc=f"floci{port}"))
        return endpoint

    @classmethod
    def get_public_s3_endpoint_url(cls) -> Optional[str]:
        endpoint = cls.get_aws_endpoint_url()
        if endpoint is None:
            return None
        raw_public = os.environ.get("PUBLIC_S3_ENDPOINT_URL")
        if raw_public is not None:
            if _is_disabled_endpoint(raw_public):
                return None
            return raw_public.strip()
        parsed = urlparse(endpoint)
        if parsed.hostname == "floci":
            port = f":{parsed.port}" if parsed.port else ""
            return urlunparse(parsed._replace(netloc=f"localhost{port}"))
        return endpoint

    @classmethod
    def get_danos_queue_url(cls) -> str:
        queue_url = (os.environ.get("DANOS_QUEUE_URL") or cls.DANOS_QUEUE_URL or "").strip()
        if not queue_url:
            return ""
        endpoint = cls.get_aws_endpoint_url()
        if endpoint:
            parsed_q = urlparse(queue_url)
            parsed_e = urlparse(endpoint)
            if (
                parsed_q.hostname in ("localhost", "127.0.0.1")
                and parsed_e.hostname
                and parsed_e.hostname not in ("localhost", "127.0.0.1")
            ):
                return urlunparse(
                    parsed_q._replace(scheme=parsed_e.scheme, netloc=parsed_e.netloc)
                )
        return queue_url
