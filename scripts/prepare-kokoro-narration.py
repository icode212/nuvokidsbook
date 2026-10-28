"""Bundle farm narration using the approved NuvoABC Kokoro voice pipeline.

Requires kokoro-onnx==0.6.1. Supply local model/voices and ffmpeg paths.
Animal effect assets remain untouched. Existing versions remain available.
"""
import argparse
import hashlib
import json
import os
import subprocess
from pathlib import Path

os.environ['ORT_DISABLE_TELEMETRY'] = '1'
import numpy as np
import onnxruntime as ort
from kokoro_onnx import Kokoro

parser = argparse.ArgumentParser()
for name in ['model', 'voices', 'ffmpeg']:
    parser.add_argument('--' + name, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
source = root / 'content-source/a-day-at-the-farm/narration.json'
cues = json.loads(source.read_text())
base = '/books/a-day-at-the-farm/0.4.0'
output = root / ('public' + base)
(output / 'audio').mkdir(parents=True, exist_ok=True)
settings = dict(model='Kokoro-82M v1.0', preset='af_heart', language='en-us',
                speed=0.82, pitchSemitones=1, sentencePause=0.3,
                codec='AAC', container='M4A', channels=1, targetBitrate=32000)
options = ort.SessionOptions()
options.intra_op_num_threads = 2
options.inter_op_num_threads = 1
model = Kokoro.from_session(ort.InferenceSession(args.model, sess_options=options,
    providers=['CPUExecutionProvider']), args.voices)
inventory = json.loads((root / 'public/books/a-day-at-the-farm/0.3.0/inventory.json').read_text())
inventory['contentVersion'] = '0.4.0'
inventory['assets'] = [a for a in inventory['assets'] if '/audio/' not in a['url']]
mapping, recordings = {}, []
for index, (text, old_path) in enumerate(cues.items(), 1):
    name = Path(old_path).stem + '.m4a'
    target = output / 'audio' / name
    samples, rate = model.create(text, voice='af_heart', speed=0.82,
        lang='en-us', sentence_pause=0.3)
    # Exact pitch, normalization and edge padding from NuvoABC's welcome generator.
    ratio = 2 ** (1 / 12)
    samples = np.interp(np.arange(0, len(samples), ratio), np.arange(len(samples)), samples)
    peak = float(np.max(np.abs(samples)))
    assert peak > .005 and len(samples) / rate > .2, text
    samples *= min(.88 / peak, 2)
    samples = np.r_[np.zeros(round(rate * .06)), samples,
                    np.zeros(round(rate * .12))].astype(np.float32)
    subprocess.run([args.ffmpeg, '-v', 'error', '-y', '-f', 'f32le', '-ar', str(rate),
        '-ac', '1', '-i', 'pipe:0', '-map_metadata', '-1', '-ac', '1', '-c:a', 'aac',
        '-b:a', '32k', '-movflags', '+faststart', str(target)], input=samples.tobytes(), check=True)
    data = target.read_bytes()
    entry = dict(url=f'{base}/audio/{name}', bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
    inventory['assets'].append(entry)
    mapping[text] = entry['url']
    recordings.append(dict(**entry, text=text, durationSeconds=round(len(samples)/rate, 3)))
    print(f'{index}/{len(cues)} {name}', flush=True)
# Only switch the content mapping after the complete batch succeeds.
(output / 'inventory.json').write_text(json.dumps(inventory, indent=2) + '\n')
(output / 'voice-manifest.json').write_text(json.dumps(dict(settings=settings,
    sourceCode=['NuvoABC/scripts/generate-welcome-voice.py', 'NuvoABC/scripts/compact-voice-assets.py'],
    modelSha256=hashlib.sha256(Path(args.model).read_bytes()).hexdigest(), recordings=recordings), indent=2) + '\n')
source.write_text(json.dumps(mapping, indent=2) + '\n')
print(f'Prepared {len(mapping)} clips; pack {sum(a["bytes"] for a in inventory["assets"])/1024/1024:.2f} MB')
