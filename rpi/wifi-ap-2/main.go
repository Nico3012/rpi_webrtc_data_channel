package main

import (
	"encoding/json"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Nico3012/rpi_webrtc_data_channel/rpi/wifi-ap/internal/ap"
	"github.com/Nico3012/rpi_webrtc_data_channel/rpi/wifi-ap/internal/web"
)

type Config struct {
	SSID     string `json:"ssid"`
	Password string `json:"password"`
}

const (
	configPath = "config.json"
)

func loadWiFiConfig(path string) Config {
	b, err := os.ReadFile(path)
	if err != nil {
		log.Fatalf("failed to read %s: %v", path, err)
	}
	var cfg Config
	if err := json.Unmarshal(b, &cfg); err != nil {
		log.Fatalf("failed to parse %s: %v", path, err)
	}
	return cfg
}

func saveWiFiConfig(path string, cfg Config) {
	b, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		log.Fatalf("failed to marshal config: %v", err)
	}
	if err := os.WriteFile(path, b, 0644); err != nil {
		log.Fatalf("failed to write %s: %v", path, err)
	}
}

func main() {
	// Load wifi config (must exist)
	wifiCfg := loadWiFiConfig(configPath)

	// Start AP
	stop, err := ap.New(ap.Config{SSID: wifiCfg.SSID, Password: wifiCfg.Password})
	if err != nil {
		log.Fatalf("failed to start AP: %v", err)
	}

	// Start web server (embedded).
	getConfig := func() (web.Config, error) {
		cfg := loadWiFiConfig(configPath)
		return web.Config{SSID: cfg.SSID, Password: cfg.Password}, nil
	}
	setConfig := func(cfg web.Config) error {
		saveWiFiConfig(configPath, Config{SSID: cfg.SSID, Password: cfg.Password})
		// Trigger restart
		go func() {
			stop()
			time.Sleep(3 * time.Second)
			wifiCfg := loadWiFiConfig(configPath)
			newStop, err := ap.New(ap.Config{SSID: wifiCfg.SSID, Password: wifiCfg.Password})
			if err != nil {
				log.Printf("failed to restart AP: %v", err)
				return
			}
			stop = newStop
		}()
		return nil
	}
	ws := web.New(getConfig, setConfig)
	go func() {
		if err := ws.ListenAndServe(":80"); err != nil {
			log.Fatalf("web server error: %v", err)
		}
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig
	stop()
}
