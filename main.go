package main

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"sort"
	"strings"
)

type api struct {
	mux *http.ServeMux
}

const sharedPhotoFile = "resume_photo.txt"

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
		lang := normalizedLang(r.URL.Query().Get("lang"))
		company := r.URL.Query().Get("company")
		switch r.Method {
		case http.MethodGet:
			dataFile := dataFileForProfile(lang, company)
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
			dataFile := writableDataFileForProfile(lang, company)
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
	api.mux.HandleFunc("/profiles", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		lang := normalizedLang(r.URL.Query().Get("lang"))
		profiles, err := listProfiles(lang)
		if err != nil {
			http.Error(w, "failed to list profiles", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		_ = json.NewEncoder(w).Encode(map[string][]string{
			"profiles": profiles,
		})
	})
	api.mux.HandleFunc("/photo", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			data, err := os.ReadFile(sharedPhotoFile)
			if err != nil {
				if os.IsNotExist(err) {
					w.WriteHeader(http.StatusNoContent)
					return
				}
				http.Error(w, "failed to read photo", http.StatusInternalServerError)
				return
			}
			if len(data) == 0 {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			w.Header().Set("Content-Type", "text/plain; charset=utf-8")
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
			photo := strings.TrimSpace(payload["photo_data"])
			if photo == "" {
				if err := os.Remove(sharedPhotoFile); err != nil && !os.IsNotExist(err) {
					http.Error(w, "failed to clear photo", http.StatusInternalServerError)
					return
				}
				w.WriteHeader(http.StatusNoContent)
				return
			}
			if err := os.WriteFile(sharedPhotoFile, []byte(photo), 0644); err != nil {
				http.Error(w, "failed to save photo", http.StatusInternalServerError)
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

func normalizedLang(lang string) string {
	if strings.EqualFold(strings.TrimSpace(lang), "de") {
		return "de"
	}
	return "en"
}

func dataFileForProfile(lang, company string) string {
	safeCompany := sanitizedCompany(company)
	if safeCompany == "" || safeCompany == "default" {
		if lang == "de" {
			return "resume_de.json"
		}
		return "resume.json"
	}
	canonical := "resume_" + lang + "_" + safeCompany + ".json"
	if _, err := os.Stat(canonical); err == nil {
		return canonical
	}
	dirEntries, err := os.ReadDir(".")
	if err != nil {
		return canonical
	}
	prefix := "resume_" + lang + "_"
	for _, entry := range dirEntries {
		if entry.IsDir() {
			continue
		}
		fileName := entry.Name()
		if !strings.HasPrefix(fileName, prefix) || !strings.HasSuffix(fileName, ".json") {
			continue
		}
		raw := strings.TrimSuffix(strings.TrimPrefix(fileName, prefix), ".json")
		if sanitizedCompany(raw) == safeCompany {
			return fileName
		}
	}
	return canonical
}

func writableDataFileForProfile(lang, company string) string {
	safeCompany := sanitizedCompany(company)
	if safeCompany == "" || safeCompany == "default" {
		if lang == "de" {
			return "resume_de.json"
		}
		return "resume.json"
	}
	return "resume_" + lang + "_" + safeCompany + ".json"
}

func listProfiles(lang string) ([]string, error) {
	entries, err := os.ReadDir(".")
	if err != nil {
		return nil, err
	}
	seen := map[string]bool{
		"default": true,
	}
	prefix := "resume_" + lang + "_"
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		fileName := entry.Name()
		if !strings.HasPrefix(fileName, prefix) || !strings.HasSuffix(fileName, ".json") {
			continue
		}
		raw := strings.TrimSuffix(strings.TrimPrefix(fileName, prefix), ".json")
		safe := sanitizedCompany(raw)
		if safe != "" {
			seen[safe] = true
		}
	}
	list := make([]string, 0, len(seen))
	for p := range seen {
		if p == "default" {
			continue
		}
		list = append(list, p)
	}
	sort.Strings(list)
	return append([]string{"default"}, list...), nil
}

func sanitizedCompany(company string) string {
	s := strings.ToLower(strings.TrimSpace(company))
	s = strings.ReplaceAll(s, " ", "_")
	var b strings.Builder
	lastUnderscore := false
	for _, r := range s {
		isSafe := (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '_' || r == '-'
		if isSafe {
			b.WriteRune(r)
			lastUnderscore = false
			continue
		}
		if !lastUnderscore {
			b.WriteByte('_')
			lastUnderscore = true
		}
	}
	return strings.Trim(b.String(), "_")
}
