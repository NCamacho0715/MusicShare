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

variable "frontend_bucket_name" {
  type        = string
  description = "Nombre del bucket S3 para alojar los archivos estáticos del frontend React"
  default     = "musicshare-frontend"
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

# --- Bucket S3 para Hosting Estático del Frontend React ---
resource "aws_s3_bucket" "frontend" {
  bucket = var.frontend_bucket_name

  tags = {
    Environment = var.environment
    Project     = "MusicShare"
  }
}

resource "aws_s3_bucket_website_configuration" "frontend_website" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_cors_configuration" "frontend_cors" {
  bucket = aws_s3_bucket.frontend.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    max_age_seconds = 3000
  }
}

output "bucket_name" {
  value = aws_s3_bucket.instrument_images.id
}

output "bucket_arn" {
  value = aws_s3_bucket.instrument_images.arn
}

output "frontend_bucket_name" {
  value = aws_s3_bucket.frontend.id
}

output "frontend_bucket_arn" {
  value = aws_s3_bucket.frontend.arn
}

output "frontend_website_url" {
  value = "http://localhost:4566/${aws_s3_bucket.frontend.id}/index.html"
}
