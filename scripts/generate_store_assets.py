#!/usr/bin/env python3
"""Generate Google Play store graphics from the existing ReelTara brand mark.
Actual Android UI screenshots must be captured separately from a running build.
"""
from pathlib import Path
import os
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
ICON_PATH = ROOT / "public" / "brand" / "icon.png"
DEST = ROOT / "play-store-assets"
DEST.mkdir(exist_ok=True)

logo = Image.open(ICON_PATH).convert("RGBA")
mark = ImageOps.contain(logo, (375, 375), Image.Resampling.LANCZOS)
icon = Image.new("RGBA", (512, 512), (11, 16, 32, 255))
icon.alpha_composite(mark, ((512-mark.width)//2, (512-mark.height)//2))
icon.save(DEST / "icon-512.png", "PNG", optimize=True)

graphic = Image.new("RGB", (1024, 500), (10, 16, 32))
draw = ImageDraw.Draw(graphic)
for y in range(500):
    draw.line([(0, y), (1024, y)], fill=(int(9 + y*.012), int(16 + y*.018), int(33 + y*.03)))
for dx, dy, radius in [(865, 110, 170), (910, 375, 205), (680, 280, 105)]:
    draw.ellipse((dx-radius, dy-radius, dx+radius, dy+radius), outline=(48, 73, 109), width=3)

def font(size, bold=False):
    paths = ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]
    paths.append(str(Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts' / ('segoeuib.ttf' if bold else 'segoeui.ttf')))
    for path in paths:
        if Path(path).exists(): return ImageFont.truetype(path, size)
    return ImageFont.load_default()

large = ImageOps.contain(logo, (220, 220), Image.Resampling.LANCZOS)
graphic.paste(large, (720, 140), large)
draw.text((68, 150), "ReelTara", fill=(242, 246, 255), font=font(80, True))
draw.rounded_rectangle((70, 275, 155, 283), radius=4, fill=(89, 151, 241))
draw.text((70, 315), "Khám phá phim  ·  Trailer  ·  Phim mở", fill=(195, 215, 240), font=font(27))
graphic.save(DEST / "feature-graphic-1024x500.png", "PNG", optimize=True)

assert Image.open(DEST / "icon-512.png").size == (512, 512)
assert Image.open(DEST / "feature-graphic-1024x500.png").size == (1024, 500)
print("Google Play graphics generated from current ReelTara icon.")
