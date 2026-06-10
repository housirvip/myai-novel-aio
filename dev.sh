#!/usr/bin/env bash
# 一键启动开发环境:Go 后端 (127.0.0.1:3030) + Vite 前端 (127.0.0.1:5173)
# 用法: ./dev.sh [--install]
#   --install   启动前重新安装前端依赖 (npm install)
#   -h|--help   显示帮助

set -euo pipefail
set -m  # 启用 job control,使每个后台任务成为独立进程组(便于一并清理 go run 的子进程)

# ===== bash 版本 =====
if (( BASH_VERSINFO[0] < 4 || (BASH_VERSINFO[0] == 4 && BASH_VERSINFO[1] < 3) )); then
  echo "需要 bash >= 4.3 (当前 ${BASH_VERSION})" >&2
  exit 1
fi

# ===== 配置 =====
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

BACKEND_HOST="127.0.0.1"
BACKEND_PORT="3030"        # ← 不要改,frontend/vite.config.ts 的 proxy 钉死了 3030
FRONTEND_PORT="5173"       #   仅用于占用检查/打印 URL,真实端口由 vite.config.ts 决定
HEALTH_URL="http://${BACKEND_HOST}:${BACKEND_PORT}/health"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-60}"  # 后端就绪等待秒数(首次 go build 会久些)

# ===== 颜色 =====
if [[ -t 1 ]]; then
  CYAN=$'\033[36m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'
  RED=$'\033[31m'; BLUE=$'\033[34m'; MAGENTA=$'\033[35m'
  BOLD=$'\033[1m'; RESET=$'\033[0m'
else
  CYAN=; GREEN=; YELLOW=; RED=; BLUE=; MAGENTA=; BOLD=; RESET=
fi

log()  { printf '%s%s[dev]%s %s\n' "$BOLD" "$CYAN"   "$RESET" "$*"; }
warn() { printf '%s%s[dev]%s %s\n' "$BOLD" "$YELLOW" "$RESET" "$*" >&2; }
die()  { printf '%s%s[dev]%s %s\n' "$BOLD" "$RED"    "$RESET" "$*" >&2; exit 1; }

usage() {
  cat <<EOF
用法: $(basename "$0") [--install]

启动 Go 后端 (${BACKEND_HOST}:${BACKEND_PORT}) 和 Vite 前端 (${BACKEND_HOST}:${FRONTEND_PORT})。

选项:
  --install   启动前重新安装前端依赖 (npm install)
  -h, --help  显示此帮助

环境:
  HEALTH_TIMEOUT  后端 /health 就绪等待秒数 (默认 60)
EOF
}

# ===== 参数 =====
DO_INSTALL=0
for arg in "$@"; do
  case "$arg" in
    --install)  DO_INSTALL=1 ;;
    -h|--help)  usage; exit 0 ;;
    *)          die "未知参数: $arg (用 --help 查看用法)" ;;
  esac
done

# ===== 依赖检查 =====
command -v go   >/dev/null 2>&1 || die "未找到 go,请先安装 Go (项目要求 >= 1.26.3)"
command -v node >/dev/null 2>&1 || die "未找到 node,请先安装 Node.js"
command -v npm  >/dev/null 2>&1 || die "未找到 npm"

# ===== 端口占用检查 =====
port_busy() {
  local p="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -tlnH 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]${p}$"
  elif command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$p" -sTCP:LISTEN -P -n >/dev/null 2>&1
  else
    # 退化:用 /dev/tcp 探测
    (echo > "/dev/tcp/127.0.0.1/${p}") >/dev/null 2>&1
  fi
}
port_busy "$BACKEND_PORT"  && die "端口 $BACKEND_PORT (后端) 已被占用,请先释放"
port_busy "$FRONTEND_PORT" && die "端口 $FRONTEND_PORT (前端) 已被占用,请先释放"

# ===== 准备 =====
mkdir -p "$BACKEND_DIR/data" "$BACKEND_DIR/logs"

# 首次:复制 .env(不存在则从 .env.example 拷一份)
if [[ ! -f "$BACKEND_DIR/.env" && -f "$BACKEND_DIR/.env.example" ]]; then
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
  log "已创建 backend/.env (复制自 .env.example)"
fi

