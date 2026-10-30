"""Gemeinsame Basis aller Plattform-Module.

Eine Plattform implementiert `search(query) -> list[Hit]` und deklariert, welche
Sprachen sie hat (für die sekundären Modell+Board-Wort-Suchen). Blockaden werden
als `BlockedError` gemeldet, damit der Scheduler sie protokolliert statt umgeht.
"""
from __future__ import annotations

import logging
import random
import time
import urllib.robotparser
from dataclasses import dataclass
from typing import Iterable
from urllib.parse import urlsplit

import httpx

from ..config import Config
from ..models import Hit

log = logging.getLogger(__name__)


class BlockedError(Exception):
    """Plattform hat die Abfrage blockiert (Captcha, 403, Login-Wall, robots.txt)."""


class RobotsDisallowed(BlockedError):
    """robots.txt verbietet die Suchseite."""


@dataclass
class Query:
    text: str
    kind: str          # "primary" | "secondary" | "donor"
    lang: str = "en"


def build_queries(cfg: Config, langs: Iterable[str], include_donor: bool) -> list[Query]:
    """Erzeugt die Suchbegriffe für eine Plattform mit den angegebenen Sprachen."""
    qs: list[Query] = [Query(p, "primary") for p in cfg.get("search", "primary", default=[])]
    words_by_lang = cfg.get("search", "board_words", default={}) or {}
    seen: set[str] = set()
    for lang in langs:
        for word in words_by_lang.get(lang, []):
            for model in cfg.get("search", "secondary", default=[]):
                text = f"{model} {word}"
                if text.lower() not in seen:
                    seen.add(text.lower())
                    qs.append(Query(text, "secondary", lang))
    if include_donor and cfg.get("search", "donor_search"):
        # Modellsuche ohne Board-Wort: fängt ganze (defekte) Geräte
        for model in ("KD-65AF9", "KD-55AF9"):
            qs.append(Query(model, "donor"))
    return qs


class Platform:
    name: str = "base"
    mode: str = "browser"           # api | http | browser | manual
    langs: tuple[str, ...] = ("en",)
    supports_donor: bool = True      # Modell-Suche nach ganzen Fernsehern sinnvoll?
    robots_url: str | None = None    # robots.txt dieser Plattform
    robots_probe: str | None = None  # Beispiel-Such-URL, die gegen robots.txt geprüft wird

    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.settings = cfg.platform(self.name)
        self.user_agent = cfg.get("behaviour", "user_agent")
        self._robots_checked = False
        self._robots_ok = True

    # -------------------------------------------------------------------------
    def queries(self) -> list[Query]:
        return build_queries(self.cfg, self.langs, self.supports_donor)

    def search(self, query: Query) -> list[Hit]:  # pragma: no cover - abstrakt
        raise NotImplementedError

    def run(self) -> list[Hit]:
        """Führt alle Suchbegriffe aus, mit zufälligen Pausen dazwischen."""
        self.check_robots()
        pause = self.cfg.get("schedule", "pause_between_queries_seconds", default=[8, 25])
        hits: list[Hit] = []
        queries = self.queries()
        for i, q in enumerate(queries):
            try:
                found = self.search(q)
            except BlockedError:
                raise
            except Exception as exc:  # noqa: BLE001
                log.warning("[%s] Fehler bei '%s': %s", self.name, q.text, exc)
                continue
            for h in found:
                h.query = h.query or q.text
            hits.extend(found)
            if i < len(queries) - 1:
                time.sleep(random.uniform(*pause))
        return hits

    # -------------------------------------------------------------------------
    def check_robots(self) -> None:
        """Prüft robots.txt einmal pro Prozesslauf. Wirft RobotsDisallowed bei Verbot."""
        if not self.cfg.get("behaviour", "respect_robots", default=True):
            return
        if not self.robots_url or not self.robots_probe:
            return
        if self._robots_checked:
            if not self._robots_ok:
                raise RobotsDisallowed(f"robots.txt verbietet {self.robots_probe}")
            return
        self._robots_checked = True
        try:
            r = httpx.get(self.robots_url, headers={"User-Agent": self.user_agent}, timeout=15, follow_redirects=True)
            if r.status_code >= 400:
                log.info("[%s] robots.txt nicht lesbar (%s) – gehe von Erlaubnis aus", self.name, r.status_code)
                return
            rp = urllib.robotparser.RobotFileParser()
            rp.parse(r.text.splitlines())
            self._robots_ok = rp.can_fetch("*", self.robots_probe)
        except Exception as exc:  # noqa: BLE001
            log.info("[%s] robots.txt-Abruf fehlgeschlagen (%s) – gehe von Erlaubnis aus", self.name, exc)
            return
        if not self._robots_ok:
            raise RobotsDisallowed(f"robots.txt verbietet {urlsplit(self.robots_probe).path}")

    # -------------------------------------------------------------------------
    def http(self) -> httpx.Client:
        return httpx.Client(
            headers={"User-Agent": self.user_agent,
                     "Accept-Language": f"{self.langs[0]},en;q=0.7",
                     "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8"},
            timeout=30, follow_redirects=True,
        )
