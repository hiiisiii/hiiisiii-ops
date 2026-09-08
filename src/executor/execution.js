'use strict';

const { exec } = require('child_process');
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(exec);

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

module.exports = { commandEnv, runCommand, runCommands, truncate };
