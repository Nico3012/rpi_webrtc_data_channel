package main

import (
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
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
            color: #555;
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
        }
        textarea:focus {
            border-color: #007bff;
            outline: none;
        }
        button {
            background-color: #007bff;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 10px;
        }
        button:hover {
            background-color: #0056b3;
        }
        button:disabled {
            background-color: #ccc;
            cursor: not-allowed;
        }
        .result {
            margin-top: 20px;
            padding: 15px;
            border-radius: 5px;
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            display: none;
        }
        .error {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }
        .copy-btn {
            background-color: #28a745;
            margin-left: 10px;
            padding: 8px 16px;
            font-size: 14px;
        }
        .copy-btn:hover {
            background-color: #218838;
        }
        .instructions {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🥧 RPI WebRTC Server</h1>
          <div class="instructions">
            <strong>Instructions:</strong><br>
            1. Paste the complete SDP offer JSON from the web client below<br>
            2. Click "Generate Answer" to create the SDP answer JSON<br>
            3. Copy the generated answer JSON back to the web client<br>
            4. Close this tab after copying the answer
        </div>
        
        <form id="sdpForm">
            <div class="form-group">
                <label for="offer">SDP Offer JSON from Web Client:</label>
                <textarea id="offer" name="offer" placeholder="Paste the complete SDP offer JSON here..." required></textarea>
            </div>
            <button type="submit">Generate Answer</button>
        </form>
        
        <div id="result" class="result">
            <label for="answer">SDP Answer JSON (copy this back to web client):</label>
            <textarea id="answer" readonly></textarea>
            <button type="button" class="copy-btn" onclick="copyAnswer()">Copy Answer</button>
        </div>
    </div>

    <script>
        document.getElementById('sdpForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const offer = document.getElementById('offer').value;
            const resultDiv = document.getElementById('result');
            const answerTextarea = document.getElementById('answer');
            
            if (!offer.trim()) {
                alert('Please paste the SDP offer');
                return;
            }
              try {
                const response = await fetch('/offer', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: offer
                });
                
                const data = await response.json();
                
                if (data.error) {
                    resultDiv.className = 'result error';
                    answerTextarea.value = 'Error: ' + data.error;
                } else {
                    resultDiv.className = 'result';
                    // Format the JSON response nicely
                    const formattedAnswer = JSON.stringify({
                        type: data.type,
                        sdp: data.sdp
                    }, null, 2);
                    answerTextarea.value = formattedAnswer;
                }
                
                resultDiv.style.display = 'block';
                
            } catch (error) {
                resultDiv.className = 'result error';
                answerTextarea.value = 'Error: ' + error.message;
                resultDiv.style.display = 'block';
            }
        });
        
        function copyAnswer() {
            const answerTextarea = document.getElementById('answer');
            answerTextarea.select();
            document.execCommand('copy');
            
            const btn = event.target;
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            btn.style.backgroundColor = '#218838';
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.backgroundColor = '#28a745';
            }, 2000);
        }
          // Auto-paste from clipboard if available
        window.addEventListener('load', async function() {
            try {
                const clipboardText = await navigator.clipboard.readText();
                if (clipboardText && clipboardText.includes('"type"') && clipboardText.includes('"sdp"')) {
                    document.getElementById('offer').value = clipboardText;
                }
            } catch (err) {
                // Clipboard access not available or denied
                console.log('Clipboard access not available');
            }
        });
    </script>
</body>
</html>
	`
	w.Header().Set("Content-Type", "text/html")
	tmplParsed := template.Must(template.New("index").Parse(tmpl))
	tmplParsed.Execute(w, nil)
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