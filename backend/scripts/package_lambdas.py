import os
import shutil
import zipfile
from pathlib import Path

LAMBDAS = [
    ("usuarios_crear", "lambdas/usuarios/crear"),
    ("usuarios_buscar", "lambdas/usuarios/buscar"),
    ("usuarios_actualizar", "lambdas/usuarios/actualizar"),
    ("usuarios_eliminar", "lambdas/usuarios/eliminar"),
    ("instrumentos_crear", "lambdas/instrumentos/crear"),
    ("instrumentos_buscar", "lambdas/instrumentos/buscar"),
    ("instrumentos_actualizar", "lambdas/instrumentos/actualizar"),
    ("instrumentos_eliminar", "lambdas/instrumentos/eliminar"),
    ("instrumentos_imagen", "lambdas/instrumentos/imagen"),
    ("prestamos_crear", "lambdas/prestamos/crear"),
    ("prestamos_buscar", "lambdas/prestamos/buscar"),
    ("prestamos_obtener", "lambdas/prestamos/obtener"),
    ("prestamos_actualizar", "lambdas/prestamos/actualizar"),
    ("prestamos_eliminar", "lambdas/prestamos/eliminar"),
    ("mantenimiento", "lambdas/mantenimiento"),
    ("vencimientos", "lambdas/vencimientos"),
]

def package_all():
    backend_dir = Path(__file__).resolve().parent.parent
    shared_dir = backend_dir / "shared"
    dist_dir = backend_dir / "dist" / "lambdas"
    dist_dir.mkdir(parents=True, exist_ok=True)

    print(f"Empaquetando lambdas en: {dist_dir}")

    for zip_name, lambda_rel_path in LAMBDAS:
        lambda_dir = backend_dir / lambda_rel_path
        handler_file = lambda_dir / "handler.py"
        if not handler_file.exists():
            print(f"ADVERTENCIA: No se encontró {handler_file}")
            continue

        zip_path = dist_dir / f"{zip_name}.zip"
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            # Add handler.py at root
            zf.write(handler_file, arcname="handler.py")

            # Add shared module files
            for root, _, files in os.walk(shared_dir):
                for file in files:
                    if file.endswith((".pyc", ".pyo")) or "__pycache__" in root:
                        continue
                    full_path = Path(root) / file
                    rel_to_shared = full_path.relative_to(shared_dir.parent)
                    zf.write(full_path, arcname=str(rel_to_shared).replace("\\", "/"))

        print(f" -> Creado {zip_path.name} ({zip_path.stat().st_size} bytes)")

    print("Empaquetado completado exitosamente.")

if __name__ == "__main__":
    package_all()
