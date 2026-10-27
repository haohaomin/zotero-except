const fs = require('node:fs');
const path = require('node:path');
const { runPython } = require('./python.cjs');

function findArchive(kind) {
  const variable = kind === 'platform' ? 'ZOTERO_PLATFORM_ARCHIVE' : 'ZOTERO_APP_ARCHIVE';
  if (process.env[variable]) {
    if (!fs.existsSync(process.env[variable])) throw new Error(`${variable} does not exist`);
    return process.env[variable];
  }
  const roots = process.platform === 'darwin'
    ? ['/Applications/Zotero.app/Contents/Resources']
    : process.platform === 'win32'
      ? [process.env.ProgramW6432, process.env.ProgramFiles, process.env['ProgramFiles(x86)']]
        .filter(Boolean).map(root => path.join(root, 'Zotero'))
      : ['/opt/zotero', '/usr/lib/zotero'];
  return roots.map(root => path.join(root, ...(kind === 'platform' ? [] : ['app']), 'omni.ja'))
    .find(file => fs.existsSync(file));
}

function readArchive(archive, member) {
  return runPython(['-c', 'import zipfile,sys; sys.stdout.write(zipfile.ZipFile(sys.argv[1]).read(sys.argv[2]).decode("utf-8"))', archive, member]);
}

module.exports = { findArchive, readArchive };
