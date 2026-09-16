from collections import deque
from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parents[1]
src = root / "public" / "dealsluxy-logo.png"


def is_background(r: int, g: int, b: int, threshold: int = 28) -> bool:
    return r <= threshold and g <= threshold and b <= threshold


def flood_remove_background(img: Image.Image, threshold: int = 28) -> Image.Image:
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    seen = set()
    q = deque()

    for x in range(w):
        for y in (0, h - 1):
            if is_background(*px[x, y][:3], threshold):
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_background(*px[x, y][:3], threshold):
                q.append((x, y))

    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h:
            continue
        if (x, y) in seen:
            continue
        r, g, b, _a = px[x, y]
        if not is_background(r, g, b, threshold):
            continue
        seen.add((x, y))
        px[x, y] = (r, g, b, 0)
        q.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])

    return img


if __name__ == "__main__":
    img = Image.open(src)
    out = flood_remove_background(img)
    transparent = root / "public" / "dealsluxy-logo-transparent.png"
    out.save(transparent)
    print(f"Wrote {transparent} ({out.size[0]}x{out.size[1]})")
