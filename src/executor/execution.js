'use strict';

const { exec, execFileSync } = require('child_process');
const path = require('path');
const { promisify } = require('util');
const { ProtocolError } = require('./protocol');
const execAsync = promisify(exec);

class ExecutionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ExecutionError';
    this.code = code;
  }
}

function commandEnv() {
  const keys = [
    'PATH', 'HOME', 'USERPROFILE', 'TMPDIR', 'TMP', 'TEMP',
    'SYSTEMROOT', 'SystemRoot', 'WINDIR', 'ComSpec', 'PATHEXT',
    'LANG', 'LC_ALL', 'SHELL',
  ];
  const env = {};
  for (const key of keys) {
    if (typeof process.env[key] === 'string') env[key] = process.env[key];
  }
  env.CI = 'true';
  return env;
}

function truncate(text, limit) {
  const value = typeof text === 'string' ? text : String(text ?? '');
  if (value.length <= limit) return { text: value, truncated: false };
  return { text: value.slice(0, limit), truncated: true };
}

async function runCommand(command, cwd, outputLimit) {
  const perStreamLimit = Math.max(1, Math.floor(outputLimit / 2));
  try {
    const { stdout, stderr } = await execAsync(command.run, {
      cwd,
      env: commandEnv(),
      timeout: command.timeout_sec * 1000,
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true,
    });
    const out = truncate(stdout, perStreamLimit);
    const err = truncate(stderr, perStreamLimit);
    return { id: command.id, exit_code: 0, stdout: out.text, stderr: err.text, truncated: out.truncated || err.truncated };
  } catch (error) {
    const out = truncate(error.stdout ?? '', perStreamLimit);
    const err = truncate(error.stderr ?? error.message ?? '', perStreamLimit);
    const timedOut = error.killed === true || error.signal === 'SIGTERM';
    return {
      id: command.id,
      exit_code: Number.isInteger(error.code) ? error.code : 1,
      stdout: out.text,
      stderr: err.text,
      truncated: out.truncated || err.truncated,
      error_code: timedOut ? 'COMMAND_TIMEOUT' : 'COMMAND_FAILED',
    };
  }
}

async function runCommands(commands, projectRoot, workdir, outputLimit) {
  const cwd = path.resolve(projectRoot, workdir);
  const root = path.resolve(projectRoot);
  const relative = path.relative(root, cwd);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    const error = new Error('Resolved workdir escapes project root.');
    error.code = 'PATH_OUTSIDE_ROOT';
    throw error;
  }
  const results = [];
  for (const command of commands) {
    const result = await runCommand(command, cwd, outputLimit);
    results.push(result);
    if (result.exit_code !== 0) break;
  }
  return results;
}

function gitRaw(args, cwd, input = undefined) {
  return execFileSync('git', args, {
    cwd,
    input,
    encoding: 'utf8',
    env: commandEnv(),
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
  });
}

function git(args, cwd, input = undefined) {
  return gitRaw(args, cwd, input).trim();
}

