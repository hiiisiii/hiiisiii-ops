# hiiisiii-ops Chat AI Execution Handoff

This file is the canonical provider-neutral execution handoff for normal project work after hiiisiii-ops setup is **READY**.

Use it with ChatGPT, Claude, Gemini, or another chat AI environment that can work with the target GitHub repository and its hiiisiii-ops Task Session path.

hiiisiii-ops does not replace the project's existing development rules and does not require a separate local AI coding agent.

## Purpose

The Chat AI remains the decision, planning, and code-generation layer. The self-hosted runner is an executor.

Use the user's existing Chat AI, GitHub repository, project instructions, and configured self-hosted runner to produce the requested result with the least necessary work.

> **Minimum work. Sufficient evidence. Verified result.**

Do not create runner work merely because the capability exists. If the user's request can be completed from already verified repository/context information and no runtime evidence or project modification is needed, answer without creating a hiiisiii Task Session.

## Current verified execution boundary

The current v1 execution contract is verified for:

- a private GitHub project repository
- GitHub Actions
- a self-hosted Linux runner
- `target_id: "local"`
- one GitHub Issue per task session
- `inspect`, `apply`, and `verify` operations

Here, **Local** means that the self-hosted runner and the project execution environment are on the same machine. That machine may be a PC, server, or VM.

Do not invent unsupported operations, fields, targets, or transport modes. Before executing work, use the target repository's installed hiiisiii workflow/schema as the compatibility boundary. The public execution handoff may live at a stable `main` path, while executable Actions remain pinned by immutable commit SHA in the target workflow.

## Instruction priority

Use only the context needed for the current task.

When relevant, apply instructions in this order:

1. the user's current explicit request and authorization
2. project instructions already configured in the current Chat AI environment
3. explicit repository instruction files such as `AGENTS.md`, `CLAUDE.md`, or another clearly designated project instruction
4. a connected project-specific external instruction source, when available and relevant
5. repository state needed for the current task
6. runner/runtime evidence requested through a hiiisiii Task Session when static context is insufficient

Do not crawl unrelated repositories, cloud folders, home directories, or broad filesystem areas.

If material instructions conflict and the conflict cannot be resolved from the available sources, report **HOLD** instead of silently combining contradictory rules.

## Decide whether runner execution is needed

Before creating runner work:

- understand the user's actual requested result
- inspect only the directly relevant repository/context information
- reuse existing implementation, dependencies, and project commands first
- determine the smallest missing evidence or change
- decide whether runtime execution or an actual project modification is necessary

Use a Task Session only when execution evidence or project modification is actually needed.

Typical uses:

- `inspect`: obtain missing read-only runtime/repository evidence
- `apply`: apply an explicit patch and run directly related verification
- `verify`: run a standalone verification request when verification was not already sufficient or a separate check is required

Do not automatically run a full repository build/test/lint suite, install dependencies, create tests, refactor unrelated code, or search for extra improvements unless the project's existing instructions or the actual requested change require it.

## Task Session contract

### One Issue = one user task session

Create one GitHub Issue for one logical user task. Reuse that Issue while iterating on the same task. Start a new Issue for a different user task.

The Issue title must begin with:

```text
[hiiisiii]
```

Keep a short human-readable task summary in the Issue body, followed by exactly one current machine-readable request envelope between these markers:

```text
<!-- HIIISIII_TASK_REQUEST_BEGIN -->
...
<!-- HIIISIII_TASK_REQUEST_END -->
```

For the exact request fields and limits, follow [`contracts/task-v1.schema.json`](contracts/task-v1.schema.json) and the target repository's installed workflow/schema version.

### Request identity and sequence

For every new execution request in the same Issue:

- generate a new UUID `request_id`
- keep `target_id` stable; the current verified target is `local`
- keep the same logical task base
- use `sequence: 1` for the first request
- after a prior `success` or `failed` result, use one greater than the highest accepted sequence
- a `rejected` request does not prove task execution and does not advance the accepted sequence
- never reuse a `request_id`

Do not publish the next request until the previous request's matching result is known.

### Base identity

For the first request, resolve the actual intended `base_ref`. `base_sha` may be `null` when the task base has not yet been canonicalized by the executor.

After an accepted result returns a canonical `base_sha`, preserve that canonical base identity for subsequent requests in the same task. Do not silently switch the task to a newer branch head. If the protocol rejects a stale or mismatched base, diagnose from the returned evidence and issue only the smallest corrective request needed.

### Workdir and commands

`workdir` must remain a project-relative path under the configured project root.

