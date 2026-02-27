"""
Orquestador de Bots - Backend API
FastAPI application for managing and orchestrating RPA/automation bots.
"""

import asyncio
import io
import json
import logging
import os
import zipfile
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse, StreamingResponse
from sse_starlette.sse import EventSourceResponse

import auth
import executor
import queue_manager
from models import (
    Bot, BotCreate, BotExecution, BotUpdate, ExecutionRequest,
    BotSchedule, ScheduleCreate, ScheduleUpdate,
    Stats, User, UserBotsUpdate, UserRoleUpdate,
)

DATA_DIR = Path(__file__).parent / "data"
BOTS_FILE = DATA_DIR / "bots.json"
EXECUTIONS_FILE = DATA_DIR / "executions.json"
SCHEDULES_FILE = DATA_DIR / "schedules.json"
EJECUCIONES_DIR = Path(__file__).parent / "ejecuciones"

MAX_HEADLESS = int(os.getenv("MAX_HEADLESS_WORKERS", "3"))


# ── Helpers ──────────────────────────────────────────────────────────────────

def _load(path: Path) -> list[dict]:
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def _save(path: Path, data: list[dict]):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _init_default_bots():
    if BOTS_FILE.exists():
        return
    defaults = [
        Bot(
            id="robot-extraccion-mongo",
            name="Robot Extracción MongoDB",
            description="Extrae logs de auditoría desde MongoDB Atlas vía Playwright.",
            requires_ui=True,
            script_path=r"c:\apps\RobotExtraccionMongo\main.py",
            page_slug="robot-extraccion-mongo",
            icon="Database",
            supports_data_input=True,
            supports_scheduling=True,
        ),
        Bot(
            id="rpa-moni-objetos",
            name="RPA Monitoreo Objetos",
            description="Automatización RPA para monitoreo de objetos de aplicación vía RDP.",
            requires_ui=True,
            script_path=r"c:\apps\RPA_MONI_OBJETOS\main.py",
            page_slug="rpa-moni-objetos",
            icon="Monitor",
        ),
    ]
    _save(BOTS_FILE, [b.model_dump() for b in defaults])


def _recover_interrupted():
    if not EXECUTIONS_FILE.exists():
        return
    execs = _load(EXECUTIONS_FILE)
    changed = False
    for ex in execs:
        if ex.get("status") in ("running", "queued"):
            ex["status"] = "interrupted"
            ex["completed_at"] = datetime.now().isoformat()
            changed = True
    if changed:
        _save(EXECUTIONS_FILE, execs)


# ── Lifespan ─────────────────────────────────────────────────────────────────

_scheduler_task: Optional[asyncio.Task] = None


async def _scheduler_loop():
    """Background task: checks schedules every 60s and enqueues due executions."""
    import asyncio as _aio
    logger = logging.getLogger("scheduler")
    while True:
        try:
            await _check_schedules(logger)
        except Exception as e:
            logger.error("Error en scheduler: %s", e)
        await _aio.sleep(60)


async def _check_schedules(logger):
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    current_time = now.strftime("%H:%M")
    current_weekday = now.weekday()
    current_day = now.day

    schedules = _load(SCHEDULES_FILE)
    if not schedules:
        return

    for sched in schedules:
        if not sched.get("enabled", True):
            continue

        should_run = False
        sched_time = sched.get("time", "08:00")

        if current_time != sched_time:
            continue

        stype = sched.get("type", "dates")

        if stype == "dates":
            if today_str in sched.get("scheduled_dates", []):
                should_run = True
        elif stype == "frequency":
            freq = sched.get("frequency")
            if freq == "daily":
                should_run = True
            elif freq == "weekly":
                if current_weekday == sched.get("frequency_weekday", 0):
                    should_run = True
            elif freq == "biweekly":
                if current_day in sched.get("frequency_days", [1, 16]):
                    should_run = True
            elif freq == "monthly":
                if current_day in sched.get("frequency_days", [1]):
                    should_run = True

        if not should_run:
            continue

        already_ran = _schedule_already_ran_today(sched["id"], today_str)
        if already_ran:
            continue

        bot_id = sched["bot_id"]
        bot = next((b for b in _load(BOTS_FILE) if b["id"] == bot_id), None)
        if not bot or not bot.get("enabled", True):
            continue

        logger.info("Scheduler: ejecutando bot %s por schedule %s", bot_id, sched["id"])
        execution = BotExecution(
            bot_id=bot_id,
            bot_name=bot["name"],
            triggered_by="scheduler",
            triggered_by_name="Programación automática",
            input_data=sched.get("input_data", {}),
        )
        executions = _load(EXECUTIONS_FILE)
        executions.insert(0, execution.model_dump())
        _save(EXECUTIONS_FILE, executions)

        await queue_manager.enqueue(execution.id, bot.get("requires_ui", False))


