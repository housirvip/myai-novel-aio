#!/usr/bin/env bash
set -Eeuo pipefail

frontend_pid=""
backend_pid=""

cleanup() {
  local exit_code=$?

  trap - EXIT INT TERM

  if [[ -n "${frontend_pid}" ]] && kill -0 "${frontend_pid}" 2>/dev/null; then
    kill "${frontend_pid}" 2>/dev/null || true
  fi

  if [[ -n "${backend_pid}" ]] && kill -0 "${backend_pid}" 2>/dev/null; then
    kill "${backend_pid}" 2>/dev/null || true
  fi

  wait 2>/dev/null || true
  exit "${exit_code}"
}

trap cleanup EXIT INT TERM

make dev-frontend &
frontend_pid=$!

make dev-backend &
backend_pid=$!

wait -n "${frontend_pid}" "${backend_pid}"
