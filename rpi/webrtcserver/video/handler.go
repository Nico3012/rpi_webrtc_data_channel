package video

import (
	"errors"
	"fmt"
	"io"
	"log"
	"os/exec"
	"time"

	"github.com/pion/webrtc/v4"
	"github.com/pion/webrtc/v4/pkg/media"
	"github.com/pion/webrtc/v4/pkg/media/ivfreader"
)

// Handler manages the video streaming functionality
type Handler struct {
	videoTrack   *webrtc.TrackLocalStaticSample
	stopChan     chan struct{}
	isStreaming  bool
	cameraDevice int
	width        int
	height       int
	framerate    int
}

// NewHandler creates a new video handler
func NewHandler(cameraDevice int) *Handler {
	return &Handler{
		cameraDevice: cameraDevice,
		width:        640,
		height:       480,
		framerate:    30,
		stopChan:     make(chan struct{}),
	}
}

// CreateTrack creates a video track for WebRTC
func (vh *Handler) CreateTrack() (*webrtc.TrackLocalStaticSample, error) {
	videoTrack, err := webrtc.NewTrackLocalStaticSample(
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
	// Camera device path (e.g., "/dev/video0" for Linux or camera index for other systems)
	cameraPath := fmt.Sprintf("/dev/video%d", vh.cameraDevice)

	// Setup FFmpeg to capture directly from the camera and encode to VP8
	ffmpeg := exec.Command(
		"ffmpeg", "-y",
		"-f", "v4l2", // Video4Linux2 input format for Linux
		"-input_format", "yuyv422", // Common format for webcams
		"-video_size", fmt.Sprintf("%dx%d", vh.width, vh.height),
		"-framerate", fmt.Sprintf("%d", vh.framerate),
		"-i", cameraPath,
		"-c:v", "libvpx",
		"-deadline", "realtime", // Optimize for realtime encoding
		"-cpu-used", "7", // Speed up initial encoding
		"-b:v", "1M", // 1Mbps bitrate
		"-keyint_min", "15", // Force keyframes more often initially
		"-g", "15",
		"-f", "ivf",
		"pipe:1", // Output to stdout
	)

	// Get ffmpeg's stdout to read the encoded video
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
		<-vh.stopChan
		fmt.Println("Stopping FFmpeg process")
		ffmpeg.Process.Kill()
	}()

	// Read encoded frames from FFmpeg and send to WebRTC
	ivf, _, err := ivfreader.NewWith(stdout)
	if err != nil {
		return fmt.Errorf("ivfreader error: %w", err)
	}

	for {
		select {
		case <-vh.stopChan:
			return nil
		default:
			frame, _, err := ivf.ParseNextFrame()
			if errors.Is(err, io.EOF) {
				break
			}
			if err != nil {
				return fmt.Errorf("ivf parse error: %w", err)
			}

			if err := vh.videoTrack.WriteSample(media.Sample{
				Data:     frame,
				Duration: time.Second / time.Duration(vh.framerate),
			}); err != nil {
				return fmt.Errorf("write sample error: %w", err)
			}
		}
	}
}
