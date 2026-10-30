"""Plattform-Registry. Neue Plattform: Klasse hier eintragen oder BrowserSpec in
browser_specs.py ergänzen und in config.yaml unter platforms aktivieren."""
from __future__ import annotations

from ..config import Config
from .allegro_api import AllegroPlatform
from .base import Platform
from .browser import BrowserPlatform
from .browser_specs import SPECS
from .ebay_api import EbayPlatform
from .shops import ShopsPlatform
from .websearch import WebSearchPlatform

CODE_PLATFORMS: dict[str, type[Platform]] = {
    "ebay": EbayPlatform,
    "allegro": AllegroPlatform,
    "shops": ShopsPlatform,
    "websearch": WebSearchPlatform,
}

# Plattformen ohne automatische Abfrage (Begründung in README)
MANUAL_PLATFORMS = {"amazon", "aliexpress"}


def build_platforms(cfg: Config) -> list[Platform]:
    out: list[Platform] = []
    for name in cfg.enabled_platforms():
        settings = cfg.platform(name)
        if settings.get("mode") == "manual" or name in MANUAL_PLATFORMS:
            continue
        if name in CODE_PLATFORMS:
            out.append(CODE_PLATFORMS[name](cfg))
        elif name in SPECS:
            out.append(BrowserPlatform(cfg, SPECS[name]))
        else:
            raise KeyError(f"Plattform '{name}' in config.yaml, aber nicht implementiert")
    return out


def build_platform(cfg: Config, name: str) -> Platform:
    if name in CODE_PLATFORMS:
        return CODE_PLATFORMS[name](cfg)
    if name in SPECS:
        return BrowserPlatform(cfg, SPECS[name])
    raise KeyError(name)
