#!/usr/bin/env python3
"""بانرات الفئات مقاس 1024×700، وشبكة الموقع تعرضها مربعة بـ object-fit: cover
فتتقصّ الأيقونات من الأطراف. هذا يبني نسخة مربعة تحتوي الرسمة كاملة داخل نفس
الإطار العنّابي — نفس الشكل بدون قص."""
import sys
from PIL import Image
import numpy as np

FRAME = (141, 27, 61)   # عنّابي الإطار
SIZE = 1024

def square(src, dst, pad=0.06):
    im = Image.open(src).convert('RGB')
    a = np.array(im)
    # حدود المنطقة البيضاء داخل الإطار
    mc = a[:, im.width // 2]; mr = a[im.height // 2, :]
    top = next(i for i, p in enumerate(mc) if p.min() > 200)
    bot = im.height - 1 - next(i for i, p in enumerate(mc[::-1]) if p.min() > 200)
    left = next(i for i, p in enumerate(mr) if p.min() > 200)
    right = im.width - 1 - next(i for i, p in enumerate(mr[::-1]) if p.min() > 200)
    art = im.crop((left, top, right + 1, bot + 1))

    border = round(SIZE * (left / im.width))          # نفس نسبة الإطار الأصلية
    inner = SIZE - border * 2
    box = int(inner * (1 - pad * 2))
    art.thumbnail((box, box), Image.LANCZOS)

    out = Image.new('RGB', (SIZE, SIZE), FRAME)
    out.paste(Image.new('RGB', (inner, inner), (255, 255, 255)), (border, border))
    out.paste(art, (border + (inner - art.width) // 2, border + (inner - art.height) // 2))
    out.save(dst)
    print(f'{dst}  {out.size}  الرسمة {art.size}')

for p in sys.argv[1:]:
    square(p, p)
