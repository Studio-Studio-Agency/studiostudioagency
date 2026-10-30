"""Ersatzteilshops über einfache HTTPS-Abfrage (ohne Browser).

Die Shop-Liste steht in config.yaml (platforms.shops.list). Für bekannte
Shop-Systeme (Shopify, WooCommerce, PrestaShop, Shopware, Magento) gibt es
Standard-Selektoren; alles andere läuft über einen generischen Parser, der
Produktlinks mit Preis in der Nähe sucht.
"""
from __future__ import annotations

import logging
import re
import time
import random
from urllib.parse import quote_plus, urljoin, urlsplit

from bs4 import BeautifulSoup

from ..models import Hit, parse_price
from .base import BlockedError, Platform, Query

log = logging.getLogger(__name__)

# (Item-Selektor, Titel, Link, Preis) – werden der Reihe nach probiert
SYSTEM_SELECTORS = [
    # Shopify
    ("li.grid__item, .product-grid .grid__item, .product-item, product-card", ".card__heading, .product-item__title, .card-information__text, h3", "a[href*='/products/']", ".price-item--regular, .price__regular .price-item, .price, .money"),
    # WooCommerce
    ("li.product", ".woocommerce-loop-product__title, h2", "a.woocommerce-LoopProduct-link, a", ".price"),
    # PrestaShop
    (".js-product-miniature, article.product-miniature, .product_list .ajax_block_product", ".product-title, h3, h5", "a.product-thumbnail, .product-title a, a", ".price, .product-price-and-shipping .price"),
    # Shopware 5/6
    (".product-box, .product--box", ".product-name, .product--title", "a.product-name, a.product--title, a", ".product-price, .price--default"),
    # Magento
    ("li.product-item, .product-item-info", ".product-item-link, .product-item-name", "a.product-item-link, a", ".price"),
]


class ShopsPlatform(Platform):
    name = "shops"
    mode = "http"
    langs = ("de", "en", "fr", "nl")
    supports_donor = False   # Shops verkaufen keine ganzen Alt-Fernseher

    def queries(self):
        # In Shops nur Teilenummern suchen; Modellnamen liefern dort meist Fernbedienungen etc.
        return [q for q in super().queries() if q.kind == "primary"]

    def search(self, query: Query) -> list[Hit]:
        hits: list[Hit] = []
        for shop in self.settings.get("list") or []:
            try:
                hits.extend(self._search_shop(shop, query))
            except BlockedError as exc:
                log.warning("[shops/%s] blockiert: %s", shop.get("name"), exc)
            except Exception as exc:  # noqa: BLE001
                log.warning("[shops/%s] Fehler: %s", shop.get("name"), exc)
            time.sleep(random.uniform(2, 6))
        return hits

    def _search_shop(self, shop: dict, query: Query) -> list[Hit]:
        url = shop["url"].format(q=quote_plus(query.text))
        with self.http() as client:
            r = client.get(url)
        if r.status_code in (403, 429, 503):
            raise BlockedError(f"HTTP {r.status_code}")
        if r.status_code != 200:
            log.info("[shops/%s] HTTP %s", shop["name"], r.status_code)
            return []
        if "captcha" in r.text[:50000].lower():
            raise BlockedError("Captcha")
        return parse_shop_html(r.text, url, shop["name"], query.text)


def parse_shop_html(html: str, page_url: str, shop_name: str, query_text: str) -> list[Hit]:
    soup = BeautifulSoup(html, "lxml")
    host = urlsplit(page_url).netloc
    key = re.sub(r"[\s\-]", "", query_text).lower()
    hits: list[Hit] = []

    def add(title: str, href: str, price_text: str | None) -> None:
        title = re.sub(r"\s+", " ", title).strip()
        if not title or not href:
            return
        # Relevanz: Teilenummer muss im Titel stehen (Shops zeigen sonst "Vorschläge")
        if key not in re.sub(r"[\s\-]", "", title).lower():
            return
        price, cur = parse_price(price_text)
        hits.append(Hit(platform=f"shop:{shop_name}", title=title, url=urljoin(page_url, href),
                        price=price, currency=cur, location=host, query=query_text, seller=shop_name))

    for item_sel, title_sel, link_sel, price_sel in SYSTEM_SELECTORS:
        items = soup.select(item_sel)
        if not items:
            continue
        for it in items:
            t = it.select_one(title_sel)
            a = it.select_one(link_sel)
            p = it.select_one(price_sel)
            if t and a and a.get("href"):
                add(t.get_text(" "), a["href"], p.get_text(" ") if p else None)
        if hits:
            return _dedupe(hits)

    # Generischer Fallback: alle Links, deren Text die Nummer enthält
    for a in soup.select("a[href]"):
        text = a.get_text(" ")
        if key in re.sub(r"[\s\-]", "", text).lower():
            container = a.find_parent(["li", "article", "div"]) or a
            price_el = container.find(string=re.compile(r"(€|CHF|£|\$|EUR)\s?\d|\d\s?(€|CHF|£|EUR)"))
            add(text, a["href"], str(price_el) if price_el else None)
    return _dedupe(hits)


def _dedupe(hits: list[Hit]) -> list[Hit]:
    seen, out = set(), []
    for h in hits:
        if h.url not in seen:
            seen.add(h.url)
            out.append(h)
    return out
