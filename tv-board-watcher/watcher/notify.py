"""Benachrichtigungen: ntfy-Push, Telegram, tägliche E-Mail-Zusammenfassung."""
from __future__ import annotations

import logging
import smtplib
import sqlite3
from email.message import EmailMessage
from typing import Iterable

import httpx

from .config import Config

log = logging.getLogger(__name__)

CATEGORY_LABEL = {"KAUF": "KAUF", "REPARATUR": "REPARATUR", "TEILESPENDER": "TEILESPENDER",
                  "UNKLAR": "UNKLAR"}


def fmt_price(row: sqlite3.Row | dict) -> str:
    price, cur, chf = row["price"], row["currency"], row["price_chf"]
    if price is None:
        return "Preis n/a"
    s = f"{price:,.2f} {cur or ''}".strip()
    if chf is not None and (cur or "").upper() != "CHF":
        s += f" (≈ CHF {chf:,.0f})"
    return s


def format_hit(row: sqlite3.Row | dict) -> str:
    parts = [
        f"[{row['category']}] {row['title']}",
        fmt_price(row),
        f"{row['location'] or 'Standort n/a'} · {row['platform']}",
        row["url"],
    ]
    return "\n".join(parts)


class Notifier:
    def __init__(self, cfg: Config):
        self.cfg = cfg

    # ---- Push -------------------------------------------------------------------
    def push(self, title: str, body: str, url: str | None = None, priority: str = "default") -> bool:
        ok = False
        if self.cfg.get("notify", "ntfy", "enabled"):
            ok = self._ntfy(title, body, url, priority) or ok
        if self.cfg.get("notify", "telegram", "enabled"):
            ok = self._telegram(f"{title}\n{body}") or ok
        return ok

    def _ntfy(self, title: str, body: str, url: str | None, priority: str) -> bool:
        topic = self.cfg.get("notify", "ntfy", "topic")
        if not topic:
            log.warning("ntfy aktiviert, aber kein Topic gesetzt")
            return False
        server = (self.cfg.get("notify", "ntfy", "server") or "https://ntfy.sh").rstrip("/")
        headers = {"Title": title.encode("latin-1", "replace").decode("latin-1"),
                   "Priority": priority, "Tags": "tv"}
        if url:
            headers["Click"] = url
        token = self.cfg.get("notify", "ntfy", "token")
        if token:
            headers["Authorization"] = f"Bearer {token}"
        try:
            r = httpx.post(f"{server}/{topic}", content=body.encode("utf-8"), headers=headers, timeout=20)
            r.raise_for_status()
            return True
        except Exception as exc:  # noqa: BLE001
            log.error("ntfy fehlgeschlagen: %s", exc)
            return False

    def _telegram(self, text: str) -> bool:
        token = self.cfg.get("notify", "telegram", "bot_token")
        chat = self.cfg.get("notify", "telegram", "chat_id")
        if not token or not chat:
            log.warning("Telegram aktiviert, aber Token/Chat-ID fehlen")
            return False
        try:
            r = httpx.post(f"https://api.telegram.org/bot{token}/sendMessage",
                           json={"chat_id": chat, "text": text, "disable_web_page_preview": False},
                           timeout=20)
            r.raise_for_status()
            return True
        except Exception as exc:  # noqa: BLE001
            log.error("Telegram fehlgeschlagen: %s", exc)
            return False

    def push_hits(self, rows: Iterable[sqlite3.Row]) -> list[int]:
        """Schickt pro Treffer eine Push-Nachricht. Gibt IDs der erfolgreich gemeldeten zurück."""
        done = []
        for row in rows:
            title = f"{row['category']}: {fmt_price(row)}"
            if self.push(title, format_hit(row), row["url"], priority="high" if row["category"] == "KAUF" else "default"):
                done.append(row["id"])
        return done

    def push_platform_problem(self, platform: str, message: str) -> bool:
        return self.push(f"Watcher: {platform} blockiert/fehlerhaft", message, priority="low")

    # ---- E-Mail ------------------------------------------------------------------
    def send_summary(self, rows: list[sqlite3.Row]) -> bool:
        e = self.cfg.get("notify", "email") or {}
        if not e.get("enabled"):
            return False
        if not rows and not e.get("send_if_empty"):
            return False
        lines = [f"TV Board Watcher – Zusammenfassung: {len(rows)} neue Treffer", ""]
        current = None
        for r in rows:
            if r["category"] != current:
                current = r["category"]
                lines += [f"== {current} =="]
            lines += [f"- {r['title']}", f"  {fmt_price(r)} · {r['location'] or '?'} · {r['platform']}",
                      f"  {r['url']}", ""]
        if not rows:
            lines.append("Keine neuen Treffer in den letzten 24 Stunden.")
        msg = EmailMessage()
        msg["Subject"] = f"TV Board Watcher: {len(rows)} neue Treffer"
        msg["From"] = e.get("from")
        msg["To"] = e.get("to")
        msg.set_content("\n".join(lines))
        try:
            with smtplib.SMTP(e["smtp_host"], int(e.get("smtp_port", 587)), timeout=30) as s:
                s.starttls()
                if e.get("smtp_user"):
                    s.login(e["smtp_user"], e.get("smtp_password") or "")
                s.send_message(msg)
            return True
        except Exception as exc:  # noqa: BLE001
            log.error("E-Mail fehlgeschlagen: %s", exc)
            return False
