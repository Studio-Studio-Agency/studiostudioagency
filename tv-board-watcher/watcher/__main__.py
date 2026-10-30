"""Einstiegspunkt.

  python -m watcher                 Dauerbetrieb: Scheduler + Weboberfläche
  python -m watcher once [NAME...]  alle/ausgewählte Plattformen einmal abfragen
  python -m watcher web             nur Weboberfläche
  python -m watcher classify TEXT   Klassifizierung eines Titels testen
  python -m watcher test-notify     Test-Push senden
  python -m watcher platforms       Plattformen und Modus auflisten
"""
from __future__ import annotations

import logging
import signal
import sys
import threading
from logging.handlers import RotatingFileHandler

from . import config as config_mod
from .classify import classify_text
from .db import Database
from .notify import Notifier
from .platforms import SPECS, CODE_PLATFORMS, MANUAL_PLATFORMS
from .scheduler import Scheduler
from .web import create_app


def setup_logging(cfg) -> None:
    log_path = cfg.path("storage", "log_path")
    log_path.parent.mkdir(parents=True, exist_ok=True)
    fmt = logging.Formatter("%(asctime)s %(levelname)-7s %(name)s: %(message)s")
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    fh = RotatingFileHandler(log_path, maxBytes=5_000_000, backupCount=5, encoding="utf-8")
    fh.setFormatter(fmt)
    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(fmt)
    root.handlers = [fh, sh]
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("werkzeug").setLevel(logging.WARNING)


def serve_web(cfg, db, block: bool) -> None:
    app = create_app(cfg, db)
    host, port = cfg.get("web", "host", default="127.0.0.1"), int(cfg.get("web", "port", default=8765))
    logging.getLogger(__name__).info("Weboberfläche: http://%s:%d", host, port)
    if block:
        app.run(host=host, port=port, debug=False, use_reloader=False)
    else:
        threading.Thread(target=app.run, kwargs={"host": host, "port": port, "debug": False,
                                                 "use_reloader": False}, daemon=True).start()


def main(argv: list[str]) -> int:
    cfg = config_mod.load()
    setup_logging(cfg)
    cmd = argv[0] if argv else "run"

    if cmd == "classify":
        text = " ".join(argv[1:])
        c = classify_text(text)
        print(f"{c.category}  ({c.reason})")
        return 0

    if cmd == "platforms":
        for name in (cfg.get("platforms") or {}):
            p = cfg.platform(name)
            impl = "code" if name in CODE_PLATFORMS else "browser-spec" if name in SPECS else "manual" if name in MANUAL_PLATFORMS else "FEHLT"
            print(f"{name:18s} enabled={str(bool(p.get('enabled'))):5s} mode={p.get('mode','?'):8s} impl={impl}")
        return 0

    db = Database(cfg.path("storage", "db_path"))

    if cmd == "test-notify":
        ok = Notifier(cfg).push("TV Board Watcher", "Testnachricht – Push funktioniert.")
        print("gesendet" if ok else "FEHLGESCHLAGEN (siehe Log)")
        return 0 if ok else 1

    if cmd == "web":
        serve_web(cfg, db, block=True)
        return 0

    sched = Scheduler(cfg, db)
    if cmd == "once":
        sched.run_once(argv[1:] or None)
        return 0

    serve_web(cfg, db, block=False)
    signal.signal(signal.SIGTERM, lambda *_: sched.stop())
    signal.signal(signal.SIGINT, lambda *_: sched.stop())
    sched.run_forever()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
