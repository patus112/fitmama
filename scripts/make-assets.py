"""Build bundled icons and WebP art. Run from the repo root."""

import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
UPLOADS = Path('uploads')
CHARACTER = ROOT / 'src' / 'assets' / 'character'
EXERCISES = ROOT / 'src' / 'assets' / 'exercises'
ICONS = ROOT / 'public' / 'icons'

PHOTOS = {
    '01_spustanie_paty_ea24.jpg': 'heel-slides.webp',
    '02_mrtvy_chrobak_db61.jpg': 'dead-bug.webp',
    '03_vtiahnutie_brucha_na_styroch_72d2.jpg': 'belly-draw-in.webp',
    '04_plank_668c.jpg': 'short-plank.webp',
    '06_leg_raise_na_boku_23f9.jpg': 'side-leg-raise.webp',
    '07_musle_ec78.jpg': 'clamshells.webp',
    '08_drep_s_cinkou_de12.jpg': 'squat-dumbbell.webp',
    '09_zdvihanie_nohy_na_styroch_2339.jpg': 'bird-dog.webp',
    '10_kolena_k_hrudi_b45c.jpg': 'knees-to-chest.webp',
    '11_panvove_dno_s_uterakom_9123.jpg': 'pelvic-floor.webp',
}

CREAM = (255, 248, 241, 255)
CORAL = (255, 127, 92, 255)
SAGE = (143, 201, 160, 255)
INK = (59, 42, 36, 255)


def save_character() -> None:
    CHARACTER.mkdir(parents=True, exist_ok=True)
    up = Image.open(UPLOADS / 'cut3_up_6b3b.png').convert('RGBA')
    down = Image.open(UPLOADS / 'cut3_down_222c.png').convert('RGBA')
    width, height = max(up.width, down.width), max(up.height, down.height)
    for image, name in ((up, 'hips-up.webp'), (down, 'hips-down.webp')):
        canvas = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        canvas.paste(image, ((width - image.width) // 2, (height - image.height) // 2), image)
        canvas.save(CHARACTER / name, 'WEBP', quality=76, method=6)


def save_photos() -> None:
    EXERCISES.mkdir(parents=True, exist_ok=True)
    for source, name in PHOTOS.items():
        image = Image.open(UPLOADS / source).convert('RGB')
        image.thumbnail((960, 640), Image.Resampling.LANCZOS)
        image.save(EXERCISES / name, 'WEBP', quality=72, method=6)


def draw_icon(size: int, maskable: bool) -> Image.Image:
    image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    if maskable:
        draw.rectangle((0, 0, size, size), fill=CORAL)
        pad = int(size * 0.16)
        draw.ellipse((pad, pad, size - pad, size - pad), fill=CREAM)
        inner = int(size * 0.28)
        draw.ellipse((inner, inner, size - inner, size - inner), fill=SAGE)
    else:
        radius = int(size * 0.23)
        draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=CREAM)
        pad = int(size * 0.14)
        draw.ellipse((pad, pad + int(size * 0.04), size - pad, size - pad + int(size * 0.02)), fill=SAGE)
        inner = int(size * 0.28)
        draw.ellipse((inner, inner - int(size * 0.02), size - inner, size - inner - int(size * 0.02)), fill=CORAL)
    box = (int(size * 0.30), int(size * 0.36), int(size * 0.70), int(size * 0.78))
    draw.arc(box, start=200, end=340, fill=INK, width=max(6, size // 16))
    dot = max(5, size // 26)
    cx, cy = size // 2, int(size * 0.42)
    draw.ellipse((cx - dot, cy - dot, cx + dot, cy + dot), fill=INK)
    return image


def save_icons() -> None:
    ICONS.mkdir(parents=True, exist_ok=True)
    draw_icon(192, False).save(ICONS / 'icon-192.png')
    draw_icon(512, False).save(ICONS / 'icon-512.png')
    draw_icon(512, True).save(ICONS / 'icon-maskable-512.png')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('usage: python3 scripts/make-assets.py <uploads-dir>')
    UPLOADS = Path(sys.argv[1])
    save_character()
    save_photos()
    save_icons()
    print('assets ready')
