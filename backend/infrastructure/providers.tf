provider "aws" {
  region                      = var.aws_region
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  s3_use_path_style           = true

  dynamic "endpoints" {
    for_each = var.aws_endpoint_url != "" && var.aws_endpoint_url != null ? [1] : []
    content {
      apigateway     = var.aws_endpoint_url
      cloudwatch     = var.aws_endpoint_url
      dynamodb       = var.aws_endpoint_url
      events         = var.aws_endpoint_url
      iam            = var.aws_endpoint_url
      lambda         = var.aws_endpoint_url
      s3             = var.aws_endpoint_url
      sns            = var.aws_endpoint_url
      sqs            = var.aws_endpoint_url
    }
  }
}
