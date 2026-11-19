"""Video corto de lanzamiento v2: cuenta regresiva → encendido → drop → ONLINE.

Distinto al trailer a propósito: paleta azul noche + magenta/amarillo de la marca,
tipografía Anton, cámara que entra en la pantalla y música electrónica épica (128 bpm).

Uso: python3 launch.py [--preview 1.0 4.0 ...]  →  out/lanzamiento_santinococf.mp4
"""
import math
import os
import random
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy.io import wavfile
from scipy.signal import fftconvolve

import make_audio as ma
import render_video as rv

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = rv.OUT
W, H, FPS = rv.W, rv.H, rv.FPS
ANTON = os.path.join(HERE, 'assets', 'Anton-Regular.ttf')
rng = random.Random(21)

# ------------------------------------------------------------------ tiempos
BPM = 128
BEAT = 60 / BPM
COUNT = [0.6, 1.4, 2.2]          # 3 · 2 · 1
POWER = 3.15                     # se enciende el celular
DROP = 5.5                       # entra el beat
DROP_END = DROP + 8 * BEAT       # 8 tiempos de drop (≈ 9.25)
ONLINE = 9.5
LOGO = 12.4
DUR = 14.6

# ------------------------------------------------------------------ paleta
NAVY = np.array([8, 10, 32], np.float32)
PINK = (255, 79, 139)
YELLOW = (255, 210, 63)
WHITE = (255, 255, 255)


def ease_in(x):
    x = min(max(x, 0), 1)
    return x * x * x


def ease_out(x):
    x = min(max(x, 0), 1)
    return 1 - (1 - x) ** 3


# ------------------------------------------------------------------ fondo
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
rc = np.sqrt(((xx - W / 2) / W) ** 2 + ((yy - H * 0.5) / H) ** 2)
center = np.clip(1 - rc * 1.9, 0, 1) ** 2


def background(intensity=1.0, hue=0.0):
    """Azul noche con un centro de luz magenta (hue>0 lo corre a amarillo)."""
    glow = np.array(PINK, np.float32) * (1 - hue) + np.array(YELLOW, np.float32) * hue
    arr = NAVY + center[..., None] * glow * 0.42 * intensity
    return arr


STARS = [(rng.uniform(0, W), rng.uniform(0, H), rng.uniform(0.6, 2.2), rng.uniform(0, 6.3)) for _ in range(140)]


def draw_stars(img, t, speed=1.0):
    d = ImageDraw.Draw(img)
    for x, y, r, ph in STARS:
        # leve zoom hacia afuera: sensación de avance
        k = 1 + ((t * 0.08 * speed + ph / 6.3) % 1) * 0.35
        px, py = W / 2 + (x - W / 2) * k, H / 2 + (y - H / 2) * k
        a = int(120 + 120 * math.sin(t * 3 + ph))
        d.ellipse((px - r, py - r, px + r, py + r), fill=(255, 255, 255, max(0, a)))


# ------------------------------------------------------------------ texto
def glow_text(text, size, fill='white', glow=PINK, max_w=1000, glow_r=28, stroke=0):
    f = ImageFont.truetype(ANTON, size)
    while f.getlength(text) > max_w and size > 40:
        size -= 10
        f = ImageFont.truetype(ANTON, size)
    bb = f.getbbox(text)
    m = 120
    w, h = bb[2] - bb[0] + 2 * m, bb[3] - bb[1] + 2 * m
    mask = Image.new('L', (w, h), 0)
    ImageDraw.Draw(mask).text((m - bb[0], m - bb[1]), text, font=f, fill=255)
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    g = Image.new('RGBA', (w, h), glow + (0,))
    g.putalpha(mask.filter(ImageFilter.GaussianBlur(glow_r)).point(lambda v: min(255, int(v * 1.4))))
    out.alpha_composite(g)
    if fill == 'gradient':
        grad = np.zeros((h, w, 3), np.float32)
        ys = np.linspace(0, 1, h)[:, None]
        grad[:] = (np.array(YELLOW) * (1 - ys) + np.array(PINK) * ys)[:, None, :]
        face = Image.fromarray(grad.astype(np.uint8), 'RGB').convert('RGBA')
    else:
        face = Image.new('RGBA', (w, h), (255, 255, 255, 255))
    face.putalpha(mask)
    if stroke:
        st = Image.new('RGBA', (w, h), (8, 10, 32, 0))
        st.putalpha(mask.filter(ImageFilter.MaxFilter(stroke * 2 + 1)))
        out.alpha_composite(st)
    out.alpha_composite(face)
    return out


