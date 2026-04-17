#!/usr/bin/env bash
#
# @fileoverview
#   Exposes local Ollama on a public HTTPS URL so Cursor can use an OpenAI-compatible
#   base URL. Cursor blocks private IPs (localhost) with ssrf_blocked; traffic must use
#   a public hostname (ngrok or Cloudflare quick tunnel).
#
# @module scripts/cursor-ollama-bridge
#
# @brief
#   Starts a background tunnel, writes ~/.cursor-ollama-bridge/openai_base_url.txt,
#   copies the base URL to the clipboard (macOS), and optionally verifies /v1/models.
#
# @param CLI
#   start | stop | status | setup-ngrok
#
# @note
#   Ollama rejects requests whose Host is the public tunnel hostname (HTTP 403). For
#   Cloudflare quick tunnels, cloudflared must pass --http-host-header (e.g. localhost:11434).
#   Prefer ngrok when an authtoken is configured (env, token file, or ngrok.yml).
#   trycloudflare DNS can lag a few seconds after the URL is printed; start retries verification.
#
# @example
#   ./scripts/cursor-ollama-bridge.sh setup-ngrok
#   ./scripts/cursor-ollama-bridge.sh start
#   ./scripts/cursor-ollama-bridge.sh status
#   ./scripts/cursor-ollama-bridge.sh stop
#

set -euo pipefail

readonly STATE_DIR="${HOME}/.cursor-ollama-bridge"
readonly TUNNEL_PID_FILE="${STATE_DIR}/tunnel.pid"
readonly TUNNEL_PROVIDER_FILE="${STATE_DIR}/tunnel.provider"
readonly LOG_FILE="${STATE_DIR}/tunnel.log"
readonly BASE_URL_FILE="${STATE_DIR}/openai_base_url.txt"
readonly TOKEN_FILE="${STATE_DIR}/ngrok_authtoken"
readonly NGROK_YML="${HOME}/Library/Application Support/ngrok/ngrok.yml"
readonly OLLAMA_URL="${OLLAMA_URL:-http://127.0.0.1:11434}"

# @brief Extracts TCP port from OLLAMA_URL (defaults to 11434).
# @returns Prints port digits on stdout.
ollama_port() {
  if [[ "${OLLAMA_URL}" =~ :([0-9]+)(/|$) ]]; then
    echo "${BASH_REMATCH[1]}"
  else
    echo "11434"
  fi
}

# @brief Host:port to send to the local Ollama HTTP server (rewrites public tunnel Host).
# @note Ollama returns 403 when Host is the trycloudflare hostname; cloudflared must set Host to the origin.
# @returns Prints value suitable for cloudflared --http-host-header.
cloudflared_http_host_header() {
  local rest host port hostport
  rest="${OLLAMA_URL#http://}"
  rest="${rest#https://}"
  hostport="${rest%%/*}"
  host="${hostport%%:*}"
  port="${hostport#*:}"
  if [[ "${port}" == "${host}" ]]; then
    port="11434"
  fi
  if [[ "${host}" == "127.0.0.1" ]]; then
    printf 'localhost:%s' "${port}"
  else
    printf '%s' "${hostport}"
  fi
}

# @brief Resolves cloudflared binary path.
# @returns Prints path or exits 1 on stderr.
resolve_cloudflared() {
  if command -v cloudflared >/dev/null 2>&1; then
    command -v cloudflared
    return 0
  fi
  if [[ -x /opt/homebrew/bin/cloudflared ]]; then
    echo /opt/homebrew/bin/cloudflared
    return 0
  fi
  echo "cloudflared not found. Install with: brew install cloudflared" >&2
  return 1
}

# @brief Resolves ngrok binary path.
# @returns Prints path or exits 1 on stderr.
resolve_ngrok() {
  if command -v ngrok >/dev/null 2>&1; then
    command -v ngrok
    return 0
  fi
  if [[ -x /opt/homebrew/bin/ngrok ]]; then
    echo /opt/homebrew/bin/ngrok
    return 0
  fi
  echo "ngrok not found. Install with: brew install ngrok/ngrok/ngrok" >&2
  return 1
}

# @brief Returns 0 if Ollama responds on OLLAMA_URL.
# @returns 0 if healthy, non-zero otherwise.
ollama_healthy() {
  curl -fsS "${OLLAMA_URL}/v1/models" >/dev/null 2>&1
}

