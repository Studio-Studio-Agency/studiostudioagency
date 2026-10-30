#!/usr/bin/env bash
# Einrichtung auf dem Mac: venv, Abhängigkeiten, Chromium, launchd-Dienst.
set -euo pipefail
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LABEL="com.alainsz.tvboardwatcher"
PLIST_SRC="$APP_DIR/launchd/$LABEL.plist"
PLIST_DST="$HOME/Library/LaunchAgents/$LABEL.plist"

cd "$APP_DIR"

if ! command -v python3 >/dev/null; then
  echo "python3 fehlt. Installieren mit: brew install python" >&2; exit 1
fi
PYVER=$(python3 -c 'import sys; print(sys.version_info >= (3, 11))')
if [ "$PYVER" != "True" ]; then
  echo "Python 3.11 oder neuer nötig (brew install python)." >&2; exit 1
fi

echo "==> Virtuelle Umgebung"
[ -d .venv ] || python3 -m venv .venv
.venv/bin/pip install -q --upgrade pip
.venv/bin/pip install -q -r requirements.txt

echo "==> Chromium für Playwright"
.venv/bin/python -m playwright install chromium

mkdir -p data logs
[ -f .env ] || { cp .env.example .env; echo "==> .env angelegt – bitte Schlüssel eintragen (siehe README)"; }

echo "==> launchd-Dienst"
mkdir -p "$HOME/Library/LaunchAgents"
sed "s#__APP_DIR__#$APP_DIR#g" "$PLIST_SRC" > "$PLIST_DST"
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_DST"
launchctl enable "gui/$(id -u)/$LABEL"

echo
echo "Fertig. Weboberfläche: http://127.0.0.1:8765"
echo "Status:   launchctl print gui/$(id -u)/$LABEL | head -20"
echo "Logs:     tail -f $APP_DIR/logs/watcher.log"
