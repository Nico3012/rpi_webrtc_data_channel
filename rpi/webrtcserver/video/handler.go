package video

import (
	"errors"
	"fmt"
	"log"
	"net"
	"os/exec"
	"time"

	"github.com/pion/webrtc/v4"
)

// Handler manages the video streaming functionality
type Handler struct {
	videoTrack  *webrtc.TrackLocalStaticRTP
	stopChan    chan struct{}
	isStreaming bool
}

// NewHandler creates a new video handler
func NewHandler() *Handler {
	return &Handler{
		stopChan: make(chan struct{}),
	}
}

// CreateTrack creates a video track for WebRTC
func (vh *Handler) CreateTrack() (*webrtc.TrackLocalStaticRTP, error) {
	videoTrack, err := webrtc.NewTrackLocalStaticRTP(
		webrtc.RTPCodecCapability{MimeType: webrtc.MimeTypeVP8},
		"video",
		"camera",
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create video track: %w", err)
	}
	vh.videoTrack = videoTrack
	return videoTrack, nil
}

// StartStreaming starts the camera streaming process
func (vh *Handler) StartStreaming() error {
	if vh.isStreaming {
		return errors.New("streaming already in progress")
	}

	if vh.videoTrack == nil {
		return errors.New("video track not created")
	}

	vh.stopChan = make(chan struct{})
	vh.isStreaming = true

	go func() {
		if err := vh.streamCamera(); err != nil {
			log.Printf("Camera streaming error: %v", err)
		}
		vh.isStreaming = false
	}()

	return nil
}

// StopStreaming stops the streaming process
func (vh *Handler) StopStreaming() {
	if vh.isStreaming {
		close(vh.stopChan)
		vh.isStreaming = false
	}
}

// streamCamera handles the camera capture and streaming
func (vh *Handler) streamCamera() error {
	const udpPort = 5004
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
	ffmpeg := exec.Command(
		// WINDOWS:

		// "ffmpeg",
		// "-f", "dshow", // input mode
		// "-i", "video=HP HD Camera", // input device
		// "-c:v", "libvpx", // use VP8 codec
		// "-deadline", "realtime", // fastest encoding preset
		// "-cpu-used", "8", // minimal CPU usage
		// "-video_size", "640x480", // video resolution
		// "-framerate", "30", // frame rate
		// "-b:v", "2M", // Bitrate
		// "-an",       // Disable audio
		// "-f", "rtp", // RTP output format
		// fmt.Sprintf("rtp://127.0.0.1:%d", udpPort), // output URL

		// LINUX:

		"ffmpeg",
		"-i", "/dev/video0", // input device
		"-c:v", "libvpx", // use VP8 codec
		"-deadline", "realtime", // fastest encoding preset
		"-cpu-used", "8", // minimal CPU usage
		"-video_size", "640x480", // video resolution
		"-framerate", "30", // frame rate
		"-b:v", "2M", // Bitrate
		"-an",       // Disable audio
		"-f", "rtp", // RTP output format
		fmt.Sprintf("rtp://127.0.0.1:%d", udpPort), // output URL
	)

	// Capture FFmpeg's stdout and stderr
	ffmpeg.Stdout = log.Writer()
	ffmpeg.Stderr = log.Writer()

	// Start the FFmpeg process
	if err := ffmpeg.Start(); err != nil {
		return fmt.Errorf("ffmpeg start error: %w", err)
	}

	// Setup cleanup to ensure ffmpeg process is terminated
	go func() {
		<-vh.stopChan
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
		case <-vh.stopChan:
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
			if _, err := vh.videoTrack.Write(buffer[:n]); err != nil {
				return fmt.Errorf("RTP write error: %w", err)
			}
		}
	}
}
