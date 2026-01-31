package datachannelmux

import (
	"errors"
	"strings"
	"sync"

	"github.com/Nico3012/rpi_webrtc_data_channel/rpi/internal/webrtcserver"
)

const ID_LENGTH = 6

type Channel struct {
	server *webrtcserver.Server
	id     string

	mu            sync.Mutex
	recvCallbacks []func(string)
}

func (c *Channel) OnMessage(cb func(msg string)) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.recvCallbacks = append(c.recvCallbacks, cb)
}

func (c *Channel) dispatch(msg string) {
	c.mu.Lock()
	callbacks := append([]func(string){}, c.recvCallbacks...)
	c.mu.Unlock()

	for _, cb := range callbacks {
		cb(msg)
	}
}

func (c *Channel) SendData(data string) error {
	return c.server.SendData(c.id + data)
}

// Mux:

type DataChannelMux struct {
	server *webrtcserver.Server
}

func New(server *webrtcserver.Server) *DataChannelMux {
	mux := &DataChannelMux{
		server: server,
	}
	return mux
}

func (m *DataChannelMux) CreateChannel(id string) (*Channel, error) {
	if len(id) != ID_LENGTH {
		return nil, errors.New("id must be of length 6")
	}

	ch := &Channel{server: m.server, id: id}

	// Register a server-level message listener that filters messages for this channel id
	m.server.OnMessage(func(data string) {
		if strings.HasPrefix(data, id) {
			payload := data[ID_LENGTH:]
			ch.dispatch(payload)
		}
	})

	return ch, nil
}
