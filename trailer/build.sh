#!/usr/bin/env bash
# Arma el trailer completo: capturas → video → audio → mp4 final para Reels.
# Requiere: la demo corriendo (VITE_DEMO=1 npx vite build && npx vite preview --outDir dist-demo --port 4181)
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out captures
[ "${SKIP_CAPTURE:-0}" = 1 ] || node capture.cjs "${DEMO_URL:-http://localhost:4181/}"
python3 render_video.py
python3 make_audio.py
ffmpeg -y -loglevel error -i out/video.mp4 -i out/audio.wav \
  -af "loudnorm=I=-14:TP=-1:LRA=11" -c:v copy -c:a aac -b:a 256k -ar 48000 -shortest \
  -movflags +faststart out/trailer_santinococf.mp4
echo "Listo: out/trailer_santinococf.mp4"
