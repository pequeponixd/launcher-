#!/usr/bin/env python3
"""
Genera el arte en pixel art del launcher y del modpack Cachusafio.

    python3 tools/make-art.py <carpeta-de-salida>

Crea:
  launcher-icon.png   512x512  icono de la app (build/icon.png)
  icon.png            256x256  icono del modpack (ruleta)
  logo.png           ~1220x200 logo "CACHUSAFIO" con fondo transparente
  background.png     1920x1080 atardecer con fogata

Todo se dibuja en una cuadrícula pequeña y se agranda sin suavizar, por eso se ve "pixelado".
Cambia los colores de arriba y vuelve a ejecutarlo. Requiere Pillow.
"""
import math
import random
import sys
from pathlib import Path

from PIL import Image

RED = (224, 17, 43)
RED_LIGHT = (255, 74, 84)
RED_DARK = (150, 10, 28)
RED_DEEPER = (96, 6, 18)
INK = (18, 14, 16)
WHITE = (245, 240, 235)
GOLD = (240, 186, 60)
GOLD_DARK = (168, 112, 28)


def hexa(c, a=255):
    return (*c, a)


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def jitter(c, rnd, amount=10):
    """Ruido de textura, como los bloques de Minecraft."""
    d = rnd.randint(-amount, amount)
    return tuple(max(0, min(255, v + d)) for v in c)


def upscale(img, k):
    return img.resize((img.width * k, img.height * k), Image.NEAREST)


# ------------------------------------------------------------------ fuente 5x7
FONT = {
    'A': ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'C': ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
    'D': ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
    'E': ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    'F': ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
    'H': ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'I': ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
    'K': ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    'L': ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    'O': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'S': ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    'U': ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    ' ': ['...', '...', '...', '...', '...', '...', '...'],
}
ACCENTS = {'Í': 'I'}  # letra con tilde: se dibuja la base y una tilde encima


def text_mask(text, gap=1):
    """Devuelve (set de celdas (x, y), ancho, alto). y negativo = tildes."""
    cells = set()
    x = 0
    for ch in text:
        base = ACCENTS.get(ch, ch)
        g = FONT[base]
        for y, row in enumerate(g):
            for i, c in enumerate(row):
                if c == '#':
                    cells.add((x + i, y))
        if ch in ACCENTS:
            w = len(g[0])
            cells.add((x + w - 1, -2))
            cells.add((x + w - 2, -1))
        x += len(g[0]) + gap
    return cells, x - gap, 7


def dilate(cells):
    out = set(cells)
    for x, y in cells:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                out.add((x + dx, y + dy))
    return out


# ------------------------------------------------------------------ icono del launcher
def launcher_icon():
    n = 32
    rnd = random.Random(7)
    img = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    px = img.load()
    # esquinas escalonadas, como un icono redondeado hecho de píxeles
    corner = {0: 3, 1: 2, 2: 1}

    def inside(x, y):
        for r, cut in corner.items():
            if (y == r or y == n - 1 - r) and (x < cut or x > n - 1 - cut):
                return False
        return True

    for y in range(n):
        for x in range(n):
            if inside(x, y):
                px[x, y] = hexa(jitter((28, 24, 26), rnd, 3))

    # bloque rojo con biselado: claro arriba/izquierda, oscuro abajo/derecha
    x0, y0, x1, y1 = 4, 4, 27, 27
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            c = jitter(RED, rnd, 14)
            if x in (x0, x0 + 1) or y in (y0, y0 + 1):
                c = jitter(RED_LIGHT, rnd, 8)
            if x in (x1, x1 - 1) or y in (y1, y1 - 1):
                c = jitter(RED_DARK, rnd, 8)
            px[x, y] = hexa(c)
    for x in range(x0, x1 + 1):
        px[x, y1 + 1] = hexa(INK)  # sombra bajo el bloque
        px[x, y1 + 2] = hexa((22, 18, 20))

    # "C" tallada: anillo pixelado abierto a la derecha, con sombra
    cx, cy = 16.5, 15.5  # un poco a la derecha: la abertura de la C hace que se vea corrida
    c_cells = set()
    for y in range(y0 + 3, y1 - 2):
        for x in range(x0 + 3, x1 - 2):
            dx, dy = (x - cx) / 8.6, (y - cy) / 9.4
            r = math.hypot(dx, dy)
            ang = math.degrees(math.atan2(dy, dx))
            if 0.55 <= r <= 1.0 and abs(ang) > 42:
                c_cells.add((x, y))
    for x, y in c_cells:
        if (x + 1, y + 1) not in c_cells:
            px[x + 1, y + 1] = hexa(RED_DEEPER)
    for x, y in c_cells:
        shade = WHITE if y < cy else (222, 214, 208)
        px[x, y] = hexa(jitter(shade, rnd, 4))
    return upscale(img, 16)


