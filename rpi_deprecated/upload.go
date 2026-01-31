package main

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
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
	Filename    string `json:"filename"`
	Index       int    `json:"index"`
	TotalChunks int    `json:"totalChunks"`
	Data        string `json:"data"` // base64
}

type fileAckMsg struct {
	Type     string `json:"type"`
	Filename string `json:"filename"`
	Index    int    `json:"index"`
}

type fileCompleteMsg struct {
	Type        string `json:"type"`
	Filename    string `json:"filename"`
	TotalChunks int    `json:"totalChunks"`
	TotalSize   int    `json:"totalSize"`
}

type fileErrorMsg struct {
	Type     string `json:"type"`
	Filename string `json:"filename"`
	Reason   string `json:"reason"`
}

type transferState struct {
	safePath    string
	totalChunks int
	totalSize   int
	chunks      map[int][]byte
}

func UploadListener(channel *datachannelmux.Channel) {

	var (
		mu        sync.Mutex
		transfers = make(map[string]*transferState)
	)

	if err := os.MkdirAll(outputFolder, 0o755); err != nil {
		log.Fatalf("failed to create output folder: %v", err)
	}

	channel.OnMessage(func(data string) {
		var generic map[string]interface{}
		if err := json.Unmarshal([]byte(data), &generic); err != nil {
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

			safePath, err := safeRelativePath(init.Filename)
			if err != nil {
				log.Printf("rejecting file %q: %v", init.Filename, err)
				sendFileError(channel, init.Filename, "invalid filename")
				return
			}

			mu.Lock()
			if _, ok := transfers[init.Filename]; ok {
				mu.Unlock()
				log.Printf("transfer already active for %s", init.Filename)
				sendFileError(channel, init.Filename, "transfer already active")
				return
			}
			transfers[init.Filename] = &transferState{
				safePath:    safePath,
				totalChunks: init.TotalChunks,
				totalSize:   init.TotalSize,
				chunks:      make(map[int][]byte),
			}
			mu.Unlock()

			log.Printf("Receiving file init: %s (%d chunks, %d bytes)", init.Filename, init.TotalChunks, init.TotalSize)

		case "file-chunk":
			var chunk fileChunkMsg
			if err := json.Unmarshal([]byte(data), &chunk); err != nil {
				log.Println("invalid file-chunk message:", err)
				return
			}

			raw, err := base64.StdEncoding.DecodeString(chunk.Data)
			if err != nil {
				log.Println("base64 decode error:", err)
				failTransfer(channel, &mu, transfers, chunk.Filename, "invalid chunk payload")
				return
			}

			mu.Lock()
			transfer, ok := transfers[chunk.Filename]
			if !ok {
				mu.Unlock()
				log.Printf("no active file transfer for chunk: %s", chunk.Filename)
				sendFileError(channel, chunk.Filename, "no active transfer")
				return
			}

			if chunk.Index < 0 || chunk.Index >= transfer.totalChunks {
				mu.Unlock()
				log.Printf("chunk index %d out of bounds for %s", chunk.Index, chunk.Filename)
				failTransfer(channel, &mu, transfers, chunk.Filename, "chunk index out of bounds")
				return
			}

			transfer.chunks[chunk.Index] = raw
			received := len(transfer.chunks)
			total := transfer.totalChunks

			var (
				completeData []byte
				safePath     string
				totalSize    int
				missingIndex = -1
			)

			if received == transfer.totalChunks {
				completeData = make([]byte, 0, transfer.totalSize)
				for i := 0; i < transfer.totalChunks; i++ {
					part, ok := transfer.chunks[i]
					if !ok {
						missingIndex = i
						break
					}
					completeData = append(completeData, part...)
				}
				if missingIndex == -1 {
					safePath = transfer.safePath
					totalSize = len(completeData)
					delete(transfers, chunk.Filename)
				}
			}

			mu.Unlock()

			if missingIndex != -1 {
				log.Printf("missing chunk %d for %s", missingIndex, chunk.Filename)
				failTransfer(channel, &mu, transfers, chunk.Filename, fmt.Sprintf("missing chunk %d", missingIndex))
				return
			}

			sendJSON(channel, fileAckMsg{
				Type:     "file-ack",
				Filename: chunk.Filename,
				Index:    chunk.Index,
			})
			log.Printf("Received chunk %d for %s (%d/%d)", chunk.Index, chunk.Filename, received, total)

			if completeData != nil {
				outPath := filepath.Join(outputFolder, safePath)
				if err := os.MkdirAll(filepath.Dir(outPath), 0o755); err != nil {
					log.Println("failed to create output directory:", err)
					failTransfer(channel, &mu, transfers, chunk.Filename, "failed to create output directory")
					return
				}

				if err := os.WriteFile(outPath, completeData, 0o644); err != nil {
					log.Println("failed to write file:", err)
					failTransfer(channel, &mu, transfers, chunk.Filename, "failed to write file")
					return
				}

				log.Printf("Wrote file: %s (%d bytes)", outPath, totalSize)
				sendJSON(channel, fileCompleteMsg{
					Type:        "file-complete",
					Filename:    chunk.Filename,
					TotalChunks: total,
					TotalSize:   totalSize,
				})
			}

		default:
			fmt.Println(data)
		}
	})

}

func safeRelativePath(name string) (string, error) {
	cleaned := filepath.Clean("/" + name)
	if cleaned == "/" || cleaned == "." {
		return "", errors.New("empty filename")
	}
	cleaned = strings.TrimPrefix(cleaned, "/")
	if cleaned == "" || cleaned == "." {
		return "", errors.New("invalid filename")
	}
	return cleaned, nil
}

func sendJSON(channel *datachannelmux.Channel, payload interface{}) {
	b, err := json.Marshal(payload)
	if err != nil {
		log.Printf("failed to marshal payload: %v", err)
		return
	}
	channel.SendData(string(b))
}

func sendFileError(channel *datachannelmux.Channel, filename, reason string) {
	sendJSON(channel, fileErrorMsg{
		Type:     "file-error",
		Filename: filename,
		Reason:   reason,
	})
}

func failTransfer(channel *datachannelmux.Channel, mu *sync.Mutex, transfers map[string]*transferState, filename, reason string) {
	mu.Lock()
	delete(transfers, filename)
	mu.Unlock()
	sendFileError(channel, filename, reason)
}
