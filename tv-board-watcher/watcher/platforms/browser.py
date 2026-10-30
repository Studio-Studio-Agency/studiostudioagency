"""Generischer Playwright-Scraper für Kleinanzeigen-Portale.

Jede Browser-Plattform ist eine `BrowserSpec` (Such-URL + CSS-Selektoren) in
browser_specs.py. Der Scraper öffnet die Suchseite in echtem Chromium, wartet
auf die Ergebnisliste und liest die Felder aus. Captchas, Login-Walls und
Fehlerseiten werden erkannt und als BlockedError gemeldet – nie umgangen.
"""
from __future__ import annotations

import logging
import random
import re
import time
from dataclasses import dataclass, field
from urllib.parse import quote_plus, urljoin

from ..models import Hit, parse_price
from .base import BlockedError, Platform, Query

log = logging.getLogger(__name__)

# Texte/Selektoren, die auf Captcha / Bot-Schutz hinweisen
BLOCK_MARKERS = [
    "captcha", "are you a robot", "sind sie ein roboter", "bist du ein mensch", "datadome",
    "access denied", "zugriff verweigert", "unusual traffic", "ungewöhnlichen datenverkehr",
    "please verify you are a human", "cf-challenge", "perimeterx", "px-captcha",
    "Nous avons détecté", "Your request has been blocked", "geo.captcha-delivery.com",
]


@dataclass
class BrowserSpec:
    name: str
    search_url: str                       # mit {q}
    item: str                             # Selektor je Anzeige
    title: str                            # relativ zum Item
    link: str = "a"                       # relativ zum Item, href wird gelesen
    price: str | None = None
    location: str | None = None
    seller: str | None = None
    condition: str | None = None
    shipping: str | None = None
    item_id_attr: str | None = None       # Attribut am Item mit der Anzeigen-ID (z.B. data-adid)
    item_id_from_url: str | None = None   # Regex mit einer Gruppe, auf die URL angewendet
    wanted_marker: str | None = None      # Selektor/Text, der eine Suchanzeige kennzeichnet
    empty_marker: str | None = None       # Selektor, der "keine Treffer" anzeigt
    wait_for: str | None = None           # Selektor, auf den gewartet wird (Default: item)
    default_currency: str | None = None
    langs: tuple[str, ...] = ("de",)
    supports_donor: bool = True
    robots_url: str | None = None
    base_url: str = ""
    cookie_accept: str | None = None      # Selektor des Cookie-Banner-Buttons
    extra_block_markers: list[str] = field(default_factory=list)
    scroll: bool = False                  # Seite scrollen, damit lazy Listen laden


