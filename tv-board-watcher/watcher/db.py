"""SQLite-Speicher für Treffer, Plattformstatus und Wechselkurse."""
from __future__ import annotations

import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

from .models import Hit

SCHEMA = """
CREATE TABLE IF NOT EXISTS hits (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    dedupe_key    TEXT NOT NULL UNIQUE,
    platform      TEXT NOT NULL,
    item_id       TEXT,
    title         TEXT NOT NULL,
    description   TEXT,
    price         REAL,
    currency      TEXT,
    price_chf     REAL,
    shipping      TEXT,
    location      TEXT,
    seller        TEXT,
    seller_rating TEXT,
    condition     TEXT,
    url           TEXT NOT NULL,
    query         TEXT,
    category      TEXT NOT NULL,
    reason        TEXT,
    found_at      TEXT NOT NULL,
    last_seen_at  TEXT NOT NULL,
    notified_at   TEXT,
    summarized_at TEXT,
    seen          INTEGER NOT NULL DEFAULT 0,
    ignored       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_hits_category ON hits(category);
CREATE INDEX IF NOT EXISTS idx_hits_platform ON hits(platform);

CREATE TABLE IF NOT EXISTS platform_state (
    platform             TEXT PRIMARY KEY,
    next_run_at          TEXT,
    last_run_at          TEXT,
    last_status          TEXT,
    last_message         TEXT,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    alerted              INTEGER NOT NULL DEFAULT 0,
    hits_total           INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS fx_rates (
    currency   TEXT PRIMARY KEY,
    rate_chf   REAL NOT NULL,
    fetched_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    platform    TEXT NOT NULL,
    started_at  TEXT NOT NULL,
    finished_at TEXT,
    status      TEXT,
    message     TEXT,
    found       INTEGER DEFAULT 0,
    new         INTEGER DEFAULT 0
);
"""


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


