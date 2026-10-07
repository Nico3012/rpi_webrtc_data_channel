package web

import (
	"embed"
	"encoding/json"
	"io/fs"
	"log"
	"net/http"
	"strings"
)

//go:embed public
var embedFS embed.FS

type Config struct {
	SSID           string `json:"ssid"`
	Password       string `json:"password"`
	DevicePassword string `json:"devicePassword"`
}

type Device struct {
	MAC      string `json:"mac"`
	IP       string `json:"ip"`
	Hostname string `json:"hostname"`
	Online   bool   `json:"online"`
}

type GetConfigFunc func() (Config, error)

type SetConfigFunc func(Config) error

type GetDevicesFunc func() ([]Device, error)

type Server struct {
	getConfig  GetConfigFunc
	setConfig  SetConfigFunc
	getDevices GetDevicesFunc
}

func New(getConfig GetConfigFunc, setConfig SetConfigFunc, getDevices GetDevicesFunc) *Server {
	return &Server{getConfig: getConfig, setConfig: setConfig, getDevices: getDevices}
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
	mux.HandleFunc("/get-devices", s.handleGetDevices)

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
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	providedPassword := strings.TrimPrefix(authHeader, "Bearer ")
	cfg, err := s.getConfig()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if providedPassword != cfg.DevicePassword {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
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
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	providedPassword := strings.TrimPrefix(authHeader, "Bearer ")
	currentCfg, err := s.getConfig()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if providedPassword != currentCfg.DevicePassword {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
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

func (s *Server) handleGetDevices(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if s.getDevices == nil {
		http.Error(w, "getDevices not configured", http.StatusInternalServerError)
		return
	}
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	providedPassword := strings.TrimPrefix(authHeader, "Bearer ")
	currentCfg, err := s.getConfig()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if providedPassword != currentCfg.DevicePassword {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	devices, err := s.getDevices()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if devices == nil {
		devices = []Device{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(devices)
}
