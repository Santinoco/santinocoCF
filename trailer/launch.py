"""Video corto de lanzamiento ("YA DISPONIBLE"), ~15 s vertical.

Reutiliza el motor del trailer: python3 launch.py  →  out/lanzamiento_santinococf.mp4
"""
import os
import subprocess

import numpy as np
from scipy.io import wavfile

import make_audio as ma
import render_video as rv

DUR = 14.5
OUT = rv.OUT

# ------------------------------------------------------------------ guion visual
CUT_START, CUT_END = 1.9, 5.4
PAGES = ['casting', 'home', 'ranking', 'muro', 'menu', 'novedades', 'casting', 'chisme', 'publicidad', 'home']
durs = np.array([0.5, 0.45, 0.4, 0.36, 0.33, 0.3, 0.28, 0.26, 0.24, 0.22])
durs = durs * (CUT_END - CUT_START) / durs.sum()
cuts = list(CUT_START + np.concatenate([[0], np.cumsum(durs)[:-1]]))

SHOTS = [
    (0.0, CUT_START, 'card', dict(lines=['LA ESPERA', 'TERMINÓ'], text_in=0.15, text_out=1.6, big=True)),
    (CUT_START, CUT_END, 'montage', dict()),
    (CUT_END, 6.0, 'black', dict()),
    (6.0, 10.4, 'logo', dict()),
    (10.4, DUR, 'end', dict()),
]
BRAAMS = [0.15, 6.0, 10.4]
HITS = []

rv.SHOTS = SHOTS
rv.DURATION = DUR
rv.BRAAMS = BRAAMS
rv.HITS = HITS
rv.SHAKES = BRAAMS
rv.FLASHES = BRAAMS + cuts
rv.CARD_TXT[0.0] = rv.text_block(SHOTS[0][3]['lines'], 150)
rv.LOGO_SUB = rv.text_block(['YA DISPONIBLE'], 52, max_w=760, font=rv.FONT_B, tracking=0.35)
rv.END_TOP = rv.text_block(['ENTRÁ'], 96, max_w=800, tracking=0.25)
rv.END_BIG = rv.text_block(['YA'], 330, max_w=980)
rv.END_HANDLE = rv.text_block(['LINK EN LA BIO · @SANTINOCOCF'], 40, max_w=900, font=rv.FONT_B, tracking=0.12)
rv.MONTAGE = []
for pg, t0, d in zip(PAGES, cuts, durs):
    maxy = max(0, rv.pages[pg].height - rv.SH - 260)
    rv.MONTAGE.append(dict(page=pg, t0=t0, dur=d, y=rv.rng.uniform(0, maxy) if pg != 'menu' else 0,
                           rot=rv.rng.uniform(-7, 7), scale=rv.rng.uniform(1.18, 1.34), dx=rv.rng.uniform(-60, 60)))


def render_video(path):
    n = int(DUR * rv.FPS)
    ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
                           '-s', f'{rv.W}x{rv.H}', '-r', str(rv.FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'slow',
                           '-crf', '20', '-tune', 'grain', '-pix_fmt', 'yuv420p', path], stdin=subprocess.PIPE)
    for i in range(n):
        ff.stdin.write(rv.render(i / rv.FPS).tobytes())
    ff.stdin.close()
    ff.wait()


