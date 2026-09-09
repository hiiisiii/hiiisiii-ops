# hiiisiii-ops Chat AI Setup Handoff

This file is the canonical setup handoff for ChatGPT, Claude, Gemini, or another supported chat AI environment.

Use it after the user has started the hiiisiii-ops setup and wants their chat AI to continue the remaining repository-side setup and verification.

## Purpose

Continue hiiisiii-ops setup using the user's existing:

- Chat AI environment
- GitHub account and target repository
- self-hosted runner and execution environment, when already available and suitable
- project instructions and existing development environment

Do not replace the user's IDE, project workflow, or project-specific development rules.

Do not require a separate local AI coding agent such as Claude Code, Codex CLI, or Gemini CLI.

**Core principle:**

> Minimum work. Sufficient evidence. Verified result.

## Current v0.1 support boundary

The currently verified core path is:

- private GitHub project repository
- GitHub Actions
- self-hosted Linux runner
- Local execution target

The selected execution runner must also satisfy the v0.1 runner security boundary defined below. The first public bootstrap/onboarding target is Linux. This runner-OS boundary does not restrict the user's Chat AI client device; Windows, macOS, and Linux clients may be used. SSH Remote is an optional Advanced execution direction in the product design, but the current v0.1 setup contract verifies Local execution only. Do not report Windows or macOS execution runners, SSH Remote execution, or public target repositories as READY support unless a later hiiisiii-ops version explicitly documents and verifies them.

## Required input

Identify the target GitHub repository from the user's message or current chat context.

If the target repository is not known, ask only for the repository URL or `owner/repository` name before continuing.

Do not ask for information that can be discovered from the available GitHub or project context.

## Setup rules

1. **Inspect before changing anything.**
   - Check the minimum GitHub and repository state needed for setup.
   - Detect existing hiiisiii-ops workflow/configuration before creating anything.
   - Reuse existing working configuration whenever possible.

2. **Reuse an existing runner only when it is actually suitable.**
   - If a self-hosted runner is already available to the target repository, healthy, and satisfies the v0.1 runner security boundary, reuse it.
   - Do not reinstall or re-register a suitable runner merely to follow this guide.
   - Do not assume a runner attached only to another repository is available to the target repository.
   - Do not treat Actions health alone as proof that a runner is safe for hiiisiii task execution.
   - If no suitable runner is available, identify the missing setup or isolation step instead of pretending the runner is ready.

3. **Require a verified runner security boundary before READY.**
   - `commands[].run` is an OS shell command. Workdir and patch-path validation do not make the runner a project-root filesystem sandbox.
   - The selected runner must satisfy at least one of these strategies:
     - **Restricted account:** task execution runs as a non-root OS account that cannot gain privileged/root access non-interactively, uses a separated HOME/workspace, and does not have unnecessary access to unrelated credentials, personal files, or sensitive workloads.
     - **Isolated host:** the runner executes on a dedicated or sufficiently single-purpose PC/server/VM that does not contain unrelated sensitive workloads, credentials, or unnecessary production access.
   - A general-purpose runner account with passwordless/noninteractive `sudo`, privileged container/LXD access, or broad access to unrelated credentials/workloads is not a v0.1 READY runner merely because workflow jobs succeed.
   - Verify only the minimum evidence needed. Do not request secret contents, dump the complete environment, or crawl unrelated filesystems.
   - If an existing runner fails the boundary, do not automatically modify the user's working environment. The default remediation is a restricted runner account/workspace on the existing Linux host while leaving existing workloads and runners intact. Use a dedicated isolated host/VM when account-level isolation cannot provide a sufficient boundary.
   - When multiple runners could otherwise match the workflow, use an explicit routing label if necessary to select only the intended restricted runner. A runner label is routing metadata, not a replacement for the trusted-actor gate.

4. **Use the capabilities of the current Chat AI environment.**
   - If you can read and modify the target GitHub repository directly, perform the required repository-side setup yourself.
   - If a required action cannot be performed from the current Chat AI environment, give the user the smallest exact UI step or command needed.
   - After the user performs that action, verify the resulting state before continuing.
   - Do not claim a step is complete when you cannot verify it.

