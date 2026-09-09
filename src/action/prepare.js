'use strict';

const fs = require('fs');
const path = require('path');
const {
  ProtocolError,
  parseRequestFromIssueBody,
  analyzeHistory,
  recoverIdentity,
} = require('../executor/protocol');
const {
  listIssueComments,
  resolveCommitSha,
  resolveOptionalBranchSha,
  taskBranchName,
} = require('../executor/github');
const { setOutput, writeJson } = require('./io');

const RESULT_ACTOR = 'github-actions[bot]';

function resultTemplate(partial = {}) {
  return {
    schema: 'hiiisiii.result.v1',
    request_id: partial.request_id ?? null,
    sequence: partial.sequence ?? null,
    operation: partial.operation ?? null,
    status: 'rejected',
    target_id: partial.target_id ?? 'local',
    run_id: String(process.env.GITHUB_RUN_ID || ''),
    base_sha: partial.base_sha ?? null,
    task_branch: null,
    head_sha: null,
    commands: [],
    changed_files: [],
    artifact: null,
    error_code: null,
  };
}

function latestTaskBranchResult(accepted, taskBranch) {
  return [...accepted]
    .filter((item) => item?.task_branch === taskBranch && typeof item?.head_sha === 'string')
    .sort((a, b) => (b.sequence || 0) - (a.sequence || 0))[0] || null;
}

function selectCheckoutSha(history, taskBranch, branchSha, canonicalBase) {
  const latest = latestTaskBranchResult(history.accepted, taskBranch);
  if (branchSha && !latest) {
    throw new ProtocolError('STALE_BASE_SHA', 'Task branch exists without accepted task history.');
  }
  if (!branchSha && latest) {
    throw new ProtocolError('STALE_BASE_SHA', 'Accepted task history references a missing task branch.');
  }
  if (branchSha && latest && latest.head_sha !== branchSha) {
    throw new ProtocolError('STALE_BASE_SHA', 'Remote task branch differs from the latest accepted task result.');
  }
  return branchSha || canonicalBase;
}

async function prepare() {
  const token = process.env.INPUT_GITHUB_TOKEN;
  const trustedActor = process.env.INPUT_TRUSTED_ACTOR;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const repository = process.env.GITHUB_REPOSITORY;
  const runnerTemp = process.env.RUNNER_TEMP;

  if (!token || !trustedActor || !eventPath || !repository || !runnerTemp) {
    throw new Error('prepare requires github_token, trusted_actor, GitHub event, repository, and RUNNER_TEMP.');
  }

  const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  const issue = event.issue;
  if (!issue) throw new Error('prepare requires a GitHub issue event.');

  const stem = `hiiisiii-${process.env.GITHUB_RUN_ID || 'run'}-${issue.number}`;
  const controlFile = path.join(runnerTemp, `${stem}-control.json`);
  const resultFile = path.join(runnerTemp, `${stem}-result.json`);
  let result = resultTemplate();
  let shouldExecute = false;
  let checkoutSha = '';

  try {
    if (event.repository?.private !== true || event.sender?.login !== trustedActor || !String(issue.title || '').startsWith('[hiiisiii]')) {
      throw new ProtocolError('UNTRUSTED_ACTOR', 'Defense-in-depth trust validation failed.');
    }

    const request = parseRequestFromIssueBody(issue.body || '');
    result = { ...result, ...recoverIdentity(request), target_id: request.target_id };

    const comments = await listIssueComments(token, repository, issue.number);
    const history = analyzeHistory(comments, request, RESULT_ACTOR);

    let canonicalBase;
    if (request.sequence === 1) {
      canonicalBase = await resolveCommitSha(token, repository, request.base_ref);
      if (request.base_sha !== null && request.base_sha !== canonicalBase) {
        throw new ProtocolError('STALE_BASE_SHA', 'sequence 1 base_sha does not match base_ref.', recoverIdentity(request));
      }
    } else {
      canonicalBase = history.canonicalBase;
    }
    result.base_sha = canonicalBase;

    const taskBranch = taskBranchName(issue.number);
    const needsTaskState = request.operation !== 'inspect' || request.sequence > 1;
    const branchSha = needsTaskState ? await resolveOptionalBranchSha(token, repository, taskBranch) : null;
    checkoutSha = selectCheckoutSha(history, taskBranch, branchSha, canonicalBase);

    const control = {
      schema: 'hiiisiii.control.v1',
      repository,
      issue_number: issue.number,
      result_actor: RESULT_ACTOR,
      checkout_sha: checkoutSha,
      task_branch: taskBranch,
      task_branch_sha: branchSha,
      request,
    };
    writeJson(controlFile, control);
    writeJson(resultFile, result);
    shouldExecute = true;
  } catch (error) {
    if (error instanceof ProtocolError) {
      result = { ...result, ...error.partial, status: 'rejected', error_code: error.code };
      writeJson(resultFile, result);
    } else {
      result.status = 'failed';
      result.error_code = 'INTERNAL_ERROR';
      writeJson(resultFile, result);
      throw error;
    }
  } finally {
    delete process.env.INPUT_GITHUB_TOKEN;
    setOutput('should_execute', shouldExecute ? 'true' : 'false');
    setOutput('checkout_sha', checkoutSha);
    setOutput('control_file', controlFile);
    setOutput('result_file', resultFile);
  }
}

module.exports = { prepare, resultTemplate, RESULT_ACTOR, latestTaskBranchResult, selectCheckoutSha };
