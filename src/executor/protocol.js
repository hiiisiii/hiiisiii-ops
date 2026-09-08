'use strict';

const path = require('path');

const REQUEST_BEGIN = '<!-- HIIISIII_TASK_REQUEST_BEGIN -->';
const REQUEST_END = '<!-- HIIISIII_TASK_REQUEST_END -->';
const RESULT_BEGIN = '<!-- HIIISIII_TASK_RESULT_BEGIN -->';
const RESULT_END = '<!-- HIIISIII_TASK_RESULT_END -->';

const LIMITS = Object.freeze({
  maxCommands: 8,
  maxRunChars: 4000,
  maxTimeoutSec: 900,
  maxOutputLimit: 24000,
  maxPatchBytes: 512 * 1024,
});

const TASK_KEYS = [
  'schema', 'request_id', 'sequence', 'operation', 'target_id',
  'base_ref', 'base_sha', 'workdir', 'commands', 'patch', 'output_limit',
];
const COMMAND_KEYS = ['id', 'run', 'timeout_sec'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA_RE = /^[0-9a-f]{40,64}$/i;

class ProtocolError extends Error {
  constructor(code, message, partial = {}) {
    super(message);
    this.name = 'ProtocolError';
    this.code = code;
    this.partial = partial;
  }
}

function exactKeys(obj, allowed) {
  const keys = Object.keys(obj).sort();
  const expected = [...allowed].sort();
  return keys.length === expected.length && keys.every((k, i) => k === expected[i]);
}

function stripJsonFence(text) {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i);
  return match ? match[1].trim() : trimmed;
}

function extractSingleMarkedBlock(text, begin, end) {
  if (typeof text !== 'string') {
    throw new ProtocolError('INVALID_SCHEMA', 'Issue body must be text.');
  }
  const firstBegin = text.indexOf(begin);
  const firstEnd = text.indexOf(end);
  if (firstBegin < 0 || firstEnd < 0 || firstEnd <= firstBegin) {
    throw new ProtocolError('INVALID_SCHEMA', 'Task request markers are missing or out of order.');
  }
  if (text.indexOf(begin, firstBegin + begin.length) !== -1 || text.indexOf(end, firstEnd + end.length) !== -1) {
    throw new ProtocolError('INVALID_SCHEMA', 'Exactly one task request marker pair is required.');
  }
  return text.slice(firstBegin + begin.length, firstEnd).trim();
}

function parseRequestFromIssueBody(body) {
  const block = extractSingleMarkedBlock(body, REQUEST_BEGIN, REQUEST_END);
  const raw = stripJsonFence(block);
  let value;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    throw new ProtocolError('INVALID_SCHEMA', `Task request JSON is invalid: ${error.message}`);
  }
  validateTask(value);
  return value;
}

function normalizeWorkdir(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 1024 || value.includes('\0')) {
    throw new ProtocolError('INVALID_WORKDIR', 'workdir must be a bounded non-empty relative path.');
  }
  if (path.isAbsolute(value) || /^[A-Za-z]:[\\/]/.test(value) || /^\\\\/.test(value)) {
    throw new ProtocolError('INVALID_WORKDIR', 'Absolute workdir is not allowed.');
  }
  const slash = value.replace(/\\/g, '/');
  const parts = slash.split('/');
  if (parts.includes('..')) {
    throw new ProtocolError('PATH_OUTSIDE_ROOT', 'workdir traversal is not allowed.');
  }
  const normalized = path.posix.normalize(slash);
  if (normalized === '..' || normalized.startsWith('../')) {
    throw new ProtocolError('PATH_OUTSIDE_ROOT', 'workdir escapes project root.');
  }
  return normalized;
}

