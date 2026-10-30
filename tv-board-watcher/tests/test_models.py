from watcher.models import Hit, normalize_url, parse_price


def test_parse_price_variants():
    assert parse_price("EUR 129,00") == (129.0, "EUR")
    assert parse_price("1'299.– CHF") == (1299.0, "CHF")
    assert parse_price("£45.00") == (45.0, "GBP")
    assert parse_price("350 zł") == (350.0, "PLN")
    assert parse_price("1 299,50 €") == (1299.5, "EUR")
    assert parse_price("12 500 Ft") == (12500.0, "HUF")
    assert parse_price("VB") == (None, None)
    assert parse_price(None) == (None, None)


def test_normalize_url_strips_tracking():
    a = normalize_url("https://www.ebay.de/itm/123456?hash=abc&_trkparms=x&utm_source=y")
    b = normalize_url("https://www.ebay.de/itm/123456/")
    assert a == b == "https://www.ebay.de/itm/123456"


def test_dedupe_by_item_id_or_url():
    h1 = Hit(platform="x", title="a", url="https://x.de/1?ref=a", item_id="42")
    h2 = Hit(platform="x", title="b", url="https://x.de/other", item_id="42")
    h3 = Hit(platform="x", title="c", url="https://x.de/1?ref=b")
    h4 = Hit(platform="x", title="d", url="https://x.de/1")
    assert h1.dedupe_key == h2.dedupe_key
    assert h3.dedupe_key == h4.dedupe_key
    assert h1.dedupe_key != h3.dedupe_key