function zPaths(text) {
  return String(text || '').split('\0').filter(Boolean);
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function validatePatchPath(value) {
  if (typeof value !== 'string' || value.length === 0 || value.includes('\0')) {
    throw new ProtocolError('PATH_OUTSIDE_ROOT', 'Patch contains an invalid path.');
  }
  const slash = value.replace(/\\/g, '/');
  if (slash.startsWith('/') || slash.startsWith('//') || /^[A-Za-z]:\//.test(slash)) {
    throw new ProtocolError('PATH_OUTSIDE_ROOT', 'Absolute patch paths are not allowed.');
  }
  const normalized = path.posix.normalize(slash);
  if (normalized === '..' || normalized.startsWith('../') || normalized === '.' || normalized === '.git' || normalized.startsWith('.git/')) {
    throw new ProtocolError('PATH_OUTSIDE_ROOT', 'Patch path escapes or targets Git metadata.');
  }
  return normalized;
}

function extractPatchPaths(patch, cwd) {
  if (/^GIT binary patch$/m.test(patch) || /^Binary files /m.test(patch)) {
    throw new ProtocolError('PATCH_REJECTED', 'Binary patches are not supported in the v0.1 prototype.');
  }
  if (/^(rename|copy) (from|to) /m.test(patch)) {
    throw new ProtocolError('PATCH_REJECTED', 'Rename/copy patches are not supported in the first mutation prototype.');
  }

  let output;
  try {
    output = gitRaw(['apply', '--numstat', '-z', '-'], cwd, patch);
  } catch {
    throw new ExecutionError('PATCH_REJECTED', 'Patch could not be parsed by git apply.');
  }

  const paths = [];
  for (const record of zPaths(output)) {
    const firstTab = record.indexOf('\t');
    const secondTab = firstTab < 0 ? -1 : record.indexOf('\t', firstTab + 1);
    if (firstTab < 0 || secondTab < 0) {
      throw new ExecutionError('PATCH_REJECTED', 'Patch numstat output is invalid.');
    }
    const added = record.slice(0, firstTab);
    const deleted = record.slice(firstTab + 1, secondTab);
    if (added === '-' || deleted === '-') {
      throw new ProtocolError('PATCH_REJECTED', 'Binary patches are not supported in the v0.1 prototype.');
    }
    paths.push(validatePatchPath(record.slice(secondTab + 1)));
  }
  if (paths.length === 0) {
    throw new ExecutionError('PATCH_REJECTED', 'Patch contains no supported file changes.');
  }
  return sortedUnique(paths);
}

function workingTreeFiles(cwd) {
  const tracked = zPaths(gitRaw(['diff', '--name-only', '-z', '--no-renames'], cwd));
  const untracked = zPaths(gitRaw(['ls-files', '--others', '--exclude-standard', '-z'], cwd));
  return sortedUnique([...tracked, ...untracked].map(validatePatchPath));
}

function trackedWorkspaceFiles(cwd) {
  const unstaged = zPaths(gitRaw(['diff', '--name-only', '-z', '--no-renames'], cwd));
  const staged = zPaths(gitRaw(['diff', '--cached', '--name-only', '-z', '--no-renames'], cwd));
  return sortedUnique([...unstaged, ...staged].map(validatePatchPath));
}

function samePaths(left, right) {
  const a = sortedUnique(left);
  const b = sortedUnique(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function assertClean(cwd) {
  if (git(['status', '--porcelain', '--untracked-files=all'], cwd)) {
    throw new ExecutionError('INTERNAL_ERROR', 'Workspace must be clean before apply.');
  }
}

function restoreIntendedState(cwd, taskBranch, headSha) {
  git(['checkout', '-B', taskBranch, headSha], cwd);
  git(['reset', '--hard', headSha], cwd);
}

async function applyPatchAndCommit(request, projectRoot, issueNumber, taskBranch, checkoutSha) {
  assertClean(projectRoot);
  const expectedPaths = extractPatchPaths(request.patch, projectRoot);
  git(['checkout', '-B', taskBranch, checkoutSha], projectRoot);

  try {
    gitRaw(['apply', '--check', '-'], projectRoot, request.patch);
  } catch {
    throw new ExecutionError('PATCH_REJECTED', 'Patch does not apply cleanly to the selected task state.');
  }
  try {
    gitRaw(['apply', '-'], projectRoot, request.patch);
  } catch {
    throw new ExecutionError('PATCH_REJECTED', 'Patch application failed.');
  }

  const actualPaths = workingTreeFiles(projectRoot);
  if (!samePaths(actualPaths, expectedPaths)) {
    throw new ExecutionError('PATCH_REJECTED', 'Applied files differ from patch-declared files.');
  }

  git(['add', '-A', '--', ...expectedPaths], projectRoot);
  const stagedPaths = zPaths(gitRaw(['diff', '--cached', '--name-only', '-z', '--no-renames'], projectRoot)).map(validatePatchPath);
  if (!samePaths(stagedPaths, expectedPaths)) {
    throw new ExecutionError('PATCH_REJECTED', 'Staged files differ from intended patch files.');
  }

  git(['config', '--local', 'user.name', 'hiiisiii-ops'], projectRoot);
  git(['config', '--local', 'user.email', 'hiiisiii-ops@users.noreply.github.com'], projectRoot);
  try {
    git([
      '-c', 'core.hooksPath=.git/hiiisiii-no-hooks',
      'commit', '--no-gpg-sign', '--no-verify',
      '-m', `hiiisiii task #${issueNumber} seq ${request.sequence}`,
    ], projectRoot);
  } catch {
    throw new ExecutionError('PATCH_REJECTED', 'Intended patch could not be committed.');
  }

  const intendedHead = git(['rev-parse', 'HEAD'], projectRoot);
  const commandResults = await runCommands(request.commands, projectRoot, request.workdir, request.output_limit);
  const failedCommand = commandResults.find((item) => item.exit_code !== 0);
  const postVerifyHead = git(['rev-parse', 'HEAD'], projectRoot);
  const extraTracked = trackedWorkspaceFiles(projectRoot);
  const unexpectedMutation = postVerifyHead !== intendedHead || extraTracked.length > 0;

  if (unexpectedMutation) {
    restoreIntendedState(projectRoot, taskBranch, intendedHead);
  }

  return {
    commands: commandResults.map(({ error_code, ...item }) => item),
    changed_files: expectedPaths,
    task_branch: taskBranch,
    head_sha: intendedHead,
    status: unexpectedMutation || failedCommand ? 'failed' : 'success',
    error_code: unexpectedMutation ? 'UNEXPECTED_TRACKED_CHANGE' : (failedCommand?.error_code ?? null),
  };
}

module.exports = {
  ExecutionError,
  commandEnv,
  truncate,
  runCommand,
  runCommands,
  git,
  validatePatchPath,
  extractPatchPaths,
  workingTreeFiles,
  trackedWorkspaceFiles,
  applyPatchAndCommit,
};
