package config

import (
	"fmt"
	"os"
	"strconv"
)

// Config holds the runtime configuration for the Go core service.
//
// Values are sourced from environment variables with sensible defaults so the
// service works out-of-the-box during Phase 1 and can be overridden per
// environment later. Central ports/paths live here — never hard-code them in
// app code.
type Config struct {
	Host    string
	Port    int
	Env     string
	DataDir string
}

// Load reads configuration from the environment.
func Load() (*Config, error) {
	cfg := &Config{
		Host:    getEnv("ZENTRAIL_HOST", "127.0.0.1"),
		Port:    getEnvInt("ZENTRAIL_PORT", 7341),
		Env:     getEnv("ZENTRAIL_ENV", "development"),
		DataDir: getEnv("ZENTRAIL_DATA_DIR", ".data"),
	}

	if cfg.Port < 1 || cfg.Port > 65535 {
		return nil, fmt.Errorf("ZENTRAIL_PORT %d out of range", cfg.Port)
	}
	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}