# @brief Resolves ngrok authtoken from env, token file, or ngrok.yml.
# @returns Prints token or empty string.
resolve_ngrok_authtoken() {
  if [[ -n "${NGROK_AUTHTOKEN:-}" ]]; then
    printf '%s' "${NGROK_AUTHTOKEN}"
    return 0
  fi
  if [[ -f "${TOKEN_FILE}" ]]; then
    local line
    line="$(grep -vE '^[[:space:]]*(#|$)' "${TOKEN_FILE}" | head -1 | tr -d '\r\n' || true)"
    if [[ -n "${line}" ]]; then
      printf '%s' "${line}"
      return 0
    fi
  fi
  if [[ -f "${NGROK_YML}" ]]; then
    local tok
    tok="$(grep -E '^[[:space:]]*authtoken:[[:space:]]*' "${NGROK_YML}" 2>/dev/null | head -1 | sed -E 's/^[[:space:]]*authtoken:[[:space:]]*//; s/[[:space:]]*#.*$//; s/^[\"'\'']|[\"'\'']$//g' || true)"
    if [[ -n "${tok}" ]]; then
      printf '%s' "${tok}"
      return 0
    fi
  fi
  return 1
}

# @brief Chooses tunnel provider: ngrok if token exists, else cloudflared unless forced.
# @returns Prints ngrok or cloudflared on stdout.
choose_provider() {
  if [[ "${CURSOR_TUNNEL_PROVIDER:-}" == "cloudflared" ]]; then
    echo cloudflared
    return 0
  fi
  if [[ "${CURSOR_TUNNEL_PROVIDER:-}" == "ngrok" ]]; then
    echo ngrok
    return 0
  fi
  local t
  t="$(resolve_ngrok_authtoken 2>/dev/null || true)"
  if [[ -n "${t}" ]]; then
    echo ngrok
    return 0
  fi
  echo cloudflared
}

