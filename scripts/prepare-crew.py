"""Prepare the provided portrait and approved Kokoro crew introductions."""
import argparse
import json
import subprocess
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
for name in ['model', 'voices', 'ffmpeg']:
    parser.add_argument('--'+name, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
crew = json.loads((root/'content-source/crew.json').read_text())
output = root/'public/crew/1.0.0'
output.mkdir(parents=True, exist_ok=True)
subprocess.run([args.ffmpeg, '-v', 'error', '-y', '-i', str(root/'docs/characters/Wonder-Crew.png'),
    '-vf', 'scale=1200:-1', '-c:v', 'libwebp', '-quality', '85', str(output/'wonder-crew.webp')], check=True)
for cue in [crew['intro'], *crew['friends']]:
    command = [sys.executable, str(root/'scripts/generate-kokoro-preview.py'),
        '--name', Path(cue['audio']).stem, '--text', cue['text'],
        '--output-dir', 'public/crew/1.0.0', '--status', 'bundled']
    for name in ['model', 'voices', 'ffmpeg']: command += ['--'+name, getattr(args, name)]
    subprocess.run(command, check=True)
