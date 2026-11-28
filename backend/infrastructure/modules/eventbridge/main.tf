variable "lambda_function_arn" {
  type        = string
  description = "ARN de la función Lambda de revisión de vencimientos"
}

variable "lambda_function_name" {
  type        = string
  description = "Nombre de la función Lambda de revisión de vencimientos"
}

variable "environment" {
  type    = string
  default = "local"
}

resource "aws_cloudwatch_event_rule" "daily_vencimientos" {
  name                = "musicshare-revisar-vencimientos-rule"
  description         = "Ejecuta diariamente la revisión de vencimientos de préstamos"
  schedule_expression = "rate(1 day)"

  tags = {
    Environment = var.environment
    Project     = "MusicShare"
  }
}

resource "aws_cloudwatch_event_target" "vencimientos_target" {
  rule      = aws_cloudwatch_event_rule.daily_vencimientos.name
  target_id = "VencimientosLambdaTarget"
  arn       = var.lambda_function_arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_vencimientos.arn
}

output "rule_arn" {
  value = aws_cloudwatch_event_rule.daily_vencimientos.arn
}
