package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"github.com/pion/webrtc/v4"
)

type Server struct {
	peerConnection *webrtc.PeerConnection
	dataChannel    *webrtc.DataChannel
	api            *webrtc.API
	mutex          sync.Mutex
}

type SDPRequest struct {
	Type string `json:"type"`
	SDP  string `json:"sdp"`
}

type SDPResponse struct {
	Type  string `json:"type"`
	SDP   string `json:"sdp"`
	Error string `json:"error,omitempty"`
}

func main() {
	server := &Server{}
	server.setupWebRTC()

	// Serve static files from public directory
	http.Handle("/", http.FileServer(http.Dir("public")))
	
	// API routes
	http.HandleFunc("/api/offer", server.handleOffer)

	fmt.Println("RPI WebRTC Server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func (s *Server) setupWebRTC() {
	// Create a new API with a SettingEngine
	settingEngine := webrtc.SettingEngine{}
	s.api = webrtc.NewAPI(webrtc.WithSettingEngine(settingEngine))
}

func (s *Server) closeExistingConnections() {
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
	
	// Create a new peer connection
	config := webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{
				URLs: []string{"stun:stun.l.google.com:19302"},
			},
		},
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
			fmt.Printf("Received message from web client: %s\n", string(msg.Data))
		})

		dc.OnOpen(func() {
			fmt.Println("Data channel opened - new connection established")
			// Start sending periodic messages
			go s.sendPeriodicMessages()
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

func (s *Server) sendPeriodicMessages() {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	messages := []string{
		"Hello from RPI! 🥧",
		"Temperature: 25°C",
		"System uptime: 2 hours",
		"Random number: %d",
		"WebRTC is working! 🚀",
		"Data channel active ✅",
		"Sending periodic update...",
		"RPI says hi! 👋",
	}

	for {
		select {
		case <-ticker.C:
			if s.dataChannel != nil && s.dataChannel.ReadyState() == webrtc.DataChannelStateOpen {
				randomMsg := messages[rand.Intn(len(messages))]
				if randomMsg == "Random number: %d" {
					randomMsg = fmt.Sprintf(randomMsg, rand.Intn(1000))
				}

				fmt.Printf("Sending periodic message: %s\n", randomMsg)
				if err := s.dataChannel.SendText(randomMsg); err != nil {
					fmt.Printf("Error sending message: %v\n", err)
				}
			}
		}
	}
}

func (s *Server) sendError(w http.ResponseWriter, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	response := SDPResponse{Error: message}
	json.NewEncoder(w).Encode(response)
}
