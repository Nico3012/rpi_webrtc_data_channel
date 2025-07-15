// Package serialcomm provides minimal serial communication with an Arduino device.
package serialcomm

import (
	"bufio"
	"fmt"
	"sync"

	"go.bug.st/serial"
)

// Port wraps a serial connection to an Arduino.
type Port struct {
	port     serial.Port
	callback func(string)
	mu       sync.RWMutex
}

// New initializes and returns a Port connected to the specified serial port at the given baud rate.
// Example: p, err := serialcomm.New("/dev/ttyACM0", 9600)
func New(name string, baud int) (*Port, error) {
	mode := &serial.Mode{BaudRate: baud}
	s, err := serial.Open(name, mode)
	if err != nil {
		return nil, fmt.Errorf("opening serial port %s: %w", name, err)
	}

	p := &Port{port: s}
	go p.readLoop()
	return p, nil
}

// NewAuto initializes and returns a Port using the first available serial port at the given baud rate.
// It queries the list of connected ports and picks the first one.
// Example: p, err := serialcomm.NewAuto(9600)
func NewAuto(baud int) (*Port, error) {
	ports, err := serial.GetPortsList()
	if err != nil {
		return nil, fmt.Errorf("listing serial ports: %w", err)
	}
	if len(ports) == 0 {
		return nil, fmt.Errorf("no serial ports found")
	}
	return New(ports[0], baud)
}

// SendData writes a string plus a single '\n' to the serial port.
func (p *Port) SendData(data string) error {
	p.mu.RLock()
	defer p.mu.RUnlock()
	if p.port == nil {
		return fmt.Errorf("serial port not initialized")
	}
	// always append exactly '\n'
	msg := data + "\n"
	_, err := p.port.Write([]byte(msg))
	return err
}

// InitDataCallback sets a handler function that will be called whenever data is received.
func (p *Port) InitDataCallback(cb func(string)) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.callback = cb
}

// Close closes the serial port.
func (p *Port) Close() error {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.port == nil {
		return nil
	}
	err := p.port.Close()
	p.port = nil
	return err
}

// internal read loop: reads lines and invokes callback if set.
func (p *Port) readLoop() {
	reader := bufio.NewReader(p.port)
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			// Stop reading on errors
			return
		}
		p.mu.RLock()
		cb := p.callback
		p.mu.RUnlock()
		if cb != nil {
			cb(line)
		}
	}
}
