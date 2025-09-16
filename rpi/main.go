package main

import (
	"log"

	"github.com/Nico3012/rpi_webrtc_data_channel/rpi/internal/datachannelmux"
	"github.com/Nico3012/rpi_webrtc_data_channel/rpi/internal/webrtcserver"
)

const winTest = true

func main() {
	if winTest {
		server := webrtcserver.New("8081", true, true)

		mux := datachannelmux.New(server)

		channel, err := mux.CreateChannel("123456")
		if err != nil {
			log.Fatalln(err)
		}

		UploadListener(channel)

		select {}

		// i := 0

		// for {
		// 	if server.IsConnected() {
		// 		server.SendData(fmt.Sprintf("Message: %d", i))
		// 		i++
		// 	}

		// 	time.Sleep(2 * time.Second)
		// }
	} else {
		// server := webrtcserver.New("8080", true, true)
		// var port *serialcomm.Port
		// var err error

		// for {
		// 	port, err = serialcomm.NewAuto(9600)
		// 	if err == nil {
		// 		break
		// 	}

		// 	log.Println(err)
		// 	time.Sleep(2 * time.Second)
		// 	log.Println("Try serial initialization again...")
		// }

		// defer port.Close()

		// server.InitReadDataCallback(func(data string) {
		// 	err := port.SendData(data)
		// 	if err != nil {
		// 		log.Println(err)
		// 	}
		// })

		// port.InitDataCallback(func(data string) {
		// 	if server.IsConnected() {
		// 		err := server.SendData(data)
		// 		if err != nil {
		// 			log.Println(err)
		// 		}
		// 	}
		// })

		// select {}
	}
}