def _schedule_already_ran_today(schedule_id: str, today_str: str) -> bool:
    executions = _load(EXECUTIONS_FILE)
    for ex in executions:
        if (
            ex.get("triggered_by") == "scheduler"
            and ex.get("queued_at", "").startswith(today_str)
        ):
            return True
    return False


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _scheduler_task
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    EJECUCIONES_DIR.mkdir(parents=True, exist_ok=True)
    if not EXECUTIONS_FILE.exists():
        _save(EXECUTIONS_FILE, [])
    if not SCHEDULES_FILE.exists():
        _save(SCHEDULES_FILE, [])
    if not auth.USERS_FILE.exists():
        _save(auth.USERS_FILE, [])
    _init_default_bots()
    _recover_interrupted()
    queue_manager.init_workers(executor.run_execution, MAX_HEADLESS)
    _scheduler_task = asyncio.create_task(_scheduler_loop())
    yield
    if _scheduler_task:
        _scheduler_task.cancel()
    queue_manager.stop_workers()


app = FastAPI(
    title="Orquestador de Bots",
    description="API para gestionar y orquestar bots RPA",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|[\d\.]+|[\d\.]+\.nip\.io):(5175|8002)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ══════════════════════════════════════════════════════════════════════════════
#  AUTH
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/auth/google-url")
def google_url():
    return {"url": auth.get_google_auth_url()}


@app.get("/api/auth/callback")
async def google_callback(code: str = Query(...), state: str = Query("")):
    try:
        tokens = await auth.exchange_code(code)
        user_info = await auth.get_google_user_info(tokens["access_token"])
    except Exception as e:
        frontend = os.getenv("FRONTEND_URL", "http://localhost:5175")
        return RedirectResponse(f"{frontend}/login?error=oauth_failed")

    email: str = user_info.get("email", "")
    allowed_domain = os.getenv("ALLOWED_DOMAIN", "interseguro.com.pe")
    if not email.endswith(f"@{allowed_domain}"):
        frontend = os.getenv("FRONTEND_URL", "http://localhost:5175")
        return RedirectResponse(f"{frontend}/login?error=domain_not_allowed")

    user = auth.upsert_user(email, user_info.get("name", ""), user_info.get("picture", ""))
    token = auth.create_jwt(user)
    frontend = os.getenv("FRONTEND_URL", "http://localhost:5175")
    return RedirectResponse(f"{frontend}/auth-callback?token={token}")


@app.get("/api/auth/me")
def me(current_user: dict = Depends(auth.get_current_user)):
    return current_user


# ══════════════════════════════════════════════════════════════════════════════
#  BOTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/bots")
def list_bots(current_user: dict = Depends(auth.get_current_user)):
    bots = _load(BOTS_FILE)
    if current_user["role"] in ("superadmin", "admin"):
        return bots
    allowed = current_user.get("allowed_bot_ids", [])
    return [b for b in bots if b["id"] in allowed and b.get("enabled", True)]


@app.get("/api/bots/{bot_id}")
def get_bot(bot_id: str, current_user: dict = Depends(auth.get_current_user)):
    bot = next((b for b in _load(BOTS_FILE) if b["id"] == bot_id), None)
    if not bot:
        raise HTTPException(404, "Bot no encontrado")
    if current_user["role"] not in ("superadmin", "admin"):
        if bot_id not in current_user.get("allowed_bot_ids", []):
            raise HTTPException(403, "Sin acceso a este bot")
    return bot


