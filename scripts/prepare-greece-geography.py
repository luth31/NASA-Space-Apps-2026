"""Derive licensed local Greece admin-1 contours from Natural Earth's source file.
Usage: python3 scripts/prepare-greece-geography.py /path/to/ne_10m_admin_1_states_provinces.geojson
"""
import hashlib,json,sys
from pathlib import Path
source=Path(sys.argv[1])
data=json.loads(source.read_text())
def rounded(coords):
    return [round(v,5) if isinstance(v,(int,float)) else rounded(v) for v in coords]
features=[]
for feature in data['features']:
    p=feature['properties']
    if p.get('admin')!='Greece': continue
    features.append({'type':'Feature','properties':{'NAME_EN':p.get('name_en') or p['name'],'CONTINENT':'Europe','ISO_A3':p['iso_3166_2'],'TYPE':p.get('type_en'),'LABEL_LON':p.get('longitude'),'LABEL_LAT':p.get('latitude')},'geometry':{'type':feature['geometry']['type'],'coordinates':rounded(feature['geometry']['coordinates'])}})
out=Path('web/public/assets/geography/greece-admin1.json')
out.write_text(json.dumps({'type':'FeatureCollection','features':features},separators=(',',':')))
Path('web/public/assets/geography/greece-admin1-source.txt').write_text('Natural Earth 1:10m Admin 1 states/provinces, public domain. Downloaded 2026-11-15. Source URL: https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson\nOriginal SHA256: '+hashlib.sha256(source.read_bytes()).hexdigest()+'\nDerivative: Greece only, 13 regions and Mount Athos; retained English name, subdivision identifier, type, label coordinate; geometric coordinates rounded to 5 decimals. Generalized geographic context, not an official legal boundary. Natural Earth notes this dataset is beta and may not reflect every administrative change.\nLicense: https://www.naturalearthdata.com/about/terms-of-use/\nDataset: https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/\n')
print(len(features),'features;',out.stat().st_size,'bytes')
