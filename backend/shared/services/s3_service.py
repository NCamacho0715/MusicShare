import os
from typing import Any, Dict, Optional
from shared.aws_clients import get_s3_client
from shared.config import Config

class S3Service:
    def __init__(self, bucket_name: Optional[str] = None):
        self.s3_client = get_s3_client()
        self.bucket_name = bucket_name or Config.INSTRUMENTS_BUCKET

    def generate_upload_url(self, instrumento_id: str, filename: str, expires_in: int = 3600) -> Dict[str, Any]:
        sanitized_filename = os.path.basename(filename)
        key = f"instrumentos/{instrumento_id}/{sanitized_filename}"
        url = self.s3_client.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": self.bucket_name,
                "Key": key,
            },
            ExpiresIn=expires_in
        )
        return {
            "upload_url": url,
            "key": key,
            "bucket": self.bucket_name
        }

    def generate_download_url(self, key: str, expires_in: int = 3600) -> str:
        return self.s3_client.generate_presigned_url(
            ClientMethod="get_object",
            Params={
                "Bucket": self.bucket_name,
                "Key": key
            },
            ExpiresIn=expires_in
        )

    def delete_file(self, key: str) -> None:
        self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
