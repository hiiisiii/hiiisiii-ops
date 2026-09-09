#!/usr/bin/env bash
set -euo pipefail

SCRIPT="${1:-setup/bootstrap.sh}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

fail() { echo "FAIL: $*" >&2; exit 1; }
assert_contains() { [[ "$1" == *"$2"* ]] || fail "expected output to contain: $2\nActual:\n$1"; }
assert_status() { [[ "$1" -eq "$2" ]] || fail "expected status $2, got $1"; }

make_fake_bin() {
  local os="$1" arch="$2" inside="$3" origin="$4" runner="$5"
  local bin="$TMP/bin"
  rm -rf "$bin"
  mkdir -p "$bin"

  cat > "$bin/uname" <<SH
#!/usr/bin/env bash
[[ "\${1:-}" == "-s" ]] && { echo "$os"; exit 0; }
[[ "\${1:-}" == "-m" ]] && { echo "$arch"; exit 0; }
exit 1
SH

  cat > "$bin/git" <<SH
#!/usr/bin/env bash
case "\${1:-}" in
  --version) echo "git version 2.99.0"; exit 0 ;;
  rev-parse) [[ "$inside" == "yes" ]] && { echo true; exit 0; } || exit 1 ;;
  remote) [[ "\${2:-}" == "get-url" && "\${3:-}" == "origin" && -n "$origin" ]] && { echo "$origin"; exit 0; } || exit 1 ;;
esac
exit 1
SH

  cat > "$bin/pgrep" <<SH
#!/usr/bin/env bash
[[ "$runner" == "yes" ]] && { echo "4242 /opt/actions-runner/bin/Runner.Listener run"; exit 0; }
exit 1
SH

  chmod +x "$bin/uname" "$bin/git" "$bin/pgrep"
  echo "$bin"
}

run_case() {
  local bin="$1"
  shift
  set +e
  OUTPUT="$(PATH="$bin:/usr/bin:/bin" /bin/bash "$SCRIPT" "$@" 2>&1)"
  STATUS=$?
  set -e
}

set +e
OUTPUT="$(/bin/bash "$SCRIPT" --help 2>&1)"
STATUS=$?
set -e
assert_status "$STATUS" 0
assert_contains "$OUTPUT" "Linux-first hiiisiii-ops bootstrap diagnostic."

bin="$(make_fake_bin Darwin arm64 no '' no)"
run_case "$bin" --target owner/repo
assert_status "$STATUS" 2
assert_contains "$OUTPUT" "Bootstrap status: HOLD"
assert_contains "$OUTPUT" "verified for Linux only"

bin="$(make_fake_bin Linux x86_64 yes 'https://github.com/hiiisiii/hiiisiii-ops.git' no)"
run_case "$bin"
assert_status "$STATUS" 2
assert_contains "$OUTPUT" "Target repository: not resolved"

bin="$(make_fake_bin Linux aarch64 yes 'https://github.com/hiiisiii/hiiisiii-ops.git' yes)"
run_case "$bin" --target 'https://github.com/example/private-project.git'
assert_status "$STATUS" 0
assert_contains "$OUTPUT" "Target repository: example/private-project"
assert_contains "$OUTPUT" "Bootstrap status: HANDOFF_READY"
assert_contains "$OUTPUT" "Self-hosted runner local signal: detected local runner process"
assert_contains "$OUTPUT" "This diagnostic did not install packages"

bin="$(make_fake_bin Linux x86_64 yes 'git@github.com:example/project.git' no)"
run_case "$bin"
assert_status "$STATUS" 0
assert_contains "$OUTPUT" "Target repository: example/project"

bin="$(make_fake_bin Linux x86_64 no '' no)"
run_case "$bin" --target 'not a repo'
assert_status "$STATUS" 2
assert_contains "$OUTPUT" "not a recognized GitHub owner/repository value"

echo "bootstrap tests: 6/6 PASS"
