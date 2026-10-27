"""Check installable contents, UTF-8 metadata, and ZIP portability on all OSes."""
import json
from pathlib import Path
from zipfile import ZipFile

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
with ZipFile(root / 'dist' / f"zotero-except-{manifest['version']}.xpi") as archive:
    assert archive.testzip() is None
    assert set(archive.namelist()) == {'manifest.json', 'bootstrap.js', 'src/filter.js'}
    assert json.loads(archive.read('manifest.json').decode('utf-8')) == manifest
    for name in archive.namelist():
        assert '\\' not in name and not name.startswith('/')
        assert archive.read(name) == (root / name).read_bytes()
print('XPI verified: portable paths, UTF-8 manifest, CRC and source contents')
