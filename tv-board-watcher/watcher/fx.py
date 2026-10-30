"""Umrechnung in CHF mit Tageskurs (EZB via frankfurter.app, frei, kein Schlüssel)."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

import httpx

from .db import Database

log = logging.getLogger(__name__)
MAX_AGE = timedelta(hours=20)


class FxConverter:
    def __init__(self, db: Database, source_template: str):
        self._db = db
        self._tpl = source_template
        self._mem: dict[str, float] = {}

    def rate(self, currency: str) -> float | None:
        currency = (currency or "").upper()
        if currency == "CHF":
            return 1.0
        if currency in self._mem:
            return self._mem[currency]
        cached = self._db.get_rate(currency)
        if cached:
            rate, fetched = cached
            if datetime.now(timezone.utc) - datetime.fromisoformat(fetched) < MAX_AGE:
                self._mem[currency] = rate
                return rate
        try:
            r = httpx.get(self._tpl.format(cur=currency), timeout=15)
            r.raise_for_status()
            rate = float(r.json()["rates"]["CHF"])
            self._db.set_rate(currency, rate)
            self._mem[currency] = rate
            return rate
        except Exception as exc:  # noqa: BLE001
            log.warning("Wechselkurs %s nicht abrufbar: %s", currency, exc)
            if cached:
                return cached[0]
            return None

    def to_chf(self, amount: float | None, currency: str | None) -> float | None:
        if amount is None or not currency:
            return None
        rate = self.rate(currency)
        return round(amount * rate, 2) if rate else None