@app.post("/api/bots/{bot_id}/execute")
async def execute_bot(
    bot_id: str,
    body: ExecutionRequest = ExecutionRequest(),
    current_user: dict = Depends(auth.get_current_user),
):
    bots = _load(BOTS_FILE)
    bot = next((b for b in bots if b["id"] == bot_id), None)
    if not bot:
        raise HTTPException(404, "Bot no encontrado")
    if not bot.get("enabled", True):
        raise HTTPException(400, "Bot deshabilitado")
    if current_user["role"] not in ("superadmin", "admin"):
        if bot_id not in current_user.get("allowed_bot_ids", []):
            raise HTTPException(403, "Sin acceso a este bot")

    execution = BotExecution(
        bot_id=bot_id,
        bot_name=bot["name"],
        triggered_by=current_user["email"],
        triggered_by_name=current_user["name"],
        input_data=body.input_data,
    )
    executions = _load(EXECUTIONS_FILE)
    executions.insert(0, execution.model_dump())
    _save(EXECUTIONS_FILE, executions)

    await queue_manager.enqueue(execution.id, bot.get("requires_ui", False))
    return execution.model_dump()


@app.get("/api/bots/{bot_id}/executions")
def bot_executions(bot_id: str, current_user: dict = Depends(auth.get_current_user)):
    return [e for e in _load(EXECUTIONS_FILE) if e["bot_id"] == bot_id]


# ══════════════════════════════════════════════════════════════════════════════
#  EJECUCIONES
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/executions")
def list_executions(current_user: dict = Depends(auth.get_current_user)):
    return _load(EXECUTIONS_FILE)


@app.get("/api/executions/{execution_id}")
def get_execution(execution_id: str, current_user: dict = Depends(auth.get_current_user)):
    ex = next((e for e in _load(EXECUTIONS_FILE) if e["id"] == execution_id), None)
    if not ex:
        raise HTTPException(404, "Ejecución no encontrada")
    return ex


@app.get("/api/executions/{execution_id}/stream")
async def stream_execution(execution_id: str, current_user: dict = Depends(auth.get_current_user)):
    """SSE: emite el estado de una ejecución cada segundo hasta que termine."""
    import asyncio

    async def generator():
        while True:
            ex = next((e for e in _load(EXECUTIONS_FILE) if e["id"] == execution_id), None)
            if not ex:
                yield {"data": json.dumps({"error": "not_found"})}
                return
            yield {"data": json.dumps(ex)}
            if ex["status"] in ("completed", "failed", "cancelled", "interrupted"):
                return
            await asyncio.sleep(1)

    return EventSourceResponse(generator())


@app.post("/api/executions/{execution_id}/cancel")
def cancel_execution(execution_id: str, current_user: dict = Depends(auth.get_current_user)):
    executions = _load(EXECUTIONS_FILE)
    ex = next((e for e in executions if e["id"] == execution_id), None)
    if not ex:
        raise HTTPException(404, "Ejecución no encontrada")
    if ex["status"] not in ("queued", "running"):
        raise HTTPException(400, "La ejecución ya finalizó")
    # Intentar terminar proceso en ejecución
    killed = executor.cancel_running_process(execution_id)

    ex["status"] = "cancelled"
    ex["completed_at"] = datetime.now().isoformat()
    if killed:
        ex["exit_code"] = -9
        ex["error_message"] = "Proceso terminado por cancelación"
    _save(EXECUTIONS_FILE, executions)
    return {"ok": True, "killed": killed}


@app.get("/api/executions/{execution_id}/files")
def list_execution_files(execution_id: str, current_user: dict = Depends(auth.get_current_user)):
    ex = next((e for e in _load(EXECUTIONS_FILE) if e["id"] == execution_id), None)
    if not ex or not ex.get("run_folder"):
        return {"logs": [], "resultados": []}
    return executor.list_execution_files(ex["run_folder"])


