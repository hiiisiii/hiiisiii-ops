'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ProtocolError } = require('../src/executor/protocol');
const { resolveCommitSha } = require('../src/executor/github');

const originalFetch = global.fetch;

test.afterEach(() => {
  global.fetch = originalFetch;
});

test('resolveCommitSha maps missing ref to BASE_REF_NOT_FOUND', async () => {
  global.fetch = async () => ({ ok: false, status: 404 });

  await assert.rejects(
    () => resolveCommitSha('token', 'owner/repo', 'missing-ref'),
    (error) => error instanceof ProtocolError && error.code === 'BASE_REF_NOT_FOUND',
  );
});

test('resolveCommitSha preserves non-404 API failures as internal errors', async () => {
  global.fetch = async () => ({ ok: false, status: 500 });

  await assert.rejects(
    () => resolveCommitSha('token', 'owner/repo', 'main'),
    (error) => !(error instanceof ProtocolError) && /GitHub commit resolve failed: 500/.test(error.message),
  );
});
