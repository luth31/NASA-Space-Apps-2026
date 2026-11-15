"""Rebuild the pinned static terrain assets and display-only 1:50m geometry.
Run from the repository root. URLs and expected hashes are in terrain-sources.json.
Satellite observations and the existing count-assignment geometry are untouched.
"""
from pathlib import Path
import hashlib
import json
import urllib.request

folder = Path('web/public/assets/geography')
manifest = json.loads((folder / 'terrain-sources.json').read_text())

def rounded(coords):
    return [round(x, 5) if isinstance(x, (int, float)) else rounded(x) for x in coords]

for record in manifest['files']:
    with urllib.request.urlopen(record['source'], timeout=90) as response:
        content = response.read()
    original_hash = record.get('originalSha256', record['sha256'])
    assert hashlib.sha256(content).hexdigest() == original_hash, 'Upstream asset changed: ' + record['file']
    if record['file'].endswith('.json'):
        data = json.loads(content)
        data['features'] = [dict(type='Feature', properties={key:feature['properties'].get(key, '') for key in ['NAME_EN', 'CONTINENT', 'ISO_A3', 'SUBREGION']}, geometry=dict(type=feature['geometry']['type'], coordinates=rounded(feature['geometry']['coordinates']))) for feature in data['features']]
        content = json.dumps(data, separators=(',', ':')).encode()
    assert hashlib.sha256(content).hexdigest() == record['sha256'], 'Derived hash mismatch: ' + record['file']
    (folder / record['file']).write_bytes(content)
    print(record['file'], len(content))
