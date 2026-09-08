'use strict';

const { prepare } = require('./prepare');
const { execute } = require('./execute');
const { finalize } = require('./finalize');

async function main() {
  const mode = process.env.INPUT_MODE;
  if (mode === 'prepare') return prepare();
  if (mode === 'execute') return execute();
  if (mode === 'finalize') return finalize();
  throw new Error(`Unsupported mode: ${mode || '<empty>'}`);
}

main().catch((error) => {
  console.error(`hiiisiii action fatal: ${error.message}`);
  process.exitCode = 1;
});
