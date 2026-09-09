'use strict';

const { readJson, writeJson } = require('./io');
const { postIssueComment, pushTaskBranch } = require('../executor/github');

async function finalize() {
  const token = process.env.INPUT_GITHUB_TOKEN;
  const resultFile = process.env.INPUT_RESULT_FILE;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const repository = process.env.GITHUB_REPOSITORY;
  const workspace = process.env.GITHUB_WORKSPACE;
  if (!token || !resultFile || !eventPath || !repository || !workspace) {
    throw new Error('finalize requires github_token, result_file, event, repository, and GITHUB_WORKSPACE.');
  }

  const event = readJson(eventPath);
  const result = readJson(resultFile);
  if (!event.issue?.number) throw new Error('finalize requires a GitHub issue event.');

  if (result.operation === 'apply' && result.task_branch && result.head_sha) {
    try {
      pushTaskBranch(token, repository, workspace, result.task_branch, result.head_sha);
    } catch (error) {
      result.status = 'failed';
      result.error_code = error.code === 'STALE_BASE_SHA' ? 'STALE_BASE_SHA' : 'INTERNAL_ERROR';
      writeJson(resultFile, result);
    }
  }

  await postIssueComment(token, repository, event.issue.number, result);
  delete process.env.INPUT_GITHUB_TOKEN;
  if (result.status !== 'success') process.exitCode = 1;
}

module.exports = { finalize };
