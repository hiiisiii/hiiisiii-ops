'use strict';

const fs = require('fs');

function setOutput(name, value) {
  const output = process.env.GITHUB_OUTPUT;
  if (!output) return;
  fs.appendFileSync(output, `${name}<<HIIISIII_OUTPUT\n${String(value ?? '')}\nHIIISIII_OUTPUT\n`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

module.exports = { setOutput, readJson, writeJson };
