### Stage 1: Build frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

### Stage 2: Build backend
FROM golang:1.22-alpine AS backend-builder
RUN apk add --no-cache build-base git
WORKDIR /src
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
ENV CGO_ENABLED=1 GOOS=linux
RUN go build -ldflags="-s -w" -o /out/server ./cmd/server && \
    go build -ldflags="-s -w" -o /out/novel  ./cmd/novel

### Stage 3: Runtime
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata sqlite-libs && \
    addgroup -S app && adduser -S -G app app

WORKDIR /app
COPY --from=backend-builder /out/server /app/server
COPY --from=backend-builder /out/novel  /app/novel
COPY --from=frontend-builder /build/dist /app/webui
COPY .env.example /app/.env.example

RUN mkdir -p /app/data /app/logs && chown -R app:app /app
USER app

ENV WEBUI_DIST_PATH=/app/webui
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:3000/health || exit 1

ENTRYPOINT ["/app/server"]
