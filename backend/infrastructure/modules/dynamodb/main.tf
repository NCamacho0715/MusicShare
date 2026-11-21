variable "environment" {
  type        = string
  description = "Ambiente de despliegue"
  default     = "local"
}

resource "aws_dynamodb_table" "usuarios" {
  name         = "Usuarios"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "correo"
    type = "S"
  }

  attribute {
    name = "rol"
    type = "S"
  }

  global_secondary_index {
    name            = "email-index"
    hash_key        = "correo"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "rol-index"
    hash_key        = "rol"
    projection_type = "ALL"
  }

  tags = {
    Environment = var.environment
    Project     = "MusicShare"
  }
}

resource "aws_dynamodb_table" "instrumentos" {
  name         = "Instrumentos"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "propietario_id"
    type = "S"
  }

  attribute {
    name = "estado"
    type = "S"
  }

  attribute {
    name = "categoria"
    type = "S"
  }

  global_secondary_index {
    name            = "propietario_id-index"
    hash_key        = "propietario_id"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "estado-index"
    hash_key        = "estado"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "categoria-index"
    hash_key        = "categoria"
    projection_type = "ALL"
  }

  tags = {
    Environment = var.environment
    Project     = "MusicShare"
  }
}

resource "aws_dynamodb_table" "prestamos" {
  name         = "Prestamos"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "instrumento_id"
    type = "S"
  }

  attribute {
    name = "solicitante_id"
    type = "S"
  }

  attribute {
    name = "propietario_id"
    type = "S"
  }

  attribute {
    name = "estado"
    type = "S"
  }

  attribute {
    name = "fecha_vencimiento"
    type = "S"
  }

  global_secondary_index {
    name            = "instrumento_id-index"
    hash_key        = "instrumento_id"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "solicitante_id-index"
    hash_key        = "solicitante_id"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "propietario_id-index"
    hash_key        = "propietario_id"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "estado-index"
    hash_key        = "estado"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "fecha_vencimiento-index"
    hash_key        = "fecha_vencimiento"
    projection_type = "ALL"
  }

  tags = {
    Environment = var.environment
    Project     = "MusicShare"
  }
}

output "usuarios_table_name" {
  value = aws_dynamodb_table.usuarios.name
}

output "usuarios_table_arn" {
  value = aws_dynamodb_table.usuarios.arn
}

output "instrumentos_table_name" {
  value = aws_dynamodb_table.instrumentos.name
}

output "instrumentos_table_arn" {
  value = aws_dynamodb_table.instrumentos.arn
}

output "prestamos_table_name" {
  value = aws_dynamodb_table.prestamos.name
}

output "prestamos_table_arn" {
  value = aws_dynamodb_table.prestamos.arn
}
