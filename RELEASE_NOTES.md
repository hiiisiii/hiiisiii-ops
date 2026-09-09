# hiiisiii-ops v0.1.1

Release date: 2026-09-10

## Status

v0.1.1 is a backward-compatible documentation and usage-flow patch on top of the verified v0.1.0 Local/Linux runtime baseline.

It does not change executor behavior, the Task/Result protocol, JSON schemas, workflow template, or bootstrap behavior.

## What changed

- Added root `CHAT_AI_EXECUTION.md` as the canonical provider-neutral handoff for normal project work after setup is READY.
- Connected `setup/CHAT_AI_SETUP.md` and `README.md` so the same Chat AI conversation can continue with ordinary natural-language project requests after READY without requiring a separate hiiisiii prompt for every task.
- Documented the minimal persistent-project-context reference and the one-time fallback for a completely independent new chat.
- Clarified the public value proposition: reuse the Chat AI and compute you already have without requiring a separate local AI coding agent or cloud execution worker. Normal Chat AI plan, message, and model usage still applies.
- Clarified the supported Local model for server-hosted projects: when the self-hosted runner and project execution environment are on the same machine, it is Local execution.
- Kept public documentation focused on the currently supported and verified execution scope.

## Runtime compatibility

v0.1.1 keeps the v0.1.0 runtime and protocol baseline unchanged.

The existing v0.1.0 self-hosted end-to-end evidence remains applicable. No new runtime capability is claimed by this patch.

---

# hiiisiii-ops v0.1.0

Release date: 2026-09-10

## Status

v0.1.0 is the first public Local/Linux release baseline for hiiisiii-ops.

The release provides a provider-neutral Chat AI → GitHub → self-hosted runner → project work → GitHub result path without requiring a separate local AI coding agent.

## Verified core

The v0.1.0 core has actual self-hosted end-to-end evidence for:

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

## Supported v0.1.0 execution scope

- private GitHub project repositories
- repository-level self-hosted runners
- Linux execution runners
- Local execution on the runner machine
- existing project instructions such as `AGENTS.md`, `CLAUDE.md`, repository documentation, or a connected project-specific instruction source

The v0.1.0 execution environment is a Linux self-hosted runner. The device used to access ChatGPT, Claude, Gemini, GitHub, the project, or an IDE may be Windows, macOS, or Linux.

## Chat AI compatibility

The Task/Result protocol and setup handoff are provider-neutral.

- ChatGPT is the currently verified end-to-end Chat AI path.
- Claude, Gemini, and other Chat AI environments can use the same core protocol when they can perform the required GitHub repository/Issue operations or guide the user through the minimal missing GitHub action.
- Other providers have not been individually verified end to end in v0.1.0.

No Claude Code, Codex CLI, Gemini CLI, or other local AI coding agent is required by hiiisiii-ops.

## Runner security boundary

`commands[].run` executes with the operating-system permissions of the selected self-hosted runner account. It is not a project-root filesystem sandbox.

A deployment should select either:

- a restricted non-root runner account without non-interactive privilege escalation and without unnecessary access to unrelated credentials/workloads, or
- a dedicated/sufficiently isolated runner host or VM.

This is a READY precondition for each user's deployment environment. hiiisiii-ops documents and checks the boundary during setup, but the project release does not centrally validate every user's PC, server, NAS, or VM.

## Onboarding

The public repository provides:

- `setup/bootstrap.sh`
- `setup/CHAT_AI_SETUP.md`
- `setup/HEALTH_CHECK.md`
- `templates/workflows/hiiisiii-task.yml`
- the public JavaScript Action and Task/Result contracts

The bootstrap is intentionally non-destructive and does not automatically install project runtimes, re-register working runners, modify live project clones, or collect plaintext secrets.

## v0.1.0 release boundary

This release verifies the Local execution path on a Linux self-hosted runner and private target repositories.

Public target repositories and Windows/macOS execution runners are outside the current READY claim.

These execution boundaries do not restrict the user's client device. Windows, macOS, or Linux may be used to access the Chat AI, GitHub, the project, or the user's normal development environment.

## Operating principle

> Minimum work. Sufficient evidence. Verified result.
