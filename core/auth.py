"""Simple local authentication for demo. Users stored in JSON."""

from __future__ import annotations
import json
import hashlib
import secrets
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime

AUTH_PATH = Path(__file__).parent.parent / "data" / "users.json"


def _hash_password(password: str, salt: str = "") -> str:
    if not salt:
        salt = secrets.token_hex(8)
    h = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}${h}"


def _verify_password(password: str, stored: str) -> bool:
    try:
        salt, h = stored.split("$", 1)
        return _hash_password(password, salt) == stored
    except Exception:
        return False


def _load_users() -> Dict[str, Any]:
    if AUTH_PATH.exists():
        try:
            return json.loads(AUTH_PATH.read_text())
        except Exception:
            pass
    # Seed demo users
    users = {
        "riya": {
            "password": _hash_password("demo123"),
            "display_name": "Riya Sharma",
            "created_at": "2026-08-01T10:00:00Z",
            "role": "user",
        },
        "arjun": {
            "password": _hash_password("demo123"),
            "display_name": "Arjun Mehta",
            "created_at": "2026-08-01T10:00:00Z",
            "role": "user",
        },
        "priya": {
            "password": _hash_password("demo123"),
            "display_name": "Priya Nair",
            "created_at": "2026-08-01T10:00:00Z",
            "role": "user",
        },
        "judge": {
            "password": _hash_password("hackverse"),
            "display_name": "Hackathon Judge",
            "created_at": "2026-09-01T00:00:00Z",
            "role": "judge",
        },
    }
    _save_users(users)
    return users


def _save_users(users: Dict[str, Any]):
    AUTH_PATH.parent.mkdir(parents=True, exist_ok=True)
    AUTH_PATH.write_text(json.dumps(users, indent=2))


def register_user(username: str, password: str, display_name: str) -> tuple[bool, str]:
    username = username.strip().lower()
    if len(username) < 3:
        return False, "Username must be at least 3 characters"
    if len(password) < 4:
        return False, "Password must be at least 4 characters"
    users = _load_users()
    if username in users:
        return False, "Username already exists"
    users[username] = {
        "password": _hash_password(password),
        "display_name": display_name or username.title(),
        "created_at": datetime.utcnow().isoformat() + "Z",
        "role": "user",
    }
    _save_users(users)
    return True, "Registered successfully"


def authenticate(username: str, password: str) -> Optional[Dict[str, Any]]:
    username = username.strip().lower()
    users = _load_users()
    user = users.get(username)
    if not user:
        return None
    if not _verify_password(password, user["password"]):
        return None
    return {
        "username": username,
        "display_name": user.get("display_name", username),
        "role": user.get("role", "user"),
    }


def list_demo_accounts() -> list[str]:
    return ["riya / demo123", "arjun / demo123", "priya / demo123", "judge / hackverse"]
