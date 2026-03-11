package main

// set VIDEO_MODE=windows-privat # can also be empty, then dummy video is used
// set AUDIO_MODE=windows-privat # can also be empty, then dummy audio is used

import "github.com/Nico3012/rpi_webrtc_data_channel/rpi/controller/internal/webrtcserver"

func main() {
	webrtcserver.New("8080", true, true)

	select {}
}
