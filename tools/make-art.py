#!/usr/bin/env python3
"""
Genera el arte en pixel art del launcher y del modpack Cachusafio.

    python3 tools/make-art.py <carpeta-de-salida>

Crea:
  launcher-icon.png   512x512  icono de la app (build/icon.png)
  icon.png            256x256  icono del modpack (ruleta)
  logo.png           ~1220x200 logo "CACHUSAFIO" con fondo transparente
  background.png     1920x1080 noche de luna con aurora, lago y cabaña
  background.apng     960x540  la misma escena animada en loop (aurora, estrellas, agua, humo, luciérnagas)
  hover.wav / click.wav        sonidos cortos de los botones del menú
  background-atardecer.png     el fondo anterior (atardecer con fogata)
  btn-play*.png       200x24   botón principal del menú del juego (normal y al pasar el mouse)
  btn*.png            98x20    botones secundarios (Opciones, Salir)

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
def background_sunset():
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


# ------------------------------------------------------------------ botones del menú del juego
def button(w, h, style='primary', hover=False, seed=5):
    """Textura de botón a 1 píxel = 1 unidad de la interfaz de Minecraft (se ve nítida a cualquier escala)."""
    rnd = random.Random(seed + (1 if hover else 0))
    if style == 'primary':
        face, light, dark = (mix(RED, RED_LIGHT, 0.5), mix(RED_LIGHT, WHITE, 0.3), RED_DARK) if hover else (RED, RED_LIGHT, RED_DARK)
        edge = WHITE if hover else INK
        rim = mix(RED_LIGHT, WHITE, 0.55)
    else:
        face, light, dark = ((64, 56, 58), (92, 82, 84), (34, 29, 31)) if hover else ((44, 38, 40), (66, 58, 60), (26, 22, 24))
        edge = RED if hover else INK
        rim = mix(RED, (64, 56, 58), 0.4)
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    px = img.load()
    for y in range(h):
        for x in range(w):
            corner = (x in (0, w - 1)) and (y in (0, h - 1))
            if corner:
                continue  # esquinas recortadas, como los botones de Minecraft
            if x in (0, w - 1) or y in (0, h - 1):
                px[x, y] = hexa(edge)
            elif hover and (y == 1 or (x in (1, w - 2) and y < h - 3)):
                px[x, y] = hexa(rim)  # resalte: borde interior iluminado al pasar el mouse
            elif y == 1:
                px[x, y] = hexa(jitter(light, rnd, 4))  # brillo arriba
            elif y >= h - 3:
                px[x, y] = hexa(jitter(dark, rnd, 4))  # sombra abajo: da volumen
            else:
                px[x, y] = hexa(jitter(face, rnd, 6))
    return img


# ------------------------------------------------------------------ fondo: noche en el lago (animado)
def lake_frame(t=0.0):
    """Un cuadro de la escena, sin agrandar (240×135). t va de 0 a 1 y da la vuelta completa (loop perfecto)."""
    W, H = 240, 135
    TAU = 2 * math.pi
    rnd = random.Random(7)  # misma semilla en cada cuadro: lo que no se anima queda idéntico
    img = Image.new('RGB', (W, H))
    px = img.load()
    water = 86  # línea del agua
    bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
    stops = [(0.0, (6, 8, 24)), (0.45, (14, 24, 54)), (0.8, (28, 52, 84)), (1.0, (52, 86, 112))]

    def sky(v):
        for i in range(len(stops) - 1):
            a, b = stops[i], stops[i + 1]
            if v <= b[0]:
                return mix(a[1], b[1], (v - a[0]) / (b[0] - a[0]))
        return stops[-1][1]

    bands = 12
    for y in range(water):
        for x in range(W):
            f = y / water * bands
            step = math.floor(f) + (1 if (f % 1) * 16 > bayer[y % 4][x % 4] else 0)
            px[x, y] = sky(min(step, bands) / bands)

    # aurora: cortinas verticales que ondulan (borde de abajo brillante, se desvanece hacia arriba)
    for x in range(W):
        bottom = int(36 + 6 * math.sin(x * 0.05 + TAU * t) + 3 * math.sin(x * 0.13 + 0.7 - 2 * TAU * t))
        length = int(12 + 9 * (0.5 + 0.5 * math.sin(x * 0.27 + math.sin(x * 0.05 + TAU * t) * 2)))
        strength = 0.42 + 0.2 * math.sin(x * 0.08 + 1 + TAU * t) + 0.1 * math.sin(x * 0.31 - TAU * t)
        for i in range(length):
            y = bottom - i
            if not 0 <= y < water:
                continue
            a = strength * (1 - i / length) ** 1.3
            if a < 0.12 and (x + y) % 2:
                continue  # tramado en las puntas
            px[x, y] = mix(px[x, y], (110, 240, 170) if i < 3 else (70, 180, 170), min(0.65, a))

    for i in range(110):  # estrellas que titilan, cada una a su ritmo
        x, y = rnd.randrange(W), rnd.randrange(int(water * 0.85))
        tw = 0.55 + 0.45 * math.sin(TAU * (t * (1 + i % 2) + i * 0.137))
        px[x, y] = mix(px[x, y], (220, 225, 255), 0.9 * tw)
    for i in range(6):  # estrellas grandes en cruz
        x, y = rnd.randrange(2, W - 2), rnd.randrange(2, 40)
        tw = 0.6 + 0.4 * math.sin(TAU * (t + i * 0.29))
        for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
            c = (255, 250, 230) if (dx, dy) == (0, 0) else (200, 210, 255)
            px[x + dx, y + dy] = mix(px[x + dx, y + dy], c, 1.0 if (dx, dy) == (0, 0) else 0.6 * tw)

    # luna llena con cráteres
    mx, my, mr = 186, 26, 12
    for y in range(my - mr - 1, my + mr + 2):
        for x in range(mx - mr - 1, mx + mr + 2):
            d = math.hypot(x - mx, y - my)
            if d <= mr:
                px[x, y] = jitter(mix((236, 236, 214), (196, 198, 184), max(0, (x - mx + y - my) / (2 * mr))), rnd, 3)
            elif d <= mr + 3:
                px[x, y] = mix(px[x, y], (120, 140, 170), 0.25)
    for cx, cy, cr in ((182, 22, 3), (191, 30, 2), (184, 32, 1.5), (192, 21, 1.5)):
        for y in range(int(cy - cr), int(cy + cr) + 1):
            for x in range(int(cx - cr), int(cx + cr) + 1):
                if math.hypot(x - cx, y - cy) <= cr:
                    px[x, y] = (178, 180, 168)

    def ridge(base, amp, seed, freq):
        r = random.Random(seed)
        ph = [r.random() * 6.28 for _ in range(3)]
        return [base - amp * (0.55 * math.sin(x * freq + ph[0]) + 0.3 * math.sin(x * freq * 2.7 + ph[1]) + 0.15 * math.sin(x * freq * 6.3 + ph[2])) for x in range(W)]

    far = ridge(62, 18, 11, 0.04)
    for x in range(W):
        top = int(far[x - x % 2]) // 2 * 2
        for y in range(max(0, top), water):
            # nieve solo en las cumbres altas, más gruesa cuanto más alta
            snow = top < 58 and y - top < 2 + (58 - top) // 3
            px[x, y] = jitter((190, 202, 220) if snow else mix((58, 72, 110), (36, 46, 76), (y - top) / 30), rnd, 3)
    near = ridge(78, 6, 4, 0.06)
    for x in range(W):
        top = int(near[x - x % 2]) // 2 * 2
        for y in range(top, water):
            px[x, y] = jitter((20, 30, 48), rnd, 2)
    for x0 in range(2, W, 5):  # pinos
        if rnd.random() < 0.35:
            continue
        base = int(near[x0]) // 2 * 2
        hgt = rnd.randint(6, 11)
        for i in range(hgt):
            half = (i * 3) // hgt
            for dx in range(-half, half + 1):
                if 0 <= x0 + dx < W:
                    px[x0 + dx, base - hgt + i] = jitter((16, 26, 40), rnd, 2)

    # orilla de bloques a la derecha (abajo a la izquierda queda agua tranquila)
    blk = 4
    shore = {}
    for c in range(W // blk):
        x = c * blk
        if x < W * 0.6:
            continue
        top = water - 4 - (4 if x > W * 0.72 else 0) - (4 if x > W * 0.86 else 0)
        shore[c] = top
        for xx in range(x, x + blk):
            for y in range(top, H):
                depth = y - top
                col = (52, 92, 52) if depth < 1 else (70, 50, 38) if (y // blk + c) % 2 else (62, 44, 34)
                px[xx, y] = jitter(mix(col, (8, 10, 18), min(0.8, 0.45 + depth / 50)), rnd, 3)

    # cabaña con la ventana encendida (la luz parpadea un poco, como una vela)
    cb = int(W * 0.78) // blk
    gx, gy = cb * blk, shore[cb]
    wall_w, wall_h = 18, 9
    for y in range(gy - wall_h, gy):
        for x in range(gx, gx + wall_w):
            px[x, y] = jitter((86, 58, 38) if (y - gy) % 3 else (66, 44, 30), rnd, 4)
    for i in range(7):
        for x in range(gx - 2 + i, gx + wall_w + 2 - i):
            px[x, gy - wall_h - 1 - i] = jitter(RED_DARK if i % 2 else RED_DEEPER, rnd, 5)
    for y in range(gy - wall_h - 9, gy - wall_h - 3):
        for x in range(gx + 13, gx + 15):
            px[x, y] = jitter((70, 66, 70), rnd, 4)
    for i in range(12):  # humo que sube y se va
        k = (i + t * 12) % 12
        sx = gx + 14 + int(round(2 * math.sin(k * 0.8 + TAU * t)))
        sy = gy - wall_h - 10 - int(k * 2)
        if 0 <= sy:
            px[sx, sy] = mix(px[sx, sy], (150, 155, 170), max(0.0, 0.6 - k * 0.05))
    flicker = 0.85 + 0.1 * math.sin(TAU * 3 * t) + 0.05 * math.sin(TAU * 7 * t + 1)
    wx, wy = gx + 4, gy - 7
    snap = img.copy()
    spx = snap.load()
    for y in range(H):
        for x in range(W):
            d = math.hypot((x - wx - 2) * 0.9, y - wy - 1)
            if d < 22:
                px[x, y] = mix(spx[x, y], (255, 170, 80), (1 - d / 22) ** 2 * 0.35 * flicker)
    for y in range(wy, wy + 4):
        for x in range(wx, wx + 5):
            px[x, y] = mix((200, 130, 60), (255, 205, 115), flicker) if (x - wx) != 2 and (y - wy) != 1 else (120, 76, 40)
    for y in range(gy - 5, gy):
        for x in range(gx + 11, gx + 14):
            px[x, y] = (46, 30, 22)
    for x in range(gx - 14, gx):  # muelle
        px[x, water] = (78, 54, 36)
        if x % 5 == 0:
            for y in range(water + 1, water + 4):
                px[x, y] = (54, 38, 26)

    # luciérnagas cerca de la orilla
    for i in range(7):
        fx = int(W * 0.66 + 26 * (0.5 + 0.5 * math.sin(TAU * t + i * 1.9)) + i * 5) % W
        fy = int(water - 12 + 6 * math.sin(TAU * 2 * t + i * 2.3))
        glow = 0.5 + 0.5 * math.sin(TAU * (t * 2 + i * 0.31))
        if glow > 0.25:
            px[fx, fy] = mix(px[fx, fy], (220, 255, 140), glow)

    # agua: reflejo ondulado de lo de arriba + camino de luz de la luna que brilla
    above = img.copy()
    apx = above.load()
    for y in range(water, H):
        d = y - water
        src_y = water - 1 - d
        for x in range(W):
            if x >= W * 0.6 and px[x, y] != apx[x, y] and y > water:
                continue  # la orilla tapa el agua
            ripple = int(round(math.sin(y * 1.7 + x * 0.05 + TAU * 2 * t) * (1 + d / 20)))
            sx = min(W - 1, max(0, x + ripple))
            refl = apx[sx, src_y] if src_y >= 0 else (10, 14, 28)
            c = mix(refl, mix((14, 24, 46), (6, 10, 22), d / (H - water)), 0.55 + d / (H - water) * 0.3)
            if abs(x - mx) < max(2, 7 - d // 4) and (y + x // 3 + int(t * 6)) % 3 == 0 and d < 40:
                c = mix(c, (220, 225, 210), 0.55 - d / 90)
            if x < W * 0.6 or px[x, y] == apx[x, y]:
                px[x, y] = c
    for x in range(W):
        if px[x, water - 1][2] > 40 and x < W * 0.6:
            px[x, water] = mix(px[x, water], (120, 160, 190), 0.4)
    return img


def background():
    return upscale(lake_frame(0.0), 8)


def background_animated(path, frames=36, ms=110, scale=4):
    """Guarda la escena animada como APNG (FancyMenu la reproduce en loop)."""
    imgs = [upscale(lake_frame(i / frames), scale) for i in range(frames)]
    imgs[0].save(path, format='PNG', save_all=True, append_images=imgs[1:], duration=ms, loop=0, optimize=True)
    return path


def blip(path, freq=880, ms=45, vol=0.18, slide=1.0):
    """Sonido corto (wav) para los botones: un "tic" suave, sin archivos de terceros."""
    import struct
    import wave
    rate = 44100
    n = int(rate * ms / 1000)
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        frames = bytearray()
        phase = 0.0
        for i in range(n):
            f = freq * (1 + (slide - 1) * i / n)
            phase += 2 * math.pi * f / rate
            env = min(1, i / 60) * (1 - i / n) ** 2  # ataque rápido y se apaga suave
            # onda cuadrada suavizada: suena "retro" sin ser chillona
            v = math.tanh(3 * math.sin(phase)) * env * vol
            frames += struct.pack('<h', int(v * 32767))
        w.writeframes(bytes(frames))


def main():
    out = Path(sys.argv[1] if len(sys.argv) > 1 else 'art')
    out.mkdir(parents=True, exist_ok=True)
    launcher_icon().save(out / 'launcher-icon.png')
    modpack_icon().save(out / 'icon.png')
    logo().save(out / 'logo.png')
    background().save(out / 'background.png', optimize=True)
    background_sunset().save(out / 'background-atardecer.png', optimize=True)
    background_animated(out / 'background.apng')
    blip(out / 'hover.wav', freq=660, ms=40, vol=0.12, slide=1.3)
    blip(out / 'click.wav', freq=520, ms=70, vol=0.2, slide=0.6)
    button(200, 24).save(out / 'btn-play.png')
    button(200, 24, hover=True).save(out / 'btn-play-hover.png')
    button(98, 20, 'dark').save(out / 'btn.png')
    button(98, 20, 'dark', hover=True).save(out / 'btn-hover.png')
    for f in sorted([*out.glob('*.png'), *out.glob('*.apng')]):
        with Image.open(f) as im:
            print(f'{f.name}: {im.width}x{im.height}, {f.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
