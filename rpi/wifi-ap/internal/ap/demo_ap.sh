set -e
echo [SH]: Starting command
ip addr add 192.168.50.1/24 dev wlp2s0 || true

cat > hostapd.conf <<EOF
interface=wlp2s0
driver=nl80211
ssid=DemoAP
hw_mode=g
channel=6
wpa=2
wpa_passphrase=demopassword
wpa_key_mgmt=WPA-PSK
rsn_pairwise=CCMP
EOF

cat > dnsmasq.conf <<EOF
interface=wlp2s0
bind-interfaces
dhcp-range=192.168.50.10,192.168.50.100,12h
address=/device-controller.net/192.168.50.1
EOF

hostapd ./hostapd.conf &
PID1=$!
dnsmasq --conf-file=./dnsmasq.conf --no-daemon &
PID2=$!

shutdown() {
  echo [SH]: Stopping command...
  # Gracefully stop child processes and wait until they have finished their shutdown.
  kill -TERM "$PID1" "$PID2" 2>/dev/null || true
  wait "$PID1" 2>/dev/null || true
  wait "$PID2" 2>/dev/null || true
  exit 0
}

cleanup() {
  ip addr del 192.168.50.1/24 dev wlp2s0 || true
  rm -f hostapd.conf dnsmasq.conf
  echo [SH]: Stopped command
}

trap 'shutdown' TERM INT
trap 'cleanup' EXIT

wait "$PID1" "$PID2"
