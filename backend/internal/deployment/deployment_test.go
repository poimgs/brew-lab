package deployment_test

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// projectRoot returns the absolute path to the project root (coffee-tracker/).
func projectRoot(t *testing.T) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("cannot determine test file path")
	}
	// This file is at backend/internal/deployment/deployment_test.go
	// Project root is 3 levels up from the directory containing this file.
	return filepath.Join(filepath.Dir(filename), "..", "..", "..")
}

func readFile(t *testing.T, path string) string {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("cannot read %s: %v", path, err)
	}
	return string(data)
}

func TestBackendDockerfile(t *testing.T) {
	root := projectRoot(t)
	content := readFile(t, filepath.Join(root, "backend", "Dockerfile"))

	t.Run("uses Go 1.25 base image", func(t *testing.T) {
		if !strings.Contains(content, "golang:1.25-alpine") {
			t.Error("backend Dockerfile should use golang:1.25-alpine to match go.mod")
		}
	})

	t.Run("builds server binary", func(t *testing.T) {
		if !strings.Contains(content, "go build -o /server ./cmd/server") {
			t.Error("backend Dockerfile should build the server binary")
		}
	})

	t.Run("builds seed binary", func(t *testing.T) {
		if !strings.Contains(content, "go build -o /seed ./cmd/seed") {
			t.Error("backend Dockerfile should build the seed binary for user creation")
		}
	})

	t.Run("copies migrations", func(t *testing.T) {
		if !strings.Contains(content, "internal/database/migrations") {
			t.Error("backend Dockerfile should copy database migrations")
		}
	})

	t.Run("exposes port 8080", func(t *testing.T) {
		if !strings.Contains(content, "EXPOSE 8080") {
			t.Error("backend Dockerfile should expose port 8080")
		}
	})

	t.Run("uses multi-stage build", func(t *testing.T) {
		if strings.Count(content, "FROM ") < 2 {
			t.Error("backend Dockerfile should use multi-stage build (at least 2 FROM statements)")
		}
	})
}

func TestFrontendDockerfile(t *testing.T) {
	root := projectRoot(t)
	content := readFile(t, filepath.Join(root, "frontend", "Dockerfile"))

	t.Run("uses Node base image", func(t *testing.T) {
		if !strings.Contains(content, "node:") {
			t.Error("frontend Dockerfile should use a Node base image")
		}
	})

	t.Run("runs npm ci for reproducible installs", func(t *testing.T) {
		if !strings.Contains(content, "npm ci") {
			t.Error("frontend Dockerfile should use npm ci for reproducible dependency installation")
		}
	})

	t.Run("runs npm build", func(t *testing.T) {
		if !strings.Contains(content, "npm run build") {
			t.Error("frontend Dockerfile should run npm run build")
		}
	})

	t.Run("copies dist output", func(t *testing.T) {
		if !strings.Contains(content, "/dist") {
			t.Error("frontend Dockerfile should copy /dist output from build stage")
		}
	})

	t.Run("uses multi-stage build", func(t *testing.T) {
		if strings.Count(content, "FROM ") < 2 {
			t.Error("frontend Dockerfile should use multi-stage build (at least 2 FROM statements)")
		}
	})
}

