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
	// Setup FFmpeg to capture directly from the camera and encode to VP8
	ffmpeg := exec.Command(
		"ffmpeg",
		"-i", "/dev/video0", // use default webcam
		"-c:v", "vp8", // set video codec to vp8
		"-video_size", "640x480",
		"-framerate", "30",
		"-b:v", "2M", // video bitrate 2 megabits per second
		"-an",                 // disable audio
		"-f", "ivf", "pipe:1", // pipe out as ivf
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
