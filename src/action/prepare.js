'use strict';

const fs = require('fs');
const path = require('path');
const {
  ProtocolError,
  parseRequestFromIssueBody,
  analyzeHistory,
  recoverIdentity,
} = require('../executor/protocol');
const { listIssueComments, resolveCommitSha } = require('../executor/github');
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

    const resolvedBase = await resolveCommitSha(token, repository, request.base_ref);
    if (request.sequence === 1) {
      if (request.base_sha !== null && request.base_sha !== resolvedBase) {
        throw new ProtocolError('STALE_BASE_SHA', 'sequence 1 base_sha does not match base_ref.', recoverIdentity(request));
      }
      result.base_sha = resolvedBase;
      checkoutSha = resolvedBase;
    } else {
      result.base_sha = history.canonicalBase;
      checkoutSha = history.canonicalBase || '';
    }

    const control = {
      schema: 'hiiisiii.control.v1',
      repository,
      issue_number: issue.number,
      result_actor: RESULT_ACTOR,
      checkout_sha: checkoutSha,
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
    // Keep repository credentials out of later execute-mode process inputs/outputs.
    delete process.env.INPUT_GITHUB_TOKEN;
    setOutput('should_execute', shouldExecute ? 'true' : 'false');
    setOutput('checkout_sha', checkoutSha);
    setOutput('control_file', controlFile);
    setOutput('result_file', resultFile);
  }
}

module.exports = { prepare, resultTemplate, RESULT_ACTOR };
