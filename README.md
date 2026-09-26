# hiiisiii-ops

Use the Chat AI you already use to do real project work in your own execution environment, with GitHub carrying the request and verified result.

**v0.1 verified scope:** private GitHub project repositories + Linux self-hosted runner. Your normal Chat AI plan, message, and model usage still applies.

Typical use cases:

- ask your usual Chat AI to inspect, test, or change a project that actually runs on your own PC or server
- keep using existing project rules such as `AGENTS.md` or `CLAUDE.md` instead of moving to a new prompt or development framework
- use Direct GitHub integration when available, or the same Task/Result path through Assisted or Manual transport when it is not

A normal request can look like this:

```text
You: Run the failing API test on the server, fix only what is needed, and show me the verified result.
Chat AI → GitHub Issue → self-hosted runner → project work → GitHub result → Chat AI
```

[Start with Quick Start](#quick-start) · [Execution handoff](CHAT_AI_EXECUTION.md) · [Release scope](RELEASE_NOTES.md)

**Not a good fit:** when the main requirement is a very fast interactive edit/run loop. hiiisiii-ops intentionally uses GitHub Issue/Actions round trips for execution and evidence.

hiiisiii-ops is not a new IDE and does not require a separate local AI coding agent. The reasoning, planning, and code generation stay in ChatGPT, Claude, Gemini, or another supported chat AI environment. Your PC or server is used as the execution environment.

> **Status:** v0.1 Local/Linux release baseline is complete. Detailed verification status and security boundaries are documented below.

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

v0.1 uses a **Linux self-hosted runner as the execution environment**.

For server-hosted projects, the simplest supported model is to install or reuse the self-hosted runner on the server that actually runs the project. hiiisiii-ops treats this as Local execution because the runner and project execution environment are on the same machine. Public target repositories are outside the current v0.1 READY claim.

### Chat AI compatibility

The core protocol and setup handoff are provider-neutral. The transport path is selected from the GitHub capabilities that are actually available in the current Chat AI session:

- **Direct:** the Chat AI can create/update the task Issue and read/search the matching result through its GitHub integration.
- **Assisted:** the Chat AI prepares the exact task request as a prefilled Issue URL or equivalent ready-to-submit body, and the user submits it while signed in as the configured `HIIISIII_TRUSTED_ACTOR`.
- **Manual:** when the Chat AI also cannot read/search the private result, the user relays the unchanged request/result between GitHub and the Chat AI.

Direct same-Issue execution and Assisted human-submit execution have both been verified against the same v1 Task/Result contract. A provider is not permanently assigned to one mode; use the least-manual path supported by the current session.

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

If the project itself runs on a server, prefer reusing or connecting a suitable self-hosted runner on that execution server.

For v0.1 Local/Linux, the selected execution runner must satisfy at least one of these security strategies:

- **Restricted account:** task execution runs as a non-root OS account that cannot gain privileged/root access non-interactively, uses a separated HOME/workspace, and does not have unnecessary access to unrelated credentials, personal files, or sensitive workloads.
- **Isolated host:** the runner executes on a dedicated or sufficiently single-purpose PC/server/VM that does not contain unrelated sensitive workloads, credentials, or unnecessary production access.

A healthy runner is not considered suitable merely because it can execute Actions. For example, a general-purpose runner account with passwordless `sudo` and broad access to unrelated credentials/workloads does not meet the v0.1 READY security boundary.

If an existing runner fails this boundary, do not automatically modify the user's working environment. The default remediation is to create or select a restricted runner account on the existing Linux host while leaving existing workloads/runners intact. Use a dedicated isolated host/VM only when account-level isolation on the existing host cannot provide a sufficient boundary. If multiple runners can match the repository, use an explicit routing label when necessary so hiiisiii tasks select only the intended restricted runner; runner labels are routing controls, not trusted-actor security gates.

This security check is a deployment/setup responsibility for the selected runner. hiiisiii-ops documents the boundary and can guide the setup, but it does not claim to centrally validate every user's PC, server, NAS, or VM.

Do not paste runner registration tokens, PATs, SSH private keys, API keys, or other secrets into a Chat AI conversation.

### Security boundary

hiiisiii-ops executes real shell commands with the permissions of the selected self-hosted runner OS account.

The execution handoff instructs the Chat AI to treat repository contents, command output, GitHub discussion text, and other observed content as data rather than independent authority to expand the task or execution boundary. Project instructions may guide how authorized project work is performed, but they do not independently authorize access to credentials, unrelated user data, privilege escalation, or other security-boundary expansion.

Command output may be returned through GitHub Issues and the Chat AI, so sensitive configuration should normally be checked without printing secret values.

Normal project commands such as tests, builds, package scripts, or deployment tools may themselves execute repository or dependency code with the runner account's permissions. Chat AI instruction rules cannot make such code inherently safe.

The primary protection against unintended access therefore remains a restricted runner account or an appropriately isolated host/VM. Chat AI instruction rules and output handling are defense-in-depth, not substitutes for that execution boundary.

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

The Chat AI may be able to perform repository-side setup directly through its GitHub integration. If direct GitHub write is unavailable, it should prefer the verified Assisted path: prepare the exact prefilled Issue URL or ready-to-submit body and ask you only to submit it as the configured trusted actor. If result read/search is also unavailable, use the same request/result contract through Manual relay. Use HOLD only when the required action or evidence cannot be completed through any of these bounded paths.

For the current v0.1 workflow, the target repository also needs the repository Actions variable `HIIISIII_TRUSTED_ACTOR`. Its value must be the exact GitHub actor identity expected to create or edit hiiisiii task Issues. The setup handoff verifies this rather than asking you to paste any secret.

Existing tools and working configuration should be reused whenever possible.

### 5. Verify before using

Setup is complete only after the runner security boundary is verified and the canonical [`setup/HEALTH_CHECK.md`](setup/HEALTH_CHECK.md) verifies the actual execution path.

The v0.1 health check is a real read-only hiiisiii Task Session that verifies the Chat AI → GitHub Issue → GitHub Actions → self-hosted runner → Issue result path. Creating files or configuring a workflow alone is not enough evidence that the runner path works, and a successful health check alone does not prove that the runner OS account or host is safely isolated.

Once setup is verified as **READY**, have the Chat AI read and follow the canonical [`CHAT_AI_EXECUTION.md`](CHAT_AI_EXECUTION.md) for normal project work. In the same setup conversation, the user should then be able to make ordinary natural-language project requests without pasting a separate hiiisiii prompt for every task.

### 6. Use hiiisiii-ops after READY

If your project already has a persistent instruction source such as `AGENTS.md`, `CLAUDE.md`, a Chat AI project instruction, or a connected project-specific Drive instruction, you can add this stable reference once so later project chats can rediscover the execution contract:

```text
For real project execution through hiiisiii-ops, follow https://github.com/hiiisiii/hiiisiii-ops/blob/main/CHAT_AI_EXECUTION.md.
```

This does not replace your existing project rules, and hiiisiii-ops does not require a new project-prompt format.

If a completely new chat has no persistent project context, use the minimal one-time handoff below:

```text
Use hiiisiii-ops for this project.
Read and follow:
https://github.com/hiiisiii/hiiisiii-ops/blob/main/CHAT_AI_EXECUTION.md

Target repository:
https://github.com/<owner>/<repository>
```

You should not need to repeat that handoff for every task in the same project context.

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

The core Task/Result protocol, [`setup/CHAT_AI_SETUP.md`](setup/CHAT_AI_SETUP.md), and [`CHAT_AI_EXECUTION.md`](CHAT_AI_EXECUTION.md) remain provider-neutral. Direct and Assisted transports reuse the same executor and contracts; Manual is the bounded fallback when the current Chat AI session cannot perform the required GitHub read/write operation directly.

See [`RELEASE_NOTES.md`](RELEASE_NOTES.md) for the v0.1 release scope and execution boundary.
