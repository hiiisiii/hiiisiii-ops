'use strict';

const { ProtocolError, recoverIdentity } = require('../executor/protocol');
const { ExecutionError, runCommands, applyPatchAndCommit, git } = require('../executor/execution');
const { readJson, writeJson, setOutput } = require('./io');

function changedFiles(cwd) {
  const output = git(['status', '--porcelain'], cwd);
  if (!output) return [];
  return output.split(/\r?\n/).filter(Boolean).map((line) => line.slice(3).trim());
}

async function execute() {
  if (process.env.INPUT_GITHUB_TOKEN) {
    throw new Error('execute mode must not receive github_token.');
  }

  const controlFile = process.env.INPUT_CONTROL_FILE;
  const resultFile = process.env.INPUT_RESULT_FILE;
  const workspace = process.env.GITHUB_WORKSPACE;
  if (!controlFile || !resultFile || !workspace) {
    throw new Error('execute requires control_file, result_file, and GITHUB_WORKSPACE.');
  }

  const control = readJson(controlFile);
  const request = control.request;
  let result = readJson(resultFile);

  try {
    if (control.schema !== 'hiiisiii.control.v1') {
      throw new ProtocolError('INVALID_SCHEMA', 'Unsupported prepared control schema.', recoverIdentity(request));
    }
    if (!['inspect', 'apply'].includes(request.operation)) {
      throw new ProtocolError('INVALID_SCHEMA', 'Current v0.1 runtime executes inspect/apply; standalone verify is not implemented yet.', recoverIdentity(request));
    }

    const currentHead = git(['rev-parse', 'HEAD'], workspace);
    if (currentHead !== control.checkout_sha) {
      throw new ProtocolError('STALE_BASE_SHA', 'Checked out SHA differs from prepared checkout SHA.', recoverIdentity(request));
    }

    if (request.operation === 'apply') {
      const applied = await applyPatchAndCommit(
        request,
        workspace,
        control.issue_number,
        control.task_branch,
        control.checkout_sha,
      );
      result = { ...result, ...applied };
    } else {
      const commandResults = await runCommands(request.commands, workspace, request.workdir, request.output_limit);
      const failed = commandResults.find((item) => item.exit_code !== 0);
      result.commands = commandResults.map(({ error_code, ...item }) => item);
      result.changed_files = changedFiles(workspace);
      result.task_branch = control.task_branch_sha ? control.task_branch : null;
      result.head_sha = git(['rev-parse', 'HEAD'], workspace);
      result.status = failed ? 'failed' : 'success';
      result.error_code = failed?.error_code ?? null;
    }
  } catch (error) {
    if (error instanceof ProtocolError) {
      result = { ...result, ...error.partial, status: 'rejected', error_code: error.code };
    } else if (error instanceof ExecutionError) {
      result.status = 'failed';
      result.error_code = error.code;
    } else {
      result.status = 'failed';
      result.error_code = error.code === 'PATH_OUTSIDE_ROOT' ? 'PATH_OUTSIDE_ROOT' : 'INTERNAL_ERROR';
    }
  }

  writeJson(resultFile, result);
  setOutput('result_file', resultFile);
}

module.exports = { execute, changedFiles, git };
