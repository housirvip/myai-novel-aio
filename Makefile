.PHONY: help dev-frontend dev-backend dev-tauri build build-frontend build-backend build-tauri test test-frontend test-backend clean clean-tauri docker docker-up docker-down

help:
	@echo "Development:"
	@echo "  make dev-frontend     Run Vite dev server (port 5173)"
	@echo "  make dev-backend      Run Go server (port 3030)"
	@echo "  make dev-tauri        Run Tauri desktop app (dev mode)"
	@echo ""
	@echo "Build:"
	@echo "  make build            Build frontend + backend"
	@echo "  make build-frontend   npm run build"
	@echo "  make build-backend    go build server + cli"
	@echo "  make build-tauri      Build Tauri desktop app"
	@echo ""
	@echo "Test:"
	@echo "  make test             Run all tests"
	@echo "  make test-frontend    Run frontend tests"
	@echo "  make test-backend     Run backend tests"
	@echo ""
	@echo "Docker:"
	@echo "  make docker           Docker build"
	@echo "  make docker-up        Docker compose up"
	@echo "  make docker-down      Docker compose down"
	@echo ""
	@echo "Other:"
	@echo "  make clean            Clean build artifacts"

dev-frontend:
	cd frontend && npm run dev

dev-backend:
	cd backend && go run ./cmd/server

dev-tauri:
	cd tauri && cargo tauri dev

build: build-frontend build-backend

build-frontend:
	cd frontend && npm ci && npm run build

build-backend:
	cd backend && go build -o bin/server ./cmd/server
	cd backend && go build -o bin/novel ./cmd/novel

test: test-frontend test-backend

test-frontend:
	cd frontend && npm test -- --run

test-backend:
	cd backend && go test ./...

clean:
	rm -rf frontend/dist frontend/node_modules
	rm -rf backend/bin

clean-tauri:
	cd tauri && cargo clean
	rm -rf tauri/binaries

build-tauri: build-backend
	@mkdir -p tauri/binaries
	@cp backend/bin/server tauri/binaries/server-$$(rustc -vV | grep host | cut -d' ' -f2)
	cd tauri && cargo tauri build

docker:
	docker build -t myai-novel-aio:dev .

docker-up:
	docker compose up -d --build

docker-down:
	docker compose down -v
