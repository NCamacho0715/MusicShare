variable "environment" {
  type    = string
  default = "local"
}

variable "lambda_functions" {
  type        = any
  description = "Mapa de funciones Lambda para asociar a los métodos de API Gateway"
}

resource "aws_api_gateway_rest_api" "api" {
  name        = "musicshare-api"
  description = "API Gateway para MusicShare Backend"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Environment = var.environment
    Project     = "MusicShare"
  }
}

# --- /usuarios ---
resource "aws_api_gateway_resource" "usuarios" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "usuarios"
}

resource "aws_api_gateway_resource" "usuarios_id" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.usuarios.id
  path_part   = "{id}"
}

# POST /usuarios
resource "aws_api_gateway_method" "post_usuarios" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.usuarios.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "post_usuarios_int" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.usuarios.id
  http_method             = aws_api_gateway_method.post_usuarios.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_functions["usuarios_crear"].invoke_arn
}

# GET /usuarios
resource "aws_api_gateway_method" "get_usuarios" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.usuarios.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "get_usuarios_int" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.usuarios.id
  http_method             = aws_api_gateway_method.get_usuarios.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_functions["usuarios_buscar"].invoke_arn
}

# GET /usuarios/{id}
resource "aws_api_gateway_method" "get_usuarios_id" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.usuarios_id.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "get_usuarios_id_int" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.usuarios_id.id
  http_method             = aws_api_gateway_method.get_usuarios_id.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_functions["usuarios_buscar"].invoke_arn
}

# PUT /usuarios/{id}
resource "aws_api_gateway_method" "put_usuarios_id" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.usuarios_id.id
  http_method   = "PUT"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "put_usuarios_id_int" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.usuarios_id.id
  http_method             = aws_api_gateway_method.put_usuarios_id.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_functions["usuarios_actualizar"].invoke_arn
}

# DELETE /usuarios/{id}
resource "aws_api_gateway_method" "delete_usuarios_id" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.usuarios_id.id
  http_method   = "DELETE"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "delete_usuarios_id_int" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.usuarios_id.id
  http_method             = aws_api_gateway_method.delete_usuarios_id.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_functions["usuarios_eliminar"].invoke_arn
}

# --- /instrumentos ---
resource "aws_api_gateway_resource" "instrumentos" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "instrumentos"
}

resource "aws_api_gateway_resource" "instrumentos_id" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.instrumentos.id
  path_part   = "{id}"
}

resource "aws_api_gateway_resource" "instrumentos_imagen" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.instrumentos_id.id
  path_part   = "imagen-url"
}

# POST /instrumentos
resource "aws_api_gateway_method" "post_instrumentos" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.instrumentos.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "post_instrumentos_int" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.instrumentos.id
  http_method             = aws_api_gateway_method.post_instrumentos.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_functions["instrumentos_crear"].invoke_arn
}

# GET /instrumentos
resource "aws_api_gateway_method" "get_instrumentos" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.instrumentos.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "get_instrumentos_int" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.instrumentos.id
  http_method             = aws_api_gateway_method.get_instrumentos.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_functions["instrumentos_buscar"].invoke_arn
}

# GET /instrumentos/{id}
resource "aws_api_gateway_method" "get_instrumentos_id" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.instrumentos_id.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "get_instrumentos_id_int" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.instrumentos_id.id
  http_method             = aws_api_gateway_method.get_instrumentos_id.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_functions["instrumentos_buscar"].invoke_arn
}

# PUT /instrumentos/{id}
resource "aws_api_gateway_method" "put_instrumentos_id" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.instrumentos_id.id
  http_method   = "PUT"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "put_instrumentos_id_int" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.instrumentos_id.id
  http_method             = aws_api_gateway_method.put_instrumentos_id.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_functions["instrumentos_actualizar"].invoke_arn
}

# DELETE /instrumentos/{id}
resource "aws_api_gateway_method" "delete_instrumentos_id" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.instrumentos_id.id
  http_method   = "DELETE"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "delete_instrumentos_id_int" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.instrumentos_id.id
  http_method             = aws_api_gateway_method.delete_instrumentos_id.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_functions["instrumentos_eliminar"].invoke_arn
}

# POST /instrumentos/{id}/imagen-url
resource "aws_api_gateway_method" "post_instrumentos_imagen" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.instrumentos_imagen.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "post_instrumentos_imagen_int" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.instrumentos_imagen.id
  http_method             = aws_api_gateway_method.post_instrumentos_imagen.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_functions["instrumentos_imagen"].invoke_arn
}

# --- /prestamos ---
resource "aws_api_gateway_resource" "prestamos" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "prestamos"
}

resource "aws_api_gateway_resource" "prestamos_id" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.prestamos.id
  path_part   = "{id}"
}

