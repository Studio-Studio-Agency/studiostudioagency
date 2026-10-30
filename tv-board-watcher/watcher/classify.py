"""Klassifizierung eines Treffers in KAUF / REPARATUR / TEILESPENDER / SUCHE / FALSCH / UNKLAR.

Regeln (Reihenfolge entscheidet):
 1. SUCHE        Suchanzeige eines Käufers (oder Plattform meldet "Gesuch")
 2. FALSCH       andere Sony-Boardnummer bzw. US-Version, ohne dass eine unserer
                 Teilenummern genannt wird
 3. REPARATUR    Reparaturservice, Board wird nicht verkauft
 4. TEILESPENDER ganzer (defekter) Fernseher des Modells, kein Board-Angebot
 5. KAUF         Teilenummer oder Modell + Board-Wort vorhanden
 6. UNKLAR       Rest (wird angezeigt, aber nicht gepusht)
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from .models import Hit

OUR_PART_NUMBERS = [
    "1-983-356-11", "173712811", "A2199065A", "A2199066A",
    "YA03070AA", "YA03071AA", "YD8S009UNG01", "YD8S007UNG01",
]
MODEL_RE = re.compile(r"\bKD[- ]?(?:55|65)[- ]?AF9\b", re.I)
# Jede Sony-Boardnummer im Format 1-xxx-xxx-xx (inkl. 1-980-…), auch mit Platzhalter xx
SONY_BOARD_RE = re.compile(r"\b1-\d{3}-\d{3}-(?:\d{2}|xx)\b", re.I)
SONY_BOARD_PREFIX_RE = re.compile(r"\b1-980-\d{3}\b", re.I)   # 1-980-xxx = andere Serie
US_MARKERS = (re.compile(r"\bXBR\b", re.I), re.compile(r"\bA2199067A\b", re.I))
A9F_RE = re.compile(r"\bA9F\b", re.I)
AF9_RE = re.compile(r"AF9", re.I)

BOARD_WORDS = [
    "mainboard", "main board", "hauptplatine", "motherboard", "carte mère", "carte mere",
    "scheda madre", "płyta główna", "plyta glowna", "alaplap", "moederbord", "placa base",
    "main pcb", "mainpcb", "bb board", "mainplatine", "main-board", "hauptboard",
]
REPAIR_WORDS = [
    "reparatur", "reparaturservice", "repair service", "repair", "reparieren", "naprawa",
    "réparation", "reparation", "riparazione", "reparación", "reparacion", "reparatie",
    "javítás", "javitas", "board not for sale", "send your module", "send in your board",
    "einsenden", "einschicken", "austauschservice", "exchange service", "repair only",
    "refurbishment service", "wir reparieren", "we repair", "nous réparons", "ripariamo",
]
WANTED_WORDS = [
    "suche", "kaufe", "gesucht", "wanted", "wtb", "cerco", "cherche", "recherche",
    "szukam", "kupię", "kupie", "keresek", "gezocht", "busco", "compro", "ankauf",
    "looking for", "achète", "achete",
]
DEFECT_WORDS = [
    "defekt", "defect", "kaputt", "en panne", "panne", "pour pièces", "pour pieces",
    "for parts", "spares or repair", "spares/repair", "not working", "faulty", "guasto",
    "non funzionante", "per ricambi", "uszkodzony", "na części", "na czesci", "hibás", "hibas",
    "alkatrésznek", "voor onderdelen", "averiado", "para piezas", "bastler", "bastlergerät",
    "ersatzteilspender", "teilespender", "donor", "bildfehler", "kein bild", "no picture",
    "geht nicht an", "won't turn on", "schaltet nicht ein",
]
TV_WORDS = ["tv", "fernseher", "televisor", "téléviseur", "televiseur", "televisore", "telewizor",
            "televízió", "televizio", "televisie", "oled", "smart tv", "bravia"]


def _has_word(text: str, words: list[str]) -> bool:
    for w in words:
        if re.search(r"(?<![\w-])" + re.escape(w) + r"(?![\w-])", text, re.I):
            return True
    return False


def _our_part_number(text: str) -> bool:
    compact = re.sub(r"[\s\-_.]", "", text).lower()
    return any(re.sub(r"[\-]", "", pn).lower() in compact for pn in OUR_PART_NUMBERS)


def _foreign_board_number(text: str) -> str | None:
    for m in SONY_BOARD_RE.finditer(text):
        if m.group(0).lower() not in ("1-983-356-11",):
            return m.group(0)
    m = SONY_BOARD_PREFIX_RE.search(text)
    return m.group(0) if m else None


@dataclass
class Classification:
    category: str
    reason: str


def classify_text(title: str, description: str | None = None, is_wanted_ad: bool = False) -> Classification:
    title = title or ""
    full = f"{title} {description or ''}"
    t_low = title.lower()
    our_pn = _our_part_number(full)
    model = bool(MODEL_RE.search(full))
    board = _has_word(full, BOARD_WORDS)

    # 1. Suchanzeige. Im Titel reicht das Schlüsselwort; in der Beschreibung nur,
    #    wenn es am Satzanfang steht (sonst trifft "suche" in "Ich suche nicht..." etc.).
    if is_wanted_ad:
        return Classification("SUCHE", "Plattform markiert Anzeige als Gesuch")
    if _has_word(title, WANTED_WORDS):
        return Classification("SUCHE", "Suchbegriff eines Käufers im Titel")

    # 2. Fremdes Board / US-Version – nur wenn keine unserer Nummern genannt wird
    if not our_pn:
        foreign = _foreign_board_number(full)
        if foreign:
            return Classification("FALSCH", f"andere Sony-Boardnummer {foreign}")
        for rx in US_MARKERS:
            if rx.search(full):
                return Classification("FALSCH", f"US-Version ({rx.pattern.strip(chr(92)+'b')})")
        if A9F_RE.search(full) and not AF9_RE.search(full):
            return Classification("FALSCH", "US-Modell A9F ohne AF9")

    # 3. Reparaturservice
    if _has_word(full, REPAIR_WORDS):
        return Classification("REPARATUR", "Reparatur-Schlüsselwort")

    # 4. Ganzer Fernseher als Teilespender: Modell genannt, kein Board, kein Board-Wort
    if model and not our_pn and not board:
        if _has_word(full, DEFECT_WORDS):
            return Classification("TEILESPENDER", "ganzer defekter Fernseher des Modells")
        if _has_word(title, TV_WORDS):
            return Classification("UNKLAR", "ganzer Fernseher, Zustand unklar")

    # 5. Kauf
    if our_pn:
        return Classification("KAUF", "Teilenummer genannt")
    if model and board:
        return Classification("KAUF", "Modell + Board-Wort")

    # 6. Rest
    return Classification("UNKLAR", "weder Teilenummer noch Modell+Board erkannt")


def classify_hit(hit: Hit) -> Hit:
    c = classify_text(hit.title, hit.description, hit.is_wanted_ad)
    hit.category, hit.reason = c.category, c.reason
    return hit
