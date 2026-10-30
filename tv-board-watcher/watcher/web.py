"""Lokale Weboberfläche (Flask): Treffer-Tabelle mit Filter, Sortierung, Markierungen."""
from __future__ import annotations

from datetime import datetime

from flask import Flask, redirect, render_template, request, url_for

from .config import Config
from .db import Database
from .models import CATEGORIES


def create_app(cfg: Config, db: Database) -> Flask:
    app = Flask(__name__, template_folder="templates")

    @app.template_filter("dt")
    def fmt_dt(value: str | None) -> str:
        if not value:
            return ""
        try:
            return datetime.fromisoformat(value).astimezone().strftime("%d.%m.%Y %H:%M")
        except ValueError:
            return value

    @app.template_filter("money")
    def fmt_money(value: float | None, cur: str | None = "") -> str:
        if value is None:
            return "–"
        return f"{value:,.0f} {cur or ''}".replace(",", "'").strip()

    @app.route("/")
    def index():
        args = request.args
        price_min = args.get("price_min", type=float)
        price_max = args.get("price_max", type=float)
        rows = db.list_hits(
            category=args.get("category") or None,
            platform=args.get("platform") or None,
            price_min=price_min, price_max=price_max,
            show_hidden=args.get("hidden") == "1",
            sort=args.get("sort", "found_at"),
            order=args.get("order", "desc"),
        )
        return render_template(
            "index.html", rows=rows, categories=CATEGORIES, platforms=db.platforms_in_db(),
            states=db.all_states(), stats=db.stats(), args=args,
        )

    @app.post("/hit/<int:hit_id>/<field>")
    def flag(hit_id: int, field: str):
        if field not in ("seen", "ignored"):
            return "bad field", 400
        value = request.form.get("value", "1") == "1"
        db.set_flag(hit_id, field, value)
        return redirect(request.form.get("back") or url_for("index"))

    @app.route("/runs")
    def runs():
        return render_template("runs.html", runs=db.recent_runs(200), states=db.all_states())

    return app
