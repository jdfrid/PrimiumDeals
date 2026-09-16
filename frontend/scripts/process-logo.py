from collections import deque
from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parents[1]
src = root / "public" / "dealsluxy-logo.png"
out = root / "public" / "dealsluxy-logo-light.png"


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

    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    return img


if __name__ == "__main__":
    img = Image.open(src)
    transparent = remove_edge_background(img)
    transparent.save(out)
    print(f"Wrote {out} ({transparent.size[0]}x{transparent.size[1]})")
