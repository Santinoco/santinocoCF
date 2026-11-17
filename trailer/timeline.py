"""Línea de tiempo del trailer. La usan render_video.py y make_audio.py."""

FPS = 30
W, H = 1080, 1920
DURATION = 47.0

# Planos: (inicio, fin, tipo, parámetros)
SHOTS = [
    (0.0, 4.0, 'card', dict(lines=['EN UN MUNDO', 'LLENO DE SECRETOS'], text_in=0.5, text_out=3.7)),
    (4.0, 8.0, 'phone', dict(page='home', y=(0, 900), scale=(0.9, 1.0), rot=(-4, 0), rise=1.4)),
    (8.0, 10.5, 'card', dict(lines=['DONDE', 'TODO SE SABE'], text_in=0.15, text_out=2.3)),
    (10.5, 14.5, 'phone', dict(page='novedades', y=(150, 1500), scale=(1.0, 1.08), rot=(2.5, -1))),
    (14.5, 17.0, 'card', dict(lines=['UN PORTAL', 'SE LEVANTA'], text_in=0.0, text_out=2.4, big=True)),
    (17.0, 19.0, 'phone', dict(page='chisme', y=(150, 450), scale=(1.06, 1.0), rot=(-2, 0), caption='CADA CHISME')),
    (19.0, 21.0, 'phone', dict(page='muro', y=(150, 600), scale=(1.0, 1.06), rot=(2, 0), caption='CADA VOZ')),
    (21.0, 23.0, 'phone', dict(page='publicidad', y=(0, 450), scale=(1.06, 1.0), rot=(-1.5, 1), caption='CADA MARCA')),
    (23.0, 26.0, 'phone', dict(page='ranking', y=(150, 470), scale=(0.98, 1.12), rot=(0, 0), glow=True)),
    (26.0, 28.5, 'card', dict(lines=['SOLO LOS MÁS LEALES', 'LLEGARÁN A LA CIMA'], text_in=0.0, text_out=2.35)),
    (28.5, 31.0, 'card', dict(lines=['Y UN SOLO HOMBRE...'], text_in=0.3, text_out=2.4)),
    (31.0, 33.2, 'photo', dict(src='../public/santino/espartano.jpg')),
    (33.2, 35.0, 'phone', dict(page='casting', y=(0, 260), scale=(1.12, 1.0), rot=(0, 0), caption='BUSCARÁ LO IMPOSIBLE')),
    (35.0, 39.0, 'montage', dict()),
    (39.0, 39.6, 'black', dict()),
    (39.6, 43.5, 'logo', dict()),
    (43.5, 47.0, 'end', dict()),
]

# Montaje rápido: cortes cada vez más cortos
MONTAGE_PAGES = ['home', 'casting', 'ranking', 'muro', 'menu', 'novedades', 'chisme', 'publicidad',
                 'casting', 'home', 'ranking', 'menu', 'muro', 'casting', 'novedades', 'home']
MONTAGE_DURS = [0.42, 0.4, 0.36, 0.34, 0.32, 0.3, 0.28, 0.26, 0.24, 0.22, 0.2, 0.2, 0.18, 0.18, 0.15, 0.15]
_s = sum(MONTAGE_DURS)
MONTAGE_DURS = [d * 4.0 / _s for d in MONTAGE_DURS]
MONTAGE_CUTS = []
_t = 35.0
for d in MONTAGE_DURS:
    MONTAGE_CUTS.append(_t)
    _t += d

# Golpes grandes (braam = bocina grave de trailer)
BRAAMS = [14.5, 26.0, 31.0, 39.6, 43.5]
BOOMS = [0.5, 8.0, 28.5]
WHOOSHES = [4.0, 10.5, 17.0, 19.0, 21.0, 23.0, 33.2]
HITS = [17.0, 19.0, 21.0, 23.0, 33.2]
RISERS = [(28.6, 31.0), (35.0, 39.0)]
FLASHES = BRAAMS + HITS + MONTAGE_CUTS
SHAKES = BRAAMS

# Guion de la voz (para CapCut)
VOICE = [
    (0.6, 'En un mundo lleno de secretos...'),
    (8.1, '...donde todo se sabe...'),
    (14.6, '...un portal se levanta.'),
    (17.1, 'Cada chisme.'),
    (19.1, 'Cada voz.'),
    (21.1, 'Cada marca.'),
    (26.1, 'Solo los más leales llegarán a la cima.'),
    (28.7, 'Y un solo hombre...'),
    (33.3, '...buscará lo imposible.'),
    (39.8, 'SantinocoCF.'),
    (43.7, 'Mañana.'),
]
