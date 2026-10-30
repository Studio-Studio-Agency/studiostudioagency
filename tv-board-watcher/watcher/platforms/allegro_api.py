"""Allegro.pl über die offizielle REST API (Client-Credentials-Flow).

Das öffentliche Angebots-Listing (/offers/listing) ist mit einem Anwendungs-Token
ohne Nutzer-Login abrufbar. Allegro.hu und Allegro Lokalnie haben keinen eigenen
API-Zugang und laufen per Browser (siehe browser_specs.py).
"""
from __future__ import annotations

import base64
import logging
import time

import httpx

from ..models import Hit
from .base import BlockedError, Platform, Query

log = logging.getLogger(__name__)

TOKEN_URL = "https://allegro.pl/auth/oauth/token"
LISTING_URL = "https://api.allegro.pl/offers/listing"


class AllegroPlatform(Platform):
    name = "allegro"
    mode = "api"
    langs = ("pl",)

    def __init__(self, cfg):
        super().__init__(cfg)
        self._token: str | None = None
        self._token_exp = 0.0

    def _get_token(self) -> str:
        if self._token and time.time() < self._token_exp - 60:
            return self._token
        cid = self.cfg.get("credentials", "allegro_client_id")
        sec = self.cfg.get("credentials", "allegro_client_secret")
        if not cid or not sec:
            raise BlockedError("Allegro: ALLEGRO_CLIENT_ID / ALLEGRO_CLIENT_SECRET fehlen (siehe README)")
        auth = base64.b64encode(f"{cid}:{sec}".encode()).decode()
        r = httpx.post(TOKEN_URL, data={"grant_type": "client_credentials"},
                       headers={"Authorization": f"Basic {auth}"}, timeout=30)
        if r.status_code != 200:
            raise BlockedError(f"Allegro Token-Fehler {r.status_code}: {r.text[:200]}")
        data = r.json()
        self._token = data["access_token"]
        self._token_exp = time.time() + int(data.get("expires_in", 43200))
        return self._token

    def search(self, query: Query) -> list[Hit]:
        params = {"phrase": query.text, "limit": "60", "searchMode": "DESCRIPTIONS"
                  if query.kind == "primary" else "REGULAR"}
        headers = {"Authorization": f"Bearer {self._get_token()}",
                   "Accept": "application/vnd.allegro.public.v1+json",
                   "Accept-Language": "pl-PL"}
        r = httpx.get(LISTING_URL, params=params, headers=headers, timeout=30)
        if r.status_code == 429:
            raise BlockedError("Allegro: Rate-Limit (429)")
        if r.status_code in (401, 403):
            raise BlockedError(f"Allegro: Zugriff verweigert ({r.status_code}): {r.text[:200]}")
        if r.status_code != 200:
            log.warning("[allegro] HTTP %s: %s", r.status_code, r.text[:200])
            return []
        items = r.json().get("items", {})
        out = []
        for offer in (items.get("promoted") or []) + (items.get("regular") or []):
            price = (offer.get("sellingMode") or {}).get("price") or {}
            delivery = (offer.get("delivery") or {}).get("lowestPrice") or {}
            seller = offer.get("seller") or {}
            loc = offer.get("location") or {}
            params_ = offer.get("parameters") or []
            cond = next((p.get("values", [""])[0] for p in params_ if p.get("name", "").lower() == "stan"), None)
            out.append(Hit(
                platform="allegro.pl",
                item_id=offer.get("id"),
                title=offer.get("name", ""),
                url=f"https://allegro.pl/oferta/{offer.get('id')}",
                price=float(price["amount"]) if price.get("amount") else None,
                currency=price.get("currency", "PLN"),
                shipping=f"{delivery.get('amount')} {delivery.get('currency')}" if delivery.get("amount") else None,
                location=loc.get("city"),
                seller=seller.get("login") or seller.get("id"),
                seller_rating="Super Sprzedawca" if seller.get("superSeller") else None,
                condition=cond,
                query=query.text,
            ))
        return out
