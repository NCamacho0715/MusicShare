module "dynamodb" {
  source      = "./modules/dynamodb"
  environment = var.environment
}

module "s3" {
  source               = "./modules/s3"
  bucket_name          = var.bucket_name
  frontend_bucket_name = var.frontend_bucket_name
  environment          = var.environment
}

module "sqs" {
  source      = "./modules/sqs"
  environment = var.environment
}

module "sns" {
  source      = "./modules/sns"
  environment = var.environment
}

module "lambda" {
  source                   = "./modules/lambda"
  lambda_role_arn          = aws_iam_role.lambda_exec_role.arn
  dist_path                = "${path.module}/../dist/lambdas"
  aws_endpoint_url         = var.lambda_aws_endpoint_url
  public_s3_endpoint_url   = var.public_s3_endpoint_url
  environment              = var.environment
  usuarios_table_name      = module.dynamodb.usuarios_table_name
  instrumentos_table_name  = module.dynamodb.instrumentos_table_name
  prestamos_table_name     = module.dynamodb.prestamos_table_name
  instruments_bucket_name  = module.s3.bucket_name
  danos_queue_arn          = module.sqs.queue_arn
  danos_queue_url          = module.sqs.queue_url
  notificaciones_topic_arn = module.sns.topic_arn
}

module "api_gateway" {
  source           = "./modules/api_gateway"
  environment      = var.environment
  lambda_functions = module.lambda.functions
}

module "eventbridge" {
  source                = "./modules/eventbridge"
  environment           = var.environment
  lambda_function_arn   = module.lambda.functions["vencimientos"].arn
  lambda_function_name  = module.lambda.functions["vencimientos"].function_name
}
