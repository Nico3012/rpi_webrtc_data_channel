package webrtcserver

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"

	"github.com/pion/webrtc/v4"
)

// Server represents the WebRTC server
type Server struct {
	peerConnection  *webrtc.PeerConnection
	dataChannel     *webrtc.DataChannel
	api             *webrtc.API
	mutex           sync.Mutex
	stopChan        chan bool
	messageCallback func(string)
	port            string
	publicDir       string
}

// SDPRequest represents an incoming SDP offer
type SDPRequest struct {
	Type string `json:"type"`
	SDP  string `json:"sdp"`
}

// SDPResponse represents an SDP answer response
type SDPResponse struct {
	Type  string `json:"type"`
	SDP   string `json:"sdp"`
	Error string `json:"error,omitempty"`
}

// New creates a new WebRTC server instance and starts it
func New(port, publicDir string) *Server {
	server := &Server{
		port:      port,
		publicDir: publicDir,
	}

	server.setupWebRTC()

	mux := http.NewServeMux()

	// Serve static files from public directory
	mux.Handle("/", http.FileServer(http.Dir(server.publicDir)))

	// API routes
	mux.HandleFunc("/api/offer", server.handleOffer)

	// Start the server in a goroutine
	go func() {
		fmt.Printf("WebRTC Server starting on port %s\n", server.port)
		if err := http.ListenAndServe(":"+server.port, mux); err != nil {
			fmt.Printf("Server error: %v\n", err)
		}
	}()

	return server
}

// SendData sends data through the WebRTC data channel if it exists
func (s *Server) SendData(data string) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if s.dataChannel == nil {
		return fmt.Errorf("data channel is not available")
	}

	if s.dataChannel.ReadyState() != webrtc.DataChannelStateOpen {
		return fmt.Errorf("data channel is not open")
	}

	fmt.Printf("Sending data: %s\n", data)
	return s.dataChannel.SendText(data)
}

// InitReadDataCallback sets a callback function that will be executed when a new message is received
func (s *Server) InitReadDataCallback(callback func(string)) {
	s.messageCallback = callback
}

// IsConnected returns true if the data channel is connected and ready
func (s *Server) IsConnected() bool {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	return s.dataChannel != nil && s.dataChannel.ReadyState() == webrtc.DataChannelStateOpen
}

func (s *Server) setupWebRTC() {
	// Create a new API with a SettingEngine
	settingEngine := webrtc.SettingEngine{}

	// Enable ICE Lite mode for better performance on server/device side
	settingEngine.SetLite(true)

	s.api = webrtc.NewAPI(webrtc.WithSettingEngine(settingEngine))
}

func (s *Server) closeExistingConnections() {
	// Stop any existing channels
	if s.stopChan != nil {
		close(s.stopChan)
		s.stopChan = nil
	}

	// Close existing data channel
	if s.dataChannel != nil {
		fmt.Println("Closing existing data channel")
		if err := s.dataChannel.Close(); err != nil {
			fmt.Printf("Error closing data channel: %v\n", err)
		}
		s.dataChannel = nil
	}

	// Close existing peer connection
	if s.peerConnection != nil {
		fmt.Println("Closing existing peer connection")
		if err := s.peerConnection.Close(); err != nil {
			fmt.Printf("Error closing peer connection: %v\n", err)
		}
		s.peerConnection = nil
	}
}

func (s *Server) handleOffer(w http.ResponseWriter, r *http.Request) {
	// Enable CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		return
	}

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req SDPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.sendError(w, "Invalid JSON: "+err.Error())
		return
	}

	answer, err := s.processOffer(req.Type, req.SDP)
	if err != nil {
		s.sendError(w, "Error processing offer: "+err.Error())
		return
	}

	response := SDPResponse{Type: "answer", SDP: answer}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (s *Server) processOffer(offerType, offerSDP string) (string, error) {
	// Validate offer type
	if offerType != "offer" {
		return "", fmt.Errorf("expected offer type 'offer', got '%s'", offerType)
	}

	// Lock to ensure only one connection at a time
	s.mutex.Lock()
	defer s.mutex.Unlock()

	// Close any existing connections
	s.closeExistingConnections()

	// Create a new peer connection without ICE servers for local network
	config := webrtc.Configuration{
		// No ICE servers needed for local network connections
	}

	var err error
	s.peerConnection, err = s.api.NewPeerConnection(config)
	if err != nil {
		return "", fmt.Errorf("failed to create peer connection: %v", err)
	}

	// Set up data channel event handler
	s.peerConnection.OnDataChannel(func(dc *webrtc.DataChannel) {
		fmt.Printf("New DataChannel %s %d\n", dc.Label(), dc.ID())
		s.dataChannel = dc

		// Handle incoming messages
		dc.OnMessage(func(msg webrtc.DataChannelMessage) {
			message := string(msg.Data)
			fmt.Printf("Received message from web client: %s\n", message)

			// Call the user-defined callback if set
			if s.messageCallback != nil {
				s.messageCallback(message)
			}
		})

		dc.OnOpen(func() {
			fmt.Println("Data channel opened - new connection established")
			// Create a new stop channel for this connection
			s.stopChan = make(chan bool)
		})

		dc.OnClose(func() {
			fmt.Println("Data channel closed - connection terminated")
		})
	})

	// Set the remote description
	offer := webrtc.SessionDescription{
		Type: webrtc.SDPTypeOffer,
		SDP:  offerSDP,
	}

	if err := s.peerConnection.SetRemoteDescription(offer); err != nil {
		return "", fmt.Errorf("failed to set remote description: %v", err)
	}

	// Create answer
	answer, err := s.peerConnection.CreateAnswer(nil)
	if err != nil {
		return "", fmt.Errorf("failed to create answer: %v", err)
	}

	// Set local description
	if err := s.peerConnection.SetLocalDescription(answer); err != nil {
		return "", fmt.Errorf("failed to set local description: %v", err)
	}

	// Wait for ICE gathering to complete
	gatherComplete := webrtc.GatheringCompletePromise(s.peerConnection)
	<-gatherComplete

	return s.peerConnection.LocalDescription().SDP, nil
}

func (s *Server) sendError(w http.ResponseWriter, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	response := SDPResponse{Error: message}
	json.NewEncoder(w).Encode(response)
}
