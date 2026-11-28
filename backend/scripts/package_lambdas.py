import hashlib
import os
import platform
import shutil
import subprocess
import sys
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

ZIP_TIMESTAMP = (2026, 1, 1, 0, 0, 0)


def detect_linux_platform_tag() -> str:
    env_tag = os.environ.get("LAMBDA_PIP_PLATFORM", "").strip()
    if env_tag:
        return env_tag

    arch = ""
    try:
        res = subprocess.run(
            ["docker", "info", "--format", "{{.Architecture}}"],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
        if res.returncode == 0:
            arch = res.stdout.strip().lower()
    except Exception:
        pass

    if not arch:
        arch = platform.machine().lower()

    if any(token in arch for token in ("aarch64", "arm64")):
        return "manylinux2014_aarch64"
    return "manylinux2014_x86_64"


def ensure_lambda_dependencies(backend_dir: Path, dist_root: Path) -> Path:
    req_file = backend_dir / "requirements-lambda.txt"
    platform_tag = detect_linux_platform_tag()
    deps_dir = dist_root / f"lambda_deps_{platform_tag}"
    stamp_file = deps_dir / ".stamp"

    if not req_file.exists():
        deps_dir.mkdir(parents=True, exist_ok=True)
        return deps_dir

    expected_stamp = hashlib.sha256(
        req_file.read_bytes() + f"\n{platform_tag}\n3.12".encode("utf-8")
    ).hexdigest()

    if deps_dir.exists() and stamp_file.exists() and stamp_file.read_text(encoding="utf-8").strip() == expected_stamp:
        print(f"Usando dependencias Lambda cacheadas ({platform_tag}) en: {deps_dir}")
        return deps_dir

    print(f"Instalando dependencias Linux Python 3.12 ({platform_tag}) desde {req_file.name}...")
    if deps_dir.exists():
        shutil.rmtree(deps_dir, ignore_errors=True)
    deps_dir.mkdir(parents=True, exist_ok=True)

    subprocess.check_call([
        sys.executable,
        "-m",
        "pip",
        "install",
        "--target",
        str(deps_dir),
        "--platform",
        platform_tag,
        "--implementation",
        "cp",
        "--python-version",
        "3.12",
        "--only-binary=:all:",
        "--upgrade",
        "--quiet",
        "-r",
        str(req_file),
    ])

    for child in list(deps_dir.iterdir()):
        if child.is_dir() and (child.name.endswith(".dist-info") or child.name == "bin"):
            shutil.rmtree(child, ignore_errors=True)
    for root, dirs, _ in os.walk(deps_dir):
        if "__pycache__" in dirs:
            shutil.rmtree(Path(root) / "__pycache__", ignore_errors=True)

    stamp_file.write_text(expected_stamp, encoding="utf-8")
    return deps_dir


def add_file_deterministic(zf: zipfile.ZipFile, file_path: Path, arcname: str) -> None:
    info = zipfile.ZipInfo(filename=arcname, date_time=ZIP_TIMESTAMP)
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = 0o644 << 16
    zf.writestr(info, file_path.read_bytes())


def iter_clean_files(base_dir: Path, relative_root: Path):
    collected = []
    for root, dirs, files in os.walk(base_dir):
        dirs[:] = sorted(
            d for d in dirs
            if d != "__pycache__" and not d.endswith(".dist-info")
        )
        for file in sorted(files):
            if file in (".stamp", ".DS_Store") or file.endswith((".pyc", ".pyo")):
                continue
            full_path = Path(root) / file
            arcname = str(full_path.relative_to(relative_root)).replace("\\", "/")
            collected.append((full_path, arcname))
    return collected


def package_all():
    backend_dir = Path(__file__).resolve().parent.parent
    shared_dir = backend_dir / "shared"
    dist_root = backend_dir / "dist"
    dist_dir = dist_root / "lambdas"
    dist_dir.mkdir(parents=True, exist_ok=True)

    deps_dir = ensure_lambda_dependencies(backend_dir, dist_root)
    shared_files = iter_clean_files(shared_dir, shared_dir.parent)
    deps_files = iter_clean_files(deps_dir, deps_dir)

    print(f"Empaquetando lambdas en: {dist_dir}")

    for zip_name, lambda_rel_path in LAMBDAS:
        lambda_dir = backend_dir / lambda_rel_path
        handler_file = lambda_dir / "handler.py"
        if not handler_file.exists():
            print(f"ADVERTENCIA: No se encontró {handler_file}")
            continue

        zip_path = dist_dir / f"{zip_name}.zip"
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            add_file_deterministic(zf, handler_file, "handler.py")
            for full_path, arcname in shared_files:
                add_file_deterministic(zf, full_path, arcname)
            for full_path, arcname in deps_files:
                add_file_deterministic(zf, full_path, arcname)

        print(f" -> Creado {zip_path.name} ({zip_path.stat().st_size} bytes)")

    print("Empaquetado completado exitosamente.")


if __name__ == "__main__":
    package_all()
