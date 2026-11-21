variable "bucket_name" {
  type        = string
  description = "Nombre del bucket S3 para imágenes de instrumentos"
  default     = "musicshare-instrument-images"
}

variable "environment" {
  type        = string
  description = "Ambiente de despliegue"
  default     = "local"
}

resource "aws_s3_bucket" "instrument_images" {
  bucket = var.bucket_name

  tags = {
    Environment = var.environment
    Project     = "MusicShare"
  }
}

resource "aws_s3_bucket_cors_configuration" "images_cors" {
  bucket = aws_s3_bucket.instrument_images.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

output "bucket_name" {
  value = aws_s3_bucket.instrument_images.id
}

output "bucket_arn" {
  value = aws_s3_bucket.instrument_images.arn
}
