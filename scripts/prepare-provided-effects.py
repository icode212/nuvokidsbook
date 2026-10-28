"""Prepare the user's supplied recordings without modifying their source files."""
import argparse
import array
import hashlib
import json
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--ffmpeg', required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
base = '/books/a-day-at-the-farm/0.8.0'
output = root / ('public' + base)
(output / 'effects').mkdir(parents=True, exist_ok=True)
sources = {'cow': 'cow-moo2.wav', 'calf': 'Calf.wav', 'lamb': 'Lamb.wav', 'birds': 'Birds.wav', 'sheep': 'Sheeps.mov',
           'ducks': 'Ducks.wav', 'hen': 'Hen.wav', 'chicks': 'Chickens.wav', 'horse': 'Horse.wav', 'door': 'Door.wav', 'scratching-feet': 'Scratching Feet.wav'}
inventory = json.loads((root / 'public/books/a-day-at-the-farm/0.4.0/inventory.json').read_text())
inventory['contentVersion'] = '0.8.0'
inventory['assets'] = [a for a in inventory['assets'] if '/effects/' not in a['url']]
mapping, ledger = {}, []
for key, name in sources.items():
    source = root / 'docs/animals-sound' / name
    raw = subprocess.run([args.ffmpeg, '-v', 'error', '-i', str(source), '-vn',
        '-ac', '1', '-ar', '24000', '-f', 's16le', 'pipe:1'], capture_output=True, check=True).stdout
    samples = array.array('h', raw)
    peak = max(abs(v) for v in samples)
    assert peak > 0, name
    gain = min(1, .45 * 32767 / peak)
    # Keep the full recording and original timing; soften only its outer 20 ms.
    fade = 480
    samples = array.array('h', (round(v * gain * min(1, i/fade, (len(samples)-1-i)/fade))
        for i, v in enumerate(samples)))
    target = output / 'effects' / (key + '.m4a')
    subprocess.run([args.ffmpeg, '-v', 'error', '-y', '-f', 's16le', '-ar', '24000',
        '-ac', '1', '-i', 'pipe:0', '-map_metadata', '-1', '-ac', '1', '-c:a', 'aac',
        '-b:a', '64k', '-movflags', '+faststart', str(target)], input=samples.tobytes(), check=True)
    data = target.read_bytes()
    asset = dict(url=f'{base}/effects/{key}.m4a', bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
    inventory['assets'].append(asset)
    mapping[key] = asset['url']
    ledger.append(dict(**asset, source=f'docs/animals-sound/{name}',
        sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),
        provenance='User supplied; external source and license not specified',
        changes='Full audio, mono 24 kHz AAC M4A targeting 64 kbps, peak reduction only, 20 ms edge fades',
        durationSeconds=round(len(samples)/24000, 3)))
# Chicks use Chickens.wav until a dedicated chick-peep recording is provided.
(root / 'content-source/a-day-at-the-farm/effects.json').write_text(json.dumps(mapping, indent=2)+'\n')
(root / 'content-source/a-day-at-the-farm/effect-rights.json').write_text(json.dumps(ledger, indent=2)+'\n')
(output / 'inventory.json').write_text(json.dumps(inventory, indent=2)+'\n')
print(f'Prepared {len(sources)} supplied recordings; full pack {sum(a["bytes"] for a in inventory["assets"])/1024/1024:.2f} MB')
