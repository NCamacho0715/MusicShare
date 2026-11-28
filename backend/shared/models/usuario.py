import re
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, field_validator

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

class RolUsuario(str, Enum):
    ESTUDIANTE = "estudiante"
    MUSICO = "musico"
    PROPIETARIO = "propietario"
    ADMINISTRADOR = "administrador"

class EstadoUsuario(str, Enum):
    ACTIVO = "activo"
    INACTIVO = "inactivo"

class UsuarioCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    apellido: str = Field(..., min_length=1, max_length=100)
    correo: str
    telefono: Optional[str] = Field(None, max_length=20)
    rol: RolUsuario
    estado: EstadoUsuario = EstadoUsuario.ACTIVO

    @field_validator("correo")
    @classmethod
    def validate_correo(cls, v: str) -> str:
        if not EMAIL_REGEX.match(v):
            raise ValueError(f"Formato de correo inválido: {v}")
        return v.lower().strip()

class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=100)
    apellido: Optional[str] = Field(None, min_length=1, max_length=100)
    correo: Optional[str] = None
    telefono: Optional[str] = Field(None, max_length=20)
    rol: Optional[RolUsuario] = None
    estado: Optional[EstadoUsuario] = None

    @field_validator("correo")
    @classmethod
    def validate_correo(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not EMAIL_REGEX.match(v):
                raise ValueError(f"Formato de correo inválido: {v}")
            return v.lower().strip()
        return v

class UsuarioModel(BaseModel):
    id: str
    nombre: str
    apellido: str
    correo: str
    telefono: Optional[str] = None
    rol: str
    estado: str
    created_at: str
    updated_at: str
