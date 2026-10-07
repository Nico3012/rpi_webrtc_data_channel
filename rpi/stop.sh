#!/bin/bash
# Verhindert, dass das Skript abbricht, wenn die SSH-Verbindung abreißt
trap '' HUP
set -e

echo "=== Stoppe Docker Compose Services... ==="
docker compose down

echo "Gebe Interfaces wieder an NetworkManager frei..."
rm -f /etc/NetworkManager/conf.d/10-unmanaged.conf

echo "Lade NetworkManager neu..."
systemctl reload NetworkManager

echo "=== Erfolgreich gestoppt! LAN-Port ist wieder für das Heimnetz/Router verfügbar. ==="