func TestDockerComposeProd(t *testing.T) {
	root := projectRoot(t)
	content := readFile(t, filepath.Join(root, "docker-compose.prod.yml"))

	requiredServices := []string{"db:", "backend:", "frontend:", "caddy:"}
	for _, svc := range requiredServices {
		t.Run("has service "+strings.TrimSuffix(svc, ":"), func(t *testing.T) {
			if !strings.Contains(content, svc) {
				t.Errorf("docker-compose.prod.yml should define %s service", strings.TrimSuffix(svc, ":"))
			}
		})
	}

	t.Run("db uses PostgreSQL 16", func(t *testing.T) {
		if !strings.Contains(content, "postgres:16") {
			t.Error("db service should use PostgreSQL 16")
		}
	})

	t.Run("db has healthcheck", func(t *testing.T) {
		if !strings.Contains(content, "pg_isready") {
			t.Error("db service should have a pg_isready healthcheck")
		}
	})

	t.Run("backend depends on db health", func(t *testing.T) {
		if !strings.Contains(content, "service_healthy") {
			t.Error("backend should depend on db with service_healthy condition")
		}
	})

	t.Run("caddy exposes ports 80 and 443", func(t *testing.T) {
		if !strings.Contains(content, `"80:80"`) || !strings.Contains(content, `"443:443"`) {
			t.Error("caddy service should expose ports 80 and 443")
		}
	})

	t.Run("uses persistent volumes", func(t *testing.T) {
		if !strings.Contains(content, "postgres_data") {
			t.Error("should use persistent volume for PostgreSQL data")
		}
		if !strings.Contains(content, "caddy_data") {
			t.Error("should use persistent volume for Caddy data (TLS certs)")
		}
	})

	t.Run("configures restart policy", func(t *testing.T) {
		if !strings.Contains(content, "restart: unless-stopped") {
			t.Error("services should have restart: unless-stopped policy")
		}
	})

	requiredEnvVars := []string{"DATABASE_URL", "JWT_SECRET", "CADDY_DOMAIN", "DB_PASSWORD"}
	for _, env := range requiredEnvVars {
		t.Run("references env var "+env, func(t *testing.T) {
			if !strings.Contains(content, env) {
				t.Errorf("docker-compose.prod.yml should reference %s environment variable", env)
			}
		})
	}
}

func TestCaddyfile(t *testing.T) {
	root := projectRoot(t)
	content := readFile(t, filepath.Join(root, "Caddyfile"))

	t.Run("uses CADDY_DOMAIN variable", func(t *testing.T) {
		if !strings.Contains(content, "CADDY_DOMAIN") {
			t.Error("Caddyfile should use CADDY_DOMAIN environment variable")
		}
	})

	t.Run("defaults to localhost", func(t *testing.T) {
		if !strings.Contains(content, "localhost") {
			t.Error("Caddyfile should default to localhost when CADDY_DOMAIN is not set")
		}
	})

	t.Run("proxies API to backend", func(t *testing.T) {
		if !strings.Contains(content, "/api/*") {
			t.Error("Caddyfile should proxy /api/* requests")
		}
		if !strings.Contains(content, "reverse_proxy backend:8080") {
			t.Error("Caddyfile should reverse proxy to backend:8080")
		}
	})

	t.Run("proxies health endpoint", func(t *testing.T) {
		if !strings.Contains(content, "/health") {
			t.Error("Caddyfile should proxy /health endpoint")
		}
	})

	t.Run("has SPA fallback", func(t *testing.T) {
		if !strings.Contains(content, "try_files") || !strings.Contains(content, "index.html") {
			t.Error("Caddyfile should have SPA fallback (try_files with index.html)")
		}
	})

	t.Run("caches hashed assets", func(t *testing.T) {
		if !strings.Contains(content, "/assets/*") {
			t.Error("Caddyfile should have cache rules for /assets/*")
		}
		if !strings.Contains(content, "immutable") {
			t.Error("Caddyfile should set immutable cache for hashed assets")
		}
	})

	t.Run("disables caching for service worker", func(t *testing.T) {
		if !strings.Contains(content, "sw.js") {
			t.Error("Caddyfile should reference sw.js for no-cache policy")
		}
		if !strings.Contains(content, "no-cache") {
			t.Error("Caddyfile should set no-cache for service worker files")
		}
	})
}

func TestEnvExample(t *testing.T) {
	root := projectRoot(t)
	content := readFile(t, filepath.Join(root, ".env.example"))

	requiredVars := []string{
		"DB_PASSWORD",
		"DATABASE_URL",
		"JWT_SECRET",
		"ACCESS_TOKEN_TTL",
		"REFRESH_TOKEN_TTL",
		"ENVIRONMENT",
		"CADDY_DOMAIN",
	}

	for _, v := range requiredVars {
		t.Run("documents "+v, func(t *testing.T) {
			if !strings.Contains(content, v) {
				t.Errorf(".env.example should document %s variable", v)
			}
		})
	}

	t.Run("DATABASE_URL references db host", func(t *testing.T) {
		if !strings.Contains(content, "@db:") {
			t.Error(".env.example DATABASE_URL should reference 'db' as host (Docker internal network)")
		}
	})

	t.Run("references production domain", func(t *testing.T) {
		if !strings.Contains(content, "brew-lab.steven-chia.com") {
			t.Error(".env.example should reference the production domain")
		}
	})
}