# 前端依赖
if [[ "$DO_INSTALL" -eq 1 || ! -d "$FRONTEND_DIR/node_modules" ]]; then
  log "安装前端依赖 (npm install)..."
  ( cd "$FRONTEND_DIR" && npm install --no-fund --no-audit )
fi

# ===== 清理逻辑 =====
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  local code=$?
  trap - INT TERM EXIT
  echo
  log "停止服务..."
  # set -m 下,每个后台任务都是独立进程组组长 → kill -- -PID 杀整组(go run 的编译产物也会一起走)
  for pid in "$BACKEND_PID" "$FRONTEND_PID"; do
    [[ -n "$pid" ]] || continue
    kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
  done
  # 给最多 3s 优雅退出
  for _ in $(seq 1 10); do
    local alive=0
    for pid in "$BACKEND_PID" "$FRONTEND_PID"; do
      [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null && alive=1
    done
    [[ $alive -eq 0 ]] && break
    sleep 0.3
  done
  # 兜底 KILL
  for pid in "$BACKEND_PID" "$FRONTEND_PID"; do
    [[ -n "$pid" ]] || continue
    kill -KILL -- "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
  done
  log "已停止"
  exit "$code"
}
trap cleanup INT TERM EXIT

# 行前缀着色 (awk 比 sed -u/-l 更可移植)
pfx() {
  local color="$1" label="$2"
  awk -v c="$color" -v l="$label" -v r="$RESET" '{ printf "%s[%s]%s %s\n", c, l, r, $0; fflush() }'
}

# ===== 启动后端 =====
# 关键:用 process substitution (`> >(pfx …)`),让 exec 后的 go 进程本体成为
# $! 的目标 + 进程组 leader。若改回 `{ … } | pfx &`,$! 会指向 pipeline 尾端的
# awk,清理时杀不掉 go run 编译产物。
log "启动后端 (Go) → ${HEALTH_URL}"
( cd "$BACKEND_DIR" && exec env \
    SERVER_HOST="$BACKEND_HOST" \
    SERVER_PORT="$BACKEND_PORT" \
    go run ./cmd/server \
) > >(pfx "$BLUE" "backend ") 2>&1 &
BACKEND_PID=$!

# 等 /health 就绪
log "等待后端就绪 (最多 ${HEALTH_TIMEOUT}s,首次会编译)..."
ready=0
deadline=$(( SECONDS + HEALTH_TIMEOUT ))
while (( SECONDS < deadline )); do
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    die "后端进程提前退出,请查看上方日志"
  fi
  if command -v curl >/dev/null 2>&1; then
    curl -fsS -o /dev/null --max-time 1 "$HEALTH_URL" 2>/dev/null && { ready=1; break; }
  elif command -v wget >/dev/null 2>&1; then
    wget -qO- --timeout=1 --tries=1 "$HEALTH_URL" >/dev/null 2>&1 && { ready=1; break; }
  else
    (echo > "/dev/tcp/${BACKEND_HOST}/${BACKEND_PORT}") 2>/dev/null && { ready=1; break; }
  fi
  sleep 0.5
done
if [[ $ready -ne 1 ]]; then
  warn "后端在 ${HEALTH_TIMEOUT}s 内未就绪,仍尝试启动前端 (可手动 Ctrl+C 中止)"
else
  log "${GREEN}后端就绪 ✓${RESET}"
fi

# ===== 启动前端 =====
log "启动前端 (Vite) → http://${BACKEND_HOST}:${FRONTEND_PORT}/app/"
( cd "$FRONTEND_DIR" && exec npm run dev ) \
  > >(pfx "$MAGENTA" "frontend") 2>&1 &
FRONTEND_PID=$!

cat <<EOF

${BOLD}${GREEN}✔ 全部启动完成${RESET}
  ${BOLD}前端${RESET}  http://${BACKEND_HOST}:${FRONTEND_PORT}/app/
  ${BOLD}后端${RESET}  http://${BACKEND_HOST}:${BACKEND_PORT}/
  ${BOLD}健康${RESET}  ${HEALTH_URL}

按 ${BOLD}Ctrl+C${RESET} 停止全部服务。

EOF

# 任一子进程退出 → 触发 trap 清理另一个
wait -n
warn "检测到有服务退出,正在停止剩余服务..."
