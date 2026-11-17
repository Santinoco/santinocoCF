import { useEffect, useState, type FormEvent } from 'react'
import { ErrorBox, LoginGate, PageHead, Spinner } from '../components/ui'
import { useAuth } from '../lib/auth'
import { isConfigured, supabase } from '../lib/supabase'
import type { Comment } from '../lib/types'
import { friendlyError, timeAgo } from '../lib/utils'

const PAGE = 30
const COLORS = ['yellow', 'pink', 'blue', 'green', 'purple']

export default function Muro() {
  const { session, profile } = useAuth()
  const [items, setItems] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load(reset: boolean) {
    if (!isConfigured) return setLoading(false)
    setLoading(true)
    const from = reset ? 0 : items.length
    const { data } = await supabase
      .from('comments')
      .select('id, user_id, content, created_at, profiles(username)')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1)
    const rows = (data as unknown as Comment[]) ?? []
    setItems(reset ? rows : [...items, ...rows])
    setMore(rows.length === PAGE)
    setLoading(false)
  }

  useEffect(() => {
    load(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (text.trim().length < 2) return
    setBusy(true)
    setError('')
    const { data, error } = await supabase
      .from('comments')
      .insert({ content: text.trim() })
      .select('id, user_id, content, created_at, profiles(username)')
      .single()
    setBusy(false)
    if (error) return setError(friendlyError(error))
    setItems([data as unknown as Comment, ...items])
    setText('')
  }

  async function remove(id: string) {
    if (!confirm('¿Borrar este comentario?')) return
    const { error } = await supabase.from('comments').delete().eq('id', id)
    if (!error) setItems(items.filter((c) => c.id !== id))
  }

  return (
    <div className="stack-lg narrow">
      <PageHead kicker="Libre expresión (dentro de todo)" title="El muro" color="blue">
        Dejá tu mensaje para Santino y para el mundo. Todos pueden leerlo.
      </PageHead>

      <LoginGate what="comentar">
        <form className="card stack form" onSubmit={submit}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={`¿Qué tenés para decir, ${profile?.username ?? 'crack'}?`}
          />
          <div className="row-between">
            <span className="field-hint">{text.length}/500</span>
            <button className="btn btn-blue" disabled={busy || text.trim().length < 2}>{busy ? 'Publicando…' : 'Publicar'}</button>
          </div>
          <ErrorBox>{error}</ErrorBox>
        </form>
      </LoginGate>

      <div className="wall">
        {items.map((c, i) => (
          <div key={c.id} className={`wall-note bg-${COLORS[i % COLORS.length]}-soft`} style={{ ['--rot' as string]: `${((i * 7) % 5) - 2}deg` }}>
            <p>{c.content}</p>
            <div className="wall-foot">
              <strong>@{c.profiles?.username ?? 'anónimo'}</strong>
              <span>{timeAgo(c.created_at)}</span>
              {(session?.user.id === c.user_id || profile?.is_admin) && (
                <button className="link-btn" onClick={() => remove(c.id)} aria-label="Borrar">🗑️</button>
              )}
            </div>
          </div>
        ))}
      </div>
      {loading && <Spinner />}
      {!loading && items.length === 0 && (
        <div className="card card-center"><div className="big-emoji">🦗</div><p>Nadie dijo nada todavía. Rompé el hielo.</p></div>
      )}
      {more && !loading && <button className="btn btn-block" onClick={() => load(false)}>Ver más</button>}
    </div>
  )
}
