'use strict';

const { ProtocolError, recoverIdentity } = require('./protocol');
const { runCommands, git, trackedWorkspaceFiles } = require('./execution');

function assertVerifyClean(cwd) {
  if (git(['status', '--porcelain', '--untracked-files=all'], cwd)) {
    const error = new Error('Workspace must be clean before verify.');
    error.code = 'INTERNAL_ERROR';
    throw error;
  }
}

function restoreVerifyState(cwd, checkoutSha) {
  git(['checkout', '--detach', '-f', checkoutSha], cwd);
  git(['reset', '--hard', checkoutSha], cwd);
}

async function verifyCheckedOutState(request, projectRoot, checkoutSha, taskBranch = null) {
  assertVerifyClean(projectRoot);
  const initialHead = git(['rev-parse', 'HEAD'], projectRoot);
  if (initialHead !== checkoutSha) {
    throw new ProtocolError('STALE_BASE_SHA', 'Verify checkout differs from prepared checkout SHA.', recoverIdentity(request));
  }

  const commandResults = await runCommands(request.commands, projectRoot, request.workdir, request.output_limit);
  const failedCommand = commandResults.find((item) => item.exit_code !== 0);
  const postVerifyHead = git(['rev-parse', 'HEAD'], projectRoot);
  const trackedChanges = trackedWorkspaceFiles(projectRoot);
  const unexpectedMutation = postVerifyHead !== checkoutSha || trackedChanges.length > 0;

  if (unexpectedMutation) {
    restoreVerifyState(projectRoot, checkoutSha);
  }

  return {
    commands: commandResults.map(({ error_code, ...item }) => item),
    changed_files: trackedChanges,
    task_branch: taskBranch,
    head_sha: checkoutSha,
    status: unexpectedMutation || failedCommand ? 'failed' : 'success',
    error_code: unexpectedMutation ? 'UNEXPECTED_TRACKED_CHANGE' : (failedCommand?.error_code ?? null),
  };
}

module.exports = { assertVerifyClean, restoreVerifyState, verifyCheckedOutState };
