variable "lambda_role_arn" {
  type = string
}

variable "dist_path" {
  type    = string
  default = "../dist/lambdas"
}

variable "aws_endpoint_url" {
  type    = string
  default = "http://floci:4566"
}

variable "public_s3_endpoint_url" {
  type    = string
  default = "http://localhost:4566"
}

variable "environment" {
  type    = string
  default = "local"
}

variable "usuarios_table_name" {
  type    = string
  default = "Usuarios"
}

variable "instrumentos_table_name" {
  type    = string
  default = "Instrumentos"
}

variable "prestamos_table_name" {
  type    = string
  default = "Prestamos"
}

variable "instruments_bucket_name" {
  type    = string
  default = "musicshare-instrument-images"
}

variable "danos_queue_arn" {
  type = string
}

variable "danos_queue_url" {
  type = string
}

variable "notificaciones_topic_arn" {
  type = string
}

locals {
  resolved_danos_queue_url = var.aws_endpoint_url != "" ? replace(replace(var.danos_queue_url, "http://localhost:4566", var.aws_endpoint_url), "http://127.0.0.1:4566", var.aws_endpoint_url) : var.danos_queue_url

  common_env = {
    AWS_ENDPOINT_URL         = var.aws_endpoint_url
    PUBLIC_S3_ENDPOINT_URL   = var.public_s3_endpoint_url
    USUARIOS_TABLE_NAME      = var.usuarios_table_name
    INSTRUMENTOS_TABLE_NAME  = var.instrumentos_table_name
    PRESTAMOS_TABLE_NAME     = var.prestamos_table_name
    INSTRUMENTS_BUCKET_NAME  = var.instruments_bucket_name
    DANOS_QUEUE_URL          = local.resolved_danos_queue_url
    NOTIFICACIONES_TOPIC_ARN = var.notificaciones_topic_arn
    ENVIRONMENT              = var.environment
  }

  functions = [
    "usuarios_crear",
    "usuarios_buscar",
    "usuarios_actualizar",
    "usuarios_eliminar",
    "instrumentos_crear",
    "instrumentos_buscar",
    "instrumentos_actualizar",
    "instrumentos_eliminar",
    "instrumentos_imagen",
    "prestamos_crear",
    "prestamos_buscar",
    "prestamos_obtener",
    "prestamos_actualizar",
    "prestamos_eliminar",
    "mantenimiento",
    "vencimientos",
  ]
}

resource "aws_lambda_function" "lambdas" {
  for_each         = toset(local.functions)
  function_name    = "musicshare-${each.key}"
  role             = var.lambda_role_arn
  handler          = "handler.lambda_handler"
  runtime          = "python3.12"
  filename         = "${var.dist_path}/${each.key}.zip"
  source_code_hash = filebase64sha256("${var.dist_path}/${each.key}.zip")
  timeout          = 30
  memory_size      = 256

  environment {
    variables = local.common_env
  }

  tags = {
    Environment = var.environment
    Project     = "MusicShare"
  }
}

# Event source mapping for SQS -> Mantenimiento Lambda
resource "aws_lambda_event_source_mapping" "sqs_mantenimiento" {
  event_source_arn = var.danos_queue_arn
  function_name    = aws_lambda_function.lambdas["mantenimiento"].arn
  batch_size       = 10
  enabled          = true
}

output "functions" {
  value = aws_lambda_function.lambdas
}
