import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { isConfigured, supabase } from '../lib/supabase'
import type { NewsComment } from '../lib/types'
import { confirmAction, friendlyError, timeAgo } from '../lib/utils'
import { ErrorBox, LoginGate } from './ui'

const SELECT = 'id, news_id, parent_id, user_id, content, created_at, profiles(username, is_admin)'

type Thread = { root: NewsComment; replies: NewsComment[] }

export default function NewsComments({ newsId }: { newsId: string }) {
  const [items, setItems] = useState<NewsComment[] | null>(null)
  const [replyTo, setReplyTo] = useState<{ rootId: string; username: string } | null>(null)

  useEffect(() => {
    if (!isConfigured) return setItems([])
    supabase
      .from('news_comments').select(SELECT).eq('news_id', newsId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setItems((data as unknown as NewsComment[]) ?? []))
  }, [newsId])

  // Principales: el más nuevo arriba. Respuestas: en orden de charla.
  const threads = useMemo<Thread[]>(() => {
    if (!items) return []
    const roots = items.filter((c) => !c.parent_id)
    return roots
      .map((root) => ({ root, replies: items.filter((c) => c.parent_id === root.id) }))
      .reverse()
  }, [items])

  function added(c: NewsComment) {
    setItems((prev) => [...(prev ?? []), c])
    setReplyTo(null)
  }
  function removed(id: string) {
    setItems((prev) => prev?.filter((c) => c.id !== id && c.parent_id !== id) ?? null)
  }

  const total = items?.length ?? 0

  return (
    <section className="stack nc" id="comentarios">
      <h3>💬 Comentarios {total > 0 && <span className="nc-count">{total}</span>}</h3>

      <LoginGate what="comentar">
        <CommentForm newsId={newsId} onDone={added} placeholder="¿Qué opinás de esta noticia?" />
      </LoginGate>

      {items === null ? (
        <div className="card skeleton nc-skeleton" />
      ) : threads.length === 0 ? (
        <p className="muted nc-empty">Nadie comentó todavía. Estrenalo vos.</p>
      ) : (
        <ul className="nc-list">
          {threads.map(({ root, replies }) => (
            <li key={root.id} className="nc-thread">
              <CommentItem c={root} onReply={() => setReplyTo({ rootId: root.id, username: root.profiles?.username ?? '' })} onRemoved={removed} />
              {(replies.length > 0 || replyTo?.rootId === root.id) && (
                <ul className="nc-replies">
                  {replies.map((r) => (
                    <li key={r.id}>
                      <CommentItem c={r} onReply={() => setReplyTo({ rootId: root.id, username: r.profiles?.username ?? '' })} onRemoved={removed} />
                    </li>
                  ))}
                  {replyTo?.rootId === root.id && (
                    <li>
                      <CommentForm
                        key={replyTo.username}
                        newsId={newsId}
                        parentId={root.id}
                        mention={replyTo.username}
                        onDone={added}
                        onCancel={() => setReplyTo(null)}
                        placeholder="Escribí tu respuesta…"
                      />
                    </li>
                  )}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function CommentItem({ c, onReply, onRemoved }: { c: NewsComment; onReply: () => void; onRemoved: (id: string) => void }) {
  const { session, profile } = useAuth()
  const admin = Boolean(c.profiles?.is_admin)
  const canDelete = session?.user.id === c.user_id || profile?.is_admin

  async function remove() {
    if (!confirmAction(c.parent_id ? '¿Borrar esta respuesta?' : '¿Borrar este comentario y sus respuestas?')) return
    const { error } = await supabase.from('news_comments').delete().eq('id', c.id)
    if (error) return alert(friendlyError(error))
    onRemoved(c.id)
  }

  return (
    <div className={`nc-item ${admin ? 'nc-admin' : ''}`}>
      <div className="nc-head">
        <span className="avatar nc-avatar">{c.profiles?.username?.[0]?.toUpperCase() ?? '?'}</span>
        <strong>@{c.profiles?.username ?? 'anónimo'}</strong>
        {admin && <span className="sticker sticker-sm bg-pink nc-badge">Redacción ✔</span>}
        <span className="nc-time">{timeAgo(c.created_at)}</span>
      </div>
      <p className="nc-text">{c.content}</p>
      <div className="nc-actions">
        {session && <button className="link-btn" onClick={onReply}>Responder</button>}
        {canDelete && <button className="link-btn" onClick={remove}>Borrar</button>}
      </div>
    </div>
  )
}

function CommentForm({ newsId, parentId, mention, onDone, onCancel, placeholder }: {
  newsId: string
  parentId?: string
  mention?: string
  onDone: (c: NewsComment) => void
  onCancel?: () => void
  placeholder: string
}) {
  const [text, setText] = useState(mention ? `@${mention} ` : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!parentId || !ref.current) return
    const el = ref.current
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [parentId])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (text.trim().length < 2) return
    setBusy(true)
    setError('')
    const { data, error } = await supabase
      .from('news_comments')
      .insert({ news_id: newsId, parent_id: parentId ?? null, content: text.trim() })
      .select(SELECT)
      .single()
    setBusy(false)
    if (error) return setError(friendlyError(error))
    setText('')
    onDone(data as unknown as NewsComment)
  }

  return (
    <form className={`nc-form ${parentId ? 'nc-form-reply' : 'card'}`} onSubmit={submit}>
      <textarea ref={ref} value={text} onChange={(e) => setText(e.target.value)} rows={parentId ? 2 : 3} maxLength={500} placeholder={placeholder} />
      <div className="row-between">
        <span className="field-hint">{text.length}/500</span>
        <div className="row-tight">
          {onCancel && <button type="button" className="btn btn-sm btn-ghost" onClick={onCancel}>Cancelar</button>}
          <button className="btn btn-sm btn-pink" disabled={busy || text.trim().length < 2}>
            {busy ? 'Enviando…' : parentId ? 'Responder' : 'Comentar'}
          </button>
        </div>
      </div>
      <ErrorBox>{error}</ErrorBox>
    </form>
  )
}
