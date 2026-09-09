# hiiisiii-ops

Connect the Chat AI you already use to GitHub and your own execution environment through a self-hosted runner.

hiiisiii-ops is not a new IDE and does not require a separate local AI coding agent. The reasoning, planning, and code generation stay in ChatGPT, Claude, Gemini, or another supported chat AI environment. Your PC or server is used as the execution environment.

> **Status:** v0.1 developer preview. The core Local task path has been validated end to end on a private repository with a Linux self-hosted runner. The Linux-first bootstrap diagnostic is implemented and the onboarding release gate has sufficient evidence from bootstrap behavior validation plus the canonical self-hosted health-check E2E. The runner OS-account/isolation policy is now defined, but v0.1 Local/Linux is not release-ready until the selected execution runner is verified to satisfy that security boundary. Do not treat the current repository as a production-ready release yet.

## How it works

```text
ChatGPT / Claude / Gemini
          ↓
        GitHub
          ↓
    GitHub Actions
          ↓
 self-hosted runner
          ↓
 your PC or server
          ↓
   project work/results
          ↓
        GitHub
          ↓
       Chat AI
```

The goal is to reuse what you already have:

- your existing GitHub repositories
- your existing PC or server
- your existing IDE and development environment
- your existing project instructions such as `AGENTS.md` or `CLAUDE.md`
- your existing self-hosted runner when it is already usable by the target repository and satisfies the runner security boundary

No Claude Code, Codex CLI, Gemini CLI, or other local AI coding agent is required by hiiisiii-ops.

## v0.1 scope

The current verified core path is intentionally small:

- private GitHub project repository
- GitHub Actions
- self-hosted Linux runner
- Local execution target
- Chat AI ↔ GitHub Issue task/result loop
- `inspect`, `apply`, and standalone `verify` operations
- deterministic task branches for mutation state
- existing project instructions

The first public bootstrap/onboarding target is Linux. Windows, macOS, SSH Remote execution, and public target repositories are not READY support claims for v0.1 yet.

## Quick Start

### 1. Choose the project repository

Use the GitHub repository where you want the Chat AI to perform real project work.

For the current v0.1 prototype, use a **private project repository**.

### 2. Run the Linux bootstrap diagnostic

Clone the public hiiisiii-ops repository and run the diagnostic with your target project repository:

```bash
git clone https://github.com/hiiisiii/hiiisiii-ops.git
cd hiiisiii-ops
bash setup/bootstrap.sh --target <owner/repository>
```

The bootstrap script is intentionally non-destructive. It detects the Linux/architecture and local Git state, reports whether the optional GitHub CLI is present, checks only limited local self-hosted-runner signals, resolves the target repository, and prints the canonical Chat AI setup handoff.

It does **not** install packages, register or re-register a runner, modify GitHub repositories, manage your existing project clone, install project runtimes, or change project source.

`HANDOFF_READY` means the local diagnostic collected enough context to continue setup in your Chat AI. It does **not** mean the repository is fully READY; final readiness requires the canonical health check and a verified runner security boundary.

If the target repository already has a suitable working runner, reuse it. Do not install or register another runner just because you are setting up hiiisiii-ops. A local runner process or config file alone is not proof that the runner is usable by the target repository or safe for hiiisiii task execution.

For v0.1 Local/Linux, the selected execution runner must satisfy at least one of these security strategies:

- **Restricted account:** task execution runs as a non-root OS account that cannot gain privileged/root access non-interactively, uses a separated HOME/workspace, and does not have unnecessary access to unrelated credentials, personal files, or sensitive workloads.
- **Isolated host:** the runner executes on a dedicated or sufficiently single-purpose PC/server/VM that does not contain unrelated sensitive workloads, credentials, or unnecessary production access.

A healthy runner is not considered suitable merely because it can execute Actions. For example, a general-purpose runner account with passwordless `sudo` and broad access to unrelated credentials/workloads does not meet the v0.1 READY security boundary.

