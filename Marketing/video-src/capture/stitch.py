import sys, numpy as np
from PIL import Image
out, files = sys.argv[1], sys.argv[2:]
ims = [np.asarray(Image.open(f).convert('RGB')).astype(np.int16) for f in files]
# rows that never change across shots = fixed header/footer
same = np.all([np.abs(ims[0] - im).sum(axis=(1, 2)) == 0 for im in ims[1:]], axis=0)
top = 0
while same[top]: top += 1
bot = len(same)
while same[bot - 1]: bot -= 1
top += 2; bot -= 2  # small margin
print('content rows', top, bot)
C = [im[top:bot] for im in ims]
H = bot - top
tall = C[0]; offsets = [0]; pos = 0
for a, b in zip(C, C[1:]):
    best, bd = None, 1e18
    for d in range(0, H - 300):
        diff = np.abs(a[d:d + 300:3, ::4] - b[0:300:3, ::4]).mean()
        if diff < bd: bd, best = diff, d
    print('offset', best, 'err', round(bd, 2))
    pos += best; offsets.append(pos)
    tall = np.concatenate([tall[:pos], b], axis=0)
Image.fromarray(tall.astype(np.uint8)).save(out)
print('tall height', tall.shape[0], 'offsets', offsets)