# POST /prestamos
resource "aws_api_gateway_method" "post_prestamos" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.prestamos.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "post_prestamos_int" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.prestamos.id
  http_method             = aws_api_gateway_method.post_prestamos.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_functions["prestamos_crear"].invoke_arn
}

# GET /prestamos
resource "aws_api_gateway_method" "get_prestamos" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.prestamos.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "get_prestamos_int" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.prestamos.id
  http_method             = aws_api_gateway_method.get_prestamos.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_functions["prestamos_buscar"].invoke_arn
}

# GET /prestamos/{id}
resource "aws_api_gateway_method" "get_prestamos_id" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.prestamos_id.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "get_prestamos_id_int" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.prestamos_id.id
  http_method             = aws_api_gateway_method.get_prestamos_id.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_functions["prestamos_obtener"].invoke_arn
}

# PUT /prestamos/{id}
resource "aws_api_gateway_method" "put_prestamos_id" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.prestamos_id.id
  http_method   = "PUT"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "put_prestamos_id_int" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.prestamos_id.id
  http_method             = aws_api_gateway_method.put_prestamos_id.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_functions["prestamos_actualizar"].invoke_arn
}

# DELETE /prestamos/{id}
resource "aws_api_gateway_method" "delete_prestamos_id" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.prestamos_id.id
  http_method   = "DELETE"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "delete_prestamos_id_int" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.prestamos_id.id
  http_method             = aws_api_gateway_method.delete_prestamos_id.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_functions["prestamos_eliminar"].invoke_arn
}

# --- CORS para cada recurso ---
locals {
  cors_resources = {
    usuarios            = aws_api_gateway_resource.usuarios.id
    usuarios_id         = aws_api_gateway_resource.usuarios_id.id
    instrumentos        = aws_api_gateway_resource.instrumentos.id
    instrumentos_id     = aws_api_gateway_resource.instrumentos_id.id
    instrumentos_imagen = aws_api_gateway_resource.instrumentos_imagen.id
    prestamos           = aws_api_gateway_resource.prestamos.id
    prestamos_id        = aws_api_gateway_resource.prestamos_id.id
  }
}

resource "aws_api_gateway_method" "options" {
  for_each      = local.cors_resources
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = each.value
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_int" {
  for_each    = local.cors_resources
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = each.value
  http_method = aws_api_gateway_method.options[each.key].http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options_200" {
  for_each    = local.cors_resources
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = each.value
  http_method = aws_api_gateway_method.options[each.key].http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_int_resp" {
  for_each    = local.cors_resources
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = each.value
  http_method = aws_api_gateway_method.options[each.key].http_method
  status_code = aws_api_gateway_method_response.options_200[each.key].status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-User-Id,X-User-Role,X-User-Name,X-User-Email,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
  depends_on = [aws_api_gateway_integration.options_int]
}

# Permissions for API Gateway to call Lambdas
resource "aws_lambda_permission" "api_gateway_permissions" {
  for_each      = var.lambda_functions
  statement_id  = "AllowAPIGatewayInvoke-${each.key}"
  action        = "lambda:InvokeFunction"
  function_name = each.value.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*/*"
}

# Deployment & Stage
resource "aws_api_gateway_deployment" "deployment" {
  rest_api_id = aws_api_gateway_rest_api.api.id

  depends_on = [
    aws_api_gateway_integration.post_usuarios_int,
    aws_api_gateway_integration.get_usuarios_int,
    aws_api_gateway_integration.get_usuarios_id_int,
    aws_api_gateway_integration.put_usuarios_id_int,
    aws_api_gateway_integration.delete_usuarios_id_int,
    aws_api_gateway_integration.post_instrumentos_int,
    aws_api_gateway_integration.get_instrumentos_int,
    aws_api_gateway_integration.get_instrumentos_id_int,
    aws_api_gateway_integration.put_instrumentos_id_int,
    aws_api_gateway_integration.delete_instrumentos_id_int,
    aws_api_gateway_integration.post_instrumentos_imagen_int,
    aws_api_gateway_integration.post_prestamos_int,
    aws_api_gateway_integration.get_prestamos_int,
    aws_api_gateway_integration.get_prestamos_id_int,
    aws_api_gateway_integration.put_prestamos_id_int,
    aws_api_gateway_integration.delete_prestamos_id_int,
    aws_api_gateway_integration_response.options_int_resp,
  ]

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "stage" {
  deployment_id = aws_api_gateway_deployment.deployment.id
  rest_api_id   = aws_api_gateway_rest_api.api.id
  stage_name    = var.environment
}

output "api_id" {
  value = aws_api_gateway_rest_api.api.id
}

output "stage_name" {
  value = aws_api_gateway_stage.stage.stage_name
}

output "invoke_url" {
  value = "http://localhost:4566/restapis/${aws_api_gateway_rest_api.api.id}/${aws_api_gateway_stage.stage.stage_name}/_user_request_"
}