# ------------------------------------------------------------------ icono del modpack (ruleta)
def modpack_icon():
    n = 32
    rnd = random.Random(3)
    img = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    px = img.load()
    for y in range(n):
        for x in range(n):
            px[x, y] = hexa(jitter((27, 22, 24), rnd, 3))
    cx, cy = 15.5, 16.5
    segs = 12
    for y in range(n):
        for x in range(n):
            r = math.hypot(x - cx, y - cy)
            ang = (math.degrees(math.atan2(y - cy, x - cx)) + 360 + 90) % 360
            if r <= 14.2:
                if r > 12.2:
                    # aro dorado con brillo arriba a la izquierda
                    light = (x - cx) + (y - cy) < -4
                    px[x, y] = hexa(jitter(GOLD if light else GOLD_DARK, rnd, 6))
                elif r > 11.4:
                    px[x, y] = hexa(INK)
                elif r <= 2.6:
                    px[x, y] = hexa(jitter(GOLD, rnd, 6))
                elif r <= 3.4:
                    px[x, y] = hexa(INK)
                else:
                    seg = int(ang // (360 / segs))
                    if seg == 0:
                        base = (60, 160, 70)  # la casilla verde
                    else:
                        base = RED if seg % 2 else (34, 30, 34)
                    px[x, y] = hexa(jitter(base, rnd, 8))
            elif r <= 15.2:
                px[x, y] = hexa(INK)
    # flecha blanca arriba que marca el premio
    for i, w in enumerate([5, 3, 1]):
        for dx in range(-(w // 2), w // 2 + 1):
            px[int(cx + 0.5) + dx, 1 + i] = hexa(WHITE)
    for dx in range(-3, 4):
        if px[int(cx + 0.5) + dx, 0][3]:
            px[int(cx + 0.5) + dx, 0] = hexa(INK)
    return upscale(img, 8)


# ------------------------------------------------------------------ logo
def logo(title='CACHUSAFIO', subtitle=None):
    """subtitle opcional, ej. 'EL DESAFÍO DE LAS KILAS' (el launcher ya muestra la descripción debajo)."""
    rnd = random.Random(11)
    k = 18  # tamaño de cada "píxel" del título
    face, tw, th = text_mask(title, gap=2)
    depth = 2
    extr = {(x, y + d) for x, y in face for d in range(1, depth + 1)} - face
    outline = dilate(face | extr) - face - extr

    sub, sw, _ = text_mask(subtitle or '')
    ks = 7
    sub_out = dilate(sub) - sub

    pad = 1
    width = max((tw + 2 * pad) * k, (sw + 2) * ks)
    title_h = (th + depth + 2 * pad) * k
    height = title_h + (14 + (7 + 2 + 2 + 2) * ks if subtitle else 0)
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))

    def put(cells, colorfn, scale, ox, oy):
        for x, y in cells:
            c = colorfn(x, y)
            img.paste(hexa(c), ((ox + x) * scale, (oy + y) * scale, (ox + x + 1) * scale, (oy + y + 1) * scale))

    tox = (width // k - tw) // 2
    put(outline, lambda x, y: INK, k, tox, pad)
    put(extr, lambda x, y: jitter(RED_DEEPER if y >= th else RED_DARK, rnd, 6), k, tox, pad)

    def face_color(x, y):
        c = mix(RED_LIGHT, RED_DARK, y / (th - 1))
        if y == 0:
            c = mix(c, WHITE, 0.3)  # solo la fila de arriba iluminada
        return jitter(c, rnd, 5)

    put(face, face_color, k, tox, pad)

    if not subtitle:
        return img
    soy = (title_h + 14) // ks + 2
    sox = (width // ks - sw) // 2
    put(sub_out, lambda x, y: INK, ks, sox, soy)
    put(sub, lambda x, y: jitter(WHITE, rnd, 5), ks, sox, soy)
    return img


# ------------------------------------------------------------------ fondo
def background():
    W, H = 240, 135  # ×8 = 1920×1080
    rnd = random.Random(42)
    img = Image.new('RGB', (W, H))
    px = img.load()

    # cielo de atardecer en franjas con tramado ordenado entre franjas
    stops = [(0.0, (12, 12, 32)), (0.35, (34, 20, 52)), (0.6, (92, 32, 60)), (0.78, (176, 60, 52)), (0.9, (236, 128, 64))]
    bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
    bands = 14

    def sky(t):
        for i in range(len(stops) - 1):
            a, b = stops[i], stops[i + 1]
            if t <= b[0]:
                return mix(a[1], b[1], (t - a[0]) / (b[0] - a[0]))
        return stops[-1][1]

    horizon = 0.9
    for y in range(H):
        for x in range(W):
            t = min(1, y / (H * horizon)) * horizon
            f = t / horizon * bands
            lo = math.floor(f)
            frac = f - lo
            step = lo + (1 if frac * 16 > bayer[y % 4][x % 4] else 0)
            px[x, y] = sky(min(step, bands) / bands * horizon)

    for _ in range(70):  # estrellas arriba
        x, y = rnd.randrange(W), rnd.randrange(int(H * 0.35))
        px[x, y] = (200, 190, 220) if rnd.random() < 0.8 else (255, 240, 200)

    def sun():
        # sol grande con rayas en la mitad de abajo, típico sol pixelado
        sx, sy, sr = 168, 84, 20
        for y in range(H):
            for x in range(W):
                if math.hypot(x - sx, y - sy) > sr or (y > sy and (y - sy) % 5 in (3, 4)):
                    continue
                px[x, y] = mix((255, 214, 120), (255, 120, 70), max(0, (y - (sy - sr)) / (2 * sr)))

    def ridge(base, amp, seed, freq):
        r = random.Random(seed)
        ph = [r.random() * 6.28 for _ in range(3)]
        return [base - amp * (0.5 * math.sin(x * freq + ph[0]) + 0.3 * math.sin(x * freq * 2.3 + ph[1]) + 0.2 * math.sin(x * freq * 5.1 + ph[2])) for x in range(W)]

    # montañas lejanas y colinas: escalonadas de a 2 píxeles para que se vean de bloques
    for i, (heights, color) in enumerate(((ridge(80, 22, 1, 0.035), (58, 28, 58)), (ridge(94, 14, 2, 0.05), (36, 18, 40)))):
        if i == 1:
            sun()  # entre la cordillera lejana y las colinas
        for x in range(W):
            top = int(heights[x - x % 2]) // 2 * 2
            for y in range(max(0, top), H):
                px[x, y] = jitter(color, rnd, 3)

    # suelo de bloques de 4×4 (32 px reales): pasto arriba, tierra abajo, bajo a la izquierda
    blk = 4
    cols = W // blk
    ground = []
    h = 112
    for c in range(cols):
        if c < cols * 0.42:
            target = 116  # zona tranquila donde va el texto del launcher
        else:
            target = 104 + 6 * math.sin(c * 0.4)
        h += max(-blk, min(blk, round((target - h) / blk) * blk)) if rnd.random() < 0.6 else 0
        ground.append(h)
    for c, top in enumerate(ground):
        for x in range(c * blk, (c + 1) * blk):
            for y in range(top, H):
                depth = y - top
                if depth < 1:
                    col = (62, 104, 52)
                elif depth < 2 and rnd.random() < 0.5:
                    col = (48, 84, 42)
                else:
                    col = (74, 50, 40) if (y // blk + c) % 2 else (66, 44, 36)
                # el suelo está a contraluz: se oscurece hacia abajo
                px[x, y] = jitter(mix(col, (12, 10, 14), min(0.85, 0.35 + depth / 40)), rnd, 4)

    def tree(c):
        top = ground[c]
        x = c * blk + 1
        for y in range(top - 10, top):
            for dx in range(2):
                px[x + dx, y] = jitter((40, 28, 24), rnd, 3)
        for by in range(3):
            for bx in range(3):
                if (bx, by) in ((0, 0), (2, 0)) and rnd.random() < 0.7:
                    continue
                for y in range(top - 22 + by * blk, top - 22 + (by + 1) * blk):
                    for xx in range(x - 4 + bx * blk, x - 4 + (bx + 1) * blk):
                        if 0 <= xx < W:
                            px[xx, y] = jitter((24, 40, 30), rnd, 5)

    for c in (int(cols * 0.55), int(cols * 0.86), int(cols * 0.95)):
        tree(c)

    # fogata con luz cálida alrededor
    fc = int(cols * 0.72)
    fx, fy = fc * blk + 2, ground[fc]
    base = img.copy()
    bpx = base.load()
    for y in range(H):
        for x in range(W):
            d = math.hypot((x - fx) * 0.8, y - fy)
            if d < 34:
                glow = (1 - d / 34) ** 2 * 0.55
                px[x, y] = mix(bpx[x, y], (255, 150, 60), glow)
    for dx in range(-3, 4):  # troncos
        px[fx + dx, fy - 1] = (70, 44, 30)
    for i, (w, col) in enumerate([(5, (255, 120, 40)), (5, (255, 150, 50)), (3, (255, 190, 70)), (3, (255, 220, 120)), (1, (255, 240, 180))]):
        for dx in range(-(w // 2), w // 2 + 1):
            px[fx + dx, fy - 2 - i] = col
    for _ in range(14):  # chispas
        x = fx + rnd.randint(-5, 5)
        y = fy - rnd.randint(8, 26)
        px[x, y] = (255, 200, 90) if rnd.random() < 0.6 else (255, 130, 50)

    return upscale(img, 8)


def main():
    out = Path(sys.argv[1] if len(sys.argv) > 1 else 'art')
    out.mkdir(parents=True, exist_ok=True)
    launcher_icon().save(out / 'launcher-icon.png')
    modpack_icon().save(out / 'icon.png')
    logo().save(out / 'logo.png')
    background().save(out / 'background.png', optimize=True)
    for f in sorted(out.glob('*.png')):
        with Image.open(f) as im:
            print(f'{f.name}: {im.width}x{im.height}, {f.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
