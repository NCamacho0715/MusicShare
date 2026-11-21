variable "queue_name" {
  type        = string
  default     = "musicshare-danos-queue"
}

variable "dlq_name" {
  type        = string
  default     = "musicshare-danos-dlq"
}

variable "environment" {
  type        = string
  default     = "local"
}

resource "aws_sqs_queue" "danos_dlq" {
  name                      = var.dlq_name
  message_retention_seconds = 1209600 # 14 days

  tags = {
    Environment = var.environment
    Project     = "MusicShare"
  }
}

resource "aws_sqs_queue" "danos_queue" {
  name                      = var.queue_name
  visibility_timeout_seconds = 60
  message_retention_seconds = 86400 # 1 day

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.danos_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Environment = var.environment
    Project     = "MusicShare"
  }
}

output "queue_url" {
  value = aws_sqs_queue.danos_queue.url
}

output "queue_arn" {
  value = aws_sqs_queue.danos_queue.arn
}

output "dlq_url" {
  value = aws_sqs_queue.danos_dlq.url
}

output "dlq_arn" {
  value = aws_sqs_queue.danos_dlq.arn
}
