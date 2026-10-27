from pathlib import Path
import json
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
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
        # Use portable ZIP member names and metadata on every OS.
        info = ZipInfo(name, date_time=(2020, 1, 1, 0, 0, 0))
        info.create_system = 3
        info.external_attr = 0o100644 << 16
        info.compress_type = ZIP_DEFLATED
        archive.writestr(info, (root / name).read_bytes())
with ZipFile(output) as archive:
    assert archive.testzip() is None
print(output)
