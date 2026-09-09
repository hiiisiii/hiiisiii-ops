'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  applyPatchAndCommit,
  validatePatchPath,
} = require('../src/executor/execution');
const { selectCheckoutSha } = require('../src/action/prepare');
const { validateTaskBranchRef } = require('../src/executor/github');

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function repo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hiiisiii-apply-'));
  git(['init', '-q'], root);
  git(['config', 'user.name', 'test'], root);
  git(['config', 'user.email', 'test@example.com'], root);
  fs.writeFileSync(path.join(root, 'target.txt'), 'before\n');
  fs.writeFileSync(path.join(root, 'other.txt'), 'stable\n');
  git(['add', '.'], root);
  git(['commit', '-qm', 'base'], root);
  return { root, head: git(['rev-parse', 'HEAD'], root) };
}

function patchForTarget(root, next = 'after\n') {
  fs.writeFileSync(path.join(root, 'target.txt'), next);
  const patch = git(['diff', '--no-renames'], root);
  git(['checkout', '--', 'target.txt'], root);
  return `${patch}\n`;
}

function request(patch, commands = []) {
  return {
    sequence: 1,
    patch,
    commands,
    workdir: '.',
    output_limit: 12000,
  };
}

test('patch path validation rejects traversal and Git metadata', () => {
  assert.throws(() => validatePatchPath('../escape.txt'), (error) => error.code === 'PATH_OUTSIDE_ROOT');
  assert.throws(() => validatePatchPath('.git/config'), (error) => error.code === 'PATH_OUTSIDE_ROOT');
});

test('apply creates exactly one intended commit on deterministic task branch', async () => {
  const { root, head } = repo();
  const patch = patchForTarget(root);
  const result = await applyPatchAndCommit(request(patch, [
    { id: 'head', run: 'git rev-parse HEAD', timeout_sec: 60 },
  ]), root, 17, 'hiiisiii/task-17', head);

  assert.equal(result.status, 'success');
  assert.equal(result.task_branch, 'hiiisiii/task-17');
  assert.deepEqual(result.changed_files, ['target.txt']);
  assert.equal(git(['branch', '--show-current'], root), 'hiiisiii/task-17');
  assert.equal(git(['rev-list', '--count', `${head}..${result.head_sha}`], root), '1');
  assert.equal(fs.readFileSync(path.join(root, 'target.txt'), 'utf8'), 'after\n');
});

test('verification failure preserves the intended commit', async () => {
  const { root, head } = repo();
  const patch = patchForTarget(root);
  const result = await applyPatchAndCommit(request(patch, [
    { id: 'fail', run: 'node -e "process.exit(7)"', timeout_sec: 60 },
  ]), root, 18, 'hiiisiii/task-18', head);

  assert.equal(result.status, 'failed');
  assert.equal(result.error_code, 'COMMAND_FAILED');
  assert.equal(git(['rev-parse', 'HEAD'], root), result.head_sha);
  assert.equal(git(['show', `${result.head_sha}:target.txt`], root), 'after');
});

test('verification tracked mutation is not included in the intended commit', async () => {
  const { root, head } = repo();
  const patch = patchForTarget(root);
  const result = await applyPatchAndCommit(request(patch, [
    { id: 'mutate', run: 'node -e "require(\'fs\').appendFileSync(\'other.txt\', \'changed\\n\')"', timeout_sec: 60 },
  ]), root, 19, 'hiiisiii/task-19', head);

  assert.equal(result.status, 'failed');
  assert.equal(result.error_code, 'UNEXPECTED_TRACKED_CHANGE');
  assert.equal(git(['show', `${result.head_sha}:other.txt`], root), 'stable');
  assert.equal(git(['status', '--porcelain', '--untracked-files=no'], root), '');
});

test('prepare task-state selection rejects unverified remote branch state', () => {
  const branch = 'hiiisiii/task-20';
  const base = 'a'.repeat(40);
  const remote = 'b'.repeat(40);
  assert.equal(selectCheckoutSha({ accepted: [] }, branch, null, base), base);
  assert.throws(() => selectCheckoutSha({ accepted: [] }, branch, remote, base), (error) => error.code === 'STALE_BASE_SHA');
  assert.equal(selectCheckoutSha({ accepted: [{ sequence: 1, task_branch: branch, head_sha: remote }] }, branch, remote, base), remote);
  assert.throws(
    () => selectCheckoutSha({ accepted: [{ sequence: 1, task_branch: branch, head_sha: remote }] }, branch, 'c'.repeat(40), base),
    (error) => error.code === 'STALE_BASE_SHA',
  );
});

test('trusted push helper refuses default or arbitrary branches before Git access', () => {
  assert.throws(() => validateTaskBranchRef('main', 'a'.repeat(40)));
  assert.throws(() => validateTaskBranchRef('feature/test', 'a'.repeat(40)));
  assert.doesNotThrow(() => validateTaskBranchRef('hiiisiii/task-21', 'a'.repeat(40)));
});
