output "api_gateway_invoke_url" {
  description = "URL base del API Gateway"
  value       = module.api_gateway.invoke_url
}

output "api_id" {
  description = "ID del API Gateway"
  value       = module.api_gateway.api_id
}

output "dynamodb_tables" {
  description = "Nombres de las tablas DynamoDB"
  value = {
    usuarios     = module.dynamodb.usuarios_table_name
    instrumentos = module.dynamodb.instrumentos_table_name
    prestamos    = module.dynamodb.prestamos_table_name
  }
}

output "s3_bucket" {
  description = "Bucket de imágenes"
  value       = module.s3.bucket_name
}

output "frontend_s3_bucket" {
  description = "Nombre del bucket S3 para alojar el Frontend"
  value       = module.s3.frontend_bucket_name
}

output "frontend_s3_url" {
  description = "URL para acceder al Frontend alojado en S3"
  value       = module.s3.frontend_website_url
}

output "sqs_queue_url" {
  description = "URL de la cola de daños"
  value       = module.sqs.queue_url
}

output "sns_topic_arn" {
  description = "ARN del topic de notificaciones"
  value       = module.sns.topic_arn
}