5. **Do not reinstall existing tools without evidence that it is necessary.**
   - Prefer existing Git, GitHub configuration, runner installation, and native platform capabilities.
   - Do not install project runtimes, dependencies, containers, or unrelated tools as part of hiiisiii-ops setup unless the current project explicitly requires them for the setup verification being performed.

6. **Protect secrets.**
   - Never ask the user to paste passwords, PATs, API keys, SSH private keys, GitHub runner registration tokens, or other secret plaintext into the chat.
   - Prefer official browser/device authorization flows and the platform's normal secret-management mechanisms.

7. **Do not modify project source code during setup unless the user explicitly asks for project work.**
   - Setup changes should be limited to the hiiisiii-ops files, GitHub workflow/configuration, runner-selection metadata when required, and directly required setup metadata.
   - Do not refactor, clean up, or otherwise change unrelated project code.

## Project instructions

Before making repository-side setup changes, discover only the project instructions needed for this repository.

Use this priority when relevant:

1. The user's explicit instructions in the current chat.
2. Project instructions already attached to or configured in the current Chat AI environment.
3. Explicit repository instruction files such as `AGENTS.md`, `CLAUDE.md`, or other clearly designated project instructions.
4. A connected project-specific external instruction source, such as a project Google Drive folder, only when it is available in the current environment and relevant to this repository.

Do not crawl unrelated repositories, unrelated cloud folders, or the user's filesystem.

If material instructions conflict and the conflict cannot be resolved from the available sources, report **HOLD** instead of silently merging them.

## Setup workflow

Follow only the steps that are still necessary.

### 1. Resolve the target

Confirm the target repository and the GitHub account/context available to the current Chat AI.

For the current v0.1 prototype, the target repository must be private.

### 2. Inspect the current setup state

Check, to the extent the current environment allows:

- repository accessibility and private visibility
- existing hiiisiii-ops files or workflow
- whether `.github/workflows/hiiisiii-task.yml` uses the current published pinned Action SHAs
- whether the repository Actions variable `HIIISIII_TRUSTED_ACTOR` is configured for the exact GitHub actor identity expected to create or edit hiiisiii task Issues
- whether the target repository has access to a suitable self-hosted runner
- whether the intended execution runner satisfies either the restricted-account or isolated-host security strategy
- the minimum repository settings needed by the current hiiisiii-ops version
- relevant project instructions

Do not perform broad repository scans just because repository access is available.

Do not treat a runner config file, workflow file, or successful unrelated Actions job alone as proof that a runner is healthy and safely isolated for hiiisiii execution.

If the runner security boundary cannot be verified from available evidence, report **HOLD** and request only the smallest read-only user action needed to establish that boundary. Do not request secret values or unrelated filesystem contents.

### 3. Apply only missing repository-side setup

Use the current hiiisiii-ops release files and documented configuration as the source of truth.

Prefer the smallest change that makes the target repository ready.

For the current v0.1 workflow, repository-side setup includes, when missing:

- installing/updating `.github/workflows/hiiisiii-task.yml` from the published hiiisiii-ops workflow template without replacing its immutable Action pins with floating branches or tags
- configuring repository Actions variable `HIIISIII_TRUSTED_ACTOR` to the exact GitHub actor identity expected to create or edit hiiisiii task Issues
- adding only runner labels that are actually necessary to select the intended safe execution runner; do not create a hiiisiii-specific label merely for branding

`HIIISIII_TRUSTED_ACTOR` is not a secret. Do not replace it with a PAT, token, or credential. Its purpose is to make the job-level trust gate compare `github.actor` against the explicitly configured task actor before assigning the self-hosted runner.

If the current Chat AI can make the required changes directly, make them and verify them.

If it cannot configure the repository Actions variable, runner routing, or another required GitHub setting, tell the user the smallest exact GitHub UI step or command needed and then verify the resulting state before moving on.