class Database:
    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self._path = path
        self._lock = threading.RLock()
        self._conn = sqlite3.connect(str(path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.executescript(SCHEMA)

    @contextmanager
    def cursor(self) -> Iterator[sqlite3.Cursor]:
        with self._lock:
            cur = self._conn.cursor()
            try:
                yield cur
                self._conn.commit()
            finally:
                cur.close()

    # ---- Treffer ------------------------------------------------------------
    def upsert_hit(self, hit: Hit) -> bool:
        """Speichert einen Treffer. Rückgabe True, wenn er neu ist."""
        ts = now_iso()
        with self.cursor() as cur:
            cur.execute("SELECT id FROM hits WHERE dedupe_key = ?", (hit.dedupe_key,))
            row = cur.fetchone()
            if row:
                cur.execute(
                    "UPDATE hits SET last_seen_at=?, price=COALESCE(?, price), "
                    "price_chf=COALESCE(?, price_chf) WHERE id=?",
                    (ts, hit.price, hit.price_chf, row["id"]),
                )
                return False
            cur.execute(
                """INSERT INTO hits (dedupe_key, platform, item_id, title, description, price,
                   currency, price_chf, shipping, location, seller, seller_rating, condition,
                   url, query, category, reason, found_at, last_seen_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    hit.dedupe_key, hit.platform, hit.item_id, hit.title, hit.description,
                    hit.price, hit.currency, hit.price_chf, hit.shipping, hit.location,
                    hit.seller, hit.seller_rating, hit.condition, hit.url, hit.query,
                    hit.category, hit.reason, ts, ts,
                ),
            )
            return True

    def unnotified_hits(self, categories: list[str]) -> list[sqlite3.Row]:
        if not categories:
            return []
        marks = ",".join("?" * len(categories))
        with self.cursor() as cur:
            cur.execute(
                f"SELECT * FROM hits WHERE notified_at IS NULL AND ignored=0 "
                f"AND category IN ({marks}) ORDER BY found_at",
                categories,
            )
            return cur.fetchall()

    def mark_notified(self, ids: list[int]) -> None:
        if not ids:
            return
        with self.cursor() as cur:
            cur.executemany("UPDATE hits SET notified_at=? WHERE id=?", [(now_iso(), i) for i in ids])

    def unsummarized_hits(self, categories: list[str]) -> list[sqlite3.Row]:
        marks = ",".join("?" * len(categories))
        with self.cursor() as cur:
            cur.execute(
                f"SELECT * FROM hits WHERE summarized_at IS NULL AND ignored=0 "
                f"AND category IN ({marks}) ORDER BY category, price_chf",
                categories,
            )
            return cur.fetchall()

    def mark_summarized(self, ids: list[int]) -> None:
        with self.cursor() as cur:
            cur.executemany("UPDATE hits SET summarized_at=? WHERE id=?", [(now_iso(), i) for i in ids])

    def list_hits(
        self,
        category: str | None = None,
        platform: str | None = None,
        price_min: float | None = None,
        price_max: float | None = None,
        show_hidden: bool = False,
        sort: str = "found_at",
        order: str = "desc",
    ) -> list[sqlite3.Row]:
        where, args = [], []
        if category:
            where.append("category = ?"); args.append(category)
        elif not show_hidden:
            where.append("category NOT IN ('SUCHE','FALSCH')")
        if not show_hidden:
            where.append("ignored = 0")
        if platform:
            where.append("platform = ?"); args.append(platform)
        if price_min is not None:
            where.append("price_chf >= ?"); args.append(price_min)
        if price_max is not None:
            where.append("price_chf <= ?"); args.append(price_max)
        sort_col = {"price": "price_chf", "found_at": "found_at", "platform": "platform"}.get(sort, "found_at")
        order_sql = "ASC" if order == "asc" else "DESC"
        sql = "SELECT * FROM hits"
        if where:
            sql += " WHERE " + " AND ".join(where)
        sql += f" ORDER BY {sort_col} {order_sql} NULLS LAST, found_at DESC"
        with self.cursor() as cur:
            cur.execute(sql, args)
            return cur.fetchall()

    def set_flag(self, hit_id: int, field: str, value: bool) -> None:
        assert field in ("seen", "ignored")
        with self.cursor() as cur:
            cur.execute(f"UPDATE hits SET {field}=? WHERE id=?", (1 if value else 0, hit_id))

    def platforms_in_db(self) -> list[str]:
        with self.cursor() as cur:
            cur.execute("SELECT DISTINCT platform FROM hits ORDER BY platform")
            return [r[0] for r in cur.fetchall()]

    def stats(self) -> dict[str, int]:
        with self.cursor() as cur:
            cur.execute("SELECT category, COUNT(*) FROM hits WHERE ignored=0 GROUP BY category")
            return {r[0]: r[1] for r in cur.fetchall()}

    # ---- Plattformstatus -----------------------------------------------------
    def get_state(self, platform: str) -> sqlite3.Row | None:
        with self.cursor() as cur:
            cur.execute("SELECT * FROM platform_state WHERE platform=?", (platform,))
            return cur.fetchone()

    def all_states(self) -> list[sqlite3.Row]:
        with self.cursor() as cur:
            cur.execute("SELECT * FROM platform_state ORDER BY platform")
            return cur.fetchall()

    def set_next_run(self, platform: str, next_run_at: datetime) -> None:
        with self.cursor() as cur:
            cur.execute(
                "INSERT INTO platform_state(platform, next_run_at) VALUES(?,?) "
                "ON CONFLICT(platform) DO UPDATE SET next_run_at=excluded.next_run_at",
                (platform, next_run_at.replace(microsecond=0).isoformat()),
            )

    def record_run(self, platform: str, status: str, message: str, found: int, new: int) -> sqlite3.Row:
        """Speichert einen Lauf und aktualisiert Fehlerzähler. Gibt neuen Status zurück."""
        ts = now_iso()
        with self.cursor() as cur:
            cur.execute(
                "INSERT INTO runs(platform, started_at, finished_at, status, message, found, new) "
                "VALUES(?,?,?,?,?,?,?)",
                (platform, ts, ts, status, message[:500], found, new),
            )
            failed = status in ("blocked", "error")
            cur.execute(
                """INSERT INTO platform_state(platform, last_run_at, last_status, last_message,
                       consecutive_failures, hits_total)
                   VALUES(?,?,?,?,?,?)
                   ON CONFLICT(platform) DO UPDATE SET
                       last_run_at=excluded.last_run_at,
                       last_status=excluded.last_status,
                       last_message=excluded.last_message,
                       consecutive_failures = CASE WHEN ? THEN consecutive_failures+1 ELSE 0 END,
                       alerted = CASE WHEN ? THEN alerted ELSE 0 END,
                       hits_total = hits_total + ?""",
                (platform, ts, status, message[:500], 1 if failed else 0, new, failed, failed, new),
            )
            cur.execute("SELECT * FROM platform_state WHERE platform=?", (platform,))
            return cur.fetchone()

    def set_alerted(self, platform: str) -> None:
        with self.cursor() as cur:
            cur.execute("UPDATE platform_state SET alerted=1 WHERE platform=?", (platform,))

    def recent_runs(self, limit: int = 50) -> list[sqlite3.Row]:
        with self.cursor() as cur:
            cur.execute("SELECT * FROM runs ORDER BY id DESC LIMIT ?", (limit,))
            return cur.fetchall()

    # ---- Wechselkurse --------------------------------------------------------
    def get_rate(self, currency: str) -> tuple[float, str] | None:
        with self.cursor() as cur:
            cur.execute("SELECT rate_chf, fetched_at FROM fx_rates WHERE currency=?", (currency,))
            row = cur.fetchone()
            return (row[0], row[1]) if row else None

    def set_rate(self, currency: str, rate: float) -> None:
        with self.cursor() as cur:
            cur.execute(
                "INSERT INTO fx_rates(currency, rate_chf, fetched_at) VALUES(?,?,?) "
                "ON CONFLICT(currency) DO UPDATE SET rate_chf=excluded.rate_chf, fetched_at=excluded.fetched_at",
                (currency, rate, now_iso()),
            )

    def row_to_dict(self, row: sqlite3.Row) -> dict[str, Any]:
        return dict(row)
