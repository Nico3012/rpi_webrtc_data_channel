#!/bin/bash
# Verhindert, dass das Skript abbricht, wenn die SSH-Verbindung abreißt
trap '' HUP
set -e

# Umgebungsvariablen aus .env laden
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

echo "=== Starte System mit DEVICE=$DEVICE ==="

# Hinweis zu INTERFACES:
# - 'br0' bleibt immer gleich, da die Linux-Bridge vom Container immer so angelegt wird.
# - Es müssen nur das Interface für WiFi (z.B. wlan0) und LAN (z.B. eth0) angegeben werden.
# - Ein eventuelles WAN-Interface (z.B. eth1) darf hier NICHT aufgeführt werden,
#   damit NetworkManager sich dort automatisch per DHCP um die Internetverbindung kümmert!
case "$DEVICE" in
  "linux")
    INTERFACES="wlan0,eth0,br0"
    ;;
  "linux-work")
    INTERFACES="wlp2s0,br0"
    ;;
  *)
    echo "Fehler: Unbekanntes oder fehlendes DEVICE='$DEVICE' in .env"
    exit 1
    ;;
esac

echo "Sperre folgende Interfaces für NetworkManager: $INTERFACES"

FORMATTED=""
IFS=',' read -ra ADDR <<< "$INTERFACES"
for iface in "${ADDR[@]}"; do
  clean_iface=$(echo "$iface" | xargs)
  if [ -n "$clean_iface" ]; then
    FORMATTED="${FORMATTED}interface-name:${clean_iface};"
  fi
done

mkdir -p /etc/NetworkManager/conf.d
tee /etc/NetworkManager/conf.d/10-unmanaged.conf > /dev/null <<EOF
[keyfile]
unmanaged-devices=$FORMATTED
EOF

echo "Lade NetworkManager neu..."
systemctl reload NetworkManager

echo "Starte Docker Compose Services..."
docker compose up -d

echo "=== Erfolgreich gestartet! ==="
