# hiiisiii-ops v0.1 Health Check

This document defines the canonical setup health check for the current v0.1 private-repository prototype.

The health check is not a separate execution system. It is the smallest real hiiisiii-ops Task Session that proves the configured path works end to end:

```text
Chat AI
  → GitHub Issue
  → GitHub Actions
  → self-hosted runner
  → read-only repository inspection
  → Issue result comment
  → Chat AI verification
```

A repository is not **READY** merely because workflow files or runner configuration exist. The actual execution path must complete successfully, and the selected runner must separately satisfy the v0.1 runner security boundary.

## Scope

The v0.1 health check is intentionally read-only.

It must not:

- modify project source files
- create a task branch
- commit or push changes
- run project-wide builds or tests
- install dependencies
- deploy or restart anything
- inspect unrelated files or directories

It only verifies the minimum GitHub-to-runner task/result loop.

The health check does **not** prove that the runner OS account or host is safely isolated. That security boundary is a required setup precondition and must be verified separately with the minimum necessary evidence.

## Current support boundary

The currently verified v0.1 core path is a private GitHub project repository using a self-hosted Linux runner and the Local execution target.

The selected runner must satisfy at least one supported isolation strategy:

- **Restricted account:** a non-root runner account that cannot gain privileged/root access non-interactively, uses a separated HOME/workspace, and does not have unnecessary access to unrelated credentials, personal files, or sensitive workloads.
- **Isolated host:** a dedicated or sufficiently single-purpose PC/server/VM without unrelated sensitive workloads, credentials, or unnecessary production access.

Do not use this health check to claim READY support for Windows, macOS, SSH Remote execution, or public target repositories unless a later hiiisiii-ops version explicitly documents and verifies that path.

## Preconditions

Before starting the health check, verify the minimum required setup for the current v0.1 version:

- the target repository is known and accessible
- the target repository is private
- the current hiiisiii task workflow is installed in the target repository using the documented immutable Action pins
- repository Actions variable `HIIISIII_TRUSTED_ACTOR` exists and its value is the exact GitHub actor identity expected to create or edit the hiiisiii task Issue
- a suitable self-hosted runner is actually available to the target repository
- the selected runner satisfies the restricted-account or isolated-host security strategy
- when multiple runners could otherwise match, workflow routing is verified to select only the intended safe execution runner
- the runner can execute the current hiiisiii workflow requirements

`HIIISIII_TRUSTED_ACTOR` is an actor identity, not a secret. Never substitute a PAT, token, runner registration token, or other credential for this value.

Reuse existing working configuration when it is suitable. Do not reinstall or re-register a runner merely because hiiisiii-ops is being set up. However, a runner that is healthy but has unsafe OS-account/host privileges is not suitable for v0.1 READY.

For runner security verification, inspect only the minimum metadata needed to establish the boundary. Do not read secret contents, dump the full environment, or crawl unrelated filesystems.

If an existing runner fails the security boundary, do not automatically modify the user's working environment. The default remediation is a restricted runner account/workspace on the existing Linux host while leaving existing workloads and runners intact. Use a dedicated isolated host/VM only when account-level isolation cannot provide a sufficient boundary.

If a required precondition cannot be verified, report **HOLD** instead of running an invented substitute check.

## Canonical probe

Create one dedicated GitHub Issue for the setup health check.

Recommended title:

```text
[hiiisiii] setup health check
```

The Issue may contain a short human-readable summary, followed by exactly one current machine-readable request envelope between the hiiisiii request markers.

Generate a new UUID for `request_id`. Resolve the target repository's actual default branch and use it as `base_ref`.

````text
Setup health check for hiiisiii-ops v0.1.

