import { useState, type FormEvent } from 'react'
import { ErrorBox, Field, LoginGate, PageHead, Success } from '../components/ui'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { friendlyError, notifyAdmin } from '../lib/utils'

export default function Ideas() {
  const { profile } = useAuth()
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.from('video_ideas').insert({ content: content.trim() })
    setBusy(false)
    if (error) return setError(friendlyError(error))
    notifyAdmin('Nueva idea para video 💡', { 'Enviado por': profile?.username, Idea: content.trim() })
    setDone(true)
  }

  return (
    <div className="stack-lg narrow">
      <PageHead kicker="Sala de guionistas" title={<>Ideas para <span className="hl hl-green">próximos videos</span></>} color="green">
        ¿Qué querés que haga en el próximo video? Si la idea la rompe, te menciono.
      </PageHead>
      <LoginGate what="dejar una idea">
        {done ? (
          <Success emoji="🎬" title="Idea anotada" onAgain={() => { setContent(''); setDone(false) }}>
            La sumé a la lista de ideas. Si la hago, te enterás.
          </Success>
        ) : (
          <form className="card stack form" onSubmit={submit}>
            <Field label="Tu idea" hint={`${content.length}/1000`}>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} minLength={5} maxLength={1000} required placeholder="Ej: Santino intenta cocinar un asado sin ayuda de nadie" />
            </Field>
            <ErrorBox>{error}</ErrorBox>
            <button className="btn btn-green btn-block" disabled={busy}>{busy ? 'Enviando…' : 'Mandar idea'}</button>
          </form>
        )}
      </LoginGate>
    </div>
  )
}
