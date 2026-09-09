# hiiisiii-ops Chat AI Setup Handoff

This file is the canonical setup handoff for ChatGPT, Claude, Gemini, or another supported chat AI environment.

Use it after the user has started the hiiisiii-ops setup and wants their chat AI to continue the remaining repository-side setup and verification.

## Purpose

Continue hiiisiii-ops setup using the user's existing:

- Chat AI environment
- GitHub account and target repository
- self-hosted runner and execution environment, when already available
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

The first public bootstrap/onboarding target is Linux. Do not report Windows, macOS, SSH Remote execution, or public target repositories as READY support unless a later hiiisiii-ops version explicitly documents and verifies them.

## Required input

Identify the target GitHub repository from the user's message or current chat context.

If the target repository is not known, ask only for the repository URL or `owner/repository` name before continuing.

Do not ask for information that can be discovered from the available GitHub or project context.

## Setup rules

1. **Inspect before changing anything.**
   - Check the minimum GitHub and repository state needed for setup.
   - Detect existing hiiisiii-ops workflow/configuration before creating anything.
   - Reuse existing working configuration whenever possible.

2. **Reuse an existing runner when it is actually usable by the target repository.**
   - If a suitable self-hosted runner is already available to the target repository and is healthy, do not reinstall or re-register it merely to follow this guide.
   - Do not assume a runner attached only to another repository is available to the target repository.
   - If no suitable runner is available, identify the missing setup step instead of pretending the runner is ready.

3. **Use the capabilities of the current Chat AI environment.**
   - If you can read and modify the target GitHub repository directly, perform the required repository-side setup yourself.
   - If a required action cannot be performed from the current Chat AI environment, give the user the smallest exact UI step or command needed.
   - After the user performs that action, verify the resulting state before continuing.
   - Do not claim a step is complete when you cannot verify it.

4. **Do not reinstall existing tools without evidence that it is necessary.**
   - Prefer existing Git, GitHub configuration, runner installation, and native platform capabilities.
   - Do not install project runtimes, dependencies, containers, or unrelated tools as part of hiiisiii-ops setup unless the current project explicitly requires them for the setup verification being performed.

5. **Protect secrets.**
   - Never ask the user to paste passwords, PATs, API keys, SSH private keys, GitHub runner registration tokens, or other secret plaintext into the chat.
   - Prefer official browser/device authorization flows and the platform's normal secret-management mechanisms.

6. **Do not modify project source code during setup unless the user explicitly asks for project work.**
   - Setup changes should be limited to the hiiisiii-ops files, GitHub workflow/configuration, and directly required setup metadata.
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
- the minimum repository settings needed by the current hiiisiii-ops version
- relevant project instructions

Do not perform broad repository scans just because repository access is available.

Do not treat a runner config file or workflow file alone as proof that a runner is healthy.

### 3. Apply only missing repository-side setup

Use the current hiiisiii-ops release files and documented configuration as the source of truth.

Prefer the smallest change that makes the target repository ready.

For the current v0.1 workflow, repository-side setup includes, when missing:

- installing/updating `.github/workflows/hiiisiii-task.yml` from the published hiiisiii-ops workflow template without replacing its immutable Action pins with floating branches or tags
- configuring repository Actions variable `HIIISIII_TRUSTED_ACTOR` to the exact GitHub actor identity expected to create or edit hiiisiii task Issues
- adding only existing runner labels that are actually necessary to select the intended self-hosted runner; do not create a hiiisiii-specific label solely for hiiisiii-ops

`HIIISIII_TRUSTED_ACTOR` is not a secret. Do not replace it with a PAT, token, or credential. Its purpose is to make the job-level trust gate compare `github.actor` against the explicitly configured task actor before assigning the self-hosted runner.

If the current Chat AI can make the required changes directly, make them and verify them.

If it cannot configure the repository Actions variable or another required GitHub setting, tell the user the smallest exact GitHub UI step or command needed and then verify the resulting state before moving on.

### 4. Verify the execution path

Read and follow [`setup/HEALTH_CHECK.md`](HEALTH_CHECK.md).

Use that canonical read-only Task Session to verify the actual Chat AI → GitHub → Actions → self-hosted runner → result path.

Do not infer runner readiness from configuration files alone and do not substitute a different ad hoc probe while calling the setup complete.

If the canonical health check cannot be performed or verified, report **HOLD** with the smallest verified missing condition.

### 5. Finish or hold

Report **READY** only when the required setup state has been verified.

Report **HOLD** when a required capability, permission, runner connection, repository setting, or verification step is still missing.

## READY criteria

The setup may be reported as **READY** only when all conditions required by the current hiiisiii-ops version are satisfied and verified, including at minimum:

- the target repository is known, accessible, and private
- required hiiisiii-ops repository-side files/configuration are present with the documented immutable Action pins
- `HIIISIII_TRUSTED_ACTOR` is configured for the expected task actor
- a suitable self-hosted runner is actually available to the target repository
- the canonical health check completed successfully with matching evidence
- no material project-instruction conflict remains unresolved

Do not treat file creation alone as proof that the execution path works.

## HOLD examples

Use **HOLD** when, for example:

- the target repository is unknown
- the target repository is not private for the current v0.1 path
- the current Chat AI cannot perform a required GitHub action and the user has not completed the required manual step
- `HIIISIII_TRUSTED_ACTOR` is missing or does not match the actor producing the task Issue event
- no suitable runner is available to the target repository
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
- do not perform unrelated project work automatically
- wait for the user's actual project request
- for later project work, continue to respect the project's existing instructions and the current hiiisiii-ops task/execution contract

Do not search for extra improvements after setup is complete.
