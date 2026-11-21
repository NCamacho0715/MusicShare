output "api_gateway_invoke_url" {
  description = "URL base del API Gateway"
  value       = module.api_gateway.invoke_url
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

output "sqs_queue_url" {
  description = "URL de la cola de daños"
  value       = module.sqs.queue_url
}

output "sns_topic_arn" {
  description = "ARN del topic de notificaciones"
  value       = module.sns.topic_arn
}
