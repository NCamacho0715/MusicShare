variable "topic_name" {
  type        = string
  default     = "musicshare-notificaciones"
}

variable "environment" {
  type        = string
  default     = "local"
}

resource "aws_sns_topic" "notificaciones" {
  name = var.topic_name

  tags = {
    Environment = var.environment
    Project     = "MusicShare"
  }
}

output "topic_arn" {
  value = aws_sns_topic.notificaciones.arn
}

output "topic_name" {
  value = aws_sns_topic.notificaciones.name
}
