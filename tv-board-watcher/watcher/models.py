"""Datenmodell eines Treffers."""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

CATEGORIES = ("KAUF", "REPARATUR", "TEILESPENDER", "SUCHE", "FALSCH", "UNKLAR")
HIDDEN_CATEGORIES = ("SUCHE", "FALSCH")

# Tracking-Parameter, die aus URLs entfernt werden, damit Duplikate erkannt werden
_TRACKING = {"utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
             "hash", "fbclid", "gclid", "ref", "_trkparms", "_trksid", "campid",
             "mkevt", "mkcid", "mkrid", "amdata", "epid", "var", "widget_ver", "mediathek"}


def normalize_url(url: str) -> str:
    parts = urlsplit(url.strip())
    query = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True)
             if k.lower() not in _TRACKING and not k.startswith("_")]
    path = re.sub(r"/+$", "", parts.path)
    return urlunsplit((parts.scheme.lower() or "https", parts.netloc.lower(), path, urlencode(query), ""))


@dataclass
class Hit:
    platform: str
    title: str
    url: str
    item_id: str | None = None
    description: str | None = None
    price: float | None = None
    currency: str | None = None
    price_chf: float | None = None
    shipping: str | None = None
    location: str | None = None
    seller: str | None = None
    seller_rating: str | None = None
    condition: str | None = None
    query: str | None = None
    category: str = "UNKLAR"
    reason: str = ""
    # Hinweis der Plattform, dass es eine Suchanzeige ist (z.B. Kleinanzeigen "Gesuch")
    is_wanted_ad: bool = False
    extra: dict = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.url = normalize_url(self.url)
        self.title = re.sub(r"\s+", " ", self.title).strip()

    @property
    def dedupe_key(self) -> str:
        """Gleiche Artikelnummer (pro Plattform) oder gleiche URL = Duplikat."""
        if self.item_id:
            base = f"{self.platform}:{self.item_id}"
        else:
            base = f"url:{self.url}"
        return hashlib.sha1(base.encode("utf-8")).hexdigest()


def parse_price(text: str | None) -> tuple[float | None, str | None]:
    """Extrahiert Betrag und Währung aus Strings wie 'EUR 129,00', '1 299.– CHF', '£45.00', 'zł 350'."""
    if not text:
        return None, None
    t = text.replace("\xa0", " ").replace(" ", " ")
    currency = None
    for sym, code in (("€", "EUR"), ("CHF", "CHF"), ("Fr.", "CHF"), ("£", "GBP"), ("zł", "PLN"),
                      ("PLN", "PLN"), ("Ft", "HUF"), ("HUF", "HUF"), ("$", "USD"), ("US $", "USD"),
                      ("EUR", "EUR"), ("GBP", "GBP"), ("USD", "USD")):
        if sym in t:
            currency = code
            break
    m = re.search(r"(\d{1,3}(?:[ .'’]\d{3})+|\d+)(?:[.,](\d{1,2}))?", t)
    if not m:
        return None, currency
    whole = re.sub(r"[ .'’]", "", m.group(1))
    frac = m.group(2) or "0"
    try:
        return float(f"{whole}.{frac}"), currency
    except ValueError:
        return None, currency
