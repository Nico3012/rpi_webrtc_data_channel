package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"time"
)

//go:embed public
var embedFS embed.FS

func executeAction(action string) error {
	log.Printf("Executing system action: %s", action)

	if runtime.GOOS != "linux" {
		log.Printf("[DEMO MODE] Non-linux OS detected (%s). Skipping actual %s command.", runtime.GOOS, action)
		return nil
	}

	// 1. Try host systemctl via nsenter (PID 1 namespace)
	log.Printf("Attempting 'nsenter ... systemctl %s'...", action)
	cmd := exec.Command("nsenter", "-t", "1", "-m", "-u", "-i", "-n", "-p", "--", "systemctl", action)
	if out, err := cmd.CombinedOutput(); err == nil {
		log.Printf("nsenter systemctl %s succeeded: %s", action, string(out))
		return nil
	} else {
		log.Printf("nsenter systemctl %s failed: %v (output: %s)", action, err, string(out))
	}

	// 2. Try host shutdown/reboot binary via nsenter
	log.Printf("Attempting 'nsenter ... %s'...", action)
	cmd = exec.Command("nsenter", "-t", "1", "-m", "-u", "-i", "-n", "-p", "--", action)
	if out, err := cmd.CombinedOutput(); err == nil {
		log.Printf("nsenter %s succeeded: %s", action, string(out))
		return nil
	} else {
		log.Printf("nsenter %s failed: %v (output: %s)", action, err, string(out))
	}

	// 3. Try container-level direct command
	log.Printf("Attempting direct '%s'...", action)
	cmd = exec.Command(action)
	if out, err := cmd.CombinedOutput(); err == nil {
		log.Printf("direct %s succeeded: %s", action, string(out))
		return nil
	} else {
		log.Printf("direct %s failed: %v (output: %s)", action, err, string(out))
	}

	// 4. Fallback: Magic SysRq trigger
	log.Println("Falling back to Magic SysRq (/proc/sysrq-trigger)...")
	_ = os.WriteFile("/proc/sys/kernel/sysrq", []byte("1\n"), 0644)
	_ = os.WriteFile("/proc/sysrq-trigger", []byte("s\n"), 0644) // sync
	time.Sleep(500 * time.Millisecond)
	_ = os.WriteFile("/proc/sysrq-trigger", []byte("u\n"), 0644) // unmount / remount ro
	time.Sleep(500 * time.Millisecond)

	if action == "reboot" {
		return os.WriteFile("/proc/sysrq-trigger", []byte("b\n"), 0644) // reboot
	}
	return os.WriteFile("/proc/sysrq-trigger", []byte("o\n"), 0644) // power off
}

func handleAction(w http.ResponseWriter, r *http.Request, action string) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"status":  "ok",
		"message": fmt.Sprintf("Action '%s' initiated", action),
	})
	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}

	go func() {
		// Delay slightly so the HTTP response is cleanly sent and received by the browser
		time.Sleep(1 * time.Second)
		if err := executeAction(action); err != nil {
			log.Printf("Error triggering %s: %v", action, err)
		}
	}()
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	mux := http.NewServeMux()

	// API Endpoints
	mux.HandleFunc("/api/reboot", func(w http.ResponseWriter, r *http.Request) {
		handleAction(w, r, "reboot")
	})

	mux.HandleFunc("/api/poweroff", func(w http.ResponseWriter, r *http.Request) {
		handleAction(w, r, "poweroff")
	})

	mux.HandleFunc("/api/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{
			"status": "online",
			"os":     runtime.GOOS,
		})
	})

	// Static UI
	publicFS, err := fs.Sub(embedFS, "public")
	if err != nil {
		log.Fatalf("Failed to initialize public static FS: %v", err)
	}

	fileServer := http.FileServerFS(publicFS)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		fileServer.ServeHTTP(w, r)
	})

	addr := ":" + port
	log.Printf("System Control Service listening on %s (GOOS: %s)", addr, runtime.GOOS)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("Server stopped: %v", err)
	}
}
