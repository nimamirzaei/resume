package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func withTempWorkdir(t *testing.T) string {
	t.Helper()
	orig, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	tmp := t.TempDir()
	if err := os.Chdir(tmp); err != nil {
		t.Fatalf("chdir temp dir: %v", err)
	}
	t.Cleanup(func() {
		_ = os.Chdir(orig)
	})
	return tmp
}

type responseCapture struct {
	header http.Header
	status int
	body   bytes.Buffer
}

func (r *responseCapture) Header() http.Header {
	if r.header == nil {
		r.header = make(http.Header)
	}
	return r.header
}

func (r *responseCapture) Write(p []byte) (int, error) {
	if r.status == 0 {
		r.status = http.StatusOK
	}
	return r.body.Write(p)
}

func (r *responseCapture) WriteHeader(code int) {
	r.status = code
}

func mustRequest(t *testing.T, a *api, method, target string, body string, want int) ([]byte, http.Header) {
	t.Helper()
	req, err := http.NewRequest(method, target, strings.NewReader(body))
	if err != nil {
		t.Fatalf("new request: %v", err)
	}
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	rec := &responseCapture{}
	a.mux.ServeHTTP(rec, req)
	if rec.status != want {
		t.Fatalf("%s %s: status=%d want=%d body=%s", method, target, rec.status, want, rec.body.String())
	}
	return rec.body.Bytes(), rec.Header()
}

func TestAPIActionsEndToEnd(t *testing.T) {
	withTempWorkdir(t)

	a := newAPI()
	a.registerRoutes()

	// profiles default
	profilesBody, _ := mustRequest(t, a, http.MethodGet, "/profiles?lang=en", "", http.StatusOK)
	if !strings.Contains(string(profilesBody), "default") {
		t.Fatalf("profiles missing default: %s", string(profilesBody))
	}

	// missing profile
	mustRequest(t, a, http.MethodGet, "/data?lang=en&company=qa_auto", "", http.StatusNoContent)

	// save/load profile
	payload := map[string]string{
		"name":             "QA Tester",
		"contact":          "qa.tester@example.com",
		"skills":           "• API test",
		"__style_settings": "{}",
	}
	buf, _ := json.Marshal(payload)
	mustRequest(t, a, http.MethodPost, "/data?lang=en&company=qa_auto", string(buf), http.StatusNoContent)
	dataBody, _ := mustRequest(t, a, http.MethodGet, "/data?lang=en&company=qa_auto", "", http.StatusOK)
	if !strings.Contains(string(dataBody), `"QA Tester"`) || !strings.Contains(string(dataBody), `"qa.tester@example.com"`) {
		t.Fatalf("saved data mismatch: %s", string(dataBody))
	}
	profilesBody, _ = mustRequest(t, a, http.MethodGet, "/profiles?lang=en", "", http.StatusOK)
	if !strings.Contains(string(profilesBody), "qa_auto") {
		t.Fatalf("profiles missing qa_auto: %s", string(profilesBody))
	}

	// photo save/load/clear
	mustRequest(t, a, http.MethodPost, "/photo", `{"photo_data":"data:image/png;base64,QUJD"}`, http.StatusNoContent)
	photoBody, _ := mustRequest(t, a, http.MethodGet, "/photo", "", http.StatusOK)
	if string(photoBody) != "data:image/png;base64,QUJD" {
		t.Fatalf("photo mismatch: %s", string(photoBody))
	}
	mustRequest(t, a, http.MethodPost, "/photo", `{"photo_data":""}`, http.StatusNoContent)
	mustRequest(t, a, http.MethodGet, "/photo", "", http.StatusNoContent)

	// backup download
	backupBody, backupHeaders := mustRequest(t, a, http.MethodGet, "/backup", "", http.StatusOK)
	if !strings.Contains(backupHeaders.Get("Content-Disposition"), `attachment; filename="resume_backup_`) {
		t.Fatalf("backup content-disposition mismatch: %s", backupHeaders.Get("Content-Disposition"))
	}
	var backup backupPayload
	if err := json.Unmarshal(backupBody, &backup); err != nil {
		t.Fatalf("decode backup: %v", err)
	}
	if backup.Version != 1 {
		t.Fatalf("backup version=%d want=1", backup.Version)
	}
	if len(backup.Files) == 0 {
		t.Fatal("backup has no files")
	}

	// restore with injected profile
	backup.Files["resume_en_qa_restore.json"] = `{"name":"Restored QA","contact":"restore@example.com"}`
	modBackup, _ := json.Marshal(backup)
	mustRequest(t, a, http.MethodPost, "/backup", string(modBackup), http.StatusNoContent)
	restoreBody, _ := mustRequest(t, a, http.MethodGet, "/data?lang=en&company=qa_restore", "", http.StatusOK)
	if !strings.Contains(string(restoreBody), `"Restored QA"`) {
		t.Fatalf("restore data mismatch: %s", string(restoreBody))
	}
	if _, err := os.Stat(filepath.Join(".", "resume_en_qa_restore.json")); err != nil {
		t.Fatalf("restored file missing: %v", err)
	}

	// invalid restore path should fail
	invalid := `{"version":1,"files":{"../evil.txt":"bad"}}`
	mustRequest(t, a, http.MethodPost, "/backup", invalid, http.StatusBadRequest)
}