<!-- HIIISIII_TASK_REQUEST_BEGIN -->
```json
{
  "schema": "hiiisiii.task.v1",
  "request_id": "<new-uuid>",
  "sequence": 1,
  "operation": "inspect",
  "target_id": "local",
  "base_ref": "<default-branch>",
  "base_sha": null,
  "workdir": ".",
  "commands": [
    {
      "id": "status",
      "run": "git status --short",
      "timeout_sec": 60
    },
    {
      "id": "head",
      "run": "git rev-parse HEAD",
      "timeout_sec": 60
    }
  ],
  "patch": null,
  "output_limit": 12000
}
```
<!-- HIIISIII_TASK_REQUEST_END -->
````

Do not add extra commands merely because runner access is available.

## What this proves

A successful probe provides evidence that:

1. the current Chat AI can publish the required GitHub task request
2. the Issue event reaches the configured hiiisiii workflow
3. the `HIIISIII_TRUSTED_ACTOR` job-level gate allows the intended `github.actor`
4. GitHub assigns the job to the intended self-hosted runner selected by the workflow routing
5. the runner receives a validated checkout of the target repository
6. the executor can run the read-only request
7. the executor publishes a machine-readable result back to the same Issue
8. the Chat AI can read the matching result and verify it

This probe proves the execution path. It does not replace the separate OS-account/host isolation precondition.

## READY criteria

Report the hiiisiii-ops setup as **READY** only when the runner security preconditions above are verified and all of the following are verified from the actual probe result:

- a result comment exists for the same Issue
- the result contains the expected hiiisiii result markers
- the result `request_id` exactly matches the probe request
- `sequence` is `1`
- `operation` is `inspect`
- `status` is `success`
- `target_id` is `local`
- both commands completed with exit code `0`
- `git status --short` produced no repository changes
- `git rev-parse HEAD` returned the checked-out commit SHA
- the result returns a non-null canonical `base_sha`
- the `head` command output matches that canonical `base_sha`
- `changed_files` is empty
- no task branch was created for this read-only probe
- no project source mutation occurred

For the current GitHub.com v0.1 prototype, only a result from the configured trusted result publisher should be accepted as protocol evidence.

Do not report **READY** if any required result field is missing, mismatched, or only inferred from workflow configuration. Also do not report READY if the probe succeeds on a runner whose OS-account/host isolation boundary is missing or unverified.

## HOLD handling

Report **HOLD** when the required security boundary or end-to-end probe cannot be verified.

Examples:

- no suitable restricted-account or isolated-host runner is verified
- the intended runner can gain privileged/root access non-interactively on a general-purpose host
- the intended runner can access unrelated sensitive credentials/workloads without equivalent host-level isolation
- multiple runners can match and the workflow cannot be verified to route hiiisiii jobs only to the intended safe runner
- no workflow run is created
- the job is skipped because `HIIISIII_TRUSTED_ACTOR` is missing or does not match the Issue event actor
- the job remains queued because no matching runner is available
- the request is rejected by the protocol
- a command fails or times out
- no matching result comment is published
- the returned `request_id` does not match
- the result status is `failed` or `rejected`
- the checkout SHA cannot be verified
- the probe causes unexpected repository changes

When reporting **HOLD**, identify the smallest verified failure point and the smallest next action required. Do not repeat completed setup steps.

## Chat AI result report

After reading the actual Issue result, report concisely:

```text
Setup status: READY | HOLD

Verified:
- runner security boundary: restricted account | isolated host
- task request reached the target repository
- intended self-hosted runner executed the read-only probe
- matching result returned for request_id <id>
- canonical base SHA: <sha>

User action required:
- <only when HOLD>
```

Do not include raw tokens, secrets, complete environment dumps, or unrelated runner information.

## After READY

A successful read-only health check plus a verified runner security boundary proves the basic hiiisiii-ops setup path is connected and meets the current v0.1 Local/Linux release boundary.

It does **not** by itself prove that mutation/apply, task-branch push, SSH Remote, deployment, or every project-specific command works.

After setup is READY, stop. Wait for the user's actual project request instead of automatically performing a code change.
