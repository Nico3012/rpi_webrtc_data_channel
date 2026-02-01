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
ip addr add {{.IP}} dev {{.Iface}} || true

cat > hostapd.conf <<EOF
interface={{.Iface}}
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
interface={{.Iface}}
bind-interfaces
dhcp-range={{.DHCPMin}},{{.DHCPMax}},12h
address=/{{.Domain}}/{{.DomainIP}}
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
  ip addr del {{.IP}} dev {{.Iface}} || true
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
			"IP":       "192.168.50.1/24",
			"DHCPMin":  "192.168.50.10",
			"DHCPMax":  "192.168.50.100",
			"Domain":   "device-controller.net",
			"DomainIP": "192.168.50.1",
			"Iface":    "wlan0",
		}
	case "linux-work":
		vars = map[string]string{
			"IP":       "192.168.50.1/24",
			"DHCPMin":  "192.168.50.10",
			"DHCPMax":  "192.168.50.100",
			"Domain":   "device-controller.net",
			"DomainIP": "192.168.50.1",
			"Iface":    "wlp2s0",
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
