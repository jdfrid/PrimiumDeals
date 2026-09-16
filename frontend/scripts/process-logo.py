from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

root = Path(__file__).resolve().parents[1]
public = root / "public"
src = public / "dealsluxy-logo.png"


def is_bg(r: int, g: int, b: int, threshold: int = 22) -> bool:
    return r <= threshold and g <= threshold and b <= threshold


def remove_edge_background(img: Image.Image, threshold: int = 22) -> Image.Image:
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    seen = set()
    q = deque()

    for x in range(w):
        for y in (0, h - 1):
            if is_bg(*px[x, y][:3], threshold):
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_bg(*px[x, y][:3], threshold):
                q.append((x, y))

    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or (x, y) in seen:
            continue
        r, g, b, _a = px[x, y]
        if not is_bg(r, g, b, threshold):
            continue
        seen.add((x, y))
        px[x, y] = (r, g, b, 0)
        q.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])

    return img


def clean_dark_specks(img: Image.Image) -> Image.Image:
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and max(r, g, b) < 18:
                px[x, y] = (0, 0, 0, 0)
    return img


def crop_icon(img: Image.Image) -> Image.Image:
    """Icon mark only — wordmark is rendered as HTML text in the UI."""
    w, h = img.size
    cut = min(int(w * 0.27), 290)
    icon = img.crop((0, 0, cut, h))
    bbox = icon.getbbox()
    if not bbox:
        return icon
    icon = icon.crop(bbox)
    side = max(icon.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    ox = (side - icon.size[0]) // 2
    oy = (side - icon.size[1]) // 2
    canvas.paste(icon, (ox, oy), icon)
    return canvas


if __name__ == "__main__":
    base = remove_edge_background(Image.open(src))
    base = clean_dark_specks(base)
    bbox = base.getbbox()
    if bbox:
        base = base.crop(bbox)
    base.filter(ImageFilter.UnsharpMask(radius=1.2, percent=90, threshold=2)).save(public / "dealsluxy-logo-light.png")

    icon_src = remove_edge_background(Image.open(src))
    icon = crop_icon(icon_src)
    icon.filter(ImageFilter.UnsharpMask(radius=1, percent=80, threshold=2)).save(public / "dealsluxy-icon.png")

    print(f"icon size {icon.size}")
