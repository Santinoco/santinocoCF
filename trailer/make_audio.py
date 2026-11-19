"""Genera la música épica y los efectos del trailer en out/audio.wav (48 kHz, estéreo)."""
import os

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt

from timeline import BOOMS, BRAAMS, DURATION, HITS, MONTAGE_CUTS, RISERS, WHOOSHES

SR = 48000
N = int((DURATION + 0.5) * SR)
rng = np.random.default_rng(11)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
os.makedirs(OUT, exist_ok=True)

music = np.zeros((N, 2))
sfx = np.zeros((N, 2))


def tv(dur):
    return np.arange(int(dur * SR)) / SR


def filt(x, fc, kind='low', order=2):
    if kind == 'band':
        sos = butter(order, fc, 'bandpass', fs=SR, output='sos')
    else:
        sos = butter(order, fc, kind, fs=SR, output='sos')
    return sosfilt(sos, x)


def saw(freq, t):
    f = np.broadcast_to(freq, t.shape)
    ph = np.cumsum(f) / SR + rng.uniform()
    return 2 * (ph % 1.0) - 1


def add(buf, sig, t0, pan=0.0, gain=1.0):
    i0 = int(t0 * SR)
    if i0 >= N:
        return
    sig = sig[: N - i0] * gain
    if sig.ndim == 1:
        a = (pan + 1) * np.pi / 4
        buf[i0:i0 + len(sig), 0] += sig * np.cos(a)
        buf[i0:i0 + len(sig), 1] += sig * np.sin(a)
    else:
        buf[i0:i0 + len(sig)] += sig


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def supersaw(f, t, voices=5, spread=0.006):
    out = np.zeros_like(t)
    for v in range(voices):
        det = 1 + spread * (v - (voices - 1) / 2) / max(1, (voices - 1) / 2)
        out += saw(f * det, t)
    return out / voices


# ------------------------------------------------------------------ instrumentos
def braam(dur=3.6):
    t = tv(dur)
    tone = sum(g * supersaw(f, t, 7, 0.01) for f, g in [(36.71, 0.35), (73.42, 0.9), (110.0, 0.9), (146.83, 0.8), (220.0, 0.45), (293.66, 0.25)])
    bright = filt(tone, 4200, order=4)
    dark = filt(tone, 700, order=4)
    w = np.exp(-t * 1.8)
    sig = bright * w + dark * (1 - w)
    sig = np.tanh(sig * 2.2)
    env = np.minimum(1, t / 0.025) * np.exp(-t / 1.9)
    sub = np.sin(2 * np.pi * np.cumsum(36.71 + 20 * np.exp(-t * 6)) / SR) * np.exp(-t / 2.2)
    return (sig * env * 1.0 + sub * 0.35) * np.minimum(1, (dur - t) / 0.3)


def boom(dur=3.0, f0=58):
    t = tv(dur)
    f = f0 * 0.5 + f0 * 0.5 * np.exp(-t * 2.5)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 1.1)
    thump = filt(rng.normal(0, 1, len(t)), 180) * np.exp(-t * 14) * 3
    mid = np.sin(2 * np.pi * np.cumsum(f * 3.1) / SR) * np.exp(-t * 5) * 0.6
    return np.tanh((body * 0.6 + thump + mid) * 1.4)


def taiko(vel=1.0):
    t = tv(0.9)
    f = 72 + 90 * np.exp(-t * 9)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = (np.sin(ph) * 0.7 + np.sin(ph * 2.3) * 0.45 + np.sin(ph * 3.6) * 0.2) * np.exp(-t * 6)
    skin = filt(rng.normal(0, 1, len(t)), (200, 2500), 'band') * np.exp(-t * 30) * 2.2
    return np.tanh((body + skin) * 1.6) * vel


def metal_hit(dur=2.5):
    t = tv(dur)
    partials = [(176, 6), (331, 5), (529, 4.5), (809, 6), (1243, 8), (1787, 10)]
    ring = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * np.exp(-t * d) for f, d in partials) / 4
    noise = filt(rng.normal(0, 1, len(t)), (1200, 7000), 'band') * np.exp(-t * 22)
    return ring * 0.7 + noise * 0.8 + boom(dur, 70) * 0.9


