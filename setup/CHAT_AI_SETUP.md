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
   - Prefer existing Git, GitHub configuration, runner installation, project clone, and native platform capabilities.
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

### 2. Inspect the current setup state

Check, to the extent the current environment allows:

- repository accessibility
- existing hiiisiii-ops files or workflow
- whether the target repository has access to a suitable self-hosted runner
- the minimum repository settings needed by the current hiiisiii-ops version
- relevant project instructions

Do not perform broad repository scans just because repository access is available.

### 3. Apply only missing repository-side setup

Use the current hiiisiii-ops release files and documented configuration as the source of truth.

Prefer the smallest change that makes the target repository ready.

If the current Chat AI can make the change directly, make it and verify it.

If it cannot, tell the user exactly what must be done and then verify the result before moving on.

### 4. Verify the execution path

Run the current hiiisiii-ops health check or setup verification documented by the version being installed.

The verification must provide real evidence that the configured path is working. Do not infer runner readiness from configuration files alone.

If the current version does not provide the required health-check mechanism, report **HOLD** rather than inventing an unofficial replacement and calling the setup complete.

### 5. Finish or hold

Report **READY** only when the required setup state has been verified.

Report **HOLD** when a required capability, permission, runner connection, repository setting, or verification step is still missing.

## READY criteria

The setup may be reported as **READY** only when all conditions required by the current hiiisiii-ops version are satisfied and verified, including at minimum:

- the target repository is known and accessible
- required hiiisiii-ops repository-side files/configuration are present
- a suitable self-hosted runner is actually available to the target repository
- the required GitHub execution path has been verified with the current health check
- no material project-instruction conflict remains unresolved

Do not treat file creation alone as proof that the execution path works.

## HOLD examples

Use **HOLD** when, for example:

- the target repository is unknown
- the current Chat AI cannot perform a required GitHub action and the user has not completed the required manual step
- no suitable runner is available to the target repository
- required GitHub permissions are missing
- a required repository setting cannot be verified
- the health check has not completed successfully
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