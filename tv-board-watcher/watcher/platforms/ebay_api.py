"""eBay über die offizielle Browse API (OAuth Client Credentials).

Ein Schlüsselpaar deckt alle Marktplätze ab; der Marktplatz wird per Header
X-EBAY-C-MARKETPLACE-ID gewählt. Rate-Limit des kostenlosen Zugangs: 5000 Calls/Tag,
davon brauchen wir < 150.
"""
from __future__ import annotations

import base64
import logging
import time

import httpx

from ..models import Hit
from .base import BlockedError, Platform, Query

log = logging.getLogger(__name__)

TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token"
SEARCH_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search"
SCOPE = "https://api.ebay.com/oauth/api_scope"

MARKET_LANG = {
    "EBAY_DE": "de", "EBAY_AT": "de", "EBAY_CH": "de", "EBAY_FR": "fr", "EBAY_IT": "it",
    "EBAY_ES": "es", "EBAY_NL": "nl", "EBAY_BE": "nl", "EBAY_PL": "pl", "EBAY_GB": "en", "EBAY_US": "en",
}


class EbayPlatform(Platform):
    name = "ebay"
    mode = "api"
    langs = ("de", "en", "fr", "it", "es", "nl", "pl")

    def __init__(self, cfg):
        super().__init__(cfg)
        self._token: str | None = None
        self._token_exp = 0.0
        self.marketplaces = self.settings.get("marketplaces") or ["EBAY_DE"]

    # ---- Auth ----------------------------------------------------------------
    def _get_token(self) -> str:
        if self._token and time.time() < self._token_exp - 60:
            return self._token
        cid = self.cfg.get("credentials", "ebay_client_id")
        sec = self.cfg.get("credentials", "ebay_client_secret")
        if not cid or not sec:
            raise BlockedError("eBay: EBAY_CLIENT_ID / EBAY_CLIENT_SECRET fehlen (siehe README)")
        auth = base64.b64encode(f"{cid}:{sec}".encode()).decode()
        r = httpx.post(TOKEN_URL, data={"grant_type": "client_credentials", "scope": SCOPE},
                       headers={"Authorization": f"Basic {auth}",
                                "Content-Type": "application/x-www-form-urlencoded"}, timeout=30)
        if r.status_code != 200:
            raise BlockedError(f"eBay Token-Fehler {r.status_code}: {r.text[:200]}")
        data = r.json()
        self._token = data["access_token"]
        self._token_exp = time.time() + int(data.get("expires_in", 7200))
        return self._token

    # ---- Suche ---------------------------------------------------------------
    def search(self, query: Query) -> list[Hit]:
        hits: list[Hit] = []
        for market in self.marketplaces:
            # Sekundärsuchen nur auf Marktplätzen der passenden Sprache
            if query.kind == "secondary" and MARKET_LANG.get(market) != query.lang:
                continue
            hits.extend(self._search_market(query, market))
            time.sleep(1.0)
        return hits

    def _search_market(self, query: Query, market: str) -> list[Hit]:
        params = {"q": query.text, "limit": "50"}
        filters = []
        if query.kind == "donor":
            # nur ganze Geräte interessant: Kategorie Fernseher (11071) – Filter per Kategorie
            params["category_ids"] = "11071"
        if self.settings.get("search_in_description") and query.kind == "primary":
            # Teilenummern stehen oft nur in der Beschreibung
            filters.append("searchInDescription:true")
        if filters:
            params["filter"] = ",".join(filters)
        headers = {"Authorization": f"Bearer {self._get_token()}",
                   "X-EBAY-C-MARKETPLACE-ID": market,
                   "Accept-Language": MARKET_LANG.get(market, "en")}
        r = httpx.get(SEARCH_URL, params=params, headers=headers, timeout=30)
        if r.status_code == 429:
            raise BlockedError("eBay: Rate-Limit erreicht (429)")
        if r.status_code in (401, 403):
            raise BlockedError(f"eBay: Zugriff verweigert ({r.status_code}): {r.text[:200]}")
        if r.status_code != 200:
            log.warning("[ebay %s] HTTP %s: %s", market, r.status_code, r.text[:200])
            return []
        out = []
        for item in r.json().get("itemSummaries", []) or []:
            price = item.get("price") or {}
            ship = (item.get("shippingOptions") or [{}])[0].get("shippingCost") or {}
            loc = item.get("itemLocation") or {}
            seller = item.get("seller") or {}
            out.append(Hit(
                platform=f"ebay.{market.split('_')[1].lower()}",
                item_id=item.get("legacyItemId") or item.get("itemId"),
                title=item.get("title", ""),
                description=item.get("shortDescription"),
                url=item.get("itemWebUrl", ""),
                price=float(price["value"]) if price.get("value") else None,
                currency=price.get("currency"),
                shipping=f"{ship.get('value')} {ship.get('currency')}" if ship.get("value") else None,
                location=", ".join(x for x in (loc.get("city"), loc.get("country")) if x),
                seller=seller.get("username"),
                seller_rating=f"{seller.get('feedbackPercentage', '')}% / {seller.get('feedbackScore', '')}".strip(" /%"),
                condition=item.get("condition"),
                query=query.text,
            ))
        return out
