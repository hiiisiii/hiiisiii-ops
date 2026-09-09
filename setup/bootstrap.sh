#!/usr/bin/env bash
set -uo pipefail

readonly HIIISIII_OPS_REPO="hiiisiii/hiiisiii-ops"
readonly SETUP_URL="https://github.com/hiiisiii/hiiisiii-ops/blob/main/setup/CHAT_AI_SETUP.md"

target_input=""

usage() {
  cat <<'USAGE'
Usage: bash setup/bootstrap.sh [--target <owner/repo|github-url>]

Linux-first hiiisiii-ops bootstrap diagnostic.

This script does not install packages, register runners, modify GitHub repositories,
or change project source. It only inspects local state and prints the canonical
Chat AI setup handoff.

Options:
  --target <value>  Target private GitHub project repository as owner/repo or URL.
  -h, --help        Show this help.
USAGE
}

normalize_repo() {
  local value="$1"
  value="${value%/}"
  value="${value%.git}"

  case "$value" in
    https://github.com/*|http://github.com/*)
      value="${value#*github.com/}"
      ;;
    ssh://git@github.com/*)
      value="${value#ssh://git@github.com/}"
      ;;
    git@github.com:*)
      value="${value#git@github.com:}"
      ;;
  esac

  if [[ "$value" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
    printf '%s\n' "$value"
    return 0
  fi

  return 1
}

while (($#)); do
  case "$1" in
    --target)
      if (($# < 2)) || [[ -z "${2:-}" ]]; then
        echo "ERROR: --target requires owner/repo or a GitHub repository URL." >&2
        exit 2
      fi
      target_input="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

os_name="$(uname -s 2>/dev/null || printf 'unknown')"
arch_name="$(uname -m 2>/dev/null || printf 'unknown')"

echo "hiiisiii-ops bootstrap diagnostic"
echo "OS: $os_name"
echo "Architecture: $arch_name"

if [[ "$os_name" != "Linux" ]]; then
  echo "Bootstrap status: HOLD"
  echo "Reason: v0.1 bootstrap is currently verified for Linux only."
  echo "No changes were made."
  exit 2
fi

if ! command -v git >/dev/null 2>&1; then
  echo "Git: missing"
  echo "Bootstrap status: HOLD"
  echo "Reason: Git is required for the current v0.1 Local path."
  echo "Next: install Git using your operating system's normal package source, then rerun this diagnostic."
  echo "No changes were made."
  exit 2
fi

git_version="$(git --version 2>/dev/null || true)"
echo "Git: ${git_version:-detected}"

if command -v gh >/dev/null 2>&1; then
  gh_version="$(gh --version 2>/dev/null | head -n 1 || true)"
  echo "GitHub CLI: ${gh_version:-detected} (optional)"
else
  echo "GitHub CLI: not detected (optional; not required)"
fi

current_repo="no"
origin_url=""
origin_repo=""
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  current_repo="yes"
  origin_url="$(git remote get-url origin 2>/dev/null || true)"
  if [[ -n "$origin_url" ]]; then
    origin_repo="$(normalize_repo "$origin_url" 2>/dev/null || true)"
  fi
fi

echo "Current Git repository: $current_repo"
if [[ -n "$origin_url" ]]; then
  echo "Current origin: $origin_url"
else
  echo "Current origin: not detected"
fi

runner_process="not detected"
if [[ -n "${RUNNER_NAME:-}" ]]; then
  runner_process="detected via RUNNER_NAME=${RUNNER_NAME}"
elif command -v pgrep >/dev/null 2>&1 && pgrep -af '[R]unner.Listener|[r]unsvc.sh' >/dev/null 2>&1; then
  runner_process="detected local runner process"
fi
echo "Self-hosted runner local signal: $runner_process"
echo "Note: local runner signals are diagnostic only; repository usability must be proven by the canonical health check."

target_repo=""
if [[ -n "$target_input" ]]; then
  if ! target_repo="$(normalize_repo "$target_input")"; then
    echo "Bootstrap status: HOLD"
    echo "Reason: --target is not a recognized GitHub owner/repository value."
    echo "No changes were made."
    exit 2
  fi
elif [[ -n "$origin_repo" && "$origin_repo" != "$HIIISIII_OPS_REPO" ]]; then
  target_repo="$origin_repo"
fi

if [[ -z "$target_repo" ]]; then
  echo "Target repository: not resolved"
  echo "Bootstrap status: HOLD"
  echo "Reason: the target project repository is still required."
  echo "Next: rerun with --target <owner/repository>, or provide that repository to your Chat AI when using the handoff below."
else
  echo "Target repository: $target_repo"
  echo "Bootstrap status: HANDOFF_READY"
fi

echo
echo "Canonical Chat AI setup handoff:"
echo "$SETUP_URL"
echo
echo "Copy/paste into ChatGPT, Claude, Gemini, or another supported Chat AI:"
echo "---"
echo "Continue the hiiisiii-ops setup."
echo
echo "Read and follow:"
echo "$SETUP_URL"
if [[ -n "$target_repo" ]]; then
  echo
  echo "Target repository:"
  echo "https://github.com/$target_repo"
else
  echo
  echo "Target repository:"
  echo "<owner/repository>"
fi
echo "---"
echo
echo "This diagnostic did not install packages, register a runner, modify GitHub, or change project source."

if [[ -z "$target_repo" ]]; then
  exit 2
fi

exit 0
