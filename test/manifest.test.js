const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

test('release metadata includes required Zotero installation fields', () => {
  const manifest = JSON.parse(fs.readFileSync('manifest.json'));
  const pkg = JSON.parse(fs.readFileSync('package.json'));
  assert.equal(manifest.version, pkg.version);
  assert.equal(manifest.manifest_version, 2);
  const application = manifest.applications.zotero;
  for (const field of ['id', 'update_url', 'strict_min_version', 'strict_max_version']) {
    assert.equal(typeof application[field], 'string');
    assert.ok(application[field].length > 0, `${field} is required`);
  }
  assert.equal(new URL(application.update_url).protocol, 'https:');
});

const installedArchive = '/Applications/Zotero.app/Contents/Resources/omni.ja';
test('installed Zotero manifest requirements reject the old package and accept the new manifest',
  { skip: !fs.existsSync(installedArchive) }, () => {
    const source = execFileSync('python3', ['-c',
      'import zipfile,sys; print(zipfile.ZipFile(sys.argv[1]).read("modules/Extension.sys.mjs").decode())',
      installedArchive], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
    // Execute the actual installed Zotero-specific validation block, without
    // invoking the app, installing an extension, or touching the user's profile.
    const start = source.indexOf('if (!manifest.applications?.zotero?.id)');
    const end = source.indexOf('manifest.browser_specific_settings = undefined;', start);
    assert.ok(start >= 0 && end > start, 'Installed validator must be located explicitly');
    const validate = manifest => {
      const errors = [];
      vm.runInNewContext(source.slice(start, end), { manifest, manifestError: e => errors.push(e) });
      return errors;
    };
    const current = JSON.parse(fs.readFileSync('manifest.json'));
    assert.deepEqual(validate(current), []);
    const old = structuredClone(current);
    delete old.applications.zotero.update_url;
    assert.deepEqual(validate(old), ['applications.zotero.update_url not provided']);
  });
