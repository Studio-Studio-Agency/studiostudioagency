"""Hauptschleife: Plattformen in zufälligen Abständen abfragen, Treffer speichern,
klassifizieren, benachrichtigen. Läuft als Dauerprozess (launchd)."""
from __future__ import annotations

import logging
import random
import threading
import time
from datetime import datetime, timedelta, timezone

from .classify import classify_hit
from .config import Config
from .db import Database
from .fx import FxConverter
from .models import Hit
from .notify import Notifier
from .platforms import build_platforms
from .platforms.base import BlockedError, Platform, RobotsDisallowed

log = logging.getLogger(__name__)


class Scheduler:
    def __init__(self, cfg: Config, db: Database):
        self.cfg = cfg
        self.db = db
        self.fx = FxConverter(db, cfg.get("fx", "source"))
        self.notifier = Notifier(cfg)
        self.platforms: list[Platform] = build_platforms(cfg)
        self._stop = threading.Event()
        self._last_summary_date: str | None = None

    # ---- Treffer verarbeiten -----------------------------------------------------
    def process_hits(self, hits: list[Hit]) -> int:
        new = 0
        max_chf = float(self.cfg.get("behaviour", "max_price_chf", default=0) or 0)
        for hit in hits:
            classify_hit(hit)
            hit.price_chf = self.fx.to_chf(hit.price, hit.currency)
            if max_chf and hit.price_chf and hit.price_chf > max_chf and hit.category in ("KAUF", "TEILESPENDER"):
                hit.category, hit.reason = "UNKLAR", f"über Preisgrenze CHF {max_chf:.0f}"
            if self.db.upsert_hit(hit):
                new += 1
                log.info("NEU [%s] %s | %s %s | %s", hit.category, hit.title[:80], hit.price, hit.currency, hit.url)
        return new

    def notify_new(self) -> None:
        cats = self.cfg.get("notify", "push_categories", default=["KAUF", "REPARATUR", "TEILESPENDER"])
        rows = self.db.unnotified_hits(cats)
        if not rows:
            return
        if not (self.cfg.get("notify", "ntfy", "enabled") or self.cfg.get("notify", "telegram", "enabled")):
            # kein Push konfiguriert: trotzdem als gemeldet markieren, sonst stauen sie sich
            self.db.mark_notified([r["id"] for r in rows])
            return
        done = self.notifier.push_hits(rows)
        self.db.mark_notified(done)
        log.info("%d/%d Treffer gepusht", len(done), len(rows))

    # ---- Eine Plattform ausführen ------------------------------------------------
    def run_platform(self, platform: Platform) -> tuple[str, str, int, int]:
        log.info("[%s] Abfrage startet (%d Suchbegriffe)", platform.name, len(platform.queries()))
        try:
            hits = platform.run()
        except RobotsDisallowed as exc:
            return "robots", str(exc), 0, 0
        except BlockedError as exc:
            return "blocked", str(exc), 0, 0
        except Exception as exc:  # noqa: BLE001
            log.exception("[%s] unerwarteter Fehler", platform.name)
            return "error", f"{type(exc).__name__}: {exc}", 0, 0
        new = self.process_hits(hits)
        log.info("[%s] %d Treffer, %d neu", platform.name, len(hits), new)
        return "ok", f"{len(hits)} Treffer, {new} neu", len(hits), new

    def _after_run(self, platform: Platform, status: str, message: str, found: int, new: int) -> None:
        state = self.db.record_run(platform.name, status, message, found, new)
        threshold = int(self.cfg.get("behaviour", "alert_after_consecutive_failures", default=3))
        if status == "robots" and not state["alerted"]:
            self.notifier.push_platform_problem(
                platform.name, f"robots.txt verbietet die Suchseite. Plattform wird übersprungen. "
                               f"Alternative: gespeicherte Suche mit E-Mail-Alarm (siehe README).")
            self.db.set_alerted(platform.name)
        elif status in ("blocked", "error") and state["consecutive_failures"] >= threshold and not state["alerted"]:
            self.notifier.push_platform_problem(platform.name, f"{state['consecutive_failures']}x in Folge: {message}")
            self.db.set_alerted(platform.name)

    def _schedule_next(self, platform: Platform, status: str) -> None:
        lo = int(self.cfg.get("schedule", "interval_min_minutes", default=120))
        hi = int(self.cfg.get("schedule", "interval_max_minutes", default=240))
        lo, hi = max(60, lo), max(60, hi, lo)
        minutes = random.uniform(lo, hi)
        if status in ("blocked", "robots"):
            minutes *= 2  # nach Block länger warten
        self.db.set_next_run(platform.name, datetime.now(timezone.utc) + timedelta(minutes=minutes))

    # ---- Tägliche Zusammenfassung --------------------------------------------------
    def maybe_daily_summary(self) -> None:
        hhmm = self.cfg.get("schedule", "daily_summary_time", default="08:00")
        now = datetime.now()
        today = now.strftime("%Y-%m-%d")
        if self._last_summary_date == today or now.strftime("%H:%M") < hhmm:
            return
        self._last_summary_date = today
        cats = self.cfg.get("notify", "push_categories", default=["KAUF", "REPARATUR", "TEILESPENDER"])
        rows = self.db.unsummarized_hits(cats)
        if self.notifier.send_summary(rows):
            self.db.mark_summarized([r["id"] for r in rows])
            log.info("Tägliche Zusammenfassung mit %d Treffern gesendet", len(rows))
        elif not self.cfg.get("notify", "email", "enabled"):
            self.db.mark_summarized([r["id"] for r in rows])

    # ---- Hauptschleife ---------------------------------------------------------------
    def _initial_schedule(self) -> None:
        spread = int(self.cfg.get("schedule", "startup_spread_seconds", default=600))
        now = datetime.now(timezone.utc)
        for i, p in enumerate(self.platforms):
            state = self.db.get_state(p.name)
            if state and state["next_run_at"]:
                nxt = datetime.fromisoformat(state["next_run_at"])
                if nxt > now:
                    continue  # geplanter Termin noch in der Zukunft -> beibehalten
            offset = (spread / max(1, len(self.platforms))) * i + random.uniform(0, 60)
            self.db.set_next_run(p.name, now + timedelta(seconds=offset))

    def run_forever(self) -> None:
        log.info("Scheduler gestartet mit %d Plattformen: %s", len(self.platforms),
                 ", ".join(p.name for p in self.platforms))
        self._initial_schedule()
        while not self._stop.is_set():
            now = datetime.now(timezone.utc)
            for p in self.platforms:
                state = self.db.get_state(p.name)
                nxt = datetime.fromisoformat(state["next_run_at"]) if state and state["next_run_at"] else now
                if nxt <= now:
                    status, msg, found, new = self.run_platform(p)
                    self._after_run(p, status, msg, found, new)
                    self._schedule_next(p, status)
                    self.notify_new()
                    if self._stop.is_set():
                        break
            self.maybe_daily_summary()
            self._stop.wait(30)

    def run_once(self, only: list[str] | None = None) -> None:
        """Alle (oder ausgewählte) Plattformen genau einmal abfragen – zum Testen."""
        for p in self.platforms:
            if only and p.name not in only:
                continue
            status, msg, found, new = self.run_platform(p)
            self._after_run(p, status, msg, found, new)
            print(f"{p.name:18s} {status:8s} {msg}")
        self.notify_new()

    def stop(self) -> None:
        self._stop.set()
