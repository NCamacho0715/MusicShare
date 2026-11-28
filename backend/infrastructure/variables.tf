variable "aws_region" {
  type        = string
  description = "Región de AWS"
  default     = "us-east-1"
}

variable "environment" {
  type        = string
  description = "Ambiente de despliegue (local, ci, production)"
  default     = "local"
}

variable "aws_endpoint_url" {
  type        = string
  description = "Endpoint personalizado para emuladores locales como Floci"
  default     = "http://localhost:4566"
}

variable "lambda_aws_endpoint_url" {
  type        = string
  description = "Endpoint interno usado por contenedores Lambda en Docker para comunicarse con Floci"
  default     = "http://floci:4566"
}

variable "public_s3_endpoint_url" {
  type        = string
  description = "Endpoint público usado para firmar URLs prefirmadas de S3 alcanzables desde el navegador"
  default     = "http://localhost:4566"
}

variable "bucket_name" {
  type        = string
  description = "Nombre del bucket S3 para imágenes"
  default     = "musicshare-instrument-images"
}

variable "frontend_bucket_name" {
  type        = string
  description = "Nombre del bucket S3 para alojar el frontend React"
  default     = "musicshare-frontend"
}
