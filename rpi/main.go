package main

import (
	"log"
	"rpi-webrtc/serialcomm"
	"rpi-webrtc/webrtcserver"
	"time"
)

func main() {
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
		log.Println("Try initialization again...")
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

	select {}
}
