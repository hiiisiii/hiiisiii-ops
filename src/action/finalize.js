'use strict';

const { readJson } = require('./io');
const { postIssueComment } = require('../executor/github');

async function finalize() {
  const token = process.env.INPUT_GITHUB_TOKEN;
  const resultFile = process.env.INPUT_RESULT_FILE;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!token || !resultFile || !eventPath || !repository) {
    throw new Error('finalize requires github_token, result_file, event, and repository.');
  }

  const event = readJson(eventPath);
  const result = readJson(resultFile);
  if (!event.issue?.number) throw new Error('finalize requires a GitHub issue event.');

  await postIssueComment(token, repository, event.issue.number, result);
  delete process.env.INPUT_GITHUB_TOKEN;
  if (result.status !== 'success') process.exitCode = 1;
}

module.exports = { finalize };