# @brief Stops legacy cloudflared.pid if present.
# @returns Always 0.
stop_legacy_cloudflared_pid() {
  local legacy="${STATE_DIR}/cloudflared.pid"
  if [[ -f "${legacy}" ]]; then
    local pid
    pid="$(cat "${legacy}" || true)"
    if [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null; then
      kill "${pid}" 2>/dev/null || true
      sleep 1
      kill -9 "${pid}" 2>/dev/null || true
    fi
    rm -f "${legacy}"
  fi
}

# @brief Stops running tunnel process recorded in state files.
# @param $1 Pass "quiet" to suppress the confirmation line.
# @returns Always 0.
stop_tunnel() {
  local quiet="${1:-}"
  mkdir -p "${STATE_DIR}"
  stop_legacy_cloudflared_pid
  if [[ -f "${TUNNEL_PID_FILE}" ]]; then
    local pid
    pid="$(cat "${TUNNEL_PID_FILE}" || true)"
    if [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null; then
      kill "${pid}" 2>/dev/null || true
      sleep 1
      kill -9 "${pid}" 2>/dev/null || true
    fi
    rm -f "${TUNNEL_PID_FILE}"
  fi
  rm -f "${TUNNEL_PROVIDER_FILE}" "${BASE_URL_FILE}"
  if [[ "${quiet}" != "quiet" ]]; then
    echo "Tunnel stopped."
  fi
}

# @brief Waits for trycloudflare hostname in cloudflared log.
# @param $1 Max seconds to wait.
# @returns Prints origin URL on success.
wait_for_trycloudflare_url() {
  local wait_secs="${1:-60}"
  local i=0
  while (( i < wait_secs )); do
    if [[ -f "${LOG_FILE}" ]]; then
      local url
      url="$(grep -Eo 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' "${LOG_FILE}" 2>/dev/null | head -1 || true)"
      if [[ -n "${url}" ]]; then
        echo "${url}"
        return 0
      fi
    fi
    sleep 1
    (( i++ )) || true
  done
  return 1
}

# @brief Waits for ngrok local API and returns first HTTPS public URL.
# @param $1 Max seconds to wait.
# @returns Prints origin URL (https://…) on success.
wait_for_ngrok_public_url() {
  local wait_secs="${1:-45}"
  local tmp="${STATE_DIR}/ngrok-tunnels.json"
  local i=0
  while (( i < wait_secs )); do
    if curl -fsS "http://127.0.0.1:4040/api/tunnels" >"${tmp}" 2>/dev/null; then
      local origin
      origin="$(python3 - "${tmp}" <<'PY' 2>/dev/null || true
import json, sys
path = sys.argv[1]
with open(path, encoding="utf-8") as f:
    d = json.load(f)
for t in d.get("tunnels", []):
    u = t.get("public_url") or ""
    if u.startswith("https:"):
        print(u)
        break
PY
)"
      if [[ -n "${origin}" ]]; then
        echo "${origin}"
        return 0
      fi
    fi
    sleep 1
    (( i++ )) || true
  done
  return 1
}

# @brief GET /v1/models through public base URL (Bearer ollama); stdout is response body.
# @param $1 Full base URL including /v1 suffix.
# @returns 0 on HTTP 200 from Ollama through the tunnel.
curl_public_models() {
  local base="$1"
  if curl -fsS -H "Authorization: Bearer ollama" "${base}/models" 2>/dev/null; then
    return 0
  fi
  if [[ "${base}" != https://* ]]; then
    return 1
  fi
  local origin host ip
  origin="${base#https://}"
  origin="${origin%/v1}"
  host="${origin%%/*}"
  if ! command -v dig >/dev/null 2>&1; then
    return 1
  fi
  ip="$(dig +short "${host}" @8.8.8.8 2>/dev/null | grep -E '^[0-9.]+$' | head -1 || true)"
  if [[ -z "${ip}" ]]; then
    return 1
  fi
  curl -fsS --resolve "${host}:443:${ip}" -H "Authorization: Bearer ollama" "${base}/models" 2>/dev/null || return 1
}

# @brief Verifies OpenAI-compatible /v1/models through public base URL.
# @param $1 Full base URL including /v1 suffix.
# @returns 0 if HTTP 200 and JSON object returned.
verify_public_base_url() {
  local base="$1"
  curl_public_models "${base}" >/dev/null 2>&1
}

# @brief Prints Cursor API key fields to configure after tunnel is up.
# @param $1 OpenAI base URL (…/v1).
# @returns Always 0.
print_cursor_instructions() {
  local base_url="$1"
  echo ""
  echo "Cursor → Settings → API Keys:"
  echo "  1) OpenAI API Key: ON, value: ollama"
  echo "  2) Override OpenAI Base URL: ON, value: ${base_url}"
  echo "  3) Models: add custom model id exactly: qwen2.5-coder:latest"
  echo ""
}

# @brief Starts ngrok HTTP tunnel to local Ollama.
# @returns 0 on success.
start_ngrok_tunnel() {
  local ngrok_bin token port
  ngrok_bin="$(resolve_ngrok)" || exit 1
  token="$(resolve_ngrok_authtoken 2>/dev/null || true)"
  if [[ -z "${token}" ]]; then
    echo "No ngrok authtoken found. Run: $0 setup-ngrok" >&2
    exit 1
  fi
  port="$(ollama_port)"

  stop_tunnel quiet >/dev/null 2>&1 || true
  mkdir -p "${STATE_DIR}"
  chmod 700 "${STATE_DIR}" 2>/dev/null || true
  : >"${LOG_FILE}"

  echo "Starting ngrok → ${OLLAMA_URL} (port ${port}) …"
  nohup "${ngrok_bin}" http "${port}" \
    --authtoken "${token}" \
    --log="${LOG_FILE}" \
    --log-format=json \
    >/dev/null 2>&1 &
  echo $! >"${TUNNEL_PID_FILE}"
  printf '%s' "ngrok" >"${TUNNEL_PROVIDER_FILE}"

  local origin
  if ! origin="$(wait_for_ngrok_public_url 60)"; then
    echo "Timed out waiting for ngrok public URL. See: ${LOG_FILE}" >&2
    stop_tunnel quiet >/dev/null 2>&1 || true
    exit 1
  fi

  local base_url="${origin}/v1"
  printf '%s' "${base_url}" >"${BASE_URL_FILE}"

  if verify_public_base_url "${base_url}"; then
    echo "Verified: ${base_url}/models"
  else
    echo "Warning: could not verify ${base_url}/models from this machine (ngrok interstitial or network). Cursor may still work." >&2
  fi

  if command -v pbcopy >/dev/null 2>&1; then
    printf '%s' "${base_url}" | pbcopy
    echo "Copied to clipboard: ${base_url}"
  else
    echo "OpenAI base URL: ${base_url}"
  fi

  print_cursor_instructions "${base_url}"
  echo "State: pid $(cat "${TUNNEL_PID_FILE}"), provider ngrok, log ${LOG_FILE}"
  echo "Stop with: $0 stop"
}

# @brief Starts Cloudflare quick tunnel to local Ollama.
# @returns 0 on success.
start_cloudflared_tunnel() {
  local cf origin
  cf="$(resolve_cloudflared)" || exit 1

  stop_tunnel quiet >/dev/null 2>&1 || true
  mkdir -p "${STATE_DIR}"
  : >"${LOG_FILE}"

  local host_header
  host_header="$(cloudflared_http_host_header)"
  echo "Starting Cloudflare quick tunnel → ${OLLAMA_URL} (Host → ${host_header}) …"
  nohup "${cf}" tunnel --url "${OLLAMA_URL}" --http-host-header "${host_header}" >>"${LOG_FILE}" 2>&1 &
  echo $! >"${TUNNEL_PID_FILE}"
  printf '%s' "cloudflared" >"${TUNNEL_PROVIDER_FILE}"

  if ! origin="$(wait_for_trycloudflare_url 60)"; then
    echo "Timed out waiting for trycloudflare URL. See: ${LOG_FILE}" >&2
    stop_tunnel quiet >/dev/null 2>&1 || true
    exit 1
  fi

  local base_url="${origin}/v1"
  printf '%s' "${base_url}" >"${BASE_URL_FILE}"

  # Quick Tunnel hostname can appear in logs before global DNS answers; retry briefly.
  local ok=0
  local attempt
  for (( attempt = 0; attempt < 25; attempt++ )); do
    if verify_public_base_url "${base_url}"; then
      ok=1
      break
    fi
    sleep 1
  done
  if [[ "${ok}" -eq 1 ]]; then
    echo "Verified: ${base_url}/models"
  else
    echo "Warning: could not verify ${base_url}/models after 25s. Check Ollama and ${LOG_FILE}. Try ngrok: $0 setup-ngrok" >&2
  fi

  if command -v pbcopy >/dev/null 2>&1; then
    printf '%s' "${base_url}" | pbcopy
    echo "Copied to clipboard: ${base_url}"
  else
    echo "OpenAI base URL: ${base_url}"
  fi

  print_cursor_instructions "${base_url}"
  echo "State: pid $(cat "${TUNNEL_PID_FILE}"), provider cloudflared, log ${LOG_FILE}"
  echo "Stop with: $0 stop"
}

# @brief Entry: picks provider and starts tunnel.
# @returns 0 on success.
start_tunnel() {
  if ! ollama_healthy; then
    echo "Ollama is not reachable at ${OLLAMA_URL}. Start it with: brew services start ollama" >&2
    exit 1
  fi

  local provider
  provider="$(choose_provider)"
  if [[ "${provider}" == "ngrok" ]]; then
    if [[ -z "$(resolve_ngrok_authtoken 2>/dev/null || true)" ]]; then
      echo "CURSOR_TUNNEL_PROVIDER=ngrok was set but no authtoken found. Run: $0 setup-ngrok" >&2
      exit 1
    fi
    start_ngrok_tunnel
  else
    start_cloudflared_tunnel
  fi
}

# @brief Prints tunnel status and probes /v1/models.
# @returns 0 if tunnel process is alive.
status_tunnel() {
  if [[ ! -f "${TUNNEL_PID_FILE}" ]]; then
    echo "No tunnel running. Run: $0 start"
    exit 1
  fi
  local pid provider
  pid="$(cat "${TUNNEL_PID_FILE}")"
  provider="$(cat "${TUNNEL_PROVIDER_FILE}" 2>/dev/null || echo unknown)"
  if ! kill -0 "${pid}" 2>/dev/null; then
    echo "Tunnel pid ${pid} is not running. Run: $0 start"
    exit 1
  fi
  echo "Tunnel running (pid ${pid}, provider ${provider})."
  if [[ -f "${BASE_URL_FILE}" ]]; then
    local bu
    bu="$(cat "${BASE_URL_FILE}")"
    echo "Saved base URL: ${bu}"
    echo "Probing ${bu}/models …"
    curl_public_models "${bu}" | head -c 500 || echo "(probe failed)"
    echo ""
  fi
}

# @brief Opens ngrok dashboard and explains one-time token file setup.
# @returns Always 0.
setup_ngrok() {
  mkdir -p "${STATE_DIR}"
  chmod 700 "${STATE_DIR}" 2>/dev/null || true
  if command -v open >/dev/null 2>&1; then
    open "https://dashboard.ngrok.com/get-started/your-authtoken" || true
  fi
  cat <<EOF

One-time ngrok authtoken (free tier is fine):

  1) Sign in at ngrok and copy your authtoken.
  2) Save it to a single line in this file (no quotes, no spaces):
       ${TOKEN_FILE}
  3) Run: chmod 600 "${TOKEN_FILE}"
  4) Run: $0 start

The script prefers ngrok whenever that token is available (env NGROK_AUTHTOKEN,
${TOKEN_FILE}, or authtoken in ${NGROK_YML}).

EOF
}

cmd="${1:-}"
case "${cmd}" in
  start) start_tunnel ;;
  stop) stop_tunnel ;;
  status) status_tunnel ;;
  setup-ngrok) setup_ngrok ;;
  *)
    echo "Usage: $0 {start|stop|status|setup-ngrok}" >&2
    exit 2
    ;;
esac
