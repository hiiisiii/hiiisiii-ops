# hiiisiii-ops

Connect the Chat AI you already use to GitHub and your own execution environment through a self-hosted runner.

hiiisiii-ops is not a new IDE and does not require a separate local AI coding agent. The reasoning, planning, and code generation stay in ChatGPT, Claude, Gemini, or another supported chat AI environment. Your PC or server is used as the execution environment.

> **Use the Chat AI you already have and the compute you already own.** hiiisiii-ops does not require a second local AI coding agent or a separate cloud execution worker, helping avoid unnecessary additional agent and hosted-compute usage. Your normal Chat AI plan, message, and model usage still applies.

> **Status:** v0.1 Local/Linux release baseline is complete. The core Local task path has been validated end to end on a private repository with a Linux self-hosted runner, the Linux-first bootstrap/onboarding path is implemented, and the runner security boundary is documented. Runner isolation remains a per-deployment READY precondition for each user's execution environment; it is not a requirement that hiiisiii-ops centrally validate every user's machine before the project itself can be released.

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

The verified v0.1 core path is intentionally small:

- private GitHub project repository
- GitHub Actions
- self-hosted Linux runner
- Local execution target
- Chat AI ↔ GitHub Issue task/result loop
- `inspect`, `apply`, and standalone `verify` operations
- deterministic task branches for mutation state
- existing project instructions

v0.1 uses a **Linux self-hosted runner as the execution environment**. This does not restrict the device where you use ChatGPT, Claude, Gemini, GitHub, or your IDE: the client side may be Windows, macOS, or Linux.

For server-hosted projects, the simplest supported model is to install or reuse the self-hosted runner on the server that actually runs the project. hiiisiii-ops still treats this as Local execution even if you personally access that server over SSH. A runner-to-SSH-to-different-host transport remains a deferred Advanced direction and is not required for the current v0.1 READY path. Public target repositories and Windows/macOS execution runners are likewise outside the current v0.1 READY claim.

### Chat AI compatibility

The core protocol and setup handoff are provider-neutral.

- **ChatGPT:** the currently verified end-to-end Chat AI path.
- **Claude / Gemini / other Chat AIs:** compatible when the selected Chat AI environment can perform the required GitHub repository and Issue operations, or can guide the user through the minimal missing GitHub action. These providers have not been individually verified end to end in v0.1.

hiiisiii-ops does not require provider-specific local coding agents to bridge those differences.

## Quick Start

### 1. Choose the project repository

Use the GitHub repository where you want the Chat AI to perform real project work.

For v0.1, use a **private project repository**.

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

If the project itself runs on a server, prefer reusing or connecting a suitable self-hosted runner on that execution server instead of adding an SSH hop solely for hiiisiii-ops.

For v0.1 Local/Linux, the selected execution runner must satisfy at least one of these security strategies:

- **Restricted account:** task execution runs as a non-root OS account that cannot gain privileged/root access non-interactively, uses a separated HOME/workspace, and does not have unnecessary access to unrelated credentials, personal files, or sensitive workloads.
- **Isolated host:** the runner executes on a dedicated or sufficiently single-purpose PC/server/VM that does not contain unrelated sensitive workloads, credentials, or unnecessary production access.

A healthy runner is not considered suitable merely because it can execute Actions. For example, a general-purpose runner account with passwordless `sudo` and broad access to unrelated credentials/workloads does not meet the v0.1 READY security boundary.

If an existing runner fails this boundary, do not automatically modify the user's working environment. The default remediation is to create or select a restricted runner account on the existing Linux host while leaving existing workloads/runners intact. Use a dedicated isolated host/VM only when account-level isolation on the existing host cannot provide a sufficient boundary. If multiple runners can match the repository, use an explicit routing label when necessary so hiiisiii tasks select only the intended restricted runner; runner labels are routing controls, not trusted-actor security gates.

This security check is a deployment/setup responsibility for the selected runner. hiiisiii-ops documents the boundary and can guide the setup, but it does not claim to centrally validate every user's PC, server, NAS, or VM.

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

## v0.1 verification status

The private-repository Local workflow/executor path has actual self-hosted E2E evidence for read-only inspection, apply/task-branch mutation, standalone verification, stale-base rejection, and unexpected tracked-mutation isolation.

The Linux-first bootstrap diagnostic is implemented and locally behavior-validated. The onboarding release gate is satisfied by combining that bounded bootstrap evidence with the canonical self-hosted health-check E2E; a destructive fresh reinstall of an already working runner environment is not required to reproduce the same facts.

The runner OS-account/host isolation boundary has been identified and documented, including an actual unsafe-runner probe and a successful restricted-account boundary check. Whether a particular user's selected runner satisfies that boundary is a deployment READY condition for that environment, not a blocker on publishing the v0.1 project itself.

ChatGPT is the verified Chat AI path. The core Task/Result protocol and [`setup/CHAT_AI_SETUP.md`](setup/CHAT_AI_SETUP.md) remain provider-neutral so Claude, Gemini, and other capable Chat AI environments can use the same setup contract without changing the core executor.

See [`RELEASE_NOTES.md`](RELEASE_NOTES.md) for the v0.1 release scope and execution boundary.
