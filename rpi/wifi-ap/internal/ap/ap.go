package ap

import (
	"bytes"
	"fmt"
	"os"
	"text/template"

	"github.com/Nico3012/rpi_webrtc_data_channel/rpi/wifi-ap/internal/runner"
)

type Config struct {
	SSID     string
	Password string
}

const commandTemplate = `
set -e
echo [SH]: Starting command

ip link add name br0 type bridge || true
if [ -e /sys/devices/virtual/net/br0/bridge/multicast_snooping ]; then
  echo 0 > /sys/devices/virtual/net/br0/bridge/multicast_snooping || true
fi

{{if .LanIfaces}}
for iface in {{.LanIfaces}}; do
  ip addr flush dev "$iface" || true
  ip link set dev "$iface" up || true
  ip link set dev "$iface" master br0 || true
done
{{end}}

ip addr flush dev {{.WifiIface}} || true
ip addr add {{.IP}} dev br0 || true
ip link set dev br0 up || true
iptables -I FORWARD -i br0 -o br0 -j ACCEPT 2>/dev/null || true

{{if .WanIface}}
echo 1 > /proc/sys/net/ipv4/ip_forward
iptables -t nat -A POSTROUTING -o {{.WanIface}} -j MASQUERADE
iptables -A FORWARD -i br0 -o {{.WanIface}} -j ACCEPT
iptables -A FORWARD -i {{.WanIface}} -o br0 -m state --state RELATED,ESTABLISHED -j ACCEPT
{{end}}

cat > hostapd.conf <<EOF
interface={{.WifiIface}}
bridge=br0
driver=nl80211
ssid={{.SSID}}
hw_mode=g
channel=6
wpa=2
wpa_passphrase={{.Password}}
wpa_key_mgmt=WPA-PSK
rsn_pairwise=CCMP
EOF

cat > dnsmasq.conf <<EOF
interface=br0
bind-interfaces
dhcp-range={{.DHCPMin}},{{.DHCPMax}},12h
address=/{{.Domain}}/{{.DomainIP}}
{{if .WanIface}}
server=8.8.8.8
server=1.1.1.1
{{end}}
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
{{if .WanIface}}
  iptables -t nat -D POSTROUTING -o {{.WanIface}} -j MASQUERADE 2>/dev/null || true
  iptables -D FORWARD -i br0 -o {{.WanIface}} -j ACCEPT 2>/dev/null || true
  iptables -D FORWARD -i {{.WanIface}} -o br0 -m state --state RELATED,ESTABLISHED -j ACCEPT 2>/dev/null || true
  echo 0 > /proc/sys/net/ipv4/ip_forward 2>/dev/null || true
{{end}}
  iptables -D FORWARD -i br0 -o br0 -j ACCEPT 2>/dev/null || true
{{if .LanIfaces}}
  for iface in {{.LanIfaces}}; do
    ip link set dev "$iface" nomaster 2>/dev/null || true
  done
{{end}}
  ip addr del {{.IP}} dev br0 2>/dev/null || true
  ip link set dev br0 down 2>/dev/null || true
  ip link delete dev br0 type bridge 2>/dev/null || true
  rm -f hostapd.conf dnsmasq.conf
  echo [SH]: Stopped command
}

trap 'shutdown' TERM INT
trap 'cleanup' EXIT

wait "$PID1" "$PID2"
`

func New(cfg Config) (func(), error) {
	device := os.Getenv("DEVICE")
	var vars map[string]string
	switch device {
	case "linux":
		vars = map[string]string{
			"IP":        "192.168.50.1/24",
			"DHCPMin":   "192.168.50.10",
			"DHCPMax":   "192.168.50.100",
			"Domain":    "device-controller.net",
			"DomainIP":  "192.168.50.1",
			"WifiIface": "wlan0", // Pflichtparameter: Darf kein empty string sein!
			"LanIfaces": "eth0",  // Optional: z.B. "eth0" oder "eth0 eth1" für LAN-Bridge, oder "" falls ungenutzt
			"WanIface":  "",      // Optional: z.B. "eth0" für WAN/Internet-Modus, oder "" falls ungenutzt
		}
	case "linux-work":
		vars = map[string]string{
			"IP":        "192.168.50.1/24",
			"DHCPMin":   "192.168.50.10",
			"DHCPMax":   "192.168.50.100",
			"Domain":    "device-controller.net",
			"DomainIP":  "192.168.50.1",
			"WifiIface": "wlp2s0",
			"LanIfaces": "", // z.B. "enp1s0"
			"WanIface":  "",
		}
	default:
		return nil, fmt.Errorf("unknown DEVICE: %q", device)
	}
	vars["SSID"] = cfg.SSID
	vars["Password"] = cfg.Password
	tpl, err := template.New("ap").Parse(commandTemplate)
	if err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	if err := tpl.Execute(&buf, vars); err != nil {
		return nil, err
	}
	stop := runner.New(buf.String())
	return stop, nil
}
