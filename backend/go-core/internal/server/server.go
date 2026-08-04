package server

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"dev.zentrail/go-core/internal/config"

	"github.com/gorilla/websocket"
)

// Server is the Go core HTTP/WebSocket surface for Phase 1.
type Server struct {
	cfg    *config.Config
	mux    *http.ServeMux
	http   *http.Server
	upgrader websocket.Upgrader
}

// New builds a Server from configuration.
func New(cfg *config.Config) *Server {
	mux := http.NewServeMux()
	s := &Server{
		cfg: cfg,
		mux: mux,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true }, // tightened in a later phase
		},
	}

	mux.HandleFunc("/healthz", s.handleHealth)
	mux.HandleFunc("/ws", s.handleWebSocket)
	return s
}

// ListenAndServe starts the HTTP server (blocking).
func (s *Server) ListenAndServe(addr string) error {
	s.http = &http.Server{
		Addr:              addr,
		Handler:           s.mux,
		ReadHeaderTimeout: 10 * time.Second,
	}
	return s.http.ListenAndServe()
}

// Shutdown gracefully stops the server.
func (s *Server) Shutdown(ctx context.Context) error {
	if s.http == nil {
		return nil
	}
	return s.http.Shutdown(ctx)
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"status": "ok",
		"env":    s.cfg.Env,
		"dataDir": s.cfg.DataDir,
	})
}

// handleWebSocket is a Phase 1 echo endpoint proving the realtime channel works.
// It will be replaced by agent/event routing in later phases.
func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("ws upgrade: %v", err)
		return
	}
	defer conn.Close()

	for {
		mt, msg, err := conn.ReadMessage()
		if err != nil {
			return
		}
		if err := conn.WriteMessage(mt, msg); err != nil {
			return
		}
	}
}
