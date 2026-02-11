set -e
echo [SH]: Starting command
ip addr add 192.168.50.1/24 dev wlp2s0 || true
ip link set wlp2s0 up

# Enable IP forwarding
echo 1 > /proc/sys/net/ipv4/ip_forward

# Set up NAT (masquerade) for internet sharing
iptables -t nat -A POSTROUTING -o enp1s0 -j MASQUERADE

# Allow forwarding from AP interface to internet interface
iptables -A FORWARD -i wlp2s0 -o enp1s0 -j ACCEPT
iptables -A FORWARD -i enp1s0 -o wlp2s0 -m state --state RELATED,ESTABLISHED -j ACCEPT

cat > hostapd.conf <<EOF
interface=wlp2s0
driver=nl80211
ssid=DemoAP
hw_mode=g
channel=6
auth_algs=1
wmm_enabled=1
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
server=8.8.8.8
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
  # Remove NAT and forwarding rules
  iptables -t nat -D POSTROUTING -o enp1s0 -j MASQUERADE || true
  iptables -D FORWARD -i wlp2s0 -o enp1s0 -j ACCEPT || true
  iptables -D FORWARD -i enp1s0 -o wlp2s0 -m state --state RELATED,ESTABLISHED -j ACCEPT || true

  # Disable IP forwarding
  echo 0 > /proc/sys/net/ipv4/ip_forward

  ip addr del 192.168.50.1/24 dev wlp2s0 || true
  rm -f hostapd.conf dnsmasq.conf
  echo [SH]: Stopped command
}

trap 'shutdown' TERM INT
trap 'cleanup' EXIT

wait "$PID1" "$PID2"