func TestDockerIgnoreFiles(t *testing.T) {
	root := projectRoot(t)

	t.Run("backend .dockerignore exists", func(t *testing.T) {
		content := readFile(t, filepath.Join(root, "backend", ".dockerignore"))
		if !strings.Contains(content, ".env") {
			t.Error("backend .dockerignore should exclude .env files")
		}
	})

	t.Run("frontend .dockerignore exists", func(t *testing.T) {
		content := readFile(t, filepath.Join(root, "frontend", ".dockerignore"))
		if !strings.Contains(content, "node_modules") {
			t.Error("frontend .dockerignore should exclude node_modules")
		}
		if !strings.Contains(content, ".env") {
			t.Error("frontend .dockerignore should exclude .env files")
		}
	})
}

func TestCreateUserScript(t *testing.T) {
	root := projectRoot(t)
	scriptPath := filepath.Join(root, "scripts", "create-user.sh")

	t.Run("exists", func(t *testing.T) {
		if _, err := os.Stat(scriptPath); os.IsNotExist(err) {
			t.Fatal("scripts/create-user.sh should exist")
		}
	})

	t.Run("is executable", func(t *testing.T) {
		info, err := os.Stat(scriptPath)
		if err != nil {
			t.Fatalf("cannot stat scripts/create-user.sh: %v", err)
		}
		if info.Mode()&0o111 == 0 {
			t.Error("scripts/create-user.sh should be executable")
		}
	})

	t.Run("accepts email and password flags", func(t *testing.T) {
		content := readFile(t, scriptPath)
		if !strings.Contains(content, "-email=") || !strings.Contains(content, "-password=") {
			t.Error("scripts/create-user.sh should accept -email= and -password= flags")
		}
	})

	t.Run("executes seed binary in backend container", func(t *testing.T) {
		content := readFile(t, scriptPath)
		if !strings.Contains(content, "docker compose") || !strings.Contains(content, "backend") || !strings.Contains(content, "seed") {
			t.Error("scripts/create-user.sh should execute seed binary in backend container via docker compose exec")
		}
	})
}

func TestMigrationFiles(t *testing.T) {
	root := projectRoot(t)
	migrationsDir := filepath.Join(root, "backend", "internal", "database", "migrations")

	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		t.Fatalf("cannot read migrations directory: %v", err)
	}

	t.Run("has migration files", func(t *testing.T) {
		if len(entries) == 0 {
			t.Error("migrations directory should contain migration files")
		}
	})

	t.Run("each up migration has a matching down migration", func(t *testing.T) {
		ups := make(map[string]bool)
		downs := make(map[string]bool)
		for _, e := range entries {
			name := e.Name()
			if strings.HasSuffix(name, ".up.sql") {
				prefix := strings.TrimSuffix(name, ".up.sql")
				ups[prefix] = true
			} else if strings.HasSuffix(name, ".down.sql") {
				prefix := strings.TrimSuffix(name, ".down.sql")
				downs[prefix] = true
			}
		}
		for prefix := range ups {
			if !downs[prefix] {
				t.Errorf("migration %s.up.sql has no matching .down.sql", prefix)
			}
		}
		for prefix := range downs {
			if !ups[prefix] {
				t.Errorf("migration %s.down.sql has no matching .up.sql", prefix)
			}
		}
	})
}

func TestDockerComposeDevExists(t *testing.T) {
	root := projectRoot(t)
	content := readFile(t, filepath.Join(root, "docker-compose.yml"))

	t.Run("defines PostgreSQL for local dev", func(t *testing.T) {
		if !strings.Contains(content, "postgres:") {
			t.Error("docker-compose.yml should define a PostgreSQL service for local development")
		}
	})

	t.Run("exposes port 5432", func(t *testing.T) {
		if !strings.Contains(content, "5432") {
			t.Error("docker-compose.yml should expose PostgreSQL port 5432")
		}
	})
}
