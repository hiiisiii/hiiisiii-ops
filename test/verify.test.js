'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { verifyCheckedOutState } = require('../src/executor/verification');

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function repo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hiiisiii-verify-'));
  git(['init', '-q'], root);
  git(['config', 'user.name', 'test'], root);
  git(['config', 'user.email', 'test@example.com'], root);
  fs.writeFileSync(path.join(root, 'target.txt'), 'one\n');
  git(['add', '.'], root);
  git(['commit', '-qm', 'base'], root);
  fs.writeFileSync(path.join(root, 'target.txt'), 'two\n');
  git(['add', '.'], root);
  git(['commit', '-qm', 'selected'], root);
  return { root, head: git(['rev-parse', 'HEAD'], root) };
}

function request(commands) {
  return {
    request_id: '550e8400-e29b-41d4-a716-446655440000',
    sequence: 2,
    operation: 'verify',
    commands,
    workdir: '.',
    output_limit: 12000,
  };
}

test('verify succeeds without source mutation and reports selected base state', async () => {
  const { root, head } = repo();
  const result = await verifyCheckedOutState(request([
    { id: 'head', run: 'git rev-parse HEAD', timeout_sec: 60 },
  ]), root, head, null);

  assert.equal(result.status, 'success');
  assert.equal(result.error_code, null);
  assert.equal(result.head_sha, head);
  assert.equal(result.task_branch, null);
  assert.deepEqual(result.changed_files, []);
});

test('verify reports deterministic task branch when selected state came from task branch', async () => {
  const { root, head } = repo();
  const result = await verifyCheckedOutState(request([]), root, head, 'hiiisiii/task-42');

  assert.equal(result.status, 'success');
  assert.equal(result.task_branch, 'hiiisiii/task-42');
  assert.equal(result.head_sha, head);
});

test('verify command failure returns failed without moving selected state', async () => {
  const { root, head } = repo();
  const result = await verifyCheckedOutState(request([
    { id: 'fail', run: 'node -e "process.exit(7)"', timeout_sec: 60 },
  ]), root, head, null);

  assert.equal(result.status, 'failed');
  assert.equal(result.error_code, 'COMMAND_FAILED');
  assert.equal(git(['rev-parse', 'HEAD'], root), head);
});

test('verify tracked mutation is rejected and restored', async () => {
  const { root, head } = repo();
  const result = await verifyCheckedOutState(request([
    { id: 'mutate', run: 'node -e "require(\'fs\').appendFileSync(\'target.txt\', \'bad\\n\')"', timeout_sec: 60 },
  ]), root, head, null);

  assert.equal(result.status, 'failed');
  assert.equal(result.error_code, 'UNEXPECTED_TRACKED_CHANGE');
  assert.deepEqual(result.changed_files, ['target.txt']);
  assert.equal(git(['rev-parse', 'HEAD'], root), head);
  assert.equal(fs.readFileSync(path.join(root, 'target.txt'), 'utf8'), 'two\n');
});

test('verify HEAD movement is rejected and selected SHA is restored', async () => {
  const { root, head } = repo();
  const result = await verifyCheckedOutState(request([
    { id: 'move-head', run: 'git checkout --detach HEAD^', timeout_sec: 60 },
  ]), root, head, null);

  assert.equal(result.status, 'failed');
  assert.equal(result.error_code, 'UNEXPECTED_TRACKED_CHANGE');
  assert.equal(result.head_sha, head);
  assert.equal(git(['rev-parse', 'HEAD'], root), head);
});
