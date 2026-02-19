package main

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strings"
)

type api struct {
	mux *http.ServeMux
}

func newAPI() *api {
	return &api{
		mux: http.NewServeMux(),
	}
}

func main() {
	api := newAPI()
	api.mux.HandleFunc("/style.css", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "style.css")
	})
	api.mux.HandleFunc("/script.js", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "script.js")
	})
	api.mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		html, err := os.ReadFile("index.html")
		if err != nil {
			http.Error(w, "index.html not found", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write(html)
	})
	api.mux.HandleFunc("/data", func(w http.ResponseWriter, r *http.Request) {
		dataFile := dataFileForLang(r.URL.Query().Get("lang"))
		switch r.Method {
		case http.MethodGet:
			data, err := os.ReadFile(dataFile)
			if err != nil {
				if os.IsNotExist(err) {
					w.WriteHeader(http.StatusNoContent)
					return
				}
				http.Error(w, "failed to read data", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			w.Write(data)
		case http.MethodPost:
			body, err := io.ReadAll(r.Body)
			if err != nil {
				http.Error(w, "failed to read body", http.StatusBadRequest)
				return
			}
			var payload map[string]string
			if err := json.Unmarshal(body, &payload); err != nil {
				http.Error(w, "invalid json", http.StatusBadRequest)
				return
			}
			out, err := json.MarshalIndent(payload, "", "  ")
			if err != nil {
				http.Error(w, "failed to encode data", http.StatusInternalServerError)
				return
			}
			if err := os.WriteFile(dataFile, out, 0644); err != nil {
				http.Error(w, "failed to save data", http.StatusInternalServerError)
				return
			}
			w.WriteHeader(http.StatusNoContent)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})

	if err := http.ListenAndServe(":8080", api.mux); err != nil {
		panic(err)
	}
}

func dataFileForLang(lang string) string {
	switch strings.ToLower(strings.TrimSpace(lang)) {
	case "de":
		return "resume_de.json"
	default:
		return "resume.json"
	}
}
