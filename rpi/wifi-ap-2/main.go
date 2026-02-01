package main

import (
	"bytes"
	"log"
	"os"
	"os/signal"
	"syscall"
	"text/template"

	"github.com/Nico3012/rpi_webrtc_data_channel/rpi/wifi-ap/internal/runner"
)

/* ================= CONFIG ================= */

var vars = map[string]string{
	"Iface":    "wlp2s0",
	"IP":       "192.168.50.1/24",
	"DHCPMin":  "192.168.50.10",
	"DHCPMax":  "192.168.50.100",
	"SSID":     "Device Controller",
	"Password": "Passwort123!",
	"Domain":   "device-controller.net",
	"DomainIP": "192.168.50.1",
}

/* ================= SHELL TEMPLATES ================= */

var startTemplate = `
set -e
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
wait $PID1 $PID2
`

var cleanupTemplate = `
set -e
ip addr del {{.IP}} dev {{.Iface}} || true
rm -f hostapd.conf dnsmasq.conf
`

/* ================= UTIL ================= */

func renderTemplate(tpl string, data map[string]string) (string, error) {
	t, err := template.New("tpl").Parse(tpl)
	if err != nil {
		return "", err
	}
	var buf bytes.Buffer
	if err := t.Execute(&buf, data); err != nil {
		return "", err
	}
	return buf.String(), nil
}

func main() {
	// Render start command
	startCommand, err := renderTemplate(startTemplate, vars)
	if err != nil {
		log.Fatalf("failed to render start template: %v", err)
	}

	// Render cleanup command
	cleanupCommand, err := renderTemplate(cleanupTemplate, vars)
	if err != nil {
		log.Fatalf("failed to render cleanup template: %v", err)
	}

	stop := runner.New(startCommand, cleanupCommand)

	sig := make(chan os.Signal, 1)
	// Ctrl+C sendet SIGINT signal (Gedacht, damit interaktive programme sich herunterfahren können)
	// Docker/Shutdown etc. senden SIGTERM signal (Wird gesendet von Systemtools für graceful shutdown)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)

	<-sig
	stop()
}