# ------------------------------------------------------------------ audio
def render_audio(path):
    SR = ma.SR
    music = np.zeros((ma.N, 2))
    sfx = np.zeros((ma.N, 2))
    add = ma.add
    # apertura: golpe + drone tenso debajo del texto
    t = ma.tv(CUT_END)
    drone = 0.8 * ma.supersaw(ma.midi(38), t, 5, 0.004) + 0.7 * ma.supersaw(ma.midi(45), t, 4, 0.004) + 0.45 * ma.supersaw(ma.midi(50), t, 4, 0.004)
    drone = ma.filt(drone, 900, order=4) * np.interp(t, [0, 0.3, CUT_END - 0.05, CUT_END], [0.3, 0.5, 0.6, 0])
    add(music, drone, 0)
    # montaje: ostinato rápido Dm–Bb a 150 bpm + tambores en semicorcheas
    chords = [(50, 53, 57), (46, 50, 53)]
    pattern = [0, 0, 2, 0, 1, 0, 2, 3]
    step = 60 / 150 / 2
    nt, k = CUT_START, 0
    while nt < CUT_END - 0.01:
        ch = chords[(k // 8) % 2]
        idx = pattern[k % 8]
        m = ch[0] + 12 if idx == 3 else ch[idx]
        prog = (nt - CUT_START) / (CUT_END - CUT_START)
        add(music, ma.string_note(m, 0.18, bright=2500 + 2000 * prog), nt, pan=-0.35 if k % 2 else 0.35, gain=0.6 + 0.4 * prog)
        add(music, ma.string_note(m + 12, 0.18, bright=3500), nt, pan=0.6 if k % 2 else -0.6, gain=0.25 * prog)
        k += 1
        nt += step
    tt, s = CUT_START, step
    while tt < CUT_END - 0.01:
        add(music, ma.taiko(0.6 + 0.4 * (tt - CUT_START) / (CUT_END - CUT_START)), tt, pan=ma.rng.uniform(-0.3, 0.3), gain=0.8)
        if tt > CUT_START + 2.0:
            s = step / 2
        tt += s
    for c in cuts[1:]:
        add(sfx, ma.whoosh(0.3), c - 0.15, gain=0.25)
        add(sfx, ma.metal_hit(0.6), c, pan=ma.rng.uniform(-0.5, 0.5), gain=0.2)
    add(sfx, ma.riser(CUT_END - CUT_START), CUT_START, gain=0.55)
    add(sfx, ma.whoosh(0.8), CUT_START - 0.5, gain=0.4)
    # golpes grandes
    for b in BRAAMS:
        dur = 3.4 if b < 10 else DUR - b + 0.3
        add(sfx, ma.braam(dur), b)
        add(sfx, ma.taiko(1.0), b)
        add(sfx, ma.metal_hit(2.5), b, gain=0.45)
    # logo y final: metales en Re menor, luego Re mayor (resolución triunfal)
    add(music, ma.brass([38, 45, 50, 53, 57, 62, 65, 69], 4.35), 6.0, gain=1.1)
    add(music, ma.pad([50, 57, 62, 65, 69, 74], 4.3, att=0.6, cut=3200), 6.1, gain=0.7)
    fin_len = DUR - 10.4
    fin = ma.brass([38, 45, 50, 54, 57, 62, 66, 69], fin_len, att=0.04)
    fin *= np.interp(ma.tv(fin_len), [0, fin_len * 0.6, fin_len], [1, 0.7, 0])
    add(music, fin, 10.4, gain=1.15)
    add(music, ma.pad([50, 54, 57, 62, 66, 69, 74], fin_len, att=0.3, cut=3600) * np.interp(ma.tv(fin_len), [0, fin_len], [1, 0]), 10.4, gain=0.7)
    # silencio antes del logo
    gate = np.ones(ma.N)
    a, b = int((CUT_END - 0.02) * SR), int(6.0 * SR)
    gate[a:b] = 0
    mix = (music + sfx * 0.9) * gate[:, None]
    # reverb
    ir_t = ma.tv(3.0)
    ir = ma.rng.normal(0, 1, (len(ir_t), 2)) * np.exp(-ir_t * 2.4)[:, None]
    for ch in range(2):
        ir[:, ch] = ma.filt(ir[:, ch], 5000)
    ir /= np.sqrt((ir ** 2).sum(0))
    from scipy.signal import fftconvolve
    wet = np.stack([fftconvolve(mix[:, ch], ir[:, ch])[:ma.N] for ch in range(2)], 1)
    out = mix * 0.8 + wet * 0.55
    for ch in range(2):
        out[:, ch] = ma.filt(out[:, ch], 45, 'high')
    out = out[: int((DUR + 0.2) * SR)]
    out /= np.abs(out).max() + 1e-9
    out = np.tanh(out * 1.6) / np.tanh(1.6)
    out *= 0.89 / np.abs(out).max()
    e0 = int((DUR - 0.5) * SR)
    out[e0:] *= np.linspace(1, 0, len(out) - e0)[:, None]
    wavfile.write(path, SR, (out * 32767).astype(np.int16))


if __name__ == '__main__':
    import sys
    if '--preview' in sys.argv:
        from PIL import Image
        for s in sys.argv[sys.argv.index('--preview') + 1:]:
            Image.fromarray(rv.render(float(s))).save(os.path.join(OUT, f'launch_{s}.jpg'), quality=85)
        sys.exit()
    v, a = os.path.join(OUT, 'launch_video.mp4'), os.path.join(OUT, 'launch_audio.wav')
    render_audio(a)
    render_video(v)
    meas = subprocess.run(['ffmpeg', '-hide_banner', '-i', a, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    lufs = float([l for l in meas.splitlines() if l.strip().startswith('I:')][-1].split()[1])
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', v, '-i', a, '-af', f'volume={-14 - lufs}dB,alimiter=limit=0.89:level=false',
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-maxrate', '10M', '-bufsize', '20M', '-pix_fmt', 'yuv420p',
                    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest', '-movflags', '+faststart',
                    os.path.join(OUT, 'lanzamiento_santinococf.mp4')], check=True)
    print('listo: out/lanzamiento_santinococf.mp4')