@app.get("/api/executions/{execution_id}/download/{file_path:path}")
def download_execution_file(
    execution_id: str, file_path: str, current_user: dict = Depends(auth.get_current_user)
):
    ex = next((e for e in _load(EXECUTIONS_FILE) if e["id"] == execution_id), None)
    if not ex or not ex.get("run_folder"):
        raise HTTPException(404, "Ejecución sin archivos")
    full = executor.get_execution_file_path(ex["run_folder"], file_path)
    if not full:
        raise HTTPException(404, "Archivo no encontrado")
    return FileResponse(full, filename=full.name)


@app.get("/api/executions/{execution_id}/file-text")
def execution_file_text(execution_id: str, file_path: str, current_user: dict = Depends(auth.get_current_user)):
    """Devuelve un archivo de la ejecución como texto UTF-8 para previsualizar en el frontend."""
    ex = next((e for e in _load(EXECUTIONS_FILE) if e["id"] == execution_id), None)
    if not ex or not ex.get("run_folder"):
        raise HTTPException(404, "Ejecución sin archivos")
    full = executor.get_execution_file_path(ex["run_folder"], file_path)
    if not full or not full.exists():
        raise HTTPException(404, "Archivo no encontrado")
    try:
        content = full.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        raise HTTPException(500, f"No se pudo leer el archivo: {e}")
    return StreamingResponse(iter([content]), media_type="text/plain; charset=utf-8")


@app.get("/api/executions/{execution_id}/download-zip")
def download_execution_zip(execution_id: str, current_user: dict = Depends(auth.get_current_user)):
    ex = next((e for e in _load(EXECUTIONS_FILE) if e["id"] == execution_id), None)
    if not ex or not ex.get("run_folder"):
        raise HTTPException(404, "Ejecución sin archivos")

    base = Path(__file__).parent / ex["run_folder"]
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in base.rglob("*"):
            if f.is_file():
                zf.write(f, f.relative_to(base))
    buf.seek(0)

    bot_slug = ex.get("bot_id", "bot").replace(" ", "_")
    input_data = ex.get("input_data") or {}
    fecha_desde = input_data.get("fecha_desde") or input_data.get("FECHA_DESDE")
    fecha_hasta = input_data.get("fecha_hasta") or input_data.get("FECHA_HASTA")
    if fecha_desde and fecha_hasta:
        zip_name = f"evidencia_{bot_slug}_{fecha_desde}_al_{fecha_hasta}.zip"
    else:
        fecha_str = (ex.get("queued_at") or "")[:10] or datetime.now().strftime("%Y-%m-%d")
        zip_name = f"evidencia_{bot_slug}_{fecha_str}.zip"

    return StreamingResponse(buf, media_type="application/zip", headers={"Content-Disposition": f'attachment; filename="{zip_name}"'})


# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN — USUARIOS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/admin/users")
def admin_list_users(current_user: dict = Depends(auth.require_admin)):
    return auth.load_users()


@app.put("/api/admin/users/{user_id}/role")
def admin_update_role(user_id: str, body: UserRoleUpdate, current_user: dict = Depends(auth.require_superadmin)):
    users = auth.load_users()
    user = next((u for u in users if u["id"] == user_id), None)
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    user["role"] = body.role
    auth.save_users(users)
    return user


@app.put("/api/admin/users/{user_id}/bots")
def admin_update_user_bots(user_id: str, body: UserBotsUpdate, current_user: dict = Depends(auth.require_admin)):
    users = auth.load_users()
    user = next((u for u in users if u["id"] == user_id), None)
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    user["allowed_bot_ids"] = body.allowed_bot_ids
    auth.save_users(users)
    return user


# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN — BOTS
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/admin/bots")
def admin_create_bot(body: BotCreate, current_user: dict = Depends(auth.require_superadmin)):
    bots = _load(BOTS_FILE)
    if any(b["page_slug"] == body.page_slug for b in bots):
        raise HTTPException(400, "Ya existe un bot con ese slug")
    new_bot = Bot(**body.model_dump())
    bots.append(new_bot.model_dump())
    _save(BOTS_FILE, bots)
    return new_bot.model_dump()


