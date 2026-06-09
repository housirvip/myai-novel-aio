# myai-novel-aio

AI 小说写作平台 — 前后端一体化项目。

## 项目结构

```
├── frontend/    React + Vite + TypeScript 前端
├── backend/     Go + Gin + GORM 后端
├── Makefile     根级编排命令
├── Dockerfile   多阶段构建（前端 + 后端 → 单镜像）
└── docker-compose.yml
```

## 快速开始

### 前置条件

- Go 1.22+（含 CGO，SQLite 依赖）
- Node.js 20+
- npm

### 本地开发

1. 复制环境配置：
```bash
cp .env.example .env
# 编辑 .env，填写 LLM API Key 等配置
# 开发时将 WEBUI_DIST_PATH 留空（使用 Vite proxy）
```

2. 启动后端（终端 1）：
```bash
cd backend
go run ./cmd/server
# 服务启动在 http://127.0.0.1:3000
```

3. 启动前端（终端 2）：
```bash
cd frontend
npm install
npm run dev
# 开发服务器在 http://127.0.0.1:5173/app/
# API 请求自动代理到 :3000
```

### 生产构建

```bash
make build
# 或使用 Docker
docker compose up --build
```

### 运行测试

```bash
make test
```

## CLI 工具

```bash
cd backend
go run ./cmd/novel --help
```

## License

MIT
