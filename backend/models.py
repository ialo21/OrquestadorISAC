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
    supports_data_input: bool = False
    supports_scheduling: bool = False
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
    supports_data_input: bool = False
    supports_scheduling: bool = False


class BotUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    requires_ui: Optional[bool] = None
    script_path: Optional[str] = None
    script_args: Optional[list[str]] = None
    page_slug: Optional[str] = None
    enabled: Optional[bool] = None
    icon: Optional[str] = None
    supports_data_input: Optional[bool] = None
    supports_scheduling: Optional[bool] = None


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
    input_data: dict = {}


class ExecutionRequest(BaseModel):
    input_data: dict = {}


# ── Programación ─────────────────────────────────────────────────────────────

ScheduleType = Literal["dates", "frequency"]
FrequencyKind = Literal["daily", "weekly", "biweekly", "monthly"]


class BotSchedule(BaseModel):
    id: str = Field(default_factory=gen_id)
    bot_id: str
    enabled: bool = True
    type: ScheduleType = "dates"
    scheduled_dates: list[str] = []
    frequency: Optional[FrequencyKind] = None
    frequency_days: list[int] = []
    frequency_weekday: Optional[int] = None
    time: str = "08:00"
    input_data: dict = {}
    created_by: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class ScheduleCreate(BaseModel):
    bot_id: str
    enabled: bool = True
    type: ScheduleType = "dates"
    scheduled_dates: list[str] = []
    frequency: Optional[FrequencyKind] = None
    frequency_days: list[int] = []
    frequency_weekday: Optional[int] = None
    time: str = "08:00"
    input_data: dict = {}


class ScheduleUpdate(BaseModel):
    enabled: Optional[bool] = None
    type: Optional[ScheduleType] = None
    scheduled_dates: Optional[list[str]] = None
    frequency: Optional[FrequencyKind] = None
    frequency_days: Optional[list[int]] = None
    frequency_weekday: Optional[int] = None
    time: Optional[str] = None
    input_data: Optional[dict] = None


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
