import os
import re
from typing import Any, Dict, Optional
from shared.aws_clients import get_s3_client, get_s3_presign_client
from shared.config import Config


class S3Service:
    def __init__(self, bucket_name: Optional[str] = None):
        self.s3_client = get_s3_client()
        self.presign_client = get_s3_presign_client()
        self.bucket_name = bucket_name or Config.INSTRUMENTS_BUCKET

    def generate_upload_url(
        self,
        instrumento_id: str,
        filename: str,
        content_type: Optional[str] = None,
        expires_in: int = 3600,
    ) -> Dict[str, Any]:
        base_name = os.path.basename(filename or "imagen.jpg")
        sanitized_filename = re.sub(r"[^A-Za-z0-9._-]", "_", base_name) or "imagen.jpg"
        key = f"instrumentos/{instrumento_id}/{sanitized_filename}"
        params: Dict[str, Any] = {
            "Bucket": self.bucket_name,
            "Key": key,
        }
        url = self.presign_client.generate_presigned_url(
            ClientMethod="put_object",
            Params=params,
            ExpiresIn=expires_in,
        )
        public_base = Config.get_public_s3_endpoint_url()
        if public_base:
            public_url = f"{public_base.rstrip('/')}/{self.bucket_name}/{key}"
        else:
            public_url = f"https://{self.bucket_name}.s3.{Config.get_aws_region()}.amazonaws.com/{key}"

        return {
            "upload_url": url,
            "key": key,
            "bucket": self.bucket_name,
            "public_url": public_url,
        }

    def generate_download_url(self, key: str, expires_in: int = 3600) -> str:
        return self.presign_client.generate_presigned_url(
            ClientMethod="get_object",
            Params={
                "Bucket": self.bucket_name,
                "Key": key
            },
            ExpiresIn=expires_in
        )

    def delete_file(self, key: str) -> None:
        self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
