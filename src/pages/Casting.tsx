import { useState, type FormEvent } from 'react'
import { ErrorBox, Field, ImagePicker, LoginGate, Success } from '../components/ui'
import { CASTING } from '../config'
import { useAuth } from '../lib/auth'
import { usePoints } from '../lib/hooks'
import { supabase } from '../lib/supabase'
import { cleanHandle, friendlyError, uploadPrivate } from '../lib/utils'

const asset = (p: string) => import.meta.env.BASE_URL + p.replace(/^\//, '')

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
      <div className="casting-layout">
        <section className="bachelor" aria-label="El soltero">
          <div className="bachelor-photo">
            <img src={asset(CASTING.hero)} alt="Santino vestido de espartano" />
            <div className="bachelor-overlay">
              <span className="sticker bg-yellow pulse">Casting oficial · +{points.candidata} pts</span>
              <h1>Se busca novia para <span className="hl-pink-solid">Santino</span></h1>
            </div>
          </div>
          {CASTING.polaroids.map((p, i) => (
            <figure key={p.src} className={`polaroid polaroid-${i + 1}`}>
              <span className="tape" aria-hidden="true" />
              <img src={asset(p.src)} alt={p.caption} style={{ objectPosition: p.pos }} loading="lazy" />
              <figcaption>{p.caption}</figcaption>
            </figure>
          ))}
          <dl className="facts">
            {CASTING.facts.map((f) => (
              <div key={f.label} className="fact">
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>

      <div className="casting-content stack-lg">
        <p className="lead casting-lead">
          Postulá a tu candidata (o postulate vos 👀). Las postulaciones me llegan solo a mí: nadie más las ve.
        </p>

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
    </div>
  )
}