class BrowserPlatform(Platform):
    mode = "browser"

    def __init__(self, cfg, spec: BrowserSpec):
        self.spec = spec
        self.name = spec.name
        self.langs = spec.langs
        self.supports_donor = spec.supports_donor
        self.robots_url = spec.robots_url
        self.robots_probe = spec.search_url.format(q=quote_plus("1-983-356-11"))
        super().__init__(cfg)
        self._pw = None
        self._browser = None
        self._context = None

    # ---- Browser-Lebenszyklus ------------------------------------------------
    def _ensure_browser(self):
        if self._context:
            return self._context
        from playwright.sync_api import sync_playwright
        self._pw = sync_playwright().start()
        launch_kwargs = {"headless": bool(self.cfg.get("behaviour", "headless", default=True))}
        self._browser = self._pw.chromium.launch(**launch_kwargs)
        self._context = self._browser.new_context(
            user_agent=self.user_agent,
            locale={"de": "de-CH", "fr": "fr-FR", "it": "it-IT", "pl": "pl-PL", "hu": "hu-HU",
                    "nl": "nl-NL", "es": "es-ES", "en": "en-GB"}.get(self.langs[0], "de-CH"),
            viewport={"width": 1366, "height": 900},
        )
        self._context.set_default_timeout(int(self.cfg.get("behaviour", "browser_timeout_seconds", default=45)) * 1000)
        return self._context

    def close(self) -> None:
        for obj in (self._context, self._browser):
            try:
                if obj:
                    obj.close()
            except Exception:  # noqa: BLE001
                pass
        try:
            if self._pw:
                self._pw.stop()
        except Exception:  # noqa: BLE001
            pass
        self._context = self._browser = self._pw = None

    def run(self) -> list[Hit]:
        try:
            return super().run()
        finally:
            self.close()

    # ---- Suche -----------------------------------------------------------------
    def search(self, query: Query) -> list[Hit]:
        ctx = self._ensure_browser()
        page = ctx.new_page()
        try:
            url = self.spec.search_url.format(q=quote_plus(query.text))
            resp = page.goto(url, wait_until="domcontentloaded")
            if resp is not None and resp.status in (403, 429, 503):
                raise BlockedError(f"HTTP {resp.status} auf {url}")
            self._accept_cookies(page)
            time.sleep(random.uniform(1.5, 3.5))
            self._detect_block(page)
            if self.spec.scroll:
                for _ in range(3):
                    page.mouse.wheel(0, 1500)
                    time.sleep(random.uniform(0.6, 1.2))
            if self.spec.empty_marker and page.locator(self.spec.empty_marker).count() > 0:
                return []
            try:
                page.wait_for_selector(self.spec.wait_for or self.spec.item, timeout=15000)
            except Exception:  # noqa: BLE001
                self._detect_block(page)
                log.info("[%s] keine Ergebnisliste für '%s'", self.name, query.text)
                return []
            return self._extract(page, query)
        finally:
            page.close()

    def _accept_cookies(self, page) -> None:
        if not self.spec.cookie_accept:
            return
        try:
            btn = page.locator(self.spec.cookie_accept).first
            if btn.count() and btn.is_visible(timeout=2500):
                btn.click(timeout=2500)
        except Exception:  # noqa: BLE001
            pass

    def _detect_block(self, page) -> None:
        html = page.content().lower()
        title = (page.title() or "").lower()
        for m in BLOCK_MARKERS + self.spec.extra_block_markers:
            if m.lower() in html[:200000] or m.lower() in title:
                raise BlockedError(f"Bot-Schutz/Captcha erkannt ('{m}')")
        if re.search(r"/(login|signin|anmelden|connexion|accedi|zaloguj)\b", page.url):
            raise BlockedError("Weiterleitung auf Login-Seite")

    def _text(self, el, selector: str | None) -> str | None:
        if not selector:
            return None
        try:
            loc = el.locator(selector).first
            if loc.count() == 0:
                return None
            return re.sub(r"\s+", " ", loc.inner_text(timeout=2000)).strip() or None
        except Exception:  # noqa: BLE001
            return None

    def _extract(self, page, query: Query) -> list[Hit]:
        items = page.locator(self.spec.item)
        n = min(items.count(), 60)
        hits: list[Hit] = []
        for i in range(n):
            el = items.nth(i)
            try:
                title = self._text(el, self.spec.title)
                if not title:
                    continue
                href = el.locator(self.spec.link).first.get_attribute("href", timeout=2000)
                if not href:
                    continue
                url = urljoin(self.spec.base_url or page.url, href)
                price, cur = parse_price(self._text(el, self.spec.price))
                cur = cur or self.spec.default_currency
                item_id = None
                if self.spec.item_id_attr:
                    item_id = el.get_attribute(self.spec.item_id_attr, timeout=1000)
                if not item_id and self.spec.item_id_from_url:
                    m = re.search(self.spec.item_id_from_url, url)
                    item_id = m.group(1) if m else None
                wanted = False
                if self.spec.wanted_marker:
                    wanted = el.locator(self.spec.wanted_marker).count() > 0
                hits.append(Hit(
                    platform=self.name, item_id=item_id, title=title, url=url,
                    price=price, currency=cur,
                    location=self._text(el, self.spec.location),
                    seller=self._text(el, self.spec.seller),
                    condition=self._text(el, self.spec.condition),
                    shipping=self._text(el, self.spec.shipping),
                    query=query.text, is_wanted_ad=wanted,
                ))
            except Exception as exc:  # noqa: BLE001
                log.debug("[%s] Eintrag %d nicht lesbar: %s", self.name, i, exc)
        # Relevanzfilter: Anzeige muss den Suchbegriff (oder Modell) enthalten, sonst
        # liefern Portale "ähnliche Anzeigen" mit.
        key = re.sub(r"[\s\-]", "", query.text.split()[0]).lower()
        return [h for h in hits if key in re.sub(r"[\s\-]", "", h.title).lower()
                or query.kind != "primary"]
