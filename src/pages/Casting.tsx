import { useState, type FormEvent } from 'react'
import { ErrorBox, Field, ImagePicker, LoginGate, Success } from '../components/ui'
import { SANTINO_PHOTOS } from '../config'
import { useAuth } from '../lib/auth'
import { usePoints } from '../lib/hooks'
import { supabase } from '../lib/supabase'
import { cleanHandle, friendlyError, uploadPrivate } from '../lib/utils'

// Posiciones de las fotos de fondo (se repiten si hay más fotos)
const SPOTS = [
  { top: '2%', left: '-4%', rot: -9 },
  { top: '6%', right: '-5%', rot: 8 },
  { top: '42%', left: '-7%', rot: 6 },
  { top: '48%', right: '-6%', rot: -7 },
  { top: '82%', left: '-3%', rot: -4 },
  { top: '86%', right: '-4%', rot: 10 },
]

export default function Casting() {
  const { session } = useAuth()
  const points = usePoints()
  const [name, setName] = useState('')
  const [instagram, setInstagram] = useState('')
  const [reason, setReason] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const photos = SANTINO_PHOTOS.length ? SANTINO_PHOTOS : SPOTS.map(() => '')

  async function submit(e: FormEvent) {
    e.preventDefault()
    const ig = cleanHandle(instagram)
    if (!ig && !file) return setError('Necesito el Instagram o una foto de la candidata. Algo.')
    setBusy(true)
    setError('')
    try {
      const photo_path = file ? await uploadPrivate(session!.user.id, 'candidatas', file) : null
      const { error } = await supabase.from('candidates').insert({
        name: name.trim(),
        instagram: ig,
        reason: reason.trim() || null,
        photo_path,
      })
      if (error) throw error
      setDone(true)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setName(''); setInstagram(''); setReason(''); setFile(null); setDone(false)
  }

  return (
    <div className="casting">
      <div className="casting-bg" aria-hidden="true">
        {photos.map((src, i) => {
          const s = SPOTS[i % SPOTS.length]
          return (
            <div
              key={i}
              className="polaroid"
              style={{ top: s.top, left: s.left, right: s.right, ['--rot' as string]: `${s.rot}deg`, animationDelay: `${i * -1.3}s` }}
            >
              {src ? <img src={src} alt="" /> : <div className="polaroid-ph">tu foto<br />bizarra<br />acá</div>}
            </div>
          )
        })}
      </div>

      <div className="casting-content stack-lg narrow">
        <div className="page-head casting-head">
          <span className="sticker bg-pink pulse">Casting oficial · +{points.candidata} pts</span>
          <h1>Se busca novia<br />para <span className="hl hl-pink">Santino</span></h1>
          <p className="lead">
            Postulá a tu candidata (o postulate vos 👀). Las postulaciones me llegan solo a mí: nadie más las ve.
          </p>
        </div>

        <LoginGate what="postular una candidata">
          {done ? (
            <Success emoji="💌" title="Candidata recibida" points={points.candidata} onAgain={reset}>
              Su carpeta ya está en mi escritorio. El jurado (yo) deliberará.
            </Success>
          ) : (
            <form className="card stack form casting-form" onSubmit={submit}>
              <Field label="Nombre de la candidata">
                <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} placeholder="¿Cómo se llama?" />
              </Field>
              <Field label="Instagram" hint="Pegá el @ o el link del perfil">
                <div className="input-prefix">
                  <span>@</span>
                  <input value={instagram} onChange={(e) => setInstagram(e.target.value)} maxLength={80} placeholder="usuario" autoCapitalize="none" />
                </div>
              </Field>
              <Field label="Foto" hint="Si no tenés el Instagram, con una foto alcanza">
                <ImagePicker file={file} onChange={setFile} label="Subir foto de la candidata" />
              </Field>
              <Field label="¿Por qué sería la indicada?" hint="Opcional, pero suma (no puntos, pero suma)">
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} maxLength={1000} placeholder="Le gusta el fernet, se ríe de los chistes malos…" />
              </Field>
              <ErrorBox>{error}</ErrorBox>
              <button className="btn btn-pink btn-block btn-lg" disabled={busy}>
                {busy ? 'Enviando carpeta…' : 'Postular candidata 💘'}
              </button>
            </form>
          )}
        </LoginGate>
      </div>
    </div>
  )
}
