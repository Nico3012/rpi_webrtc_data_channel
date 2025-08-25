package main

import (
	"log"
	"rpi-webrtc/serialcomm"
	"rpi-webrtc/webrtcserver"
	"time"
)

const winTest = true

func main() {
	if winTest {
		// set VIDEO_MODE=linux || possible values are windows-work, windows-privat or linux
		// set AUDIO_MODE=linux || possible values are windows-work, windows-privat or linux
		server := webrtcserver.New("8081", "webrtcserver/public", true, true)

		server.InitReadDataCallback(func(data string) {
			// fmt.Println(data)
		})

		select {}
	} else {
		server := webrtcserver.New("8080", "webrtcserver/public", true, true)
		var port *serialcomm.Port
		var err error

		for {
			port, err = serialcomm.NewAuto(9600)
			if err == nil {
				break
			}

			log.Println(err)
			time.Sleep(2 * time.Second)
			log.Println("Try serial initialization again...")
		}

		defer port.Close()

		server.InitReadDataCallback(func(data string) {
			err := port.SendData(data)
			if err != nil {
				log.Println(err)
			}
		})

		port.InitDataCallback(func(data string) {
			if server.IsConnected() {
				err := server.SendData(data)
				if err != nil {
					log.Println(err)
				}
			}
		})

		select {}
	}
}
