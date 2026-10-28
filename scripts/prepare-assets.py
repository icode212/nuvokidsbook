"""Reproducible delivery derivatives. Original reference art is never changed."""
from pathlib import Path
from PIL import Image, ImageDraw
import hashlib, json
root = Path(__file__).resolve().parents[1]
dest = root / 'public/books/a-day-at-the-farm/0.1.0'
dest.mkdir(parents=True, exist_ok=True)
inventory = []
for page in range(1, 13):
    image = Image.open(root / f'docs/free book/Page{page}.png').convert('RGB')
    image.thumbnail((1536, 1100))
    target = dest / f'page-{page:02}.webp'
    image.save(target, 'WEBP', quality=87, method=6)
    data = target.read_bytes()
    inventory.append({'url': '/' + str(target.relative_to(root / 'public')), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
image = Image.open(root / 'docs/free book/Page1.png').convert('RGB')
image.thumbnail((900, 600))
image.save(dest / 'cover.webp', 'WEBP', quality=88)
data = (dest / 'cover.webp').read_bytes()
inventory.append({'url':'/books/a-day-at-the-farm/0.1.0/cover.webp','bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
(dest / 'inventory.json').write_text(json.dumps({'bookId':'a-day-at-the-farm','contentVersion':'0.1.0','assets':inventory}, indent=2))
for size in [192, 512]:
    icon = Image.new('RGB', (size, size), '#216756')
    draw = ImageDraw.Draw(icon)
    draw.rounded_rectangle((size*.17, size*.30, size*.83, size*.76), radius=size*.035, fill='#fff8e8')
    draw.line((size*.50,size*.31,size*.50,size*.76),fill='#d8a448',width=max(2,int(size*.025)))
    draw.ellipse((size*.45,size*.16,size*.55,size*.26),fill='#f4ba54')
    icon.save(root / f'public/icon-{size}.png')
print(f'Prepared {len(inventory)} book images, {sum(a["bytes"] for a in inventory)/1024/1024:.2f} MB')
