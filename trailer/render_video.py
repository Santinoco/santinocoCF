"""Renderiza el video del trailer (sin audio) a out/video.mp4.

Uso: python3 render_video.py [--preview SEGUNDO ...]
"""
import math
import os
import random
import subprocess
import sys

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

from timeline import BRAAMS, DURATION, FLASHES, FPS, H, HITS, MONTAGE_CUTS, MONTAGE_DURS, MONTAGE_PAGES, SHAKES, SHOTS, W

HERE = os.path.dirname(os.path.abspath(__file__))
CAP = os.path.join(HERE, 'captures')
OUT = os.path.join(HERE, 'out')
FONT = os.path.join(HERE, 'assets', 'Cinzel-900.ttf')
FONT_B = os.path.join(HERE, 'assets', 'Cinzel-700.ttf')
os.makedirs(OUT, exist_ok=True)
rng = random.Random(7)


def ease(x):
    x = min(max(x, 0.0), 1.0)
    return 4 * x * x * x if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def ease_out(x):
    x = min(max(x, 0.0), 1.0)
    return 1 - (1 - x) ** 3


def lerp(a, b, x):
    return a + (b - a) * x


# ---------------------------------------------------------------- teléfono
SW = 640                       # ancho de pantalla del teléfono en el video
SH = int(SW * 844 / 390)       # alto (proporción iPhone)
BZ = 22                        # bisel
RAD = 78
PAD = 140                      # margen para el resplandor
k = SW / 1170

pages = {}
for name in ['home', 'novedades', 'chisme', 'muro', 'publicidad', 'ranking', 'casting', 'menu']:
    im = Image.open(os.path.join(CAP, name + '.png')).convert('RGB')
    pages[name] = im.resize((SW, int(im.height * k)), Image.LANCZOS)
topbar = Image.open(os.path.join(CAP, 'topbar.png')).convert('RGB')
topbar = topbar.resize((SW, int(topbar.height * k)), Image.LANCZOS)
bnav = Image.open(os.path.join(CAP, 'bottomnav.png')).convert('RGBA')
bnav = bnav.resize((int(bnav.width * k), int(bnav.height * k)), Image.LANCZOS)

