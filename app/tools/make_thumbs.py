"""สร้างภาพย่อ (thumbnail) ของรูปการ์ดสำหรับใช้ในหน้าเกม ให้โหลดเร็วบนมือถือ
รัน:  python tools/make_thumbs.py   (ต้องมี Pillow:  pip install pillow)
รูปต้นฉบับใน docs/ ใหญ่ ~0.8–1 MB ต่อใบ → ภาพย่อ 300px ราว 35–60 KB และ 600px (การ์ดบทบาทของตัวเอง) ราว 100–200 KB
"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.normpath(os.path.join(HERE, '..', '..', 'docs'))
OUT = os.path.normpath(os.path.join(HERE, '..', 'public', 'thumbs'))
# (โฟลเดอร์ต้นทางใน docs, โฟลเดอร์ปลายทางใน public/thumbs, ความกว้าง px, รวมโฟลเดอร์ย่อย)
JOBS = [
    ('deadline_necromancer_trap_cards', 'traps', 300, False),
    ('event_cards', 'events', 300, False),
    ('booster_cards', 'boosters', 300, False),
    ('deadline_necromancer_role_cards', 'roles', 300, True),       # รายการ/แกลเลอรี/หน้าจบเกม
    ('deadline_necromancer_role_cards', 'roles-md', 600, True),    # การ์ดบทบาทของตัวเองในหน้าเกม
]

def files(src, sub):
    base = os.path.join(DOCS, src)
    if not sub:
        for f in sorted(os.listdir(base)):
            yield '', f
    else:
        for d in sorted(os.listdir(base)):
            full = os.path.join(base, d)
            if os.path.isdir(full):
                for f in sorted(os.listdir(full)):
                    yield d, f

total = 0
for src_dir, out_dir, width, sub in JOBS:
    for d, f in files(src_dir, sub):
        if not f.lower().endswith(('.png', '.jpg', '.jpeg')):
            continue
        im = Image.open(os.path.join(DOCS, src_dir, d, f)).convert('RGBA')
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
        dst_dir = os.path.join(OUT, out_dir, d)
        os.makedirs(dst_dir, exist_ok=True)
        dst = os.path.join(dst_dir, os.path.splitext(f)[0] + '.png')
        im.quantize(256, method=Image.FASTOCTREE, dither=Image.FLOYDSTEINBERG).save(dst, 'PNG', optimize=True)
        total += os.path.getsize(dst)
    print(out_dir, 'done')
print('total', total // 1024, 'KB')
