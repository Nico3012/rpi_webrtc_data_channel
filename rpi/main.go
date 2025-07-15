package main

import (
	"log"
	"rpi-webrtc/serialcomm"
	"rpi-webrtc/webrtcserver"
)

func main() {
	server := webrtcserver.New("8080", "webrtcserver/public", true, true)
	port, err := serialcomm.NewAuto(9600)
	if err != nil {
		log.Fatalln(err)
	}

	server.InitReadDataCallback(func(data string) {
		err := port.SendData(data)
		if err != nil {
			log.Println(err)
		}
	})

	port.InitDataCallback(func(data string) {
		err := server.SendData(data)
		if err != nil {
			log.Println(err)
		}
	})
}