def whoosh(dur=0.9, rev=False):
    t = tv(dur)
    noise = rng.normal(0, 1, len(t))
    x = t / dur
    out = np.zeros_like(t)
    centers = [300, 600, 1100, 2000, 3500, 5500]
    for i, c in enumerate(centers):
        band = filt(noise, (c * 0.7, min(c * 1.4, 20000)), 'band')
        pos = i / (len(centers) - 1)
        out += band * np.exp(-((x - (0.2 + 0.6 * pos)) ** 2) / 0.03)
    env = np.sin(np.pi * x) ** 2
    sig = out * env
    pan = np.linspace(-0.8, 0.8, len(t))
    a = (pan + 1) * np.pi / 4
    return np.stack([sig * np.cos(a), sig * np.sin(a)], 1)


def riser(dur):
    t = tv(dur)
    x = t / dur
    noise = rng.normal(0, 1, len(t))
    lo, hi = filt(noise, 900), filt(noise, 3500, 'high')
    n = lo * (1 - x) + hi * x
    f = 90 * (8 ** x)
    tone = saw(f * (1 + 0.004 * np.sin(2 * np.pi * 6 * t)), t)
    tone = filt(tone, 3000) * 0.5 + np.sin(2 * np.pi * np.cumsum(f * 2) / SR) * 0.3
    env = x ** 2.6
    return (n * 0.55 + tone) * env


def string_note(m, dur=0.23, bright=2300):
    t = tv(dur)
    f = midi(m)
    sig = supersaw(f, t, 3, 0.008) + 0.5 * supersaw(f / 2, t, 2, 0.006)
    sig = filt(sig, bright)
    env = np.minimum(1, t / 0.006) * np.exp(-t / 0.11)
    return sig * env


def pad(ms, dur, att=0.4, cut=800, gain=1.0):
    t = tv(dur)
    sig = sum(supersaw(midi(m), t, 4, 0.007) for m in ms) / len(ms)
    sig = filt(sig, cut, order=2)
    env = np.minimum(1, t / att) * np.minimum(1, (dur - t) / 0.15)
    return sig * env * gain


def brass(ms, dur, att=0.06):
    t = tv(dur)
    vib = 1 + 0.003 * np.sin(2 * np.pi * 5.2 * t)
    sig = sum(supersaw(midi(m) * vib, t, 5, 0.006) for m in ms) / len(ms)
    sig = filt(sig, 1700, order=4) * 1.6
    sig = np.tanh(sig * 1.5)
    env = np.minimum(1, t / att) * (0.75 + 0.25 * np.exp(-t * 3))
    return sig * env


