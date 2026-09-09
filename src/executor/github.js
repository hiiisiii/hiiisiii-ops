'use strict';

const { execFileSync } = require('child_process');
const { RESULT_BEGIN, RESULT_END } = require('./protocol');

function apiBase() {
  return process.env.GITHUB_API_URL || 'https://api.github.com';
}

function headers(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'hiiisiii-ops-prototype',
  };
}

function nextLink(linkHeader) {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(',')) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match && match[2] === 'next') return match[1];
  }
  return null;
}

async function listIssueComments(token, repository, issueNumber) {
  const comments = [];
  let url = `${apiBase()}/repos/${repository}/issues/${issueNumber}/comments?per_page=100`;
  while (url) {
    const response = await fetch(url, { headers: headers(token) });
    if (!response.ok) throw new Error(`GitHub comments API failed: ${response.status}`);
    const page = await response.json();
    comments.push(...page);
    url = nextLink(response.headers.get('link'));
  }
  return comments;
}

async function resolveCommitSha(token, repository, ref) {
  const encoded = encodeURIComponent(ref);
  const response = await fetch(`${apiBase()}/repos/${repository}/commits/${encoded}`, { headers: headers(token) });
  if (!response.ok) throw new Error(`GitHub commit resolve failed: ${response.status}`);
  const value = await response.json();
  if (!value || typeof value.sha !== 'string') throw new Error('GitHub commit resolve returned no SHA.');
  return value.sha;
}

function taskBranchName(issueNumber) {
  if (!Number.isInteger(issueNumber) || issueNumber < 1) throw new Error('Issue number must be a positive integer.');
  return `hiiisiii/task-${issueNumber}`;
}

async function resolveOptionalBranchSha(token, repository, branch) {
  const encoded = encodeURIComponent(branch);
  const response = await fetch(`${apiBase()}/repos/${repository}/git/ref/heads/${encoded}`, { headers: headers(token) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub branch resolve failed: ${response.status}`);
  const value = await response.json();
  const sha = value?.object?.sha;
  if (typeof sha !== 'string') throw new Error('GitHub branch resolve returned no SHA.');
  return sha;
}

function validateTaskBranchRef(branch, headSha) {
  if (!/^hiiisiii\/task-[1-9]\d*$/.test(branch || '')) {
    throw new Error('Only deterministic hiiisiii task branches may be pushed.');
  }
  if (!/^[0-9a-f]{40,64}$/i.test(headSha || '')) {
    throw new Error('Task branch push requires a valid commit SHA.');
  }
}

function gitControlEnv(token) {
  const keys = [
    'PATH', 'HOME', 'USERPROFILE', 'TMPDIR', 'TMP', 'TEMP',
    'SYSTEMROOT', 'SystemRoot', 'WINDIR', 'ComSpec', 'PATHEXT',
    'LANG', 'LC_ALL', 'SSL_CERT_FILE', 'SSL_CERT_DIR', 'GIT_SSL_CAINFO',
    'HTTPS_PROXY', 'HTTP_PROXY', 'NO_PROXY', 'https_proxy', 'http_proxy', 'no_proxy',
  ];
  const env = {};
  for (const key of keys) {
    if (typeof process.env[key] === 'string') env[key] = process.env[key];
  }
  const basic = Buffer.from(`x-access-token:${token}`, 'utf8').toString('base64');
  env.GIT_TERMINAL_PROMPT = '0';
  env.GIT_CONFIG_COUNT = '1';
  env.GIT_CONFIG_KEY_0 = 'http.extraheader';
  env.GIT_CONFIG_VALUE_0 = `AUTHORIZATION: basic ${basic}`;
  return env;
}

function pushTaskBranch(token, repository, workspace, branch, headSha) {
  validateTaskBranchRef(branch, headSha);
  const server = String(process.env.GITHUB_SERVER_URL || 'https://github.com').replace(/\/$/, '');
  const remote = `${server}/${repository}.git`;
  try {
    return execFileSync('git', ['push', '--porcelain', remote, `${headSha}:refs/heads/${branch}`], {
      cwd: workspace,
      encoding: 'utf8',
      env: gitControlEnv(token),
      windowsHide: true,
      maxBuffer: 2 * 1024 * 1024,
    });
  } catch (error) {
    const detail = `${error.stdout || ''}\n${error.stderr || ''}`;
    const wrapped = new Error('Trusted task branch push failed.');
    wrapped.code = /non-fast-forward|fetch first|rejected/i.test(detail) ? 'STALE_BASE_SHA' : 'INTERNAL_ERROR';
    throw wrapped;
  }
}

function humanSummary(result) {
  return [
    `hiiisiii result — seq ${result.sequence ?? '-'} — ${result.status}`,
    `operation: ${result.operation ?? '-'}`,
    `branch: ${result.task_branch ?? '-'}`,
    `error: ${result.error_code ?? '-'}`,
  ].join('\n');
}

function formatResultComment(result) {
  return `${humanSummary(result)}\n\n${RESULT_BEGIN}\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n${RESULT_END}`;
}

async function postIssueComment(token, repository, issueNumber, result) {
  const response = await fetch(`${apiBase()}/repos/${repository}/issues/${issueNumber}/comments`, {
    method: 'POST',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: formatResultComment(result) }),
  });
  if (!response.ok) throw new Error(`GitHub comment publish failed: ${response.status}`);
  return response.json();
}

module.exports = {
  listIssueComments,
  resolveCommitSha,
  resolveOptionalBranchSha,
  taskBranchName,
  validateTaskBranchRef,
  pushTaskBranch,
  postIssueComment,
  formatResultComment,
  nextLink,
};
