package main

import "github.com/Nico3012/rpi_webrtc_data_channel/rpi/controller/internal/webrtcserver"

func main() {
	webrtcserver.New("80", true, true)

	select {}
}
