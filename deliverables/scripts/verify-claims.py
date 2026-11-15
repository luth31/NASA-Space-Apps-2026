"""Recompute stage figures from the pinned app bundle; no network or training."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
source = ROOT / 'web/public/data/manifest.json'
manifest = json.loads(source.read_text())
cases = {c['id']: c for c in manifest['cases']}
combined = {}
for case_id in ('evros', 'evia'):
    for row in cases[case_id]['months']:
        combined.setdefault(row['month'], []).append(row['viirs'])
annual = []
# Match pipeline/monthly.py: 2012 is a partial S-NPP observing year, even
# though the archive contains twelve rows (including early zero counts).
for year in range(2013, 2026):
    rows = [combined.get(f'{year}-{month:02}', []) for month in range(1, 13)]
    if not all(len(values) == 2 and all(v is not None for v in values) for values in rows):
        continue
    counts = [sum(values) for values in rows]
    annual.append({'year': year, 'total': sum(counts), 'august': counts[7],
                   'peakMonths': [i + 1 for i, v in enumerate(counts) if v == max(counts)]})
season = next(row for row in annual if row['year'] == 2023)
evros = next(row for row in cases['evros']['months'] if row['month'] == '2023-08')
result = {
    'manifestSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'bundleVersion': manifest['bundleVersion'],
    'scope': 'Evros + Evia rectangular study areas; raw S-NPP VIIRS detections, not unique fires or national totals',
    'august2023': {'detections': season['august'], 'yearTotal': season['total'], 'sharePercent': season['august'] / season['total'] * 100},
    'octoberPeak': {'years': sum(row['peakMonths'] == [10] for row in annual), 'completeYears': len(annual), 'period': '2013–2025', 'excluded': '2012: partial S-NPP observing year'},
    'evrosAugust2023': {'modis': evros['modis'], 'viirs': evros['viirs'], 'ratio': evros['viirs'] / evros['modis'], 'imageDate': cases['evros']['date']},
    'annualEvidence': annual,
}
assert (season['august'], season['total']) == (4178, 4685)
assert result['octoberPeak']['years'] == 9 and len(annual) == 13
assert (evros['modis'], evros['viirs']) == (625, 4175)
print(json.dumps(result, indent=2))
