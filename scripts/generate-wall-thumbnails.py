#!/usr/bin/env python3
"""Build the small cover images used by the homepage cover wall.

The wall shows 25 covers at roughly 120px wide, so the 480px book-thumbs
are far larger than needed. This writes ~11KB versions into
assets/home/wall/, keeping the same filenames so the homepage markup can
be derived from assets/book-thumbnails.json.

Run after scripts/generate-book-thumbnails.js has refreshed book-thumbs:

    python3 scripts/generate-wall-thumbnails.py

Requires Pillow (pip install Pillow). The Node thumbnail script uses
macOS `sips`, which is not available on Linux, hence the separate tool.
"""

import glob
import os

from PIL import Image

SOURCE = "assets/book-thumbs"
TARGET = "assets/home/wall"
MAX_SIZE = (260, 390)
QUALITY = 72


def main() -> None:
    os.makedirs(TARGET, exist_ok=True)
    sources = sorted(glob.glob(os.path.join(SOURCE, "*.jpg")))
    if not sources:
        raise SystemExit(f"No covers found in {SOURCE}")

    total = 0
    for source in sources:
        image = Image.open(source).convert("RGB")
        image.thumbnail(MAX_SIZE, Image.LANCZOS)
        destination = os.path.join(TARGET, os.path.basename(source))
        image.save(destination, "JPEG", quality=QUALITY, optimize=True, progressive=True)
        total += os.path.getsize(destination)

    print(f"Generated {len(sources)} wall covers ({total / 1024:.0f}KB total).")


if __name__ == "__main__":
    main()
