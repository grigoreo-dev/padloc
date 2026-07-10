#!/usr/bin/env bash
# Orchestrate Playwright e2e: ensure Docker maildev, start app stack, run tests.
# Stock `npx maildev` is unreliable on Node 24; use maildev/maildev:2.1.0 via Docker.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE="${1:-run}" # run | ui
MAILDEV_IMAGE="${MAILDEV_IMAGE:-maildev/maildev:2.1.0}"
MAILDEV_NAME="${MAILDEV_NAME:-padloc-e2e-maildev}"
SMTP_PORT="${E2E_MAILDEV_SMTP_PORT:-1025}"
WEB_PORT="${E2E_MAILDEV_WEB_PORT:-1080}"
STARTED_MAILDEV=0

if [[ -z "${E2E_MAILDEV_URL:-}" ]]; then
    export E2E_MAILDEV_URL="http://localhost:${WEB_PORT}"
    E2E_MAILDEV_URL_EXPLICIT=0
else
    E2E_MAILDEV_URL_EXPLICIT=1
fi

maildev_ready() {
    local url="${1:-$E2E_MAILDEV_URL}"
    local body
    body="$(curl -sf "${url}/email" 2>/dev/null)" || return 1
    # maildev returns a JSON array; reject non-maildev services that answer on the port
    [[ "$body" == \[* ]]
}

port_in_use() {
    local port="$1"
    if command -v ss >/dev/null 2>&1; then
        ss -tln | grep -qE "[:.]${port}[[:space:]]"
    else
        # Fallback: try connecting
        (echo >/dev/tcp/127.0.0.1/"$port") >/dev/null 2>&1
    fi
}

start_docker_maildev() {
    local web_port="$1"
    docker rm -f "$MAILDEV_NAME" >/dev/null 2>&1 || true
    docker run -d --rm --name "$MAILDEV_NAME" \
        -p "${SMTP_PORT}:1025" \
        -p "${web_port}:1080" \
        "$MAILDEV_IMAGE" >/dev/null
    STARTED_MAILDEV=1
    export E2E_MAILDEV_URL="http://localhost:${web_port}"
    local i
    for i in $(seq 1 60); do
        if maildev_ready; then
            echo "maildev ready at ${E2E_MAILDEV_URL} (smtp :${SMTP_PORT})"
            return 0
        fi
        sleep 0.5
    done
    echo "maildev failed to become ready at ${E2E_MAILDEV_URL}" >&2
    docker logs "$MAILDEV_NAME" 2>&1 || true
    exit 1
}

ensure_maildev() {
    if maildev_ready; then
        echo "Using existing maildev at ${E2E_MAILDEV_URL}"
        return 0
    fi

    # Common host conflict: :1080 taken; prior e2e runs map web UI to 1082
    if [[ "$E2E_MAILDEV_URL_EXPLICIT" -eq 0 ]] && maildev_ready "http://localhost:1082"; then
        export E2E_MAILDEV_URL="http://localhost:1082"
        echo "Using existing maildev at ${E2E_MAILDEV_URL}"
        return 0
    fi

    if ! command -v docker >/dev/null 2>&1; then
        echo "maildev is not reachable at ${E2E_MAILDEV_URL} and Docker is not available." >&2
        echo "Start maildev, then re-run:" >&2
        echo "  docker run --rm -d -p 1025:1025 -p 1080:1080 maildev/maildev:2.1.0" >&2
        echo "  export E2E_MAILDEV_URL=http://localhost:1080" >&2
        exit 1
    fi

    local web_port="$WEB_PORT"
    if port_in_use "$web_port"; then
        if ! port_in_use 1082; then
            web_port=1082
        else
            echo "maildev web ports ${WEB_PORT} and 1082 are both in use, and no healthy maildev was found." >&2
            echo "Set E2E_MAILDEV_URL to an existing maildev REST base URL, or free a port." >&2
            exit 1
        fi
    fi

    if port_in_use "$SMTP_PORT"; then
        # SMTP already bound — only proceed if we can still reach a REST API
        if [[ "$E2E_MAILDEV_URL_EXPLICIT" -eq 0 ]] && maildev_ready "http://localhost:1082"; then
            export E2E_MAILDEV_URL="http://localhost:1082"
            echo "Using existing maildev at ${E2E_MAILDEV_URL} (smtp :${SMTP_PORT} already bound)"
            return 0
        fi
        echo "SMTP port ${SMTP_PORT} is already in use and maildev REST API is not reachable." >&2
        echo "Stop the process on :${SMTP_PORT} or point E2E_MAILDEV_URL at a working maildev." >&2
        exit 1
    fi

    echo "Starting Docker maildev (${MAILDEV_IMAGE}) smtp:${SMTP_PORT} web:${web_port}"
    start_docker_maildev "$web_port"
}

cleanup() {
    if [[ "$STARTED_MAILDEV" -eq 1 ]]; then
        docker rm -f "$MAILDEV_NAME" >/dev/null 2>&1 || true
    fi
}
trap cleanup EXIT

ensure_maildev

APP_ENV="PL_DATA_BACKEND=memory PL_DISABLE_SW=true PL_EMAIL_BACKEND=smtp PL_EMAIL_SMTP_HOST=localhost PL_EMAIL_SMTP_PORT=${SMTP_PORT} PL_EMAIL_SMTP_IGNORE_TLS=true"
WAIT_CMD="./node_modules/.bin/wait-on tcp:localhost:8080 tcp:localhost:3000"

if [[ "$MODE" == "ui" ]]; then
    APP_CMD="${APP_ENV} pnpm run dev"
    PW_CMD="playwright test --ui"
else
    APP_CMD="${APP_ENV} pnpm start"
    PW_CMD="playwright test"
fi

# Pass through extra playwright args after --
shift || true
if [[ "${1:-}" == "--" ]]; then
    shift
fi
if [[ "$#" -gt 0 ]]; then
    PW_CMD="${PW_CMD} $*"
fi

export PATH="${ROOT}/node_modules/.bin:${PATH}"

concurrently \
    --prefix=name \
    --prefix-length=30 \
    --kill-others \
    --success=first \
    -n app,playwright \
    "${APP_CMD}" \
    "${WAIT_CMD} && E2E_MAILDEV_URL=${E2E_MAILDEV_URL} ${PW_CMD}"
status=$?
exit "$status"
