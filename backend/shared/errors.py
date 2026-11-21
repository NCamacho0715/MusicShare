class AppException(Exception):
    def __init__(self, message: str, status_code: int = 400, error_code: str = "BAD_REQUEST", details=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details

class NotFoundError(AppException):
    def __init__(self, message: str = "Recurso no encontrado", details=None):
        super().__init__(message=message, status_code=404, error_code="NOT_FOUND", details=details)

class ConflictError(AppException):
    def __init__(self, message: str = "Conflicto con recurso existente", details=None):
        super().__init__(message=message, status_code=409, error_code="CONFLICT", details=details)

class ValidationError(AppException):
    def __init__(self, message: str = "Error de validación", details=None):
        super().__init__(message=message, status_code=422, error_code="UNPROCESSABLE_ENTITY", details=details)

class ForbiddenError(AppException):
    def __init__(self, message: str = "Operación no permitida", details=None):
        super().__init__(message=message, status_code=403, error_code="FORBIDDEN", details=details)

class BadRequestError(AppException):
    def __init__(self, message: str = "Solicitud inválida", details=None):
        super().__init__(message=message, status_code=400, error_code="BAD_REQUEST", details=details)
