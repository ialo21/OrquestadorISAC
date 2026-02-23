"""Ejecutor de bots para el Orquestador de Bots.

Crea la estructura de carpetas de cada ejecución y lanza el bot como subprocess.
Estructura: ejecuciones/<bot_id>/<YYYY-MM-DD_HH-MM-SS>/logs/ y resultados/
"""

import asyncio
import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent / "data"
BOTS_FILE = DATA_DIR / "bots.json"
EXECUTIONS_FILE = DATA_DIR / "executions.json"
EJECUCIONES_DIR = Path(__file__).parent / "ejecuciones"

# Mapa de ejecuciones en curso → proceso asyncio.subprocess.Process
_running_procs: dict[str, asyncio.subprocess.Process] = {}


# ── Helpers de persistencia ──────────────────────────────────────────────────

def _load_json(path: Path) -> list[dict]:
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def _save_json(path: Path, data: list[dict]):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_execution(execution_id: str) -> Optional[dict]:
    return next((e for e in _load_json(EXECUTIONS_FILE) if e["id"] == execution_id), None)


def update_execution(execution_id: str, fields: dict):
    executions = _load_json(EXECUTIONS_FILE)
    for ex in executions:
        if ex["id"] == execution_id:
            ex.update(fields)
            break
    _save_json(EXECUTIONS_FILE, executions)


def load_bot(bot_id: str) -> Optional[dict]:
    return next((b for b in _load_json(BOTS_FILE) if b["id"] == bot_id), None)


def _register_proc(execution_id: str, proc: asyncio.subprocess.Process):
    _running_procs[execution_id] = proc


def _unregister_proc(execution_id: str):
    _running_procs.pop(execution_id, None)


def cancel_running_process(execution_id: str) -> bool:
    """Intenta terminar el proceso de una ejecución en curso."""
    proc = _running_procs.get(execution_id)
    if not proc:
        return False
    try:
        proc.terminate()
        return True
    except ProcessLookupError:
        return False
    finally:
        _unregister_proc(execution_id)


# ── Ejecución principal ──────────────────────────────────────────────────────

async def run_execution(execution_id: str):
    """Worker: ejecuta un bot y actualiza el estado de la ejecución."""
    execution = load_execution(execution_id)
    if not execution:
        logger.error("Ejecución %s no encontrada", execution_id)
        return

    # Si la ejecución ya fue cancelada antes de arrancar, no hacer nada
    if execution.get("status") == "cancelled":
        logger.info("Ejecución %s ya cancelada antes de iniciar", execution_id)
        return

    bot = load_bot(execution["bot_id"])
    if not bot:
        update_execution(execution_id, {
            "status": "failed",
            "completed_at": datetime.now().isoformat(),
            "error_message": f"Bot {execution['bot_id']} no encontrado",
        })
        return

    # Crear carpetas de salida
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    run_folder = EJECUCIONES_DIR / bot["id"] / timestamp
    logs_dir = run_folder / "logs"
    resultados_dir = run_folder / "resultados"
    logs_dir.mkdir(parents=True, exist_ok=True)
    resultados_dir.mkdir(parents=True, exist_ok=True)

    run_folder_rel = str(run_folder.relative_to(Path(__file__).parent))

    update_execution(execution_id, {
        "status": "running",
        "started_at": datetime.now().isoformat(),
        "run_folder": run_folder_rel,
    })

    script_path = Path(bot["script_path"])
    script_args = bot.get("script_args", [])
    log_file = logs_dir / "run.log"

    env = {
        **os.environ,
        "EJECUCION_DIR": str(run_folder.resolve()),
        "EJECUCION_LOGS_DIR": str(logs_dir.resolve()),
        "EJECUCION_RESULTADOS_DIR": str(resultados_dir.resolve()),
    }

    input_data: dict = execution.get("input_data", {})
    for key, value in input_data.items():
        env[f"BOT_INPUT_{key.upper()}"] = str(value)

    start_time = datetime.now()
    exit_code = -1

    try:
        proc = await asyncio.create_subprocess_exec(
            "python", str(script_path.name), *script_args,
            cwd=str(script_path.parent),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            env=env,
        )

        _register_proc(execution_id, proc)

        # Leer stdout y escribir a log en tiempo real
        with open(log_file, "w", encoding="utf-8") as lf:
            while True:
                line = await proc.stdout.readline()
                if not line:
                    break
                decoded = line.decode("utf-8", errors="replace")
                lf.write(decoded)
                lf.flush()

        exit_code = await proc.wait()
        status = "completed" if exit_code == 0 else "failed"
        error_msg = "" if exit_code == 0 else f"El proceso terminó con código {exit_code}"

    except Exception as e:
        logger.exception("Error ejecutando bot %s", bot["id"])
        status = "failed"
        error_msg = str(e)
        # Escribir error en log
        with open(log_file, "a", encoding="utf-8") as lf:
            lf.write(f"\n[EXECUTOR ERROR] {e}\n")

    finally:
        _unregister_proc(execution_id)

    duration = (datetime.now() - start_time).total_seconds()

    update_execution(execution_id, {
        "status": status,
        "completed_at": datetime.now().isoformat(),
        "exit_code": exit_code,
        "error_message": error_msg,
        "duration_seconds": round(duration, 2),
    })
    logger.info("Ejecución %s finalizada con status=%s (%.1fs)", execution_id, status, duration)


# ── Helpers para listar archivos de una ejecución ────────────────────────────

def list_execution_files(run_folder_rel: str) -> dict:
    """Retorna listas de archivos en logs/ y resultados/."""
    base = Path(__file__).parent / run_folder_rel
    result = {"logs": [], "resultados": []}

    for subfolder in ("logs", "resultados"):
        folder = base / subfolder
        if folder.exists():
            for f in sorted(folder.iterdir()):
                if f.is_file():
                    result[subfolder].append({
                        "name": f.name,
                        "size": f.stat().st_size,
                        "path": f"{subfolder}/{f.name}",
                    })
    return result


def get_execution_file_path(run_folder_rel: str, file_path: str) -> Optional[Path]:
    """Resuelve y valida la ruta de un archivo de ejecución."""
    base = Path(__file__).parent / run_folder_rel
    full = (base / file_path).resolve()
    # Evitar path traversal
    if not str(full).startswith(str(base.resolve())):
        return None
    if full.is_file():
        return full
    return None