function validateTask(task) {
  if (!task || typeof task !== 'object' || Array.isArray(task) || !exactKeys(task, TASK_KEYS)) {
    throw new ProtocolError('INVALID_SCHEMA', 'Task request has missing or unknown fields.', recoverIdentity(task));
  }
  if (task.schema !== 'hiiisiii.task.v1') {
    throw new ProtocolError('INVALID_SCHEMA', 'Unsupported task schema.', recoverIdentity(task));
  }
  if (typeof task.request_id !== 'string' || !UUID_RE.test(task.request_id)) {
    throw new ProtocolError('INVALID_SCHEMA', 'request_id must be a UUID.', recoverIdentity(task));
  }
  if (!Number.isInteger(task.sequence) || task.sequence < 1) {
    throw new ProtocolError('INVALID_SEQUENCE', 'sequence must be an integer >= 1.', recoverIdentity(task));
  }
  if (!['inspect', 'apply', 'verify'].includes(task.operation)) {
    throw new ProtocolError('INVALID_SCHEMA', 'Unsupported operation.', recoverIdentity(task));
  }
  if (task.target_id !== 'local') {
    throw new ProtocolError('INVALID_TARGET', 'First prototype only supports target_id=local.', recoverIdentity(task));
  }
  if (typeof task.base_ref !== 'string' || task.base_ref.length < 1 || task.base_ref.length > 256) {
    throw new ProtocolError('INVALID_SCHEMA', 'base_ref must be a bounded non-empty string.', recoverIdentity(task));
  }
  if (task.base_sha !== null && (typeof task.base_sha !== 'string' || !SHA_RE.test(task.base_sha))) {
    throw new ProtocolError('STALE_BASE_SHA', 'base_sha must be null or a Git SHA.', recoverIdentity(task));
  }
  task.workdir = normalizeWorkdir(task.workdir);
  if (!Array.isArray(task.commands) || task.commands.length > LIMITS.maxCommands) {
    throw new ProtocolError('INVALID_SCHEMA', `commands must contain at most ${LIMITS.maxCommands} items.`, recoverIdentity(task));
  }
  for (const command of task.commands) {
    if (!command || typeof command !== 'object' || Array.isArray(command) || !exactKeys(command, COMMAND_KEYS)) {
      throw new ProtocolError('INVALID_SCHEMA', 'Command has missing or unknown fields.', recoverIdentity(task));
    }
    if (typeof command.id !== 'string' || command.id.length < 1 || command.id.length > 64) {
      throw new ProtocolError('INVALID_SCHEMA', 'Command id is invalid.', recoverIdentity(task));
    }
    if (typeof command.run !== 'string' || command.run.length < 1 || command.run.length > LIMITS.maxRunChars) {
      throw new ProtocolError('INVALID_SCHEMA', 'Command run is invalid or too long.', recoverIdentity(task));
    }
    if (!Number.isInteger(command.timeout_sec) || command.timeout_sec < 1 || command.timeout_sec > LIMITS.maxTimeoutSec) {
      throw new ProtocolError('INVALID_SCHEMA', 'Command timeout is out of range.', recoverIdentity(task));
    }
  }
  if (!Number.isInteger(task.output_limit) || task.output_limit < 1 || task.output_limit > LIMITS.maxOutputLimit) {
    throw new ProtocolError('INVALID_SCHEMA', 'output_limit is out of range.', recoverIdentity(task));
  }
  if (task.operation === 'apply') {
    if (typeof task.patch !== 'string' || task.patch.length === 0) {
      throw new ProtocolError('PATCH_REQUIRED', 'apply requires a non-empty patch.', recoverIdentity(task));
    }
    if (Buffer.byteLength(task.patch, 'utf8') > LIMITS.maxPatchBytes) {
      throw new ProtocolError('PATCH_REJECTED', 'Patch exceeds hard byte limit.', recoverIdentity(task));
    }
  } else if (task.patch !== null) {
    throw new ProtocolError('PATCH_NOT_ALLOWED', `${task.operation} does not allow patch.`, recoverIdentity(task));
  }
  return task;
}

function recoverIdentity(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { request_id: null, sequence: null, operation: null };
  }
  return {
    request_id: typeof value.request_id === 'string' && UUID_RE.test(value.request_id) ? value.request_id : null,
    sequence: Number.isInteger(value.sequence) && value.sequence >= 1 ? value.sequence : null,
    operation: ['inspect', 'apply', 'verify'].includes(value.operation) ? value.operation : null,
  };
}

function parseResultComment(body) {
  if (typeof body !== 'string' || !body.includes(RESULT_BEGIN) || !body.includes(RESULT_END)) return null;
  try {
    const block = extractSingleMarkedBlock(body, RESULT_BEGIN, RESULT_END);
    return JSON.parse(stripJsonFence(block));
  } catch {
    return null;
  }
}

function analyzeHistory(comments, current, trustedResultActor = null) {
  const eligible = trustedResultActor
    ? comments.filter((comment) => comment?.user?.login === trustedResultActor)
    : comments;
  const results = eligible.map((comment) => parseResultComment(comment.body)).filter(Boolean);
  if (current.request_id && results.some((r) => r.request_id === current.request_id)) {
    throw new ProtocolError('DUPLICATE_REQUEST', 'request_id already has a result.', recoverIdentity(current));
  }
  const accepted = results.filter((r) => r.status === 'success' || r.status === 'failed');
  const maxSequence = accepted.reduce((max, r) => Number.isInteger(r.sequence) ? Math.max(max, r.sequence) : max, 0);
  const expected = maxSequence + 1;
  if (current.sequence !== expected) {
    throw new ProtocolError('INVALID_SEQUENCE', `Expected sequence ${expected}, received ${current.sequence}.`, recoverIdentity(current));
  }
  const canonicalBase = accepted.find((r) => typeof r.base_sha === 'string' && SHA_RE.test(r.base_sha))?.base_sha ?? null;
  if (current.sequence > 1) {
    if (!canonicalBase || current.base_sha !== canonicalBase) {
      throw new ProtocolError('STALE_BASE_SHA', 'base_sha does not match canonical task base.', recoverIdentity(current));
    }
  }
  return { results, accepted, canonicalBase };
}

module.exports = {
  REQUEST_BEGIN,
  REQUEST_END,
  RESULT_BEGIN,
  RESULT_END,
  LIMITS,
  ProtocolError,
  parseRequestFromIssueBody,
  validateTask,
  normalizeWorkdir,
  parseResultComment,
  analyzeHistory,
  recoverIdentity,
};
