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
	SSID     string
	Password string
}

type GetConfigResponse struct {
	SSID string `json:"ssid"`
}

type SetConfigRequest struct {
	SSID        string `json:"ssid"`
	OldPassword string `json:"oldPassword"`
	NewPassword string `json:"newPassword"`
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
	json.NewEncoder(w).Encode(GetConfigResponse{SSID: cfg.SSID})
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
	var req SetConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	currentCfg, err := s.getConfig()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if req.OldPassword != currentCfg.Password {
		http.Error(w, "Invalid old password", http.StatusBadRequest)
		return
	}
	newCfg := Config{
		SSID:     req.SSID,
		Password: req.NewPassword,
	}
	if err := s.setConfig(newCfg); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}
