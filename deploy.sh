#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$ROOT_DIR/.tmp-run"
LOG_DIR="$ROOT_DIR/logs"
PID_FILE="$RUN_DIR/ai-game.pid"
OUT_LOG="$RUN_DIR/server.out.log"
ERR_LOG="$RUN_DIR/server.err.log"
ENV_FILE="$ROOT_DIR/.env"
ENV_EXAMPLE="$ROOT_DIR/.env.example"

HOST_VALUE="${HOST:-0.0.0.0}"
PORT_VALUE="${PORT:-3000}"
WS_PORT_VALUE="${WS_PORT:-3001}"
API_BASE_URL_VALUE="${API_BASE_URL:-}"
API_KEY_VALUE="${API_KEY:-}"
API_MODEL_VALUE="${API_MODEL:-}"

ensure_env_file() {
  if [[ ! -f "$ENV_FILE" ]]; then
    if [[ -f "$ENV_EXAMPLE" ]]; then
      cp "$ENV_EXAMPLE" "$ENV_FILE"
    else
      touch "$ENV_FILE"
    fi
  fi
}

upsert_env() {
  local key="$1"
  local value="$2"

  if grep -qE "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

ensure_runtime_dirs() {
  mkdir -p "$RUN_DIR" "$LOG_DIR" "$ROOT_DIR/data"
}

ensure_node() {
  if ! command -v node >/dev/null 2>&1; then
    echo "未检测到 node，请先安装 Node.js 18+"
    exit 1
  fi

  if ! command -v npm >/dev/null 2>&1; then
    echo "未检测到 npm，请先安装 npm"
    exit 1
  fi
}

stop_existing() {
  if [[ -f "$PID_FILE" ]]; then
    local old_pid
    old_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [[ -n "${old_pid}" ]] && kill -0 "$old_pid" >/dev/null 2>&1; then
      kill "$old_pid" >/dev/null 2>&1 || true
      sleep 2
      if kill -0 "$old_pid" >/dev/null 2>&1; then
        kill -9 "$old_pid" >/dev/null 2>&1 || true
      fi
    fi
    rm -f "$PID_FILE"
  fi
}

install_deps() {
  if [[ -f "$ROOT_DIR/package-lock.json" ]]; then
    npm ci --omit=dev
  else
    npm install --omit=dev
  fi
}

read_env_value() {
  local key="$1"
  grep -E "^${key}=" "$ENV_FILE" | tail -n 1 | cut -d'=' -f2-
}

validate_env() {
  local current_api_base_url
  local current_api_key
  local current_api_model

  if [[ -n "$API_BASE_URL_VALUE" ]]; then
    upsert_env "API_BASE_URL" "$API_BASE_URL_VALUE"
  fi

  if [[ -n "$API_KEY_VALUE" ]]; then
    upsert_env "API_KEY" "$API_KEY_VALUE"
  fi

  if [[ -n "$API_MODEL_VALUE" ]]; then
    upsert_env "API_MODEL" "$API_MODEL_VALUE"
  fi

  current_api_base_url="$(read_env_value "API_BASE_URL")"
  current_api_key="$(read_env_value "API_KEY")"
  current_api_model="$(read_env_value "API_MODEL")"

  if [[ -z "$current_api_base_url" || "$current_api_base_url" == "http://localhost:8000" ]]; then
    echo "API_BASE_URL 未正确配置。"
    echo "请先在 .env 中写入真实模型地址，或执行："
    echo "API_BASE_URL=http://your-api-host:port API_KEY=your_key bash deploy.sh"
    exit 1
  fi

  if [[ -z "$current_api_key" || "$current_api_key" == "your_api_key_here" ]]; then
    echo "API_KEY 未正确配置。"
    echo "请先在 .env 中写入真实 API_KEY，或执行："
    echo "API_BASE_URL=http://your-api-host:port API_KEY=your_key bash deploy.sh"
    exit 1
  fi

  if [[ -z "$current_api_model" ]]; then
    upsert_env "API_MODEL" "gpt-5.2"
  fi
}

start_server() {
  cd "$ROOT_DIR"
  nohup npm start >> "$OUT_LOG" 2>> "$ERR_LOG" &
  local pid=$!
  echo "$pid" > "$PID_FILE"
  sleep 3

  if ! kill -0 "$pid" >/dev/null 2>&1; then
    echo "启动失败，请检查日志："
    echo "  $OUT_LOG"
    echo "  $ERR_LOG"
    exit 1
  fi
}

print_result() {
  local ip
  ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  echo "部署完成"
  echo "PID: $(cat "$PID_FILE")"
  echo "HTTP: http://${ip:-127.0.0.1}:${PORT_VALUE}"
  echo "WS: ws://${ip:-127.0.0.1}:${PORT_VALUE}/ws"
  echo "HOST: ${HOST_VALUE}"
  echo "日志:"
  echo "  $OUT_LOG"
  echo "  $ERR_LOG"
}

main() {
  ensure_node
  ensure_runtime_dirs
  ensure_env_file
  upsert_env "HOST" "$HOST_VALUE"
  upsert_env "PORT" "$PORT_VALUE"
  upsert_env "WS_PORT" "$WS_PORT_VALUE"
  validate_env
  install_deps
  stop_existing
  start_server
  print_result
}

main "$@"
