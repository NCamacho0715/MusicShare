from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field

class EstadoInstrumento(str, Enum):
    DISPONIBLE = "disponible"
    PRESTADO = "prestado"
    EN_MANTENIMIENTO = "en_mantenimiento"
    INACTIVO = "inactivo"

class InstrumentoCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    marca: str = Field(..., min_length=1, max_length=100)
    modelo: str = Field(..., min_length=1, max_length=100)
    categoria: str = Field(..., min_length=1, max_length=50)
    descripcion: Optional[str] = Field(None, max_length=1000)
    estado: EstadoInstrumento = EstadoInstrumento.DISPONIBLE
    propietario_id: str = Field(..., min_length=1)
    imagen_key: Optional[str] = None

class InstrumentoUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=100)
    marca: Optional[str] = Field(None, min_length=1, max_length=100)
    modelo: Optional[str] = Field(None, min_length=1, max_length=100)
    categoria: Optional[str] = Field(None, min_length=1, max_length=50)
    descripcion: Optional[str] = Field(None, max_length=1000)
    estado: Optional[EstadoInstrumento] = None
    propietario_id: Optional[str] = None
    imagen_key: Optional[str] = None

class InstrumentoModel(BaseModel):
    id: str
    nombre: str
    marca: str
    modelo: str
    categoria: str
    descripcion: Optional[str] = None
    estado: str
    propietario_id: str
    imagen_key: Optional[str] = None
    created_at: str
    updated_at: str