If an existing runner fails this boundary, do not automatically modify the user's working environment. The default remediation is to create or select a restricted runner account on the existing Linux host while leaving existing workloads/runners intact. Use a dedicated isolated host/VM only when account-level isolation on the existing host cannot provide a sufficient boundary. If multiple runners can match the repository, use an explicit routing label when necessary so hiiisiii tasks select only the intended restricted runner; runner labels are routing controls, not trusted-actor security gates.

Do not paste runner registration tokens, PATs, SSH private keys, API keys, or other secrets into a Chat AI conversation.

### 3. Continue setup in your Chat AI

Use the handoff text printed by `setup/bootstrap.sh`, or open the ChatGPT, Claude, Gemini, or other supported chat AI environment you normally use and send:

```text
Continue the hiiisiii-ops setup.

Read and follow:
https://github.com/hiiisiii/hiiisiii-ops/blob/main/setup/CHAT_AI_SETUP.md

Target repository:
https://github.com/<owner>/<repository>
```

The setup handoff is provider-neutral. The Chat AI should inspect the existing state first, reuse working configuration, apply only what is missing, and verify the result before reporting the setup as ready.

If your Chat AI cannot access the GitHub file directly, copy the contents of [`setup/CHAT_AI_SETUP.md`](setup/CHAT_AI_SETUP.md) into the conversation instead.

### 4. Follow only the remaining setup steps

The Chat AI may be able to perform repository-side setup directly through its GitHub integration. If it cannot perform a required action, it should give you the smallest exact GitHub UI step or command needed and then verify the resulting state before continuing.

For the current v0.1 workflow, the target repository also needs the repository Actions variable `HIIISIII_TRUSTED_ACTOR`. Its value must be the exact GitHub actor identity expected to create or edit hiiisiii task Issues. The setup handoff verifies this rather than asking you to paste any secret.

Existing tools and working configuration should be reused whenever possible.

### 5. Verify before using

Setup is complete only after the runner security boundary is verified and the canonical [`setup/HEALTH_CHECK.md`](setup/HEALTH_CHECK.md) verifies the actual execution path.

The v0.1 health check is a real read-only hiiisiii Task Session that verifies the Chat AI → GitHub Issue → GitHub Actions → self-hosted runner → Issue result path. Creating files or configuring a workflow alone is not enough evidence that the runner path works, and a successful health check alone does not prove that the runner OS account or host is safely isolated.

Once the setup is verified as **READY**, continue using your normal Chat AI conversation for actual project requests.

## Project instructions

hiiisiii-ops does not replace your project's development rules.

If your project already uses instructions such as:

- `AGENTS.md`
- `CLAUDE.md`
- repository-specific instructions
- project documentation
- a project-specific connected prompt source

keep using them. hiiisiii-ops should discover and respect the relevant existing instructions instead of forcing a new project prompt format.

## Operating principle

> **Minimum work. Sufficient evidence. Verified result.**

hiiisiii-ops should inspect only what is needed, reuse existing implementations and tools first, make only the required changes, run directly relevant verification, and stop when the requested result has been sufficiently verified.

## Current development state

The core private-repository Local workflow/executor path has actual self-hosted E2E evidence for read-only inspection, apply/task-branch mutation, standalone verification, stale-base rejection, and unexpected tracked-mutation isolation.

The Linux-first bootstrap diagnostic is implemented and locally behavior-validated, and the onboarding release gate is satisfied by combining that bounded bootstrap evidence with the existing canonical self-hosted health-check E2E. A fresh destructive reinstallation of an already working runner environment is not required to duplicate those same facts. The v0.1 runner security contract now requires a verified restricted-account or isolated-host boundary; remediation and verification of a conforming execution runner remain before v0.1 Local/Linux is called release-ready. The canonical Chat AI setup handoff is defined in [`setup/CHAT_AI_SETUP.md`](setup/CHAT_AI_SETUP.md), and the canonical read-only setup verification contract is defined in [`setup/HEALTH_CHECK.md`](setup/HEALTH_CHECK.md).
