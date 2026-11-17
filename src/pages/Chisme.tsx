import { useState, type FormEvent } from 'react'
import { ErrorBox, Field, ImagePicker, LoginGate, PageHead, Success } from '../components/ui'
import { useAuth } from '../lib/auth'
import { usePoints } from '../lib/hooks'
import { supabase } from '../lib/supabase'
import { friendlyError, uploadPrivate } from '../lib/utils'

export default function Chisme() {
  const { session } = useAuth()
  const points = usePoints()
  const [protagonist, setProtagonist] = useState('')
  const [content, setContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (content.trim().length < 10) return setError('Contá un poco más, con 10 letras no armo una noticia.')
    setBusy(true)
    setError('')
    try {
      const image_path = file ? await uploadPrivate(session!.user.id, 'chismes', file) : null
      const { error } = await supabase.from('gossip').insert({
        protagonist: protagonist.trim() || null,
        content: content.trim(),
        image_path,
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
    setProtagonist(''); setContent(''); setFile(null); setDone(false)
  }

  return (
    <div className="stack-lg narrow">
      <PageHead kicker={`+${points.chisme} puntos`} title={<>Cargá tu <span className="hl">chisme</span> 🤫</>}>
        ¿Te enteraste de algo? Contalo acá. Lo leo yo solo y, si está bueno, lo convierto en noticia.
      </PageHead>

      <LoginGate what="cargar un chisme">
        {done ? (
          <Success emoji="🤐" title="Chisme recibido" points={points.chisme} onAgain={reset}>
            Ya está en mi bandeja. Si sale publicado, la fuente queda en secreto.
          </Success>
        ) : (
          <form className="card stack form" onSubmit={submit}>
            <Field label="¿De quién es el chisme?" hint="Opcional. Ej: Facu Martínez">
              <input value={protagonist} onChange={(e) => setProtagonist(e.target.value)} maxLength={80} placeholder="Nombre del protagonista" />
            </Field>
            <Field label="Contá todo" hint={`${content.length}/2000`}>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={2000}
                rows={6}
                required
                placeholder="Qué pasó, dónde, cuándo y por qué es gracioso…"
              />
            </Field>
            <Field label="¿Tenés prueba?" hint="Opcional. Una foto vale más que mil chismes.">
              <ImagePicker file={file} onChange={setFile} label="Subir foto de la evidencia" />
            </Field>
            <ErrorBox>{error}</ErrorBox>
            <button className="btn btn-pink btn-block" disabled={busy}>
              {busy ? 'Enviando…' : 'Mandar chisme'}
            </button>
          </form>
        )}
      </LoginGate>
    </div>
  )
}