@app.put("/api/admin/bots/{bot_id}")
def admin_update_bot(bot_id: str, body: BotUpdate, current_user: dict = Depends(auth.require_superadmin)):
    bots = _load(BOTS_FILE)
    bot = next((b for b in bots if b["id"] == bot_id), None)
    if not bot:
        raise HTTPException(404, "Bot no encontrado")
    for k, v in body.model_dump(exclude_none=True).items():
        bot[k] = v
    _save(BOTS_FILE, bots)
    return bot


@app.delete("/api/admin/bots/{bot_id}")
def admin_delete_bot(bot_id: str, current_user: dict = Depends(auth.require_superadmin)):
    bots = _load(BOTS_FILE)
    bots = [b for b in bots if b["id"] != bot_id]
    _save(BOTS_FILE, bots)
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════════════════
#  STATS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/stats")
def get_stats(current_user: dict = Depends(auth.get_current_user)):
    executions = _load(EXECUTIONS_FILE)
    bots = _load(BOTS_FILE)
    today = datetime.now().strftime("%Y-%m-%d")

    stats = Stats(
        total_executions=len(executions),
        executions_today=sum(1 for e in executions if e.get("queued_at", "").startswith(today)),
        executions_running=sum(1 for e in executions if e["status"] == "running"),
        executions_queued=sum(1 for e in executions if e["status"] == "queued"),
        executions_completed=sum(1 for e in executions if e["status"] == "completed"),
        executions_failed=sum(1 for e in executions if e["status"] == "failed"),
        total_bots=len(bots),
        bots_enabled=sum(1 for b in bots if b.get("enabled", True)),
    )
    return stats


@app.get("/api/queue-status")
def queue_status(current_user: dict = Depends(auth.get_current_user)):
    return queue_manager.get_queue_status()


# ══════════════════════════════════════════════════════════════════════════════
#  SCHEDULES
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/bots/{bot_id}/schedules")
def list_schedules(bot_id: str, current_user: dict = Depends(auth.get_current_user)):
    return [s for s in _load(SCHEDULES_FILE) if s["bot_id"] == bot_id]


@app.post("/api/bots/{bot_id}/schedules")
def create_schedule(
    bot_id: str,
    body: ScheduleCreate,
    current_user: dict = Depends(auth.get_current_user),
):
    if current_user["role"] not in ("superadmin", "admin"):
        raise HTTPException(403, "Solo admins pueden crear programaciones")

    bot = next((b for b in _load(BOTS_FILE) if b["id"] == bot_id), None)
    if not bot:
        raise HTTPException(404, "Bot no encontrado")
    # Si el bot no define supports_scheduling, asumimos que SÍ lo soporta (solo bloquea si es False explícito)
    if bot.get("supports_scheduling") is False:
        raise HTTPException(400, "Este bot no soporta programación")

    sched = BotSchedule(
        **body.model_dump(exclude={'bot_id'}),
        bot_id=bot_id,
        created_by=current_user["email"],
    )
    schedules = _load(SCHEDULES_FILE)
    schedules.append(sched.model_dump())
    _save(SCHEDULES_FILE, schedules)
    return sched.model_dump()


@app.put("/api/schedules/{schedule_id}")
def update_schedule(
    schedule_id: str,
    body: ScheduleUpdate,
    current_user: dict = Depends(auth.get_current_user),
):
    if current_user["role"] not in ("superadmin", "admin"):
        raise HTTPException(403, "Solo admins pueden editar programaciones")

    schedules = _load(SCHEDULES_FILE)
    sched = next((s for s in schedules if s["id"] == schedule_id), None)
    if not sched:
        raise HTTPException(404, "Programación no encontrada")
    for k, v in body.model_dump(exclude_none=True).items():
        sched[k] = v
    _save(SCHEDULES_FILE, schedules)
    return sched


@app.delete("/api/schedules/{schedule_id}")
def delete_schedule(schedule_id: str, current_user: dict = Depends(auth.get_current_user)):
    if current_user["role"] not in ("superadmin", "admin"):
        raise HTTPException(403, "Solo admins pueden eliminar programaciones")

    schedules = _load(SCHEDULES_FILE)
    schedules = [s for s in schedules if s["id"] != schedule_id]
    _save(SCHEDULES_FILE, schedules)
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════════════════
#  HEALTH
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/health")
def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


# ── Arranque ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=False)