NUMS = {n: glow_text(n, 1000, glow=PINK if n != '1' else YELLOW, glow_r=40) for n in ['3', '2', '1']}
TXT_YAESTA = glow_text('YA ESTÁ', 150, glow=PINK, max_w=900)
TXT_ONLINE = glow_text('ONLINE', 420, fill='gradient', glow=PINK, max_w=1000, glow_r=45, stroke=6)
TXT_LOGO = glow_text('SANTINOCOCF', 190, glow=PINK, max_w=980)
TXT_BIO = glow_text('LINK EN LA BIO', 70, glow=YELLOW, max_w=800, glow_r=16)
TXT_HANDLE = glow_text('@SANTINOCOCF', 52, glow=PINK, max_w=800, glow_r=12)


def put(canvas, img, scale, cx, cy, alpha=1.0, rot=0.0):
    if alpha <= 0:
        return
    if alpha < 1:
        img = img.copy()
        img.putalpha(img.getchannel('A').point(lambda v: int(v * alpha)))
    rv.place(canvas, img, scale, rot, cx, cy)


def shockwave(canvas, t, t0, color=PINK, life=0.7, max_r=1100):
    x = (t - t0) / life
    if not 0 <= x < 1:
        return
    r = 60 + ease_out(x) * max_r
    a = int(255 * (1 - x) ** 1.5)
    d = ImageDraw.Draw(canvas)
    for wdt, aa in ((26, a // 4), (10, a // 2), (4, a)):
        d.ellipse((W / 2 - r, H / 2 - r, W / 2 + r, H / 2 + r), outline=color + (aa,), width=wdt)


# ------------------------------------------------------------------ rayos de luz (detrás de ONLINE)
RAYS = Image.new('RGBA', (1600, 1600), (0, 0, 0, 0))
dr = ImageDraw.Draw(RAYS)
for i in range(18):
    a0 = i * 20
    c = YELLOW if i % 2 else PINK
    dr.pieslice((0, 0, 1600, 1600), a0, a0 + 7, fill=c + (70,))
RAYS = RAYS.filter(ImageFilter.GaussianBlur(6))
rmask = Image.fromarray((np.clip(1 - np.sqrt(((np.mgrid[0:1600, 0:1600][1] - 800) / 800) ** 2 + ((np.mgrid[0:1600, 0:1600][0] - 800) / 800) ** 2), 0, 1) ** 0.8 * 255).astype(np.uint8))
RAYS.putalpha(Image.fromarray((np.asarray(RAYS.getchannel('A'), np.float32) * np.asarray(rmask, np.float32) / 255).astype(np.uint8)))

# ------------------------------------------------------------------ chispas (explosión hacia afuera)
SPARKS = []
for _ in range(170):
    ang = rng.uniform(0, 2 * math.pi)
    sp = rng.uniform(500, 2300)
    SPARKS.append(dict(vx=math.cos(ang) * sp, vy=math.sin(ang) * sp, c=rng.choice([YELLOW, YELLOW, PINK, WHITE]),
                       w=rng.choice([2, 3, 4]), life=rng.uniform(0.8, 1.8)))


def draw_sparks(canvas, t, t0):
    lt = t - t0
    if lt < 0:
        return
    d = ImageDraw.Draw(canvas)
    for s in SPARKS:
        if lt > s['life']:
            continue
        drag = (1 - math.exp(-lt * 2.2)) / 2.2
        x = W / 2 + s['vx'] * drag
        y = H / 2 + s['vy'] * drag + 260 * lt * lt
        v = math.exp(-lt * 2.2)
        x2, y2 = x - s['vx'] * v * 0.03, y - s['vy'] * v * 0.03
        a = int(255 * (1 - lt / s['life']))
        d.line((x2, y2, x, y), fill=s['c'] + (a,), width=s['w'])


# ------------------------------------------------------------------ página a pantalla completa
FULL = {}
for name in ['home', 'casting', 'ranking', 'muro', 'novedades', 'chisme', 'publicidad']:
    im = Image.open(os.path.join(rv.CAP, name + '.png')).convert('RGB')
    FULL[name] = im.resize((W, int(im.height * W / 1170)), Image.LANCZOS)
TOPBAR_F = Image.open(os.path.join(rv.CAP, 'topbar.png')).convert('RGB')
TOPBAR_F = TOPBAR_F.resize((W, int(TOPBAR_F.height * W / 1170)), Image.LANCZOS)
BNAV_F = Image.open(os.path.join(rv.CAP, 'bottomnav.png')).convert('RGBA')
BNAV_F = BNAV_F.resize((int(BNAV_F.width * W / 1170), int(BNAV_F.height * W / 1170)), Image.LANCZOS)


def full_page(name, y, punch=1.0, blur_speed=0.0):
    src = FULL[name]
    maxy = src.height - H
    y = max(0, min(y, maxy))

    def crop(yy_):
        yy_ = max(0, min(yy_, maxy))
        bw, bh = W / punch, H / punch
        box = ((W - bw) / 2, yy_ + (H - bh) / 2, (W + bw) / 2, yy_ + (H + bh) / 2)
        return np.asarray(src.resize((W, H), Image.BILINEAR, box=box), np.float32)

    if blur_speed > 2:
        taps = 8
        arr = sum(crop(y - blur_speed * 0.6 * k / taps) for k in range(taps)) / taps
    else:
        arr = crop(y)
    img = Image.fromarray(arr.astype(np.uint8), 'RGB').convert('RGBA')
    img.paste(TOPBAR_F, (0, 0))
    img.alpha_composite(BNAV_F, ((W - BNAV_F.width) // 2, H - BNAV_F.height - 46))
    return img


# Drop: 8 tiempos. Cada tiempo una toma a pantalla completa.
DROP_SHOTS = [
    ('home', 0, 600), ('home', 1500, 2100), ('casting', 0, 380), ('ranking', 200, 520),
    ('muro', 350, 850), ('casting', 650, 1150), ('home', 3300, 3900), ('novedades', 400, 1000),
]
PINK_GLOW = rv.make_glow(PINK, 170, 60)


# ------------------------------------------------------------------ frame
def render(t):
    canvas = Image.fromarray(background(1.0).clip(0, 255).astype(np.uint8), 'RGB').convert('RGBA')
    chroma = 0
    flash = 0.0
    shake = 0.0

    if t < COUNT[0]:
        canvas = Image.fromarray(NAVY.astype(np.uint8)[None, None].repeat(H, 0).repeat(W, 1), 'RGB').convert('RGBA')
        draw_stars(canvas, t, 0.3)

    elif t < POWER:
        # cuenta regresiva
        i = max(k for k, c in enumerate(COUNT) if c <= t)
        lt = t - COUNT[i]
        n = ['3', '2', '1'][i]
        canvas = Image.fromarray(background(0.5 + 0.5 * math.exp(-lt * 4), hue=1.0 if n == '1' else 0).clip(0, 255).astype(np.uint8), 'RGB').convert('RGBA')
        draw_stars(canvas, t, 1 + i)
        shockwave(canvas, t, COUNT[i], YELLOW if n == '1' else PINK)
        sc = 1.0 + 0.9 * math.exp(-lt * 14) + 0.06 * lt
        a = 1.0 if lt < 0.6 else max(0, 1 - (lt - 0.6) / 0.15)
        if n == '1' and t > POWER - 0.25:
            a = 0
        put(canvas, NUMS[n], sc * 0.85, W / 2, H / 2, a)
        flash = 0.6 * math.exp(-lt * 18)
        shake = 18 * math.exp(-lt * 10)
        chroma = int(14 * math.exp(-lt * 12))

    elif t < DROP:
        # el celular se enciende y la cámara entra en la pantalla
        lt = t - POWER
        draw_stars(canvas, t, 3)
        ph = rv.phone_image('home', 0, PINK_GLOW)
        if lt < 0.35:
            # pantalla apagada → línea de encendido → imagen
            on = ph.copy()
            scr = Image.new('RGBA', (rv.SW, rv.SH), (6, 6, 10, 255))
            k = ease_out(lt / 0.35)
            hh = max(4, int(rv.SH * k))
            bright = Image.new('RGBA', (rv.SW, hh), (255, 255, 255, int(255 * (1 - k))))
            content = ph.crop((rv.PAD + rv.BZ, rv.PAD + rv.BZ + (rv.SH - hh) // 2, rv.PAD + rv.BZ + rv.SW, rv.PAD + rv.BZ + (rv.SH + hh) // 2))
            scr.paste(content, (0, (rv.SH - hh) // 2))
            scr.alpha_composite(bright, (0, (rv.SH - hh) // 2))
            mask = Image.new('L', (rv.SW, rv.SH), 0)
            ImageDraw.Draw(mask).rounded_rectangle((0, 0, rv.SW - 1, rv.SH - 1), rv.RAD - rv.BZ, fill=255)
            on.paste(scr, (rv.PAD + rv.BZ, rv.PAD + rv.BZ), mask)
            ph = on
            flash = 0.25 * (1 - k)
        push = ease_in(max(0, lt - 0.45) / (DROP - POWER - 0.45))
        sc = 0.92 + push * 1.0 + 0.03 * math.sin(lt * 2)
        rv.place(canvas, ph, sc, 0, W / 2, H / 2 + 40 - push * 200)
        chroma = int(push * 10)

    elif t < DROP_END:
        # DROP: página a pantalla completa, golpe en cada tiempo
        lt = t - DROP
        b = min(7, int(lt / BEAT))
        bt = lt - b * BEAT
        name, y0, y1 = DROP_SHOTS[b]
        x = bt / BEAT
        y = y0 + (y1 - y0) * ease_out(x)
        speed = (y1 - y0) * 3 * (1 - x) ** 2 / BEAT / FPS
        punch = 1.0 + 0.09 * math.exp(-bt * 9)
        canvas = full_page(name, y, punch, blur_speed=speed)
        flash = (0.85 if b == 0 else 0.35) * math.exp(-bt * 16)
        chroma = int(16 * math.exp(-bt * 14))
        shake = (22 if b == 0 else 9) * math.exp(-bt * 12)
        # tinte magenta que late
        tint = Image.new('RGBA', (W, H), PINK + (int(60 * math.exp(-bt * 6)),))
        canvas.alpha_composite(tint)

    elif t < ONLINE:
        # micro silencio, negro con destello
        canvas = Image.fromarray(NAVY.astype(np.uint8)[None, None].repeat(H, 0).repeat(W, 1), 'RGB').convert('RGBA')

    elif t < LOGO:
        lt = t - ONLINE
        canvas = Image.fromarray(background(0.8 + 0.6 * math.exp(-lt * 3), hue=0.35).clip(0, 255).astype(np.uint8), 'RGB').convert('RGBA')
        draw_stars(canvas, t, 4)
        rays = RAYS.rotate(lt * 18, Image.BILINEAR)
        put(canvas, rays, 1.35 + 0.1 * lt, W / 2, H / 2, min(1, lt / 0.2))
        shockwave(canvas, t, ONLINE, YELLOW, 0.9, 1300)
        shockwave(canvas, t, ONLINE + 0.12, PINK, 0.9, 1300)
        draw_sparks(canvas, t, ONLINE)
        sc = 1.0 + 0.7 * math.exp(-lt * 12) + 0.03 * lt
        put(canvas, TXT_YAESTA, 1.0, W / 2, H / 2 - 300, min(1, max(0, (lt - 0.15) / 0.25)))
        put(canvas, TXT_ONLINE, sc, W / 2, H / 2 + 20)
        flash = 0.95 * math.exp(-lt * 9)
        chroma = int(20 * math.exp(-lt * 8))
        shake = 26 * math.exp(-lt * 7)

    else:
        lt = t - LOGO
        canvas = Image.fromarray(background(0.7 + 0.5 * math.exp(-lt * 4)).clip(0, 255).astype(np.uint8), 'RGB').convert('RGBA')
        draw_stars(canvas, t, 2)
        shockwave(canvas, t, LOGO, PINK, 0.8, 1200)
        put(canvas, TXT_LOGO, 1.0 + 0.4 * math.exp(-lt * 14) + 0.02 * lt, W / 2, H / 2 - 80)
        put(canvas, TXT_BIO, 1.0, W / 2, H / 2 + 120, min(1, max(0, (lt - 0.35) / 0.3)))
        put(canvas, TXT_HANDLE, 1.0, W / 2, H / 2 + 230, min(1, max(0, (lt - 0.6) / 0.3)))
        flash = 0.7 * math.exp(-lt * 12)
        shake = 14 * math.exp(-lt * 10)

    frame = canvas.convert('RGB')
    if shake > 0.5:
        from PIL import ImageChops
        frame = ImageChops.offset(frame, int(rng.uniform(-shake, shake)), int(rng.uniform(-shake, shake)))
    arr = np.asarray(frame, np.float32)
    if chroma > 0:
        arr = arr.copy()
        arr[..., 0] = np.roll(arr[..., 0], chroma, axis=1)
        arr[..., 2] = np.roll(arr[..., 2], -chroma, axis=1)
    arr = arr * rv.VIGNETTE
    arr += rv.GRAIN[int(t * FPS) % len(rv.GRAIN)] * 0.6
    if flash > 0.01:
        arr = arr * (1 - flash) + np.array([255, 240, 250], np.float32) * flash
    if t > DUR - 0.5:
        arr *= max(0, (DUR - t) / 0.5)
    return arr.clip(0, 255).astype(np.uint8)


# ------------------------------------------------------------------ audio
SR = ma.SR


def kick(dur=0.5, vel=1.0):
    t = ma.tv(dur)
    f = 55 + 120 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = (np.sin(ph) * 0.6 + np.sin(ph * 2) * 0.35 + np.sin(ph * 3) * 0.15) * np.exp(-t * 8)
    click = ma.filt(ma.rng.normal(0, 1, len(t)), (1500, 6000), 'band') * np.exp(-t * 90) * 0.9
    return np.tanh((body + click) * 1.8) * vel


def clap(vel=1.0):
    t = ma.tv(0.35)
    n = ma.filt(ma.rng.normal(0, 1, len(t)), (900, 6000), 'band')
    env = sum(np.exp(-np.clip(t - d, 0, None) * 60) * (t >= d) for d in (0, 0.012, 0.024)) / 2 + np.exp(-t * 14) * 0.6
    return n * env * vel


def hat(open_=False):
    t = ma.tv(0.25 if open_ else 0.06)
    n = ma.filt(ma.rng.normal(0, 1, len(t)), 7000, 'high')
    return n * np.exp(-t * (18 if open_ else 80)) * 0.5


def zap(dur=0.45):
    t = ma.tv(dur)
    f = 70 * (40 ** (t / dur))
    s = ma.saw(f, t) * 0.6 + ma.filt(ma.rng.normal(0, 1, len(t)), 4000, 'high') * (t / dur) * 0.5
    return ma.filt(s, 9000) * np.minimum(1, t / 0.02) * np.minimum(1, (dur - t) / 0.03)


def stab(ms, dur, cut=5000, att=0.005):
    t = ma.tv(dur)
    s = sum(ma.supersaw(ma.midi(m), t, 7, 0.012) for m in ms) / len(ms)
    s = ma.filt(s, cut, order=2)
    return np.tanh(s * 2.0) * np.minimum(1, t / att) * np.exp(-t / max(0.05, dur * 0.6))


def hybrid_hit(dur=3.0):
    t = ma.tv(dur)
    sub = np.sin(2 * np.pi * np.cumsum(38 + 90 * np.exp(-t * 10)) / SR) * np.exp(-t / 1.0)
    crash = ma.filt(ma.rng.normal(0, 1, len(t)), 2500, 'high') * np.exp(-t * 2.2) * 0.35
    snap = ma.filt(ma.rng.normal(0, 1, len(t)), (300, 3000), 'band') * np.exp(-t * 25) * 1.4
    mid = np.sin(2 * np.pi * np.cumsum(120 + 160 * np.exp(-t * 12)) / SR) * np.exp(-t * 4) * 0.8
    return np.tanh((sub * 0.55 + mid + crash * 1.6 + snap) * 1.5)


def render_audio(path):
    n = int((DUR + 0.6) * SR)
    music = np.zeros((ma.N, 2))
    sfx = np.zeros((ma.N, 2))
    add = ma.add
    # latido antes de la cuenta y entre números
    for hb in [0.12, 0.34, 1.02, 1.82]:
        add(sfx, kick(0.35, 0.55), hb, gain=0.8)
        add(sfx, kick(0.3, 0.35), hb + 0.17, gain=0.8)
    # tono de tensión que sube
    t = ma.tv(POWER - 0.2)
    ten = ma.supersaw(ma.midi(38) * (1 + 0.5 * (t / t[-1]) ** 2), t, 5, 0.01)
    ten = ma.filt(ten, 1400) * np.interp(t, [0, 0.6, t[-1] - 0.05, t[-1]], [0, 0.25, 0.5, 0])
    add(music, ten, 0.0)
    # cuenta regresiva: golpe + campana aguda
    for i, c in enumerate(COUNT):
        add(sfx, hybrid_hit(1.2), c, gain=0.9)
        tt = ma.tv(1.0)
        bell = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt * d) for f, d in ((1760 - i * 220, 5), (2640 - i * 330, 7), (3520, 10))) / 3
        add(sfx, bell, c, gain=0.35)
    # encendido
    add(sfx, zap(0.45), POWER, gain=0.55)
    # build: redoble que acelera + riser + barrido de sintetizador
    tt_, step = POWER + 0.35, BEAT / 2
    while tt_ < DROP - 0.06:
        prog = (tt_ - POWER) / (DROP - POWER)
        add(sfx, clap(0.4 + 0.6 * prog), tt_, pan=ma.rng.uniform(-0.3, 0.3), gain=0.5)
        if prog > 0.45:
            step = BEAT / 4
        if prog > 0.8:
            step = BEAT / 8
        tt_ += step
    add(sfx, ma.riser(DROP - POWER - 0.05), POWER, gain=0.6)
    tb = ma.tv(DROP - POWER - 0.05)
    sweep = ma.supersaw(ma.midi(50), tb, 7, 0.012)
    cut = 300 * (25 ** (tb / tb[-1]))
    lo, hi = ma.filt(sweep, 400), ma.filt(sweep, 6000)
    wgt = (cut - 300) / (cut[-1] - 300)
    add(music, (lo * (1 - wgt) + hi * wgt) * (tb / tb[-1]) ** 1.5 * 0.5, POWER)
    # DROP: bombo en negras, palmas en 2 y 4, hats a contratiempo, bajo y acordes que bombean
    add(sfx, hybrid_hit(2.0), DROP, gain=1.0)
    chords = [(50, 53, 57, 62), (46, 50, 53, 58), (53, 57, 60, 65), (48, 52, 55, 60)]
    for b in range(8):
        bt = DROP + b * BEAT
        add(music, kick(0.45), bt, gain=1.0)
        if b % 2 == 1:
            add(music, clap(), bt, gain=0.6)
        add(music, hat(True), bt + BEAT / 2, pan=0.3, gain=0.6)
        add(music, hat(), bt + BEAT / 4, pan=-0.3, gain=0.4)
        add(music, hat(), bt + 3 * BEAT / 4, pan=-0.3, gain=0.4)
        ch = chords[(b // 2) % 4]
        # bajo en contratiempo (efecto "bombeo" porque deja lugar al bombo)
        bass_t = ma.tv(BEAT / 2)
        bass = 0.35 * ma.supersaw(ma.midi(ch[0] - 24), bass_t, 5, 0.01) + ma.supersaw(ma.midi(ch[0] - 12), bass_t, 5, 0.01)
        bass = ma.filt(bass, 1800) * np.minimum(1, bass_t / 0.01) * np.minimum(1, (BEAT / 2 - bass_t) / 0.02)
        add(music, np.tanh(bass * 1.5), bt + BEAT / 2, gain=0.55)
        add(music, stab(ch, BEAT * 0.9, cut=4500 + 300 * b), bt + 0.02, pan=-0.2, gain=1.0)
        add(music, stab([m + 12 for m in ch], BEAT * 0.5, cut=7000), bt + BEAT / 2, pan=0.25, gain=0.55)
    # reverso antes de ONLINE
    rev = ma.riser(0.5)[::-1][::-1]
    add(sfx, rev, DROP_END - 0.25, gain=0.35)
    # ONLINE: golpe gigante + acorde mayor que se abre
    add(sfx, hybrid_hit(3.5), ONLINE, gain=1.1)
    add(sfx, ma.boom(3.0), ONLINE, gain=0.45)
    dur_on = LOGO - ONLINE + 0.1
    t_on = ma.tv(dur_on)
    major = [38, 45, 50, 54, 57, 62, 66, 69]
    s = sum(ma.supersaw(ma.midi(m), t_on, 7, 0.012) for m in major) / len(major)
    lo, hi = ma.filt(s, 600), ma.filt(s, 7000)
    wgt = np.clip(t_on / 1.2, 0, 1)
    add(music, np.tanh((lo * (1 - wgt) + hi * wgt) * 2.2) * np.minimum(1, t_on / 0.01) * 1.2, ONLINE)
    for k in range(int(dur_on / BEAT)):
        add(music, kick(0.45, 0.9), ONLINE + k * BEAT, gain=0.9)
        add(music, hat(True), ONLINE + k * BEAT + BEAT / 2, gain=0.5)
    # logo: último golpe y cola
    add(sfx, hybrid_hit(DUR - LOGO + 0.4), LOGO, gain=1.0)
    t_end = ma.tv(DUR - LOGO + 0.4)
    tail = sum(ma.supersaw(ma.midi(m), t_end, 7, 0.012) for m in major) / len(major)
    tail = ma.filt(tail, 3500) * np.interp(t_end, [0, 0.05, t_end[-1]], [0, 1, 0])
    add(music, np.tanh(tail * 2) * 1.1, LOGO)
    # silencios cortos antes del drop y antes de ONLINE
    gate = np.ones(ma.N)
    for a, b in [(DROP - 0.06, DROP), (DROP_END + 0.02, ONLINE)]:
        gate[int(a * SR):int(b * SR)] = 0
    mix = (music + sfx * 0.9) * gate[:, None]
    ir_t = ma.tv(2.2)
    ir = ma.rng.normal(0, 1, (len(ir_t), 2)) * np.exp(-ir_t * 3.2)[:, None]
    for ch in range(2):
        ir[:, ch] = ma.filt(ir[:, ch], 6000)
    ir /= np.sqrt((ir ** 2).sum(0))
    wet = np.stack([fftconvolve(mix[:, ch], ir[:, ch])[:ma.N] for ch in range(2)], 1)
    out = (mix * 0.85 + wet * 0.35)[:n]
    for ch in range(2):
        out[:, ch] = ma.filt(out[:, ch], 55, 'high')
    out /= np.abs(out).max() + 1e-9
    out = np.tanh(out * 1.8) / np.tanh(1.8)
    out *= 0.89 / np.abs(out).max()
    e0 = int((DUR - 0.5) * SR)
    out[e0:] *= np.linspace(1, 0, len(out) - e0)[:, None]
    wavfile.write(path, SR, (out * 32767).astype(np.int16))


if __name__ == '__main__':
    if '--preview' in sys.argv:
        for s in sys.argv[sys.argv.index('--preview') + 1:]:
            Image.fromarray(render(float(s))).save(os.path.join(OUT, f'launch_{s}.jpg'), quality=85)
        sys.exit()
    v, a = os.path.join(OUT, 'launch_video.mp4'), os.path.join(OUT, 'launch_audio.wav')
    render_audio(a)
    ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
                           '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-tune', 'grain',
                           '-pix_fmt', 'yuv420p', v], stdin=subprocess.PIPE)
    for i in range(int(DUR * FPS)):
        ff.stdin.write(render(i / FPS).tobytes())
    ff.stdin.close()
    ff.wait()
    meas = subprocess.run(['ffmpeg', '-hide_banner', '-i', a, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    lufs = float([l for l in meas.splitlines() if l.strip().startswith('I:')][-1].split()[1])
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', v, '-i', a, '-af', f'volume={-14 - lufs}dB,alimiter=limit=0.89:level=false',
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-maxrate', '10M', '-bufsize', '20M', '-pix_fmt', 'yuv420p',
                    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest', '-movflags', '+faststart',
                    os.path.join(OUT, 'lanzamiento_santinococf.mp4')], check=True)
    print('listo: out/lanzamiento_santinococf.mp4')
