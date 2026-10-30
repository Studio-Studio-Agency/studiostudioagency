import pytest

from watcher.classify import classify_text

CASES = [
    ("Sony KD-65AF9 OLED Mainboard 1-983-356-11 Reparatur", "REPARATUR"),
    ("Sony Mainboard 1-983-119-22 BB9 KD65X7055", "FALSCH"),
    ("Suche defekte Sony KD-55AF9 / KD-65AF9 Mainboards 1-983-356-11", "SUCHE"),
    ("Carte Mère Sony KD-65AF9 (1-983-356-11)", "KAUF"),
    ("TV Sony KD-65AF9 (OLED) – En panne / Pour pièces", "TEILESPENDER"),
    # weitere Fälle
    ("Sony XBR-65A9F Main Board A2199067A", "FALSCH"),
    ("Sony 1-983-356-11 Main Board A2199065A for KD-65AF9 XBR-65A9F", "KAUF"),   # unsere Nummer gewinnt
    ("Sony A9F Main Board 1-983-356-11", "KAUF"),
    ("Sony Bravia A9F Mainboard", "FALSCH"),
    ("Płyta główna Sony KD-65AF9 173712811", "KAUF"),
    ("Naprawa płyty głównej Sony KD-55AF9 1-983-356-11", "REPARATUR"),
    ("Sony KD-65AF9 Hauptplatine 1-980-335-11", "FALSCH"),
    ("Kaufe Sony KD-65AF9 Mainboard", "SUCHE"),
    ("Gesucht: Sony Mainboard 1-983-356-11", "SUCHE"),
    ("Sony KD-65AF9 OLED 65 Zoll defekt, Bild flackert – Bastler", "TEILESPENDER"),
    ("Sony KD-65AF9 OLED Fernseher top Zustand", "UNKLAR"),
    ("Scheda madre Sony KD65AF9 1-983-356-11 riparazione – board not for sale", "REPARATUR"),
    ("Moederbord Sony KD-55AF9 YD8S007UNG01", "KAUF"),
    ("Sony KD-65AF9 Netzteil APS-xxx", "UNKLAR"),
    ("Mainboard Sony 1-983-356-xx", "FALSCH"),
]


@pytest.mark.parametrize("title,expected", CASES)
def test_classify(title, expected):
    assert classify_text(title).category == expected, classify_text(title).reason


def test_wanted_flag_from_platform():
    assert classify_text("Sony KD-65AF9 Mainboard", is_wanted_ad=True).category == "SUCHE"


def test_description_part_number_counts():
    c = classify_text("Sony OLED Board", "Teilenummer 1-983-356-11, passend für KD-65AF9")
    assert c.category == "KAUF"
