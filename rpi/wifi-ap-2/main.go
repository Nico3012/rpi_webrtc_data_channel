package main

import (
	"os"
	"os/signal"
	"syscall"

	"github.com/Nico3012/rpi_webrtc_data_channel/rpi/wifi-ap/internal/runner"
)

func main() {
	stop := runner.New("echo Starting...", "echo Stoping...")

	sig := make(chan os.Signal, 1)
	// Ctrl+C sendet SIGINT signal (Gedacht, damit interaktive programme sich herunterfahren können)
	// Docker/Shutdown etc. senden SIGTERM signal (Wird gesendet von Systemtools für graceful shutdown)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)

	<-sig
	stop()
}
