package main

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"text/template"
	"time"

	"github.com/Nico3012/rpi_webrtc_data_channel/rpi/wifi-ap/internal/runner"
)

/* ================= CONFIG ================= */

var defaultVars = map[string]string{
	"Iface":    "wlp2s0",
	"IP":       "192.168.50.1/24",
	"DHCPMin":  "192.168.50.10",
	"DHCPMax":  "192.168.50.100",
	"SSID":     "Device Controller",
	"Password": "Passwort123!",
	"Domain":   "device-controller.net",
	"DomainIP": "192.168.50.1",
}

const configFile = "config.json"

func loadConfig() (map[string]string, error) {
	if _, err := os.Stat(configFile); os.IsNotExist(err) {
		// Create default config
		return saveConfig(defaultVars)
	}
	file, err := os.Open(configFile)
	if err != nil {
		return nil, err
	}
	defer file.Close()
	var config map[string]string
	decoder := json.NewDecoder(file)
	if err := decoder.Decode(&config); err != nil {
		return nil, err
	}
	return config, nil
}

func saveConfig(config map[string]string) (map[string]string, error) {
	file, err := os.Create(configFile)
	if err != nil {
		return nil, err
	}
	defer file.Close()
	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(config); err != nil {
		return nil, err
	}
	return config, nil
}

/* ================= SHELL TEMPLATES ================= */

var startTemplate = `
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

# On SIGTERM/SIGINT: stop children gracefully, then exit. Cleanup will run via EXIT trap.
trap 'shutdown' TERM INT

# Always cleanup on exit (normal exit or signal-triggered exit).
trap 'cleanup' EXIT

# Normal operation: wait indefinitely until hostapd/dnsmasq exit.
wait "$PID1" "$PID2"
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

/* ================= HTTP HANDLERS ================= */

var restartChan = make(chan struct{}, 1)
var mu sync.Mutex

func configHandler(w http.ResponseWriter, r *http.Request) {
	mu.Lock()
	defer mu.Unlock()
	if r.Method == http.MethodGet {
		config, err := loadConfig()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(config)
	} else if r.Method == http.MethodPost {
		var config map[string]string
		if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		_, err := saveConfig(config)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		// Trigger restart
		select {
		case restartChan <- struct{}{}:
		default:
		}
		w.WriteHeader(http.StatusOK)
	} else {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func fileServerWithNoCache(fs http.Handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		fs.ServeHTTP(w, r)
	}
}

func main() {
	// Start web server
	http.Handle("/api/config", http.HandlerFunc(configHandler))
	http.Handle("/", fileServerWithNoCache(http.FileServer(http.Dir("public"))))
	go func() {
		log.Println("Starting web server on :80")
		if err := http.ListenAndServe(":80", nil); err != nil {
			log.Fatalf("Failed to start web server: %v", err)
		}
	}()

	// Main loop
	for {
		// Load config
		vars, err := loadConfig()
		if err != nil {
			log.Fatalf("Failed to load config: %v", err)
		}

		// Render start command
		startCommand, err := renderTemplate(startTemplate, vars)
		if err != nil {
			log.Fatalf("failed to render start template: %v", err)
		}

		stop := runner.New(startCommand)

		sig := make(chan os.Signal, 1)
		signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)

		select {
		case <-sig:
			stop()
			return
		case <-restartChan:
			stop()
			time.Sleep(3 * time.Second)
			// Continue loop
		}
	}
}
