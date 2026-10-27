const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runPython } = require('../scripts/python.cjs');

test('build and verify an XPI from a directory containing Chinese characters and spaces', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zotero 中文路径 '));
  try {
    const files = ['manifest.json', 'bootstrap.js', 'src/filter.js', 'scripts/build.py', 'scripts/verify-package.py'];
    for (const file of files) {
      const target = path.join(root, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(file, target);
    }
    const version = JSON.parse(fs.readFileSync('manifest.json', 'utf8')).version;
    runPython([path.join(root, 'scripts/build.py')]);
    const output = path.join(root, 'dist', `zotero-except-${version}.xpi`);
    const first = fs.readFileSync(output);
    // Filesystem timestamp differences should not change the install package.
    fs.utimesSync(path.join(root, 'bootstrap.js'), new Date(2021, 0, 1), new Date(2021, 0, 1));
    runPython([path.join(root, 'scripts/build.py')]);
    assert.deepEqual(fs.readFileSync(output), first);
    assert.match(runPython([path.join(root, 'scripts/verify-package.py')]), /XPI verified/);
  }
  finally { fs.rmSync(root, { recursive: true, force: true }); }
});