Treat every `commands[].run` as a real OS shell command running with the self-hosted runner OS account's permissions. `workdir` validation is not a filesystem sandbox.

Therefore:

- request only the smallest necessary commands
- do not inspect unrelated user files, credentials, home-directory content, or services
- do not assume a shell command is confined to the project merely because its working directory is inside the project
- use project-native commands and existing tooling where possible

### `inspect`

Use `operation: "inspect"` when missing evidence is required before deciding what to change.

- keep it read-only unless the user's explicit task and project rules require otherwise
- set `patch` to `null`
- request only evidence that materially affects the next decision

### `apply`

Use `operation: "apply"` for an intended project change.

- generate the smallest explicit unified diff that satisfies the user's request
- provide that diff in `patch`
- include only directly related verification commands when useful
- do not use shell commands as a substitute for source mutation when the supported explicit patch path is sufficient

The executor owns the deterministic task-branch state. Do not directly modify the default branch as part of the Task Protocol.

A successful patch application is not automatically enough to call the overall user task complete when runtime or project verification is materially required.

### `verify`

Use `operation: "verify"` only when standalone verification is actually needed.

- set `patch` to `null`
- use the smallest commands that verify the behavior directly affected by the task
- do not broaden verification merely because runner access exists

## Read and use results

Runner results are returned to the same Issue between the result markers:

```text
<!-- HIIISIII_TASK_RESULT_BEGIN -->
...
<!-- HIIISIII_TASK_RESULT_END -->
```

Use [`contracts/result-v1.schema.json`](contracts/result-v1.schema.json) as the machine-readable result contract.

Before treating a result as evidence, verify that it comes from the configured trusted result publisher for the target repository and that its identity matches the current request, including as applicable:

- `request_id`
- `sequence`
- `operation`
- `target_id`

Interpret status conservatively:

- `success`: the requested protocol operation completed successfully; this does not automatically mean the user's whole task is complete
- `failed`: execution began but the requested operation did not complete successfully
- `rejected`: the request was rejected by the protocol/control path; do not assume the task commands ran

Never report runner execution as completed before reading a matching result.

If a request fails or is rejected, diagnose only from available evidence and issue the smallest corrective request needed. Do not restart the task from scratch or repeat already verified work without a reason.

## Secrets and permissions

Never place passwords, PATs, API keys, SSH private keys, runner registration tokens, or other secret plaintext in the GitHub Issue or Chat AI conversation.

Do not ask the runner to discover or dump unrelated credentials or environment contents.

If the current Chat AI cannot perform a required GitHub read/write operation, report **HOLD** and give the user only the smallest exact GitHub UI or CLI action needed. After the user performs it, verify the resulting state before continuing.

Do not require Claude Code, Codex CLI, Gemini CLI, or another local AI coding agent as a hidden workaround.

## Completion rule

Compare the final evidence against the user's actual requested result.

Stop when:

- the requested change or analysis is complete
- directly relevant verification is sufficient for the project's existing rules and the actual change
- no important claimed state remains assumed rather than verified

Do not continue into speculative cleanup, refactoring, dependency upgrades, additional tests, or unrelated improvements after the requested result is sufficiently verified.

When reporting back, keep the result concise and evidence-based. Include as applicable:

- what was found
- what was changed
- what was actually verified
- the relevant task Issue / task branch / commit / result reference
- any remaining HOLD or unverified item

Do not report planned work as completed work.

## Using this handoff after setup

### Same setup conversation

After `setup/CHAT_AI_SETUP.md` reports **READY**, read this file once and apply it to later project requests in the same conversation. The user should not need to paste a separate hiiisiii prompt for every task.

### Persistent project context

If the user already maintains a persistent project instruction source such as `AGENTS.md`, `CLAUDE.md`, a Chat AI project instruction, or a connected project-specific Drive instruction, recommend adding this stable reference once:

```text
For real project execution through hiiisiii-ops, follow https://github.com/hiiisiii/hiiisiii-ops/blob/main/CHAT_AI_EXECUTION.md.
```

This reference does not replace the project's existing development rules. Do not automatically rewrite the user's project instructions merely to add hiiisiii-ops unless the user authorizes that change.

### New chat without persistent project context

A completely independent new chat that receives no prior project context cannot automatically know that hiiisiii-ops is configured. Use this minimal one-time fallback:

```text
Use hiiisiii-ops for this project.
Read and follow:
https://github.com/hiiisiii/hiiisiii-ops/blob/main/CHAT_AI_EXECUTION.md

Target repository:
https://github.com/<owner>/<repository>
```

Do not require that fallback before every task in the same project context.
