"""Modelos Pydantic para el Orquestador de Bots."""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
import uuid


def gen_id() -> str:
    return str(uuid.uuid4())


# ── Usuarios ────────────────────────────────────────────────────────────────

UserRole = Literal["superadmin", "admin", "user"]


class User(BaseModel):
    id: str = Field(default_factory=gen_id)
    email: str
    name: str
    picture: str = ""
    role: UserRole = "user"
    allowed_bot_ids: list[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    last_login: Optional[str] = None


class UserRoleUpdate(BaseModel):
    role: UserRole


class UserBotsUpdate(BaseModel):
    allowed_bot_ids: list[str]


# ── Bots ────────────────────────────────────────────────────────────────────

class Bot(BaseModel):
    id: str = Field(default_factory=gen_id)
    name: str
    description: str = ""
    requires_ui: bool = False
    script_path: str
    script_args: list[str] = []
    page_slug: str
    enabled: bool = True
    icon: str = "Bot"
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class BotCreate(BaseModel):
    name: str
    description: str = ""
    requires_ui: bool = False
    script_path: str
    script_args: list[str] = []
    page_slug: str
    enabled: bool = True
    icon: str = "Bot"


class BotUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    requires_ui: Optional[bool] = None
    script_path: Optional[str] = None
    script_args: Optional[list[str]] = None
    page_slug: Optional[str] = None
    enabled: Optional[bool] = None
    icon: Optional[str] = None


# ── Ejecuciones ─────────────────────────────────────────────────────────────

ExecutionStatus = Literal["queued", "running", "completed", "failed", "cancelled", "interrupted"]


class BotExecution(BaseModel):
    id: str = Field(default_factory=gen_id)
    bot_id: str
    bot_name: str
    status: ExecutionStatus = "queued"
    queued_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    triggered_by: str
    triggered_by_name: str = ""
    run_folder: str = ""
    exit_code: Optional[int] = None
    error_message: str = ""
    duration_seconds: float = 0.0


class ExecutionRequest(BaseModel):
    pass  # Sin parámetros extra por ahora; cada bot tendrá su propio endpoint


# ── Estadísticas ─────────────────────────────────────────────────────────────

class Stats(BaseModel):
    total_executions: int = 0
    executions_today: int = 0
    executions_running: int = 0
    executions_queued: int = 0
    executions_completed: int = 0
    executions_failed: int = 0
    total_bots: int = 0
    bots_enabled: int = 0
