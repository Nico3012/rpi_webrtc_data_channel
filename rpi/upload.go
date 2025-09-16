package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"sync"

	"github.com/Nico3012/rpi_webrtc_data_channel/rpi/internal/datachannelmux"
)

// Folder to save uploaded files when running in winTest mode
const outputFolder = "./received_files"

type fileInitMsg struct {
	Type        string `json:"type"`
	Filename    string `json:"filename"`
	TotalChunks int    `json:"totalChunks"`
	TotalSize   int    `json:"totalSize"`
}

type fileChunkMsg struct {
	Type        string `json:"type"`
	Index       int    `json:"index"`
	TotalChunks int    `json:"totalChunks"`
	Data        string `json:"data"` // base64
}

func UploadListener(channel *datachannelmux.Channel) {

	// Map to collect incoming chunks per filename
	var mu sync.Mutex
	files := make(map[string]map[int][]byte)
	totals := make(map[string]int)

	// Ensure output folder exists
	if err := os.MkdirAll(outputFolder, 0o755); err != nil {
		log.Fatalf("failed to create output folder: %v", err)
	}

	channel.OnMessage(func(data string) {
		// Try to parse as JSON to detect file messages
		var generic map[string]interface{}
		if err := json.Unmarshal([]byte(data), &generic); err != nil {
			// not JSON - print as before
			fmt.Println(data)
			return
		}

		t, _ := generic["type"].(string)

		switch t {
		case "file-init":
			var init fileInitMsg
			if err := json.Unmarshal([]byte(data), &init); err != nil {
				log.Println("invalid file-init message:", err)
				return
			}

			mu.Lock()
			// prepare storage for chunks
			files[init.Filename] = make(map[int][]byte)
			totals[init.Filename] = init.TotalChunks
			mu.Unlock()

			log.Printf("Receiving file init: %s (%d chunks, %d bytes)", init.Filename, init.TotalChunks, init.TotalSize)

		case "file-chunk":
			var chunk fileChunkMsg
			if err := json.Unmarshal([]byte(data), &chunk); err != nil {
				log.Println("invalid file-chunk message:", err)
				return
			}

			// Need to figure out filename - in this simple protocol we assume only one active transfer
			// Use the first key in totals map as active filename
			mu.Lock()
			var activeFilename string
			for fn := range totals {
				activeFilename = fn
				break
			}
			if activeFilename == "" {
				log.Println("no active file for incoming chunk")
				mu.Unlock()
				return
			}

			// decode base64
			raw, err := base64.StdEncoding.DecodeString(chunk.Data)
			if err != nil {
				mu.Unlock()
				log.Println("base64 decode error:", err)
				return
			}

			// store chunk
			files[activeFilename][chunk.Index] = raw
			received := len(files[activeFilename])
			total := totals[activeFilename]
			log.Printf("Received chunk %d for %s (%d/%d)", chunk.Index, activeFilename, received, total)

			// send ack for this chunk back to sender
			ack := map[string]interface{}{
				"type":  "file-ack",
				"index": chunk.Index,
			}
			if b, err := json.Marshal(ack); err == nil {
				// best-effort send
				channel.SendData(string(b))
			}

			// If we've received all chunks, assemble and write
			if received >= total {
				// assemble in order
				out := make([]byte, 0)
				for i := 0; i < total; i++ {
					part, ok := files[activeFilename][i]
					if !ok {
						log.Printf("missing chunk %d for %s", i, activeFilename)
						// abort assembly
						mu.Unlock()
						return
					}
					out = append(out, part...)
				}

				// write to disk
				outPath := outputFolder + string(os.PathSeparator) + activeFilename
				if err := ioutil.WriteFile(outPath, out, 0o644); err != nil {
					log.Println("failed to write file:", err)
				} else {
					log.Printf("Wrote file: %s (%d bytes)", outPath, len(out))
				}

				// cleanup
				delete(files, activeFilename)
				delete(totals, activeFilename)
			}

			mu.Unlock()

		default:
			// unknown JSON type - print raw
			fmt.Println(data)
		}
	})

}
