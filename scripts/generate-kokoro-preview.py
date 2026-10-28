"""One review clip; does not replace, bundle, or publish the existing book voice.

Adapted from NuvoABC/scripts/generate-welcome-voice.py and its 32 kbps
audio compaction pipeline. User-selected af_heart overrides NuvoABC's af_sky.
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
parser.add_argument('--text', default='The farm is waking up. What can we hear?')
parser.add_argument('--name', default='farm-welcome')
parser.add_argument('--output-dir', default='output/voice-review/kokoro-af-heart')
parser.add_argument('--status', default='awaiting-user-listening-review')
args = parser.parse_args()
if not args.name or any(c not in 'abcdefghijklmnopqrstuvwxyz0123456789-' for c in args.name):
    parser.error('--name must use lowercase letters, numbers, and hyphens')
root = Path(__file__).resolve().parents[1]
output = root / args.output_dir
output.mkdir(parents=True, exist_ok=True)
target = output / (args.name + '.m4a')
text = args.text
settings = {'model': 'Kokoro-82M v1.0', 'preset': 'af_heart', 'language': 'en-us',
            'speed': 0.82, 'pitchSemitones': 1, 'sentencePause': 0.3,
            'codec': 'AAC', 'container': 'M4A', 'channels': 1, 'targetBitrate': 32000}
options = ort.SessionOptions()
options.intra_op_num_threads = 2
options.inter_op_num_threads = 1
model = Kokoro.from_session(
    ort.InferenceSession(args.model, sess_options=options, providers=['CPUExecutionProvider']), args.voices)
samples, rate = model.create(text, voice=settings['preset'], speed=settings['speed'],
                             lang=settings['language'], sentence_pause=settings['sentencePause'])
# Reuse NuvoABC's exact pitch-resampling, peak cap, and edge padding.
ratio = 2 ** (settings['pitchSemitones'] / 12)
samples = np.interp(np.arange(0, len(samples), ratio), np.arange(len(samples)), samples)
peak = float(np.max(np.abs(samples)))
assert peak > 0.005 and 1 < len(samples) / rate < 20, 'Unexpected generated sample'
samples *= min(0.88 / peak, 2)
samples = np.r_[np.zeros(round(rate * .06)), samples, np.zeros(round(rate * .12))].astype(np.float32)
subprocess.run([args.ffmpeg, '-v', 'error', '-y', '-f', 'f32le', '-ar', str(rate), '-ac', '1',
                '-i', 'pipe:0', '-map_metadata', '-1', '-ac', '1', '-c:a', 'aac', '-b:a', '32k',
                '-movflags', '+faststart', str(target)], input=samples.tobytes(), check=True)
data = target.read_bytes()
provenance = []
for name in ['generate-welcome-voice.py', 'compact-voice-assets.py']:
    source = Path('/Users/hendry/2026Projects/NuvoABC/scripts') / name
    provenance.append({'path': str(source), 'sha256': hashlib.sha256(source.read_bytes()).hexdigest()})
manifest = {**settings, 'text': text, 'file': target.name, 'sampleRate': rate,
            'durationSeconds': round(len(samples) / rate, 3), 'bytes': len(data),
            'sha256': hashlib.sha256(data).hexdigest(), 'status': args.status,
            'sourceCode': provenance, 'modelSha256': hashlib.sha256(Path(args.model).read_bytes()).hexdigest()}
(output / (args.name + '.manifest.json')).write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'file': str(target), 'durationSeconds': manifest['durationSeconds'],
                  'bytes': len(data), 'voice': settings['preset'], 'status': manifest['status']}))
