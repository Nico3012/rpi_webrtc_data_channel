package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"math/rand"
	"net/http"
	"time"

	"github.com/pion/webrtc/v4"
)

type Server struct {
	peerConnection *webrtc.PeerConnection
	dataChannel    *webrtc.DataChannel
	api            *webrtc.API
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

	http.HandleFunc("/", server.handleIndex)
	http.HandleFunc("/offer", server.handleOffer)
	http.HandleFunc("/static/", server.handleStatic)

	fmt.Println("RPI WebRTC Server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func (s *Server) setupWebRTC() {
	// Create a new API with a SettingEngine
	settingEngine := webrtc.SettingEngine{}
	s.api = webrtc.NewAPI(webrtc.WithSettingEngine(settingEngine))
}

func (s *Server) handleIndex(w http.ResponseWriter, r *http.Request) {
	// Parse URL parameters
	offerParam := r.URL.Query().Get("offer")

	var offerSDP string
	var hasOffer bool
	var answerSDP string
	var errorMessage string

	if offerParam != "" {
		// Decode the base64 encoded offer
		decodedBytes, err := base64.StdEncoding.DecodeString(offerParam)
		if err != nil {
			errorMessage = "Failed to decode offer parameter: " + err.Error()
		} else {
			// Parse the JSON offer
			var offerRequest SDPRequest
			if err := json.Unmarshal(decodedBytes, &offerRequest); err != nil {
				errorMessage = "Failed to parse offer JSON: " + err.Error()
			} else {
				offerSDP = offerRequest.SDP
				hasOffer = true

				// Automatically process the offer
				answer, err := s.processOffer(offerRequest.Type, offerRequest.SDP)
				if err != nil {
					errorMessage = "Failed to process offer: " + err.Error()
				} else {
					answerSDP = answer
				}
			}
		}
	}

	tmpl := `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RPI WebRTC Server</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .status {
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            text-align: center;
            font-weight: bold;
        }
        .success {
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }
        .error {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }
        .waiting {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
        }
        textarea {
            width: 100%;
            min-height: 150px;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 5px;
            font-family: monospace;
            font-size: 14px;
            resize: vertical;
            margin: 10px 0;
        }
        button {
            background-color: #007bff;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px 5px 10px 0;
        }
        button:hover {
            background-color: #0056b3;
        }
        .copy-btn {
            background-color: #28a745;
        }
        .copy-btn:hover {
            background-color: #218838;
        }
        .close-btn {
            background-color: #dc3545;
        }
        .close-btn:hover {
            background-color: #c82333;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
            color: #555;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🥧 RPI WebRTC Server</h1>
        
        {{if .ErrorMessage}}
        <div class="status error">
            <strong>Error:</strong> {{.ErrorMessage}}
        </div>
        {{else if .AnswerSDP}}
        <div class="status success">
            ✅ SDP Answer Generated Successfully!
        </div>
        
        <div class="form-group">
            <label>Generated SDP Answer:</label>
            <textarea id="answer" readonly>{{.AnswerJSON}}</textarea>
            <button class="copy-btn" onclick="copyAndSendAnswer()">Copy & Send Answer to Web Client</button>
            <button class="close-btn" onclick="window.close()">Close Window</button>
        </div>
        {{else if .HasOffer}}
        <div class="status waiting">
            Processing SDP offer...
        </div>
        {{else}}
        <div class="status waiting">
            Waiting for SDP offer via URL parameter...
        </div>
        <p>This page should be opened automatically with the SDP offer from the web client.</p>
        {{end}}
    </div>

    <script>
        {{if .AnswerSDP}}
        // Automatically send the answer back to the parent window
        const answerData = {
            type: "sdp_answer",
            answer: {{.AnswerJS}}
        };
        
        // Try to send to parent window
        if (window.opener) {
            try {
                window.opener.postMessage(answerData, '*');
                console.log('Answer sent to parent window');
                
                // Auto-close after a short delay
                setTimeout(() => {
                    window.close();
                }, 2000);
            } catch (error) {
                console.error('Failed to send answer to parent:', error);
            }
        }
        {{end}}
        
        function copyAndSendAnswer() {
            const answerTextarea = document.getElementById('answer');
            answerTextarea.select();
            document.execCommand('copy');
            
            const btn = event.target;
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            btn.style.backgroundColor = '#218838';
            
            // Send answer to parent if available
            {{if .AnswerSDP}}
            if (window.opener) {
                try {
                    const answerData = {
                        type: "sdp_answer",
                        answer: {{.AnswerJS}}
                    };
                    window.opener.postMessage(answerData, '*');
                } catch (error) {
                    console.error('Failed to send answer to parent:', error);
                }
            }
            {{end}}
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.backgroundColor = '#28a745';
            }, 2000);
        }
    </script>
</body>
</html>
	`

	// Prepare template data
	data := struct {
		HasOffer     bool
		OfferSDP     string
		AnswerSDP    string
		AnswerJSON   string
		AnswerJS     template.JS
		ErrorMessage string
	}{
		HasOffer:     hasOffer,
		OfferSDP:     offerSDP,
		AnswerSDP:    answerSDP,
		ErrorMessage: errorMessage,
	}

	// If we have an answer, format it for display
	if answerSDP != "" {
		answerResponse := SDPResponse{Type: "answer", SDP: answerSDP}
		answerJSONBytes, _ := json.MarshalIndent(answerResponse, "", "  ")
		data.AnswerJSON = string(answerJSONBytes)

		// For JavaScript embedding
		answerJSBytes, _ := json.Marshal(answerResponse)
		data.AnswerJS = template.JS(string(answerJSBytes))
	}
	w.Header().Set("Content-Type", "text/html")
	tmplParsed := template.Must(template.New("index").Parse(tmpl))
	tmplParsed.Execute(w, data)
}

func (s *Server) handleOffer(w http.ResponseWriter, r *http.Request) {
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
			fmt.Println("Data channel opened")
			// Start sending periodic messages
			go s.sendPeriodicMessages()
		})

		dc.OnClose(func() {
			fmt.Println("Data channel closed")
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

func (s *Server) handleStatic(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, r.URL.Path[1:])
}
