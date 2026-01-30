package main

import (
	"bytes"
	"log"
	"os"
	"os/exec"
	"os/signal"
	"syscall"
	"text/template"
	"time"
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

var startupTemplate = `
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
`

var mainTemplate = `
set -e
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

/* ================= MAIN ================= */

func main() {
	log.SetFlags(log.LstdFlags)

	// 1) startup direkt ausführen
	if err := runTemplate(startupTemplate, vars); err != nil {
		log.Printf("startup failed: %v", err)
		_ = runTemplate(cleanupTemplate, vars)
		return
	}

	// 2) main Logik direkt ausführen
	mainCmdStr, err := renderTemplate(mainTemplate, vars)
	if err != nil {
		log.Printf("render main template failed: %v", err)
		_ = runTemplate(cleanupTemplate, vars)
		return
	}

	mainCmd := exec.Command("sh", "-c", mainCmdStr)
	mainCmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	mainCmd.Stdout = os.Stdout
	mainCmd.Stderr = os.Stderr

	if err := mainCmd.Start(); err != nil {
		log.Printf("failed to start main command: %v", err)
		_ = runTemplate(cleanupTemplate, vars)
		return
	}

	// Signalhandling
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)

	done := make(chan error, 1)
	go func() { done <- mainCmd.Wait() }()

	select {
	case s := <-sig:
		log.Printf("received signal %v, shutting down", s)
	case err := <-done:
		if err != nil {
			log.Printf("main command exited with error: %v", err)
		} else {
			log.Printf("main command exited normally")
		}
	}

	// Graceful shutdown
	if mainCmd.Process != nil {
		syscall.Kill(-mainCmd.Process.Pid, syscall.SIGTERM)
		time.Sleep(5 * time.Second)
		syscall.Kill(-mainCmd.Process.Pid, syscall.SIGKILL)
	}

	// 3) cleanup direkt ausführen
	if err := runTemplate(cleanupTemplate, vars); err != nil {
		log.Printf("cleanup failed: %v", err)
	}

	log.Println("Program finished")
}

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

func runTemplate(tpl string, data map[string]string) error {
	cmdStr, err := renderTemplate(tpl, data)
	if err != nil {
		return err
	}
	cmd := exec.Command("sh", "-c", cmdStr)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}
