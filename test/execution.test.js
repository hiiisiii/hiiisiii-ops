'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { commandEnv, truncate } = require('../src/executor/execution');

test('task command environment does not inherit GitHub or action token variables', () => {
  process.env.GITHUB_TOKEN = 'secret';
  process.env.GH_TOKEN = 'secret';
  process.env.INPUT_GITHUB_TOKEN = 'secret';
  process.env.ACTIONS_RUNTIME_TOKEN = 'secret';
  const env = commandEnv();
  assert.equal(env.GITHUB_TOKEN, undefined);
  assert.equal(env.GH_TOKEN, undefined);
  assert.equal(env.INPUT_GITHUB_TOKEN, undefined);
  assert.equal(env.ACTIONS_RUNTIME_TOKEN, undefined);
});

test('truncate returns bounded output and flag', () => {
  assert.deepEqual(truncate('abcdef', 3), { text: 'abc', truncated: true });
});
