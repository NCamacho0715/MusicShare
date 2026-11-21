from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, field_validator
from shared.dates import parse_iso

class EstadoPrestamo(str, Enum):
    SOLICITADO = "solicitado"
    ACTIVO = "activo"
    DEVUELTO = "devuelto"
    DANIADO = "dañado"
    CANCELADO = "cancelado"
    VENCIDO = "vencido"

class PrestamoCreate(BaseModel):
    instrumento_id: str = Field(..., min_length=1)
    solicitante_id: str = Field(..., min_length=1)
    propietario_id: str = Field(..., min_length=1)
    fecha_inicio: str
    fecha_vencimiento: str
    observaciones: Optional[str] = Field(None, max_length=1000)

    @field_validator("fecha_inicio", "fecha_vencimiento")
    @classmethod
    def validate_iso_date(cls, v: str) -> str:
        try:
            parse_iso(v)
            return v
        except Exception:
            raise ValueError(f"Formato de fecha inválido: {v}. Debe ser ISO 8601 (ej. 2026-11-20T18:30:00Z)")

class PrestamoUpdate(BaseModel):
    estado: Optional[EstadoPrestamo] = None
    fecha_devolucion: Optional[str] = None
    observaciones: Optional[str] = Field(None, max_length=1000)
    notificacion_vencimiento_enviada: Optional[bool] = None

    @field_validator("fecha_devolucion")
    @classmethod
    def validate_iso_date(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            try:
                parse_iso(v)
                return v
            except Exception:
                raise ValueError(f"Formato de fecha inválido: {v}. Debe ser ISO 8601")
        return v

class PrestamoModel(BaseModel):
    id: str
    instrumento_id: str
    solicitante_id: str
    propietario_id: str
    fecha_inicio: str
    fecha_vencimiento: str
    fecha_devolucion: Optional[str] = None
    estado: str
    observaciones: Optional[str] = None
    notificacion_vencimiento_enviada: bool = False
    created_at: str
    updated_at: str
