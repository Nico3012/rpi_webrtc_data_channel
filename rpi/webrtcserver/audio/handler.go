package audio

import (
	"errors"
	"fmt"
	"io"
	"log"
	"os/exec"
	"time"

	"github.com/pion/webrtc/v4"
	"github.com/pion/webrtc/v4/pkg/media"
)

// Handler manages the audio streaming functionality
type Handler struct {
	audioTrack  *webrtc.TrackLocalStaticSample
	stopChan    chan struct{}
	isStreaming bool
	audioDevice string
	sampleRate  int
	channels    int
}

// NewHandler creates a new audio handler
func NewHandler(audioDevice string) *Handler {
	if audioDevice == "" {
		audioDevice = "default" // Use default ALSA device
	}

	return &Handler{
		audioDevice: audioDevice,
		sampleRate:  48000, // Standard WebRTC sample rate
		channels:    2,     // Stereo
		stopChan:    make(chan struct{}),
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

// streamAudio handles the audio capture and streaming
func (ah *Handler) streamAudio() error {
	// Setup FFmpeg to capture audio from microphone and encode to Opus
	ffmpeg := exec.Command(
		"ffmpeg", "-y",
		"-f", "alsa", // ALSA input format for Linux
		"-i", ah.audioDevice,
		"-c:a", "libopus",
		"-b:a", "64k", // 64 kbps bitrate for good quality
		"-vbr", "on", // Variable bitrate for better quality
		"-application", "voip", // Optimize for voice over IP
		"-frame_duration", "20", // 20ms frame duration (standard for WebRTC)
		"-ar", fmt.Sprintf("%d", ah.sampleRate), // Sample rate
		"-ac", fmt.Sprintf("%d", ah.channels), // Number of channels
		"-f", "opus", // Output raw Opus packets
		"pipe:1", // Output to stdout
	)

	// Get ffmpeg's stdout to read the encoded audio
	stdout, err := ffmpeg.StdoutPipe()
	if err != nil {
		return fmt.Errorf("ffmpeg stdout error: %w", err)
	}

	// Start the FFmpeg process
	if err := ffmpeg.Start(); err != nil {
		return fmt.Errorf("ffmpeg start error: %w", err)
	}

	// Setup cleanup to ensure ffmpeg process is terminated
	go func() {
		<-ah.stopChan
		fmt.Println("Stopping audio FFmpeg process")
		ffmpeg.Process.Kill()
	}()

	// Read audio frames and send to WebRTC
	buffer := make([]byte, 4096)
	frameDuration := time.Millisecond * 20 // 20ms frames

	for {
		select {
		case <-ah.stopChan:
			return nil
		default:
			n, err := stdout.Read(buffer)
			if err != nil {
				if errors.Is(err, io.EOF) {
					return nil
				}
				return fmt.Errorf("audio read error: %w", err)
			}

			if n > 0 {
				if err := ah.audioTrack.WriteSample(media.Sample{
					Data:     buffer[:n],
					Duration: frameDuration,
				}); err != nil {
					return fmt.Errorf("write audio sample error: %w", err)
				}
			}
		}
	}
}
