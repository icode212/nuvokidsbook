"""Prepare short, softly levelled real animal calls from verified CC0 sources."""
from pathlib import Path
import urllib.request, subprocess, tempfile, wave, array, math, hashlib, json, sys

root = Path(__file__).resolve().parents[1]
base = '/books/a-day-at-the-farm/0.3.0'
dest = root / ('public' + base) / 'effects'
dest.mkdir(parents=True, exist_ok=True)
sources = [
 ('cow','spurioustransients','513557','2898771',0,2.7),
 ('birds','FartMuffin','506285','10643288',0,2.6),
 ('sheep','michaelperfect','710296','201532',0,1.2),
 ('ducks','gibarroule','365133','6659813',0,3.2),
 ('hen','Breviceps','456803','9159316',0,3.2),
 ('chicks','AGFX','43380','50975',0,2.7),
 ('horse','dontwanttobehere','656661','14434814',0,4),
]
inventory = json.loads((root/'public/books/a-day-at-the-farm/0.2.0/inventory.json').read_text())
inventory['contentVersion'] = '0.3.0'
mapping, ledger = {}, []
with tempfile.TemporaryDirectory(prefix='nuvo-farm-effects-') as temp:
 for name,author,sound_id,user_id,start,duration in sources:
  url = f'https://cdn.freesound.org/previews/{int(sound_id)//1000}/{sound_id}_{user_id}-hq.mp3'
  src, decoded = Path(temp)/f'{name}.mp3', Path(temp)/f'{name}.wav'
  if '--local' in sys.argv:
   src.write_bytes((root/f'content-source/audio-masters/{name}.mp3').read_bytes())
  else:
   request = urllib.request.Request(url, headers={'User-Agent':'NuvoKidsBook asset preparation'})
   src.write_bytes(urllib.request.urlopen(request,timeout=60).read())
  subprocess.run(['/usr/bin/afconvert','-f','WAVE','-d','LEI16@22050','-c','1',str(src),str(decoded)],check=True)
  with wave.open(str(decoded),'rb') as f:
   rate=f.getframerate(); f.setpos(min(int(start*rate),f.getnframes())); samples=array.array('h',f.readframes(int(duration*rate)))
  peak=max(abs(v) for v in samples) or 1
  rms=math.sqrt(sum(v*v for v in samples)/len(samples)) or 1
  gain=min(0.45*32767/peak,0.10*32767/rms,3)
  fade=max(1,int(rate*.04))
  for i,v in enumerate(samples):
   envelope=min(1,i/fade,(len(samples)-1-i)/fade)
   samples[i]=int(v*gain*envelope)
  out=dest/f'{name}.wav'
  with wave.open(str(out),'wb') as f:
   f.setnchannels(1); f.setsampwidth(2); f.setframerate(rate); f.writeframes(samples.tobytes())
  path=f'{base}/effects/{name}.wav'; data=out.read_bytes(); mapping[name]=path
  inventory['assets'].append({'url':path,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
  ledger.append({'name':name,'author':author,'source':f'https://freesound.org/people/{author}/sounds/{sound_id}/','download':url,'license':'CC0-1.0','changes':'Short excerpt, mono 22050 Hz PCM, level reduction, 40 ms fades','duration':round(len(samples)/rate,3),'sha256':hashlib.sha256(data).hexdigest()})
(root/'content-source/a-day-at-the-farm/effects.json').write_text(json.dumps(mapping,indent=2)+'\n')
(root/'content-source/a-day-at-the-farm/effect-rights.json').write_text(json.dumps(ledger,indent=2)+'\n')
(root/('public'+base)/'inventory.json').write_text(json.dumps(inventory,indent=2)+'\n')
print(f'Prepared {len(mapping)} real animal calls; verified pack {sum(a["bytes"] for a in inventory["assets"])/1024/1024:.1f} MB')
