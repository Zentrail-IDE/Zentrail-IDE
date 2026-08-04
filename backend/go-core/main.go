// Command zentrail-core is the Go backend for Zentrail IDE (Phase 1: Foundation).
//
// Phase 1 brings up the process, configuration system, and a minimal HTTP
// surface (health + WebSocket echo) that the Tauri desktop shell can talk to.
// gRPC and SQLite persistence are introduced in later phases.
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"dev.zentrail/go-core/internal/config"
	"dev.zentrail/go-core/internal/server"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	srv := server.New(cfg)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	go func() {
		addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
		log.Printf("zentrail-core listening on %s", addr)
		if err := srv.ListenAndServe(addr); err != nil {
			log.Printf("server stopped: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("shutting down…")
	if err := srv.Shutdown(context.Background()); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
		os.Exit(1)
	}
}