PW, PH = SW + 2 * BZ, SH + 2 * BZ
frame_img = Image.new('RGBA', (PW, PH), (0, 0, 0, 0))
d = ImageDraw.Draw(frame_img)
d.rounded_rectangle((0, 0, PW - 1, PH - 1), RAD, fill=(14, 12, 14, 255), outline=(96, 86, 80, 255), width=4)
d.rounded_rectangle((6, 6, PW - 7, PH - 7), RAD - 6, outline=(40, 36, 36, 255), width=3)
screen_mask = Image.new('L', (SW, SH), 0)
ImageDraw.Draw(screen_mask).rounded_rectangle((0, 0, SW - 1, SH - 1), RAD - BZ, fill=255)
island = Image.new('RGBA', (PW, PH), (0, 0, 0, 0))
ImageDraw.Draw(island).rounded_rectangle((PW // 2 - 62, BZ + 12, PW // 2 + 62, BZ + 46), 17, fill=(5, 5, 6, 255))


def make_glow(color, alpha, blur):
    g = Image.new('RGBA', (PW + 2 * PAD, PH + 2 * PAD), (0, 0, 0, 0))
    ImageDraw.Draw(g).rounded_rectangle((PAD, PAD, PAD + PW, PAD + PH), RAD, fill=color + (alpha,))
    return g.filter(ImageFilter.GaussianBlur(blur))


GLOW_FIRE = make_glow((255, 110, 30), 120, 55)
GLOW_GOLD = make_glow((255, 200, 80), 200, 70)


def phone_image(page, y, glow=GLOW_FIRE):
    src = pages[page]
    y = int(max(0, min(y, src.height - SH)))
    screen = src.crop((0, y, SW, y + SH)).convert('RGBA')
    if page != 'menu':
        screen.paste(topbar, (0, 0))
        screen.alpha_composite(bnav, ((SW - bnav.width) // 2, SH - bnav.height - int(10 * SW / 390)))
    ph = frame_img.copy()
    ph.paste(screen, (BZ, BZ), screen_mask)
    ph.alpha_composite(island)
    full = glow.copy()
    full.alpha_composite(ph, (PAD, PAD))
    return full


def place(canvas, img, scale, rot, cx, cy):
    w, h = img.size
    im = img.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.BILINEAR)
    if abs(rot) > 0.01:
        im = im.rotate(rot, Image.BICUBIC, expand=True)
    canvas.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))


# ---------------------------------------------------------------- texto dorado
def gold_gradient(w, h):
    stops = [(0.0, (255, 246, 214)), (0.45, (240, 196, 92)), (0.6, (196, 132, 40)), (1.0, (255, 220, 140))]
    col = np.zeros((h, 3), np.float32)
    ys = np.linspace(0, 1, h)
    for i in range(len(stops) - 1):
        (a, ca), (b, cb) = stops[i], stops[i + 1]
        m = (ys >= a) & (ys <= b)
        x = ((ys[m] - a) / (b - a))[:, None]
        col[m] = np.array(ca) * (1 - x) + np.array(cb) * x
    arr = np.repeat(col[:, None, :], w, axis=1).astype(np.uint8)
    return Image.fromarray(arr, 'RGB')


def text_block(lines, size, max_w=960, font=FONT, gap=0.18, tracking=0.0):
    fonts = []
    for ln in lines:
        s = size
        while True:
            f = ImageFont.truetype(font, s)
            if f.getlength(ln) * (1 + tracking) <= max_w or s < 30:
                break
            s -= 4
        fonts.append(f)
    heights = [f.getbbox('ÁMgy')[3] - f.getbbox('ÁM')[1] for f in fonts]
    total_h = int(sum(heights) + gap * size * (len(lines) - 1))
    m = 90
    mask = Image.new('L', (max_w + 2 * m, total_h + 2 * m), 0)
    dr = ImageDraw.Draw(mask)
    y = m
    for ln, f, hh in zip(lines, fonts, heights):
        if tracking:
            chars = list(ln)
            widths = [f.getlength(c) for c in chars]
            tw = sum(widths) + tracking * f.size * (len(chars) - 1)
            x = (mask.width - tw) / 2
            for c, cw in zip(chars, widths):
                dr.text((x, y - f.getbbox('ÁM')[1]), c, font=f, fill=255)
                x += cw + tracking * f.size
        else:
            tw = f.getlength(ln)
            dr.text(((mask.width - tw) / 2, y - f.getbbox('ÁM')[1]), ln, font=f, fill=255)
        y += hh + gap * size
    gold = gold_gradient(mask.width, mask.height)
    out = Image.new('RGBA', mask.size, (0, 0, 0, 0))
    glow = mask.filter(ImageFilter.GaussianBlur(22))
    glow_img = Image.new('RGBA', mask.size, (255, 120, 30, 0))
    glow_img.putalpha(glow.point(lambda v: int(v * 0.75)))
    shadow = Image.new('RGBA', mask.size, (0, 0, 0, 0))
    shadow.putalpha(mask.filter(ImageFilter.GaussianBlur(4)).point(lambda v: int(v * 0.8)))
    out.alpha_composite(glow_img)
    out.alpha_composite(shadow, (0, 4))
    txt = gold.convert('RGBA')
    txt.putalpha(mask)
    out.alpha_composite(txt)
    return out


def with_alpha(img, a):
    if a >= 0.999:
        return img
    im = img.copy()
    im.putalpha(im.getchannel('A').point(lambda v: int(v * a)))
    return im


# ---------------------------------------------------------------- fondo, brasas, grano
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
r_bottom = np.sqrt(((xx - W / 2) / W) ** 2 + ((yy - H * 1.05) / H) ** 2)
fire = np.clip(1 - r_bottom * 1.6, 0, 1) ** 2
bg = np.zeros((H, W, 3), np.float32)
bg[..., 0] = 10 + 120 * fire
bg[..., 1] = 6 + 34 * fire
bg[..., 2] = 8 + 10 * fire
BG = Image.fromarray(bg.clip(0, 255).astype(np.uint8), 'RGB').convert('RGBA')
BLACK = Image.new('RGBA', (W, H), (0, 0, 0, 255))
r_c = np.sqrt(((xx - W / 2) / (W * 0.75)) ** 2 + ((yy - H / 2) / (H * 0.75)) ** 2)
VIGNETTE = np.clip(1.15 - r_c ** 2 * 0.85, 0.25, 1.0)[..., None]
GRAIN = []
nrng = np.random.default_rng(3)
for _ in range(6):
    g = nrng.normal(0, 1, (H // 2, W // 2)).astype(np.float32)
    g = np.asarray(Image.fromarray(((g * 40) + 128).clip(0, 255).astype(np.uint8)).resize((W, H), Image.BILINEAR), np.float32) - 128
    GRAIN.append(g[..., None] * 0.22)


def ember_sprite(r, a):
    s = r * 6
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(im).ellipse((s / 2 - r, s / 2 - r, s / 2 + r, s / 2 + r), fill=(255, 170, 60, a))
    im = im.filter(ImageFilter.GaussianBlur(r * 0.9))
    ImageDraw.Draw(im).ellipse((s / 2 - r / 3, s / 2 - r / 3, s / 2 + r / 3, s / 2 + r / 3), fill=(255, 230, 170, a))
    return im


SPRITES = {(r, a): ember_sprite(r, a) for r in (4, 7, 11) for a in (70, 140, 230)}
EMBERS = [dict(x=rng.uniform(0, W), sp=rng.uniform(50, 170), off=rng.uniform(0, H + 200), r=rng.choice((4, 4, 7, 7, 11)),
               sway=rng.uniform(10, 50), ph=rng.uniform(0, 6.28), fl=rng.uniform(2, 7)) for _ in range(70)]


def draw_embers(canvas, t, amount=1.0, front=False):
    n = int(len(EMBERS) * min(amount, 1.0))
    for i, e in enumerate(EMBERS[:n]):
        if front != (i % 5 == 0):
            continue
        y = H + 100 - ((t * e['sp'] * (1 + 0.6 * (amount > 1)) + e['off']) % (H + 200))
        x = e['x'] + math.sin(t * 1.3 + e['ph']) * e['sway']
        lvl = 0.5 + 0.5 * math.sin(t * e['fl'] + e['ph'])
        a = 230 if lvl > 0.66 else 140 if lvl > 0.33 else 70
        sp = SPRITES[(e['r'], a)]
        canvas.alpha_composite(sp, (int(x - sp.width / 2), int(y - sp.height / 2)))


# ---------------------------------------------------------------- precálculo de textos
CARD_TXT = {}
for s0, s1, kind, p in SHOTS:
    if kind == 'card':
        CARD_TXT[s0] = text_block(p['lines'], 150 if p.get('big') else 112)
    if kind == 'phone' and p.get('caption'):
        CARD_TXT[s0] = text_block([p['caption']], 74, max_w=900)
LOGO = text_block(['SANTINOCOCF'], 150, max_w=980)
LOGO_SUB = text_block(['EL PORTAL'], 46, max_w=600, font=FONT_B, tracking=0.5)
END_TOP = text_block(['ESTRENA'], 84, max_w=800, tracking=0.25)
END_BIG = text_block(['MAÑANA'], 200, max_w=980)
END_HANDLE = text_block(['@SANTINOCOCF'], 44, max_w=700, font=FONT_B, tracking=0.2)

spartan = Image.open(os.path.join(HERE, '..', 'public', 'santino', 'espartano.jpg')).convert('RGB')

TOP_BAND = Image.new('RGBA', (W, 520), (0, 0, 0, 0))
band = np.zeros((520, W, 4), np.uint8)
band[..., 3] = (np.linspace(230, 0, 520)[:, None]).astype(np.uint8)
TOP_BAND = Image.fromarray(band, 'RGBA')

MONTAGE = []
for i, (pg, t0, dur) in enumerate(zip(MONTAGE_PAGES, MONTAGE_CUTS, MONTAGE_DURS)):
    maxy = max(0, pages[pg].height - SH - 260)
    MONTAGE.append(dict(page=pg, t0=t0, dur=dur, y=rng.uniform(0, maxy) if pg != 'menu' else 0,
                        rot=rng.uniform(-6, 6), scale=rng.uniform(1.15, 1.32), dx=rng.uniform(-60, 60)))


# ---------------------------------------------------------------- un frame
def render(t):
    shot = next(s for s in SHOTS if s[0] <= t < s[1]) if t < SHOTS[-1][1] else SHOTS[-1]
    s0, s1, kind, p = shot
    lt, dur = t - s0, s1 - s0
    x = lt / dur
    canvas = BG.copy()
    fade = 1.0

    if kind == 'black':
        canvas = BLACK.copy()

    elif kind == 'card':
        canvas = BLACK.copy()
        draw_embers(canvas, t, 0.5)
        txt = CARD_TXT[s0]
        a = min(1, (lt - p['text_in']) / 0.45) if lt >= p['text_in'] else 0
        if lt > p['text_out']:
            a = max(0, 1 - (lt - p['text_out']) / 0.25)
        if a > 0:
            sc = lerp(1.0, 1.07, x)
            place(canvas, with_alpha(txt, a), sc, 0, W / 2, H / 2)

    elif kind == 'phone':
        draw_embers(canvas, t, 0.8)
        y = lerp(p['y'][0], p['y'][1], ease(x))
        sc = lerp(p['scale'][0], p['scale'][1], ease(x))
        rot = lerp(p['rot'][0], p['rot'][1], ease(x))
        cy = H / 2 + 50
        if p.get('rise'):
            cy += (1 - ease_out(lt / p['rise'])) * 700
        glow = GLOW_GOLD if p.get('glow') else GLOW_FIRE
        place(canvas, phone_image(p['page'], y, glow), sc, rot, W / 2, cy)
        draw_embers(canvas, t, 0.8, front=True)
        if p.get('caption'):
            a = min(1, max(0, (lt - 0.15) / 0.3))
            canvas.alpha_composite(with_alpha(TOP_BAND, a))
            place(canvas, with_alpha(CARD_TXT[s0], a), lerp(1.04, 1.0, ease_out(lt / 0.6)), 0, W / 2, 200)
        fade = min(1, lt / 0.2)

    elif kind == 'photo':
        z = lerp(1.0, 1.16, ease(x))
        bh = spartan.height / z
        bw = bh * W / H
        cx, cy = spartan.width / 2, spartan.height * 0.34
        top = min(max(0, cy - bh / 2), spartan.height - bh)
        box = (cx - bw / 2, top, cx + bw / 2, top + bh)
        im = spartan.resize((W, H), Image.BICUBIC, box=box)
        arr = np.asarray(im, np.float32)
        arr *= np.array([1.0, 0.86, 0.78]) * lerp(0.75, 0.95, min(1, lt / 0.4))
        canvas = Image.fromarray(arr.clip(0, 255).astype(np.uint8), 'RGB').convert('RGBA')
        draw_embers(canvas, t, 1.0)
        draw_embers(canvas, t, 1.0, front=True)

    elif kind == 'montage':
        draw_embers(canvas, t, 1.0)
        c = next(m for m in reversed(MONTAGE) if m['t0'] <= t)
        cx_ = (t - c['t0']) / c['dur']
        place(canvas, phone_image(c['page'], c['y'] + cx_ * 160), c['scale'] + cx_ * 0.05, c['rot'] * (1 - 0.3 * cx_),
              W / 2 + c['dx'], H / 2 + 40)
        draw_embers(canvas, t, 1.0, front=True)

    elif kind == 'logo':
        canvas = BLACK.copy()
        draw_embers(canvas, t, 1.6)
        # destello horizontal
        fl = max(0, 1 - lt / 1.2)
        if fl > 0:
            streak = Image.new('RGBA', (W, 160), (0, 0, 0, 0))
            ImageDraw.Draw(streak).ellipse((-200, 60, W + 200, 100), fill=(255, 200, 120, int(255 * fl)))
            streak = streak.filter(ImageFilter.GaussianBlur(18))
            canvas.alpha_composite(streak, (0, int(H / 2 - 80 - 40)))
        sc = lerp(1.25, 1.0, ease_out(lt / 0.5)) * lerp(1.0, 1.05, lt / dur)
        place(canvas, LOGO, sc, 0, W / 2, H / 2 - 40)
        a = min(1, max(0, (lt - 0.8) / 0.6))
        place(canvas, with_alpha(LOGO_SUB, a), 1.0, 0, W / 2, H / 2 + 110)
        draw_embers(canvas, t, 1.6, front=True)
        fade = min(1, lt / 0.06)

    elif kind == 'end':
        canvas = BLACK.copy()
        draw_embers(canvas, t, 1.0)
        a1 = min(1, lt / 0.4)
        place(canvas, with_alpha(END_TOP, a1), 1.0, 0, W / 2, H / 2 - 200)
        place(canvas, with_alpha(END_BIG, a1), lerp(1.18, 1.0, ease_out(lt / 0.6)) * lerp(1, 1.04, x), 0, W / 2, H / 2 + 10)
        a2 = min(1, max(0, (lt - 1.0) / 0.6))
        place(canvas, with_alpha(END_HANDLE, a2), 1.0, 0, W / 2, H / 2 + 330)
        fade = 1 - max(0, (t - (DURATION - 0.9)) / 0.9)

    frame = canvas.convert('RGB')

    # sacudón en los golpes grandes
    for b in SHAKES:
        if 0 <= t - b < 0.4:
            amp = 16 * (1 - (t - b) / 0.4)
            frame = ImageChops.offset(frame, int(rng.uniform(-amp, amp)), int(rng.uniform(-amp, amp)))

    arr = np.asarray(frame, np.float32)
    # flashes
    flash = 0.0
    for f in FLASHES:
        if 0 <= t - f < 0.18:
            strength = 0.9 if f in BRAAMS else 0.55 if f in HITS else 0.35
            flash = max(flash, strength * (1 - (t - f) / 0.18))
    arr = arr * VIGNETTE
    arr += GRAIN[int(t * FPS) % len(GRAIN)]
    if flash > 0:
        arr = arr * (1 - flash) + np.array([255, 236, 210], np.float32) * flash
    arr *= fade
    return arr.clip(0, 255).astype(np.uint8)


if __name__ == '__main__':
    if '--preview' in sys.argv:
        for s in sys.argv[sys.argv.index('--preview') + 1:]:
            Image.fromarray(render(float(s))).save(os.path.join(OUT, f'preview_{s}.jpg'), quality=85)
        sys.exit()
    n = int(DURATION * FPS)
    ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
                           '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-tune', 'grain',
                           '-pix_fmt', 'yuv420p', os.path.join(OUT, 'video.mp4')], stdin=subprocess.PIPE)
    for i in range(n):
        ff.stdin.write(render(i / FPS).tobytes())
        if i % 150 == 0:
            print(f'{i}/{n}', flush=True)
    ff.stdin.close()
    ff.wait()
    print('listo')
