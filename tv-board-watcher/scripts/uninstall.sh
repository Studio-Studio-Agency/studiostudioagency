#!/usr/bin/env bash
# Entfernt den launchd-Dienst. Daten (data/, logs/) bleiben erhalten.
set -euo pipefail
LABEL="com.alainsz.tvboardwatcher"
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
rm -f "$HOME/Library/LaunchAgents/$LABEL.plist"
echo "Dienst entfernt."
