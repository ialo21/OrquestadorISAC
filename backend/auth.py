"""Google OAuth2 + JWT para el Orquestador de Bots."""

import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from urllib.parse import urlencode

import httpx
from fastapi import Depends, HTTPException, Query, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from models import User

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

DATA_DIR = Path(__file__).parent / "data"
USERS_FILE = DATA_DIR / "users.json"

security = HTTPBearer(auto_error=False)


# ── Persistencia usuarios ────────────────────────────────────────────────────

def load_users() -> list[dict]:
    if USERS_FILE.exists():
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_users(users: list[dict]):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, ensure_ascii=False, indent=2)


def get_user_by_email(email: str) -> Optional[dict]:
    return next((u for u in load_users() if u["email"] == email), None)


def upsert_user(email: str, name: str, picture: str) -> dict:
    users = load_users()
    superadmin_email = os.getenv("SUPERADMIN_EMAIL", "")
    existing = next((u for u in users if u["email"] == email), None)

    if existing:
        existing["name"] = name
        existing["picture"] = picture
        existing["last_login"] = datetime.now().isoformat()
        # Promote to superadmin if matches env
        if email == superadmin_email and existing["role"] != "superadmin":
            existing["role"] = "superadmin"
        save_users(users)
        return existing
    else:
        role = "superadmin" if email == superadmin_email else "user"
        new_user = User(email=email, name=name, picture=picture, role=role)
        user_dict = new_user.model_dump()
        user_dict["last_login"] = datetime.now().isoformat()
        users.append(user_dict)
        save_users(users)
        return user_dict


# ── Google OAuth URL ─────────────────────────────────────────────────────────

def get_google_auth_url() -> str:
    params = {
        "client_id": os.getenv("GOOGLE_CLIENT_ID", ""),
        "redirect_uri": os.getenv("GOOGLE_REDIRECT_URI", ""),
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
    }
    allowed_domain = os.getenv("ALLOWED_DOMAIN", "interseguro.com.pe")
    if allowed_domain:
        params["hd"] = allowed_domain
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


# ── Intercambio de código ────────────────────────────────────────────────────

async def exchange_code(code: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": os.getenv("GOOGLE_CLIENT_ID", ""),
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET", ""),
            "redirect_uri": os.getenv("GOOGLE_REDIRECT_URI", ""),
            "grant_type": "authorization_code",
        })
        resp.raise_for_status()
        return resp.json()


async def get_google_user_info(access_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        return resp.json()


# ── JWT ──────────────────────────────────────────────────────────────────────

def create_jwt(user: dict) -> str:
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "exp": datetime.utcnow() + timedelta(days=7),
    }
    return jwt.encode(payload, os.getenv("JWT_SECRET", "dev-secret"), algorithm="HS256")


def decode_jwt(token: str) -> dict:
    return jwt.decode(token, os.getenv("JWT_SECRET", "dev-secret"), algorithms=["HS256"])


# ── Dependencias FastAPI ─────────────────────────────────────────────────────

def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    # Acepta token en header Bearer O como query param ?token=
    token: Optional[str] = None
    if credentials:
        token = credentials.credentials
    else:
        token = request.query_params.get("token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autenticado")
    try:
        payload = decode_jwt(token)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    # Refresh from DB to get latest role/permissions
    user = get_user_by_email(payload["email"])
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
    return user


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] not in ("superadmin", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Se requiere rol admin")
    return current_user


def require_superadmin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Se requiere rol superadmin")
    return current_user
