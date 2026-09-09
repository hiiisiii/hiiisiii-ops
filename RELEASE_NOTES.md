# hiiisiii-ops v0.1

Release date: 2026-09-10

## Status

v0.1 is the first public Local/Linux release baseline for hiiisiii-ops.

The release provides a provider-neutral Chat AI → GitHub → self-hosted runner → project work → GitHub result path without requiring a separate local AI coding agent.

## Verified core

The v0.1 core has actual self-hosted end-to-end evidence for:

- GitHub Issue-based Task Sessions
- trusted-actor pre-gate before self-hosted runner assignment
- read-only `inspect`
- unified-diff `apply`
- deterministic `hiiisiii/task-<issue-number>` branches
- standalone `verify`
- stale-base rejection
- unexpected tracked-mutation isolation and restoration
- token-separated `prepare → execute → finalize` execution
- canonical read-only setup health check
- Linux-first bootstrap behavior

## Supported v0.1 execution scope

- private GitHub project repositories
- repository-level self-hosted runners
- Linux execution runners
- Local execution on the runner machine
- existing project instructions such as `AGENTS.md`, `CLAUDE.md`, repository documentation, or a connected project-specific instruction source

The Linux limitation applies to the execution runner. The user may access ChatGPT, Claude, Gemini, GitHub, or the project from a normal Windows, macOS, or Linux client.

## Chat AI compatibility

The Task/Result protocol and setup handoff are provider-neutral.

- ChatGPT is the currently verified end-to-end Chat AI path.
- Claude, Gemini, and other Chat AI environments can use the same core protocol when they can perform the required GitHub repository/Issue operations or guide the user through the minimal missing GitHub action.
- Other providers are not individually certified in v0.1.

No Claude Code, Codex CLI, Gemini CLI, or other local AI coding agent is required by hiiisiii-ops.

## Runner security boundary

`commands[].run` executes with the operating-system permissions of the selected self-hosted runner account. It is not a project-root filesystem sandbox.

A deployment should select either:

- a restricted non-root runner account without non-interactive privilege escalation and without unnecessary access to unrelated credentials/workloads, or
- a dedicated/sufficiently isolated runner host or VM.

This is a READY precondition for each user's deployment environment. hiiisiii-ops documents and checks the boundary during setup, but the project release does not centrally certify every user's PC, server, NAS, or VM.

## Onboarding

The public repository provides:

- `setup/bootstrap.sh`
- `setup/CHAT_AI_SETUP.md`
- `setup/HEALTH_CHECK.md`
- `templates/workflows/hiiisiii-task.yml`
- the public JavaScript Action and Task/Result contracts

The bootstrap is intentionally non-destructive and does not automatically install project runtimes, re-register working runners, modify live project clones, or collect plaintext secrets.

## Not included in v0.1 READY support

- Windows self-hosted runner execution
- macOS self-hosted runner execution
- SSH Remote execution
- public target repositories
- provider-by-provider certification beyond the verified ChatGPT path
- automatic PR or merge
- a hiiisiii-specific test/lint/build policy
- a separate local AI coding-agent runtime

These are follow-up compatibility or feature areas, not missing requirements for the v0.1 Local/Linux release baseline.

## Operating principle

> Minimum work. Sufficient evidence. Verified result.
