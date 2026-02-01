package web

import (
	"embed"
	"encoding/json"
	"io/fs"
	"log"
	"net/http"
)

//go:embed public
var embedFS embed.FS

type Config struct {
	SSID     string `json:"ssid"`
	Password string `json:"password"`
}

type GetConfigFunc func() (Config, error)

type SetConfigFunc func(Config) error

type Server struct {
	getConfig GetConfigFunc
	setConfig SetConfigFunc
}

func New(getConfig GetConfigFunc, setConfig SetConfigFunc) *Server {
	return &Server{getConfig: getConfig, setConfig: setConfig}
}

func (s *Server) routes() (*http.ServeMux, error) {
	mux := http.NewServeMux()

	publicFS, err := fs.Sub(embedFS, "public")
	if err != nil {
		return nil, err
	}
	fileServer := http.FileServerFS(publicFS)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		fileServer.ServeHTTP(w, r)
	})

	mux.HandleFunc("/get-config", s.handleGetConfig)
	mux.HandleFunc("/set-config", s.handleSetConfig)

	return mux, nil
}

func (s *Server) ListenAndServe(addr string) error {
	mux, err := s.routes()
	if err != nil {
		return err
	}
	log.Printf("[web]: starting on %s", addr)
	return http.ListenAndServe(addr, mux)
}

func (s *Server) handleGetConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if s.getConfig == nil {
		http.Error(w, "getConfig not configured", http.StatusInternalServerError)
		return
	}
	cfg, err := s.getConfig()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cfg)
}

func (s *Server) handleSetConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if s.setConfig == nil {
		http.Error(w, "setConfig not configured", http.StatusInternalServerError)
		return
	}
	var req Config
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := s.setConfig(req); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}
