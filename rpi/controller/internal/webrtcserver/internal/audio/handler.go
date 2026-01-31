package audio

import (
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"os/exec"
	"time"

	"github.com/pion/webrtc/v4"
)

const udpPort = 5006

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
	localAddr, err := net.ResolveUDPAddr("udp", fmt.Sprintf("127.0.0.1:%d", udpPort))
	if err != nil {
		return fmt.Errorf("failed to resolve UDP address: %w", err)
	}

	udpConn, err := net.ListenUDP("udp", localAddr)
	if err != nil {
		return fmt.Errorf("failed to listen on UDP port %d: %w", udpPort, err)
	}
	defer udpConn.Close()

	// Setup FFmpeg to capture directly from the camera and stream as RTP
	var ffmpeg *exec.Cmd

	ffmpegBinary := os.Getenv("FFMPEG_BINARY")
	if ffmpegBinary == "" {
		ffmpegBinary = "ffmpeg"
	}

	ffmpegLogLevel := os.Getenv("FFMPEG_LOG_LEVEL")
	if ffmpegLogLevel == "" {
		ffmpegLogLevel = "error"
	}

	switch audioMode := os.Getenv("AUDIO_MODE"); audioMode {
	case "linux": // LINUX
		ffmpeg = exec.Command(
			ffmpegBinary,
			"-loglevel", ffmpegLogLevel,
			"-hide_banner",                   // removes version/config dump
			"-nostats",                       // removes the periodic "time=... bitrate=..." progress lines
			"-f", "alsa", "-i", "plughw:3,0", // input device
			"-c:a", "libopus", // use opus codec
			"-frame_duration", "20", // 20ms frames
			"-application", "voip", // Low-latency mode
			"-b:a", "48k", // Bitrate
			"-vn",       // Disable video
			"-f", "rtp", // RTP output format
			fmt.Sprintf("rtp://127.0.0.1:%d", udpPort), // output URL
		)
	case "linux-work": // UBUNTU ARBEIT
		ffmpeg = exec.Command(
			ffmpegBinary,
			"-loglevel", ffmpegLogLevel,
			"-hide_banner",                   // removes version/config dump
			"-nostats",                       // removes the periodic "time=... bitrate=..." progress lines
			"-f", "alsa", "-i", "plughw:1,0", // input device
			"-c:a", "libopus", // use opus codec
			"-frame_duration", "20", // 20ms frames
			"-application", "voip", // Low-latency mode
			"-b:a", "48k", // Bitrate
			"-vn",       // Disable video
			"-f", "rtp", // RTP output format
			fmt.Sprintf("rtp://127.0.0.1:%d", udpPort), // output URL
		)
	case "windows-work": // WINDOWS ARBEIT
		ffmpeg = exec.Command(
			ffmpegBinary,
			"-loglevel", ffmpegLogLevel,
			"-hide_banner",                                           // removes version/config dump
			"-nostats",                                               // removes the periodic "time=... bitrate=..." progress lines
			"-f", "dshow", "-i", "audio=Mikrofon (Realtek(R) Audio)", // input device
			"-c:a", "libopus", // use opus codec
			"-frame_duration", "20", // 20ms frames
			"-application", "voip", // Low-latency mode
			"-b:a", "48k", // Bitrate
			"-vn",       // Disable video
			"-f", "rtp", // RTP output format
			fmt.Sprintf("rtp://127.0.0.1:%d", udpPort), // output URL
		)
	case "windows-privat": // WINDOWS PRIVAT
		ffmpeg = exec.Command(
			ffmpegBinary,
			"-loglevel", ffmpegLogLevel,
			"-hide_banner",                                                                                     // removes version/config dump
			"-nostats",                                                                                         // removes the periodic "time=... bitrate=..." progress lines
			"-f", "dshow", "-i", "audio=Mikrofonarray (Intel® Smart Sound Technologie für digitale Mikrofone)", // input device
			"-c:a", "libopus", // use opus codec
			"-frame_duration", "20", // 20ms frames
			"-application", "voip", // Low-latency mode
			"-b:a", "48k", // Bitrate
			"-vn",       // Disable video
			"-f", "rtp", // RTP output format
			fmt.Sprintf("rtp://127.0.0.1:%d", udpPort), // output URL
		)
	default: // AUDIO
		ffmpeg = exec.Command(
			ffmpegBinary,
			"-loglevel", ffmpegLogLevel,
			"-hide_banner", // removes version/config dump
			"-nostats",     // removes the periodic "time=... bitrate=..." progress lines
			"-re",          // realtime speed
			"-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000",
			"-c:a", "libopus", // use opus codec
			"-frame_duration", "20", // 20ms frames
			"-application", "voip", // Low-latency mode
			"-b:a", "48k", // Bitrate
			"-vn",       // Disable video
			"-f", "rtp", // RTP output format
			fmt.Sprintf("rtp://127.0.0.1:%d", udpPort), // output URL
		)
	}

	ffmpeg.Stdout = io.Discard // all logs in ffmpeg go to stderr
	ffmpeg.Stderr = log.Writer()

	// Start the FFmpeg process
	if err := ffmpeg.Start(); err != nil {
		return fmt.Errorf("ffmpeg start error: %w", err)
	}

	// Setup cleanup to ensure ffmpeg process is terminated
	go func() {
		<-ah.stopChan
		if err := ffmpeg.Process.Kill(); err != nil {
			log.Printf("Error killing FFmpeg process: %v", err)
		}
		udpConn.Close()
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

				// If the connection was closed as part of normal shutdown, treat it as non-error
				if errors.Is(err, net.ErrClosed) {
					return nil
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
