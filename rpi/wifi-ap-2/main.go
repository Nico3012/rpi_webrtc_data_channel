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
	signal.Notify(sig, syscall.SIGTERM)

	<-sig
	stop()
}
