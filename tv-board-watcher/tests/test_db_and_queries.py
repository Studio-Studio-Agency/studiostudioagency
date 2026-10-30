from pathlib import Path

from watcher.config import Config
from watcher.db import Database
from watcher.models import Hit
from watcher.platforms.base import build_queries
from watcher.platforms.shops import parse_shop_html
from watcher.platforms.websearch import parse_ddg_html

CFG = Config({
    "search": {
        "primary": ["1-983-356-11", "A2199065A"],
        "secondary": ["KD-65AF9", "KD-55AF9"],
        "board_words": {"de": ["Mainboard", "Hauptplatine"], "fr": ["carte mère"], "en": ["Mainboard", "Motherboard"]},
        "donor_search": True,
    }
})


def test_build_queries_language_scoped():
    qs = build_queries(CFG, ("de",), include_donor=True)
    texts = [q.text for q in qs]
    assert "1-983-356-11" in texts
    assert "KD-65AF9 Mainboard" in texts and "KD-55AF9 Hauptplatine" in texts
    assert "KD-65AF9 carte mère" not in texts
    assert "KD-65AF9" in texts  # donor
    # "Mainboard" in de und en -> nicht doppelt
    qs2 = build_queries(CFG, ("de", "en"), include_donor=False)
    assert len([q for q in qs2 if q.text == "KD-65AF9 Mainboard"]) == 1


def test_db_upsert_and_flags(tmp_path: Path):
    db = Database(tmp_path / "t.sqlite")
    h = Hit(platform="ebay.de", title="Sony 1-983-356-11", url="https://www.ebay.de/itm/1?hash=x",
            item_id="1", price=100.0, currency="EUR", price_chf=95.0, category="KAUF")
    assert db.upsert_hit(h) is True
    assert db.upsert_hit(h) is False  # Duplikat
    rows = db.list_hits()
    assert len(rows) == 1
    assert db.unnotified_hits(["KAUF"])[0]["id"] == rows[0]["id"]
    db.mark_notified([rows[0]["id"]])
    assert db.unnotified_hits(["KAUF"]) == []
    db.set_flag(rows[0]["id"], "ignored", True)
    assert db.list_hits() == []
    assert len(db.list_hits(show_hidden=True)) == 1
    st = db.record_run("ebay", "blocked", "429", 0, 0)
    assert st["consecutive_failures"] == 1
    st = db.record_run("ebay", "ok", "fine", 3, 1)
    assert st["consecutive_failures"] == 0 and st["hits_total"] == 1


SHOPIFY_HTML = """
<ul><li class="grid__item"><a href="/products/sony-main-board-1-983-356-11">
<h3 class="card__heading">Sony Main Board 1-983-356-11 KD-65AF9</h3></a>
<span class="price-item--regular">€149,00</span></li>
<li class="grid__item"><a href="/products/other"><h3 class="card__heading">Sony Remote</h3></a>
<span class="price-item--regular">€19,00</span></li></ul>
"""


def test_parse_shopify():
    hits = parse_shop_html(SHOPIFY_HTML, "https://shop.example/search?q=x", "example", "1-983-356-11")
    assert len(hits) == 1
    assert hits[0].price == 149.0 and hits[0].currency == "EUR"
    assert hits[0].url == "https://shop.example/products/sony-main-board-1-983-356-11"


DDG_HTML = """
<div class="result"><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fboard&rut=x">Sony board</a>
<a class="result__snippet">1-983-356-11 for sale</a></div>
"""


def test_parse_ddg():
    res = parse_ddg_html(DDG_HTML)
    assert res == [("Sony board", "https://example.com/board", "1-983-356-11 for sale")]
