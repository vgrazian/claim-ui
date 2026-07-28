#!/usr/bin/env python3
"""Generate all icon assets from claim-ui.png with macOS-style rounded corners."""

from PIL import Image, ImageDraw
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "claim-ui.png")
PUBLIC = os.path.join(ROOT, "public")
ICONSET = os.path.join(ROOT, "ClaimUI.iconset")


def round_corners(im: Image.Image, radius_ratio: float = 0.2237) -> Image.Image:
    """Apply macOS-style rounded corners using an alpha mask."""
    im = im.convert("RGBA")
    w, h = im.size
    radius = int(min(w, h) * radius_ratio)

    # Create a rounded-rectangle mask
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), (w - 1, h - 1)], radius=radius, fill=255)

    # Apply mask as alpha channel
    r, g, b, a = im.split()
    # Composite: use the original alpha multiplied by the mask
    from PIL import ImageChops
    new_a = ImageChops.multiply(a, mask)
    im.putalpha(new_a)
    return im


def resize_and_save(im: Image.Image, size: int, path: str, apply_rounding: bool = True):
    """Resize image to square `size` and save as PNG."""
    im = im.copy()
    im = im.resize((size, size), Image.LANCZOS)
    if apply_rounding:
        im = round_corners(im)
    im.save(path, "PNG")
    print(f"  ✓ {path} ({size}x{size})")


def main():
    print(f"Source: {SRC}")
    src = Image.open(SRC)
    print(f"  Size: {src.size}, Mode: {src.mode}")

    # Ensure output dirs
    os.makedirs(PUBLIC, exist_ok=True)
    os.makedirs(ICONSET, exist_ok=True)

    # ── Web / PWA icons ──────────────────────────────────────
    print("\n--- Web / PWA icons ---")
    resize_and_save(src, 32, os.path.join(PUBLIC, "favicon.png"))
    resize_and_save(src, 192, os.path.join(PUBLIC, "icon-192.png"))
    resize_and_save(src, 512, os.path.join(PUBLIC, "icon-512.png"))
    resize_and_save(src, 180, os.path.join(PUBLIC, "apple-touch-icon.png"))

    # ── macOS .icns iconset ──────────────────────────────────
    # Standard iconset structure for iconutil
    # See: man iconutil
    mac_sizes = {
        "icon_16x16.png": 16,
        "icon_16x16@2x.png": 32,
        "icon_32x32.png": 32,
        "icon_32x32@2x.png": 64,
        "icon_128x128.png": 128,
        "icon_128x128@2x.png": 256,
        "icon_256x256.png": 256,
        "icon_256x256@2x.png": 512,
        "icon_512x512.png": 512,
        "icon_512x512@2x.png": 1024,
    }
    print("\n--- macOS .icns iconset ---")
    for name, size in mac_sizes.items():
        resize_and_save(src, size, os.path.join(ICONSET, name))

    # Generate .icns with iconutil
    print("\n--- Generating .icns ---")
    icns_path = os.path.join(ROOT, "ClaimUI.icns")
    ret = os.system(f'iconutil -c icns "{ICONSET}" -o "{icns_path}"')
    if ret == 0:
        print(f"  ✓ {icns_path}")
    else:
        print(f"  ✗ iconutil failed (exit {ret})")

    # ── Windows .ico ─────────────────────────────────────────
    print("\n--- Windows .ico ---")
    ico = src.copy()
    ico = ico.resize((256, 256), Image.LANCZOS)
    ico = round_corners(ico)
    ico_path = os.path.join(ROOT, "claim.ico")
    # Save as .ico (Pillow supports multi-size ico, we save single 256x256)
    # For proper .ico with multiple sizes, we'd need extra handling
    ico.save(ico_path, "ICO", sizes=[(256, 256)])
    print(f"  ✓ {ico_path}")

    # ── Copy 512 as project root icon for display ────────────
    # Keep the large one at root too
    root_icon = os.path.join(ROOT, "icon.png")
    resize_and_save(src, 512, root_icon)
    print(f"  ✓ {root_icon} (root-level 512px icon)")

    print("\n✅ All icons generated successfully!")


if __name__ == "__main__":
    main()
