#!/usr/bin/env python3
"""Create Android source icon/splash from the committed ReelTara brand image."""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
original = ROOT / "public" / "brand" / "icon.png"
if not original.is_file():
    raise SystemExit("Missing existing ReelTara brand icon")
logo = Image.open(original).convert("RGBA")
if not logo.getbbox():
    raise SystemExit("Brand icon has no visible pixels")
logo = ImageOps.contain(logo, (735, 735), Image.Resampling.LANCZOS)
canvas = Image.new("RGBA", (1024, 1024), (11, 16, 32, 255))
x = (1024 - logo.width) // 2
y = (1024 - logo.height) // 2
canvas.alpha_composite(logo, (x, y))
output = ROOT / "assets" / "logo.png"
output.parent.mkdir(parents=True, exist_ok=True)
canvas.convert("RGB").save(output, "PNG", optimize=True)
print(f"Branded 1024x1024 icon generated from {original.relative_to(ROOT)}")
