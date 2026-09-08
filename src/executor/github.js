'use strict';

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

module.exports = { listIssueComments, resolveCommitSha, postIssueComment, formatResultComment, nextLink };
