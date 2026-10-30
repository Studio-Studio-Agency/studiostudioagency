"""Allgemeine Websuche nach den primären Teilenummern.

Primär: Brave Search API (kostenloser Plan, 2000 Abfragen/Monat, Schlüssel nötig).
Fallback ohne Schlüssel: DuckDuckGo-HTML (ohne Garantie, kann drosseln).
Treffer auf Domains, die schon als eigene Plattform laufen, werden ausgefiltert.
"""
from __future__ import annotations

import logging
import re
from urllib.parse import quote_plus, urlsplit, parse_qs, unquote

import httpx
from bs4 import BeautifulSoup

from ..models import Hit
from .base import BlockedError, Platform, Query

log = logging.getLogger(__name__)

BRAVE_URL = "https://api.search.brave.com/res/v1/web/search"
DDG_URL = "https://html.duckduckgo.com/html/?q={q}"

COVERED_DOMAINS = (
    "ebay.", "kleinanzeigen.de", "willhaben.at", "ricardo.ch", "tutti.ch", "anibis.ch",
    "leboncoin.fr", "subito.it", "wallapop.com", "marktplaats.nl", "2dehands.be",
    "allegro.pl", "allegrolokalnie.pl", "allegro.hu", "jofogas.hu", "olx.pl",
    "amazon.", "aliexpress.", "youtube.com", "facebook.com", "pinterest.",
)


class WebSearchPlatform(Platform):
    name = "websearch"
    mode = "api"
    supports_donor = False

    def queries(self):
        return [q for q in super().queries() if q.kind == "primary"]

    def search(self, query: Query) -> list[Hit]:
        key = self.cfg.get("credentials", "brave_api_key")
        results = self._brave(query.text, key) if key else self._ddg(query.text)
        hits = []
        for title, url, snippet in results:
            host = urlsplit(url).netloc.lower()
            if any(d in host for d in COVERED_DOMAINS):
                continue
            hits.append(Hit(platform="web", title=title, url=url, description=snippet,
                            location=host, query=query.text))
        return hits

    def _brave(self, q: str, key: str) -> list[tuple[str, str, str]]:
        r = httpx.get(BRAVE_URL, params={"q": f'"{q}"', "count": 20},
                      headers={"X-Subscription-Token": key, "Accept": "application/json"}, timeout=30)
        if r.status_code == 429:
            raise BlockedError("Brave Search: Kontingent erschöpft (429)")
        if r.status_code in (401, 403):
            raise BlockedError(f"Brave Search: Schlüssel ungültig ({r.status_code})")
        r.raise_for_status()
        return [(x.get("title", ""), x.get("url", ""), x.get("description", ""))
                for x in (r.json().get("web") or {}).get("results", [])]

    def _ddg(self, q: str) -> list[tuple[str, str, str]]:
        with self.http() as client:
            r = client.get(DDG_URL.format(q=quote_plus(f'"{q}"')))
        if r.status_code in (403, 429) or "anomaly" in r.text.lower()[:5000]:
            raise BlockedError("DuckDuckGo drosselt – Brave-API-Schlüssel setzen")
        return parse_ddg_html(r.text)


def parse_ddg_html(html: str) -> list[tuple[str, str, str]]:
    soup = BeautifulSoup(html, "lxml")
    out = []
    for res in soup.select(".result"):
        a = res.select_one("a.result__a")
        if not a or not a.get("href"):
            continue
        href = a["href"]
        # DDG leitet über /l/?uddg=<url> um
        if "uddg=" in href:
            qs = parse_qs(urlsplit(href).query)
            href = unquote(qs.get("uddg", [href])[0])
        snippet = res.select_one(".result__snippet")
        out.append((a.get_text(" ").strip(), href, snippet.get_text(" ").strip() if snippet else ""))
    return out
