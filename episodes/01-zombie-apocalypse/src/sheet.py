import sys, glob
from PIL import Image, ImageDraw
files = sys.argv[2:]
ims = [Image.open(f).resize((270, 480)) for f in files]
cols = 6; rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * 274, rows * 500), '#333')
d = ImageDraw.Draw(sheet)
for i, (im, f) in enumerate(zip(ims, files)):
    x, y = (i % cols) * 274, (i // cols) * 500
    sheet.paste(im, (x, y)); d.text((x + 4, y + 484), f.split('_')[-1], fill='white')
sheet.save(sys.argv[1])
