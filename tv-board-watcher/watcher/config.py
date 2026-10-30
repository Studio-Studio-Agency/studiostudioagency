"""Lädt config.yaml und .env; stellt ein einfaches Config-Objekt bereit."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parent.parent

# Mapping config-Pfad -> Umgebungsvariable (aus .env). .env gewinnt.
ENV_OVERRIDES = {
    ("credentials", "ebay_client_id"): "EBAY_CLIENT_ID",
    ("credentials", "ebay_client_secret"): "EBAY_CLIENT_SECRET",
    ("credentials", "allegro_client_id"): "ALLEGRO_CLIENT_ID",
    ("credentials", "allegro_client_secret"): "ALLEGRO_CLIENT_SECRET",
    ("credentials", "brave_api_key"): "BRAVE_API_KEY",
    ("notify", "ntfy", "topic"): "NTFY_TOPIC",
    ("notify", "ntfy", "token"): "NTFY_TOKEN",
    ("notify", "telegram", "bot_token"): "TELEGRAM_BOT_TOKEN",
    ("notify", "telegram", "chat_id"): "TELEGRAM_CHAT_ID",
    ("notify", "email", "smtp_user"): "SMTP_USER",
    ("notify", "email", "smtp_password"): "SMTP_PASSWORD",
}


def _load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key.strip(), value)


class Config:
    def __init__(self, data: dict[str, Any]):
        self._data = data

    def get(self, *path: str, default: Any = None) -> Any:
        node: Any = self._data
        for key in path:
            if not isinstance(node, dict) or key not in node:
                return default
            node = node[key]
        return node

    @property
    def raw(self) -> dict[str, Any]:
        return self._data

    def path(self, *path: str) -> Path:
        """Konfigurierter Pfad, relativ zum Projektordner aufgelöst."""
        value = self.get(*path)
        p = Path(value).expanduser()
        return p if p.is_absolute() else ROOT / p

    def platform(self, name: str) -> dict[str, Any]:
        return self.get("platforms", name, default={}) or {}

    def enabled_platforms(self) -> list[str]:
        return [n for n, p in (self.get("platforms") or {}).items() if (p or {}).get("enabled")]


def load(config_path: Path | None = None) -> Config:
    config_path = config_path or ROOT / "config.yaml"
    _load_dotenv(ROOT / ".env")
    data = yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}
    for path, env in ENV_OVERRIDES.items():
        value = os.environ.get(env)
        if not value:
            continue
        node = data
        for key in path[:-1]:
            node = node.setdefault(key, {})
        node[path[-1]] = value
    return Config(data)
