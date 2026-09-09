'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  REQUEST_BEGIN,
  REQUEST_END,
  ProtocolError,
  parseRequestFromIssueBody,
  analyzeHistory,
  normalizeWorkdir,
} = require('../src/executor/protocol');

function task(overrides = {}) {
  return {
    schema: 'hiiisiii.task.v1',
    request_id: '550e8400-e29b-41d4-a716-446655440000',
    sequence: 1,
    operation: 'inspect',
    target_id: 'local',
    base_ref: 'main',
    base_sha: null,
    workdir: '.',
    commands: [{ id: 'head', run: 'git rev-parse HEAD', timeout_sec: 60 }],
    patch: null,
    output_limit: 12000,
    ...overrides,
  };
}

function issueBody(value) {
  return `human\n${REQUEST_BEGIN}\n\`\`\`json\n${JSON.stringify(value)}\n\`\`\`\n${REQUEST_END}`;
}

function resultComment(value) {
  return { body: `<!-- HIIISIII_TASK_RESULT_BEGIN -->\n\`\`\`json\n${JSON.stringify(value)}\n\`\`\`\n<!-- HIIISIII_TASK_RESULT_END -->` };
}

test('parses a valid task envelope', () => {
  const parsed = parseRequestFromIssueBody(issueBody(task()));
  assert.equal(parsed.operation, 'inspect');
  assert.equal(parsed.workdir, '.');
});

test('rejects unknown fields', () => {
  assert.throws(() => parseRequestFromIssueBody(issueBody(task({ surprise: true }))), (error) => error instanceof ProtocolError && error.code === 'INVALID_SCHEMA');
});

test('rejects workdir traversal', () => {
  assert.throws(() => normalizeWorkdir('../secret'), (error) => error.code === 'PATH_OUTSIDE_ROOT');
});

test('apply requires patch and inspect forbids patch', () => {
  assert.throws(() => parseRequestFromIssueBody(issueBody(task({ operation: 'apply' }))), (error) => error.code === 'PATCH_REQUIRED');
  assert.throws(() => parseRequestFromIssueBody(issueBody(task({ patch: 'x' }))), (error) => error.code === 'PATCH_NOT_ALLOWED');
});

test('duplicate request id is rejected', () => {
  const current = task();
  const comments = [resultComment({ request_id: current.request_id, sequence: 1, status: 'rejected', base_sha: null })];
  assert.throws(() => analyzeHistory(comments, current), (error) => error.code === 'DUPLICATE_REQUEST');
});

test('accepted history advances sequence and pins base sha', () => {
  const sha = 'a'.repeat(40);
  const previous = resultComment({ request_id: '11111111-1111-4111-8111-111111111111', sequence: 1, status: 'success', base_sha: sha });
  const current = task({ request_id: '22222222-2222-4222-8222-222222222222', sequence: 2, base_sha: sha });
  const history = analyzeHistory([previous], current);
  assert.equal(history.canonicalBase, sha);
});

test('rejected sequence does not advance accepted sequence', () => {
  const rejected = resultComment({ request_id: '11111111-1111-4111-8111-111111111111', sequence: 1, status: 'rejected', base_sha: null });
  const current = task({ request_id: '22222222-2222-4222-8222-222222222222', sequence: 1 });
  const history = analyzeHistory([rejected], current);
  assert.equal(history.accepted.length, 0);
});

test('ignores result markers from untrusted comment authors when actor filter is set', () => {
  const current = task();
  const spoofed = {
    user: { login: 'someone-else' },
    body: resultComment({ request_id: current.request_id, sequence: 1, status: 'success', base_sha: 'a'.repeat(40) }).body,
  };
  const history = analyzeHistory([spoofed], current, 'github-actions[bot]');
  assert.equal(history.accepted.length, 0);
});

test('malformed JSON is rejected without inventing request identity', () => {
  const body = `${REQUEST_BEGIN}\n\`\`\`json\n{broken\n\`\`\`\n${REQUEST_END}`;
  assert.throws(() => parseRequestFromIssueBody(body), (error) => {
    return error instanceof ProtocolError && error.code === 'INVALID_SCHEMA' && error.partial.request_id === undefined;
  });
});
