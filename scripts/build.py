from pathlib import Path
import json
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'manifest.json').read_text())
application = manifest['applications']['zotero']
# Zotero's ExtensionData.parseManifest rejects absent update_url even for
# manually distributed plugins. Keep this check before producing any XPI.
for field in ('id', 'update_url', 'strict_max_version'):
    if not application.get(field):
        raise ValueError(f'applications.zotero.{field} not provided')
version = manifest['version']
output = root / 'dist' / f'zotero-except-{version}.xpi'
output.parent.mkdir(exist_ok=True)
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for name in ['manifest.json', 'bootstrap.js', 'src/filter.js']:
        archive.write(root / name, name)
with ZipFile(output) as archive:
    assert archive.testzip() is None
print(output)
