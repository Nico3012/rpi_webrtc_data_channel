package main

import (
	"bytes"
	"embed"
	"encoding/json"
	"fmt"
	"net/http"
	"text/template"

	"github.com/Nico3012/rpi_webrtc_data_channel/web/internal/routing"
)

//go:embed sw.js
var swTemplateFS embed.FS

type swTemplateData struct {
	CacheNameJSON string
	ResourcesJSON string
}

func main() {
	mux := http.NewServeMux()

	fileServer := http.FileServer(http.Dir("public"))

	mux.HandleFunc("/sw.js", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("Content-Type", "application/javascript")
		w.Header().Set("Service-Worker-Allowed", "/")

		cacheName, resources, err := buildServiceWorkerConfig("public")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		tmpl, err := template.ParseFS(swTemplateFS, "sw.js")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		cacheNameJSON, _ := json.Marshal(cacheName)
		resourcesJSON, _ := json.Marshal(resources)

		var buf bytes.Buffer
		if err := tmpl.Execute(&buf, swTemplateData{
			CacheNameJSON: string(cacheNameJSON),
			ResourcesJSON: string(resourcesJSON),
		}); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(buf.Bytes())
	})

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		fileServer.ServeHTTP(w, r)
	})

	http.ListenAndServeTLS(":443", "cert.pem", "cert_key.pem", mux)
}

func buildServiceWorkerConfig(publicDir string) (cacheName string, resources []string, err error) {
	h, err := routing.HashDirectory(publicDir)
	if err != nil {
		return "", nil, err
	}

	routes, err := routing.ListRoutes(publicDir, false)
	if err != nil {
		return "", nil, err
	}

	return fmt.Sprintf("%d", h), routes, nil
}
