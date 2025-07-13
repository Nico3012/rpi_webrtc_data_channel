package audio

import (
	"errors"
	"fmt"
	"log"
	"net"
	"os/exec"
	"time"

	"github.com/pion/webrtc/v4"
)

// Handler manages the audio streaming functionality
type Handler struct {
	audioTrack  *webrtc.TrackLocalStaticRTP
	stopChan    chan struct{}
	isStreaming bool
}

// NewHandler creates a new audio handler
func NewHandler() *Handler {
	return &Handler{
		stopChan: make(chan struct{}),
	}
}

// CreateTrack creates an audio track for WebRTC
func (ah *Handler) CreateTrack() (*webrtc.TrackLocalStaticRTP, error) {
	audioTrack, err := webrtc.NewTrackLocalStaticRTP(
		webrtc.RTPCodecCapability{MimeType: webrtc.MimeTypeOpus},
		"audio",
		"microphone",
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create audio track: %w", err)
	}
	ah.audioTrack = audioTrack
	return audioTrack, nil
}

// StartStreaming starts the audio streaming process
func (ah *Handler) StartStreaming() error {
	if ah.isStreaming {
		return errors.New("audio streaming already in progress")
	}

	if ah.audioTrack == nil {
		return errors.New("audio track not created")
	}

	ah.stopChan = make(chan struct{})
	ah.isStreaming = true

	go func() {
		if err := ah.streamAudio(); err != nil {
			log.Printf("Audio streaming error: %v", err)
		}
		ah.isStreaming = false
	}()

	return nil
}

// StopStreaming stops the audio streaming process
func (ah *Handler) StopStreaming() {
	if ah.isStreaming {
		close(ah.stopChan)
		ah.isStreaming = false
	}
}

func (ah *Handler) streamAudio() error {
	const udpPort = 5006
	localAddr, err := net.ResolveUDPAddr("udp", fmt.Sprintf("127.0.0.1:%d", udpPort))
	if err != nil {
		return fmt.Errorf("failed to resolve UDP address: %w", err)
	}

	udpConn, err := net.ListenUDP("udp", localAddr)
	if err != nil {
		return fmt.Errorf("failed to listen on UDP port %d: %w", udpPort, err)
	}
	defer udpConn.Close()

	ffmpeg := exec.Command(
		"ffmpeg",
		"-f", "pulse", "-i", "default", // input device
		"-c:a", "libopus", // use opus codec
		"-frame_duration", "20", // 20ms frames
		"-application", "voip", // Low-latency mode
		"-b:a", "48k", // Bitrate
		"-vn",       // Disable video
		"-f", "rtp", // RTP output format
		fmt.Sprintf("rtp://127.0.0.1:%d", udpPort), // output URL
	)

	// Start the FFmpeg process
	if err := ffmpeg.Start(); err != nil {
		return fmt.Errorf("ffmpeg start error: %w", err)
	}

	// Setup cleanup to ensure ffmpeg process is terminated
	go func() {
		<-ah.stopChan
		log.Println("Stopping FFmpeg process and UDP listener")
		udpConn.Close()
		if err := ffmpeg.Process.Kill(); err != nil {
			log.Printf("Error killing FFmpeg process: %v", err)
		}
	}()

	// Buffer for reading RTP packets (1500 bytes is typical MTU size)
	buffer := make([]byte, 1500)

	// Read RTP packets from UDP and forward to WebRTC
	for {
		select {
		case <-ah.stopChan:
			return nil
		default:
			// Set read deadline to allow periodic stop checks
			udpConn.SetReadDeadline(time.Now().Add(100 * time.Millisecond))

			n, _, err := udpConn.ReadFrom(buffer)
			if err != nil {
				if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
					continue
				}
				return fmt.Errorf("UDP read error: %w", err)
			}

			// Write raw RTP packet to WebRTC track
			if _, err := ah.audioTrack.Write(buffer[:n]); err != nil {
				return fmt.Errorf("RTP write error: %w", err)
			}
		}
	}
}
