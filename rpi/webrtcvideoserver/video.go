package webrtcvideoserver

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
	gocv "gocv.io/x/gocv"
)

// VideoHandler manages the video streaming functionality
type VideoHandler struct {
	videoTrack   *webrtc.TrackLocalStaticSample
	stopChan     chan struct{}
	isStreaming  bool
	cameraDevice int
	width        int
	height       int
	framerate    int
}

// NewVideoHandler creates a new video handler
func NewVideoHandler(cameraDevice int) *VideoHandler {
	return &VideoHandler{
		cameraDevice: cameraDevice,
		width:        640,
		height:       480,
		framerate:    30,
		stopChan:     make(chan struct{}),
	}
}

// CreateTrack creates a video track for WebRTC
func (vh *VideoHandler) CreateTrack() (*webrtc.TrackLocalStaticSample, error) {
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
func (vh *VideoHandler) StartStreaming() error {
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
func (vh *VideoHandler) StopStreaming() {
	if vh.isStreaming {
		close(vh.stopChan)
		vh.isStreaming = false
	}
}

// streamCamera handles the camera capture and streaming
func (vh *VideoHandler) streamCamera() error {
	// Open camera
	webcam, err := gocv.OpenVideoCapture(vh.cameraDevice)
	if err != nil {
		return fmt.Errorf("cannot open camera: %w", err)
	}
	defer webcam.Close()

	// Configure camera settings
	webcam.Set(gocv.VideoCaptureFrameWidth, float64(vh.width))
	webcam.Set(gocv.VideoCaptureFrameHeight, float64(vh.height))
	webcam.Set(gocv.VideoCaptureFPS, float64(vh.framerate))

	// Setup FFmpeg for VP8 encoding
	ffmpeg := exec.Command(
		"ffmpeg", "-y",
		"-f", "rawvideo",
		"-pixel_format", "bgr24",
		"-video_size", fmt.Sprintf("%dx%d", vh.width, vh.height),
		"-framerate", fmt.Sprintf("%d", vh.framerate),
		"-i", "pipe:0",
		"-c:v", "libvpx",
		"-deadline", "realtime", // Optimize for realtime encoding
		"-cpu-used", "7", // Speed up initial encoding
		"-b:v", "1M",
		"-keyint_min", "15", // Force keyframes more often initially
		"-g", "15",
		"-f", "ivf", "pipe:1",
	)

	stdin, err := ffmpeg.StdinPipe()
	if err != nil {
		return fmt.Errorf("ffmpeg stdin error: %w", err)
	}
	stdout, err := ffmpeg.StdoutPipe()
	if err != nil {
		return fmt.Errorf("ffmpeg stdout error: %w", err)
	}

	if err := ffmpeg.Start(); err != nil {
		return fmt.Errorf("ffmpeg start error: %w", err)
	}

	// Stream frames to FFmpeg
	go func() {
		defer stdin.Close()

		frame := gocv.NewMat()
		defer frame.Close()

		for {
			select {
			case <-vh.stopChan:
				fmt.Println("Camera streaming stopped")
				return
			default:
				if ok := webcam.Read(&frame); !ok || frame.Empty() {
					time.Sleep(10 * time.Millisecond)
					continue
				}

				stdin.Write(frame.ToBytes())
			}
		}
	}()

	// Read encoded frames from FFmpeg and send to WebRTC
	ivf, _, err := ivfreader.NewWith(stdout)
	if err != nil {
		return fmt.Errorf("ivfreader error: %w", err)
	}

	for {
		select {
		case <-vh.stopChan:
			ffmpeg.Process.Kill()
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
