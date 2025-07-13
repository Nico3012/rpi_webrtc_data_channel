package audio

import (
	"errors"
	"fmt"
	"log"
	"net"
	"os/exec"
	"time"

	"github.com/pion/rtp"
	"github.com/pion/webrtc/v4"
	"github.com/pion/webrtc/v4/pkg/media"
)

// Handler manages the audio streaming functionality
type Handler struct {
	audioTrack  *webrtc.TrackLocalStaticSample
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
func (ah *Handler) CreateTrack() (*webrtc.TrackLocalStaticSample, error) {
	audioTrack, err := webrtc.NewTrackLocalStaticSample(
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
	// Use a random available port
	port := 5004
	rtpEndpoint := fmt.Sprintf("rtp://127.0.0.1:%d", port)

	ffmpeg := exec.Command(
		"ffmpeg",
		"-f", "pulse",
		"-i", "default",
		"-ar", "48000",
		"-ac", "1", // Mono audio is crucial
		"-c:a", "libopus",
		"-frame_duration", "20", // 20ms frames
		"-application", "voip", // Low-latency mode
		"-b:a", "48k",
		"-packet_loss", "10", // Simulate 10% loss for robustness
		"-f", "rtp", // RTP output format
		rtpEndpoint, // RTP destination
	)

	// Start FFmpeg
	if err := ffmpeg.Start(); err != nil {
		return fmt.Errorf("ffmpeg start error: %w", err)
	}

	// Cleanup on stop
	go func() {
		<-ah.stopChan
		ffmpeg.Process.Kill()
	}()

	// Set up UDP listener for RTP packets
	conn, err := net.ListenUDP("udp", &net.UDPAddr{
		IP:   net.IPv4(127, 0, 0, 1),
		Port: port,
	})
	if err != nil {
		return fmt.Errorf("UDP listen error: %w", err)
	}
	defer conn.Close()

	// Set read buffer size to handle bursts
	conn.SetReadBuffer(1024 * 1024) // 1MB buffer

	// Buffer for incoming packets
	buffer := make([]byte, 1500) // Ethernet MTU size

	for {
		select {
		case <-ah.stopChan:
			return nil
		default:
			// Set read deadline to prevent blocking forever
			conn.SetReadDeadline(time.Now().Add(100 * time.Millisecond))

			n, _, err := conn.ReadFromUDP(buffer)
			if err != nil {
				if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
					continue
				}
				return fmt.Errorf("UDP read error: %w", err)
			}

			// Parse RTP packet
			packet := &rtp.Packet{}
			if err := packet.Unmarshal(buffer[:n]); err != nil {
				log.Printf("RTP parse error: %v", err)
				continue
			}

			// Send payload directly to WebRTC
			if err := ah.audioTrack.WriteSample(media.Sample{
				Data:     packet.Payload,
				Duration: 20 * time.Millisecond, // Always 20ms frames
			}); err != nil {
				return fmt.Errorf("write sample error: %w", err)
			}
		}
	}
}
