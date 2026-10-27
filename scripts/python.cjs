const { spawnSync } = require('node:child_process');

// Do not invoke a shell: Windows paths may contain spaces or non-ASCII text.
function runPython(args) {
  const candidates = process.env.ZOTERO_EXCEPT_PYTHON
    ? [[process.env.ZOTERO_EXCEPT_PYTHON]]
    : process.platform === 'win32'
      ? [['py', '-3'], ['python'], ['python3']]
      : [['python3'], ['python']];
  for (const [command, ...prefix] of candidates) {
    const probe = spawnSync(command, [...prefix, '-c', 'import sys; sys.exit(sys.version_info.major != 3)'], { encoding: 'utf8' });
    if (probe.error || probe.status !== 0) continue;
    const result = spawnSync(command, [...prefix, '-X', 'utf8', ...args], {
      encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr || `Python exited with ${result.status}`);
    return result.stdout;
  }
  throw new Error('Python 3 not found. Install Python 3 or set ZOTERO_EXCEPT_PYTHON to its executable path.');
}

module.exports = { runPython };
if (require.main === module) {
  try { process.stdout.write(runPython(process.argv.slice(2))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