Do not automatically create OS accounts, change `sudoers`, move credentials, or register replacement runners merely because an existing runner fails the security boundary. Report **HOLD** with the minimum remediation. For v0.1, prefer a restricted runner account on the existing Linux host; use a dedicated isolated host/VM only when account-level isolation is insufficient.

### 4. Verify the execution path

Read and follow [`setup/HEALTH_CHECK.md`](HEALTH_CHECK.md).

Use that canonical read-only Task Session to verify the actual Chat AI → GitHub → Actions → self-hosted runner → result path.

The canonical health check proves connectivity and protocol execution. It does not by itself prove that the runner OS account or host is safely isolated, so the security boundary must already be verified as a setup precondition.

Do not infer runner readiness from configuration files alone and do not substitute a different ad hoc probe while calling the setup complete.

If the canonical health check cannot be performed or verified, report **HOLD** with the smallest verified missing condition.

### 5. Finish or hold

Report **READY** only when the required setup state, runner security boundary, and canonical health check have all been verified.

Report **HOLD** when a required capability, permission, runner connection, runner security condition, repository setting, or verification step is still missing.

## READY criteria

The setup may be reported as **READY** only when all conditions required by the current hiiisiii-ops version are satisfied and verified, including at minimum:

- the target repository is known, accessible, and private
- required hiiisiii-ops repository-side files/configuration are present with the documented immutable Action pins
- `HIIISIII_TRUSTED_ACTOR` is configured for the expected task actor
- a suitable self-hosted runner is actually available to the target repository
- the selected runner satisfies the verified restricted-account or isolated-host security strategy
- the workflow routes hiiisiii jobs only to the intended safe runner when multiple matching runners are available
- the canonical health check completed successfully with matching evidence
- no material project-instruction conflict remains unresolved

Do not treat file creation, runner process health, or health-check success alone as proof that the runner security boundary is satisfied.

## HOLD examples

Use **HOLD** when, for example:

- the target repository is unknown
- the target repository is not private for the current v0.1 path
- the current Chat AI cannot perform a required GitHub action and the user has not completed the required manual step
- `HIIISIII_TRUSTED_ACTOR` is missing or does not match the actor producing the task Issue event
- no suitable runner is available to the target repository
- the selected runner can gain root/privileged access non-interactively on a general-purpose host
- the selected runner can access unrelated sensitive credentials/workloads and no equivalent host-level isolation is verified
- multiple runners can match and the workflow cannot be verified to select only the intended safe runner
- required GitHub permissions are missing
- a required repository setting cannot be verified
- the canonical health check has not completed successfully
- a material project-instruction conflict remains unresolved

State the exact missing condition and the smallest next action required.

## Output contract

Keep setup reports concise and evidence-based.

Use this structure when applicable:

```text
Setup status: READY | HOLD

Verified:
- ...

Changed:
- ...

User action required:
- ...

Next:
- ...
```

Omit empty sections.

Respond in the user's language unless the user asks for another language.

## After READY

When setup is verified as READY:

- tell the user that hiiisiii-ops setup is ready for the target repository
- read and follow the root [`CHAT_AI_EXECUTION.md`](../CHAT_AI_EXECUTION.md) for later real project requests
- in this same setup conversation, apply that execution handoff automatically to later natural-language project requests; do not require the user to paste a separate hiiisiii prompt for every task
- do not perform unrelated project work automatically; wait for the user's actual project request
- continue to respect the project's existing instructions; the execution handoff does not replace them

If the user already has a persistent project instruction source such as `AGENTS.md`, `CLAUDE.md`, a Chat AI project instruction, or a connected project-specific Drive instruction, recommend adding this stable reference once for later chats:

```text
For real project execution through hiiisiii-ops, follow https://github.com/hiiisiii/hiiisiii-ops/blob/main/CHAT_AI_EXECUTION.md.
```

Do not automatically rewrite the user's existing project instructions merely to add this reference unless the user authorizes that change.

If a future independent chat has no persistent project context, use the minimal one-time handoff described in [`CHAT_AI_EXECUTION.md`](../CHAT_AI_EXECUTION.md) together with the target repository. Do not require that fallback before every task in the same project context.

Do not search for extra improvements after setup is complete.
