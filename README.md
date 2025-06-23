# WebRTC Data Channel Demo

This project demonstrates a WebRTC data channel connection between a web client (HTTPS) and a Raspberry Pi server (HTTP) for exchanging SDP offers/answers and real-time messaging.

## Architecture

- **Web Server** (`web/`): Serves the HTTPS web client that initiates WebRTC connections
- **RPI Server** (`rpi/`): HTTP server that handles SDP exchange and acts as the WebRTC peer

## Setup Instructions

### 1. Configure Network

The web interface now includes an input field for the Raspberry Pi IP address, so you don't need to manually edit any files. However, you still need to know your Raspberry Pi's IP address.

To find your Raspberry Pi's IP address:
- On the RPI: `hostname -I` or `ip addr show`
- From another device: Check your router's admin panel or use `nmap -sn 192.168.1.0/24`

### 2. Start the Servers

#### RPI Server (Port 8080)
```bash
cd rpi
go mod tidy
go run main.go
```

#### Web Server (Port 8443)
```bash
cd web
go run main.go
```

### 3. Access the Applications

- **Web Client**: Open `http://localhost:8443` in your browser
- **RPI Server**: Will be opened automatically at `http://[RPI_IP]:8080` when you generate an offer

## How to Use

### Step 1: Configure and Generate SDP Offer
1. Open the web client at `http://localhost:8443`
2. Enter your Raspberry Pi's IP address in the input field (e.g., 192.168.1.100)
3. Click "Generate SDP Offer & Open RPI Server"
4. The system will test connectivity to the RPI server
5. The SDP offer will be generated and copied to your clipboard
6. A new tab will open with the RPI server interface

### Step 2: Exchange SDP
1. In the RPI server tab, the SDP offer should auto-paste (if clipboard access is available)
2. Click "Generate Answer" to create the SDP answer
3. Copy the generated answer from the RPI server
4. Return to the web client tab and paste the answer
5. Click "Connect with Answer"
6. Close the RPI server tab

### Step 3: Communication
- Once connected, you can send messages from the web client to the RPI server
- The RPI server will automatically send periodic messages every 2 seconds
- All communication happens through the WebRTC data channel

## Features

- ✅ Dynamic IP address configuration (no need to edit files)
- ✅ IP address validation and connectivity testing
- ✅ Automatic IP address saving (localStorage)
- ✅ SDP offer/answer exchange via HTTP
- ✅ WebRTC data channel establishment
- ✅ Real-time bidirectional messaging
- ✅ Automatic clipboard handling
- ✅ Modern web interface with validation feedback
- ✅ Console logging on RPI server
- ✅ Periodic status messages from RPI

## Technical Details

### WebRTC Configuration
- Uses Google's STUN server for NAT traversal
- Data channel with ordered delivery
- ICE gathering with 10-second timeout

### Security Considerations
- Mixed content policy handled by opening RPI server in new tab
- CORS headers handled automatically by Go servers
- SDP exchange via HTTP (not HTTPS) for simplicity

## Troubleshooting

### Connection Issues
1. **Check IP Address**: Ensure the RPI IP address in `script.js` is correct
2. **Firewall**: Make sure port 8080 is open on the RPI
3. **Network**: Both devices must be on the same network for direct connection
4. **STUN Server**: If behind strict NAT, you may need TURN server configuration

### Port Conflicts
- If port 8080 is in use on RPI, change it in `rpi/main.go` and `web/public/script.js`
- If port 8443 is in use for web server, change it in `web/main.go`

### Browser Issues
- Use a modern browser that supports WebRTC
- Enable clipboard access when prompted
- Check browser console for detailed error messages

## Dependencies

### Go Modules
- **RPI Server**: `github.com/pion/webrtc/v4` - WebRTC implementation in Go
- **Web Server**: Standard library only

### Frontend
- Vanilla JavaScript (no external dependencies)
- Modern CSS with responsive design
- WebRTC APIs (built into modern browsers)

## Development

### Building Executables
```bash
# Build RPI server
cd rpi && go build -o rpi-server.exe main.go

# Build web server  
cd web && go build -o web-server.exe main.go
```

### Customization
- Modify `sendPeriodicMessages()` in `rpi/main.go` to change automatic messages
- Update CSS in `web/public/style.css` for different styling
- Adjust WebRTC configuration in both client and server for different network setups

## License

This project is provided as-is for educational and demonstration purposes.