def main():
    # ------------------------------------------------------------------ armado
    # 1. drone grave de tensión (0 → 39)
    t = tv(39.0)
    drone = 0.35 * supersaw(midi(26), t, 5, 0.004) + 0.8 * supersaw(midi(38), t, 5, 0.004) + 0.7 * supersaw(midi(45), t, 4, 0.004) + 0.45 * supersaw(midi(50), t, 4, 0.004)
    dl, dh = filt(drone, 500, order=4), filt(drone, 1600, order=4)
    w = np.clip(t / 35, 0, 1)
    drone = dl * (1 - w) + dh * w
    amp = np.interp(t, [0, 3.0, 14, 35, 38.95, 39.0], [0.15, 0.5, 0.55, 0.5, 0.5, 0.0])
    add(music, drone * amp, 0, gain=0.9)
    # nota aguda inquietante (0 → 17)
    t2 = tv(17.0)
    eerie = (np.sin(2 * np.pi * midi(74) * t2) + 0.5 * np.sin(2 * np.pi * midi(81) * t2)) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.35 * t2))
    add(music, eerie * np.interp(t2, [0, 2, 14, 17], [0, 0.03, 0.04, 0]), 0, pan=0.3)

    # 2. ostinato de cuerdas + pad (17 → 39), 120 bpm, Dm – Bb – F – C
    CHORDS = [(50, 53, 57), (46, 50, 53), (53, 57, 60), (48, 52, 55)]
    PATTERN = [0, 0, 2, 0, 1, 0, 2, 3]
    bar_t, i = 17.0, 0
    while bar_t < 39.0 - 1e-6:
        ch = CHORDS[i % 4]
        prog = (bar_t - 17) / 22
        for k_, idx in enumerate(PATTERN):
            nt = bar_t + k_ * 0.25
            if nt >= 39.0:
                break
            m = ch[0] + 12 if idx == 3 else ch[idx]
            g = 0.4 + 0.45 * prog + (0.12 if k_ % 2 == 0 else 0)
            add(music, string_note(m, bright=1800 + 2200 * prog), nt, pan=-0.35 if k_ % 2 else 0.35, gain=g)
            add(music, string_note(m + 12, bright=3000), nt, pan=0.6 if k_ % 2 else -0.6, gain=g * 0.35 * prog)
        add(music, pad([m_ - 12 for m_ in ch] + list(ch), min(2.0, 39.0 - bar_t), att=0.5, cut=1100 + 900 * prog), bar_t, gain=0.55 + 0.35 * prog)
        bar_t += 2.0
        i += 1

    # 3. tambores
    beats = []
    for bt in np.arange(17.0, 31.0, 2.0):
        beats += [(bt, 1.0), (bt + 1.0, 0.8), (bt + 1.5, 0.45)]
    for bt in np.arange(31.0, 35.0, 0.5):
        beats += [(bt, 0.95), (bt + 0.25, 0.4)]
    tt = 35.0
    step = 0.25
    while tt < 39.0:
        beats.append((tt, 0.55 + 0.45 * (tt - 35) / 4))
        if tt > 37.0:
            step = 0.125
        tt += step
    for bt, v in beats:
        add(music, taiko(v), bt, pan=rng.uniform(-0.25, 0.25), gain=0.75)

    # 4. logo y cierre: metales + pad final
    add(music, brass([38, 45, 50, 53, 57, 62, 65, 69], 3.85), 39.6, gain=1.1)
    add(music, pad([50, 57, 62, 65, 69, 74], 3.8, att=0.8, cut=3200), 39.7, gain=0.7)
    fin = brass([38, 45, 50, 53, 57, 62, 65, 69], 3.45, att=0.04)
    fin *= np.interp(tv(3.45), [0, 2.4, 3.45], [1, 0.7, 0])
    add(music, fin, 43.5, gain=1.1)
    add(music, pad([26, 38, 45], 3.45, att=0.05, cut=600) * np.interp(tv(3.45), [0, 3.45], [1, 0]), 43.5, gain=0.4)

    # 5. efectos
    for b in BRAAMS:
        dur = 3.4 if b < 43 else DURATION - b + 0.3
        add(sfx, braam(dur), b, gain=1.0)
        add(sfx, taiko(1.0), b, gain=1.0)
    for b in BOOMS:
        add(sfx, boom(3.0), b, gain=0.7)
    for h in HITS:
        add(sfx, metal_hit(), h, pan=rng.uniform(-0.2, 0.2), gain=0.55)
    for wh in WHOOSHES:
        add(sfx, whoosh(0.9), wh - 0.55, gain=0.35)
    for r0, r1 in RISERS:
        add(sfx, riser(r1 - r0), r0, gain=0.45)
    for c in MONTAGE_CUTS[1:]:
        add(sfx, whoosh(0.35), c - 0.18, gain=0.22)
        add(sfx, metal_hit(0.6), c, pan=rng.uniform(-0.5, 0.5), gain=0.18)

    # 6. silencio antes del logo
    gate = np.ones(N)
    a, b = int(38.97 * SR), int(39.6 * SR)
    gate[a:b] = 0
    gate[a - 480:a] = np.linspace(1, 0, 480)
    mix = music + sfx * 0.9
    mix *= gate[:, None]

    # 7. reverb de sala grande
    ir_t = tv(3.2)
    ir = rng.normal(0, 1, (len(ir_t), 2)) * np.exp(-ir_t * 2.4)[:, None]
    ir[:, 0] = filt(ir[:, 0], 5000)
    ir[:, 1] = filt(ir[:, 1], 5000)
    ir /= np.sqrt((ir ** 2).sum(0))
    wet = np.stack([fftconvolve(mix[:, ch], ir[:, ch])[:N] for ch in range(2)], 1)
    out = mix * 0.8 + wet * 0.55
    out[:, 0] = filt(out[:, 0], 45, 'high')
    out[:, 1] = filt(out[:, 1], 45, 'high')

    # 8. master
    out /= np.abs(out).max() + 1e-9
    out = np.tanh(out * 1.6) / np.tanh(1.6)
    out *= 0.89 / np.abs(out).max()
    end_fade = np.ones(N)
    e0 = int((DURATION - 0.6) * SR)
    end_fade[e0:] = np.linspace(1, 0, N - e0)
    out *= end_fade[:, None]
    wavfile.write(os.path.join(OUT, 'audio.wav'), SR, (out * 32767).astype(np.int16))
    print('audio listo', out.shape[0] / SR, 's')



if __name__ == '__main__':
    main()
