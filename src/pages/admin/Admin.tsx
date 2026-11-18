import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import type { AdRequest, Candidate, Comment, Gossip, InstagramPost, News, VideoIdea } from '../../lib/types'
import { confirmAction, formatDate, friendlyError, normalizeInstagramUrl, signedUrl, timeAgo } from '../../lib/utils'
import NewsEditor from './NewsEditor'

const TABS = [
  { id: 'noticias', label: '📰 Noticias' },
  { id: 'chismes', label: '🤫 Chismes', table: 'gossip', fresh: 'nuevo' },
  { id: 'candidatas', label: '💘 Candidatas', table: 'candidates', fresh: 'en_evaluacion' },
  { id: 'publicidad', label: '📣 Publicidad', table: 'ad_requests', fresh: 'pendiente' },
  { id: 'ideas', label: '💡 Ideas', table: 'video_ideas', fresh: 'nueva' },
  { id: 'comentarios', label: '💬 Comentarios' },
  { id: 'instagram', label: '📸 Instagram' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function Admin() {
  const { profile, loading } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as TabId) || 'noticias'
  const [draft, setDraft] = useState<Partial<News> | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})

  const loadCounts = useCallback(async () => {
    const entries = await Promise.all(
      TABS.filter((t) => 'table' in t).map(async (t) => {
        const tt = t as { id: string; table: string; fresh: string }
        const { count } = await supabase.from(tt.table).select('id', { count: 'exact', head: true }).eq('status', tt.fresh)
        return [tt.id, count ?? 0] as const
      }),
    )
    setCounts(Object.fromEntries(entries))
  }, [])

  useEffect(() => {
    if (profile?.is_admin) loadCounts()
  }, [profile, loadCounts, tab])

  if (loading) return <Spinner />
  if (!profile?.is_admin) {
    return (
      <div className="card card-center narrow-sm">
        <div className="big-emoji">⛔</div>
        <h2>Zona restringida</h2>
        <p className="muted">Solo para el admin. Si sos Santino, corré en Supabase:</p>
        <pre className="code">update profiles set is_admin = true{'\n'}where username = 'tu_usuario';</pre>
        <Link to="/" className="btn">Volver</Link>
      </div>
    )
  }

  function go(t: TabId) {
    setParams({ tab: t })
  }

  return (
    <div className="stack-lg admin">
      <div className="page-head">
        <span className="sticker bg-yellow">Panel de control</span>
        <h1>Redacción</h1>
      </div>

      <div className="chips-scroll admin-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`chip ${tab === t.id ? 'active' : ''}`} onClick={() => go(t.id)}>
            {t.label}
            {counts[t.id] ? <span className="badge">{counts[t.id]}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'noticias' && <NewsAdmin draft={draft} setDraft={setDraft} />}
      {tab === 'chismes' && (
        <GossipAdmin
          onCompose={(g) => {
            setDraft({ title: '', summary: '', body: g.content, source_gossip_id: g.id })
            go('noticias')
          }}
        />
      )}
      {tab === 'candidatas' && <CandidatesAdmin />}
      {tab === 'publicidad' && <AdsAdmin />}
      {tab === 'ideas' && <IdeasAdmin />}
      {tab === 'comentarios' && <CommentsAdmin />}
      {tab === 'instagram' && <InstagramAdmin />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function useRows<T extends { id: string }>(table: string, select = '*, profiles(username)') {
  const [rows, setRows] = useState<T[] | null>(null)
  const [error, setError] = useState('')
  const reload = useCallback(async () => {
    const { data, error } = await supabase.from(table).select(select).order('created_at', { ascending: false }).limit(200)
    if (error) setError(friendlyError(error))
    setRows((data as unknown as T[]) ?? [])
  }, [table, select])
  useEffect(() => { reload() }, [reload])

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from(table).update({ status }).eq('id', id)
    if (error) return alert(friendlyError(error))
    setRows((r) => r?.map((x) => (x.id === id ? ({ ...x, status } as T) : x)) ?? null)
  }
  async function remove(id: string) {
    if (!confirmAction('¿Borrar definitivamente? (si suma puntos, se le restan al usuario)')) return
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) return alert(friendlyError(error))
    setRows((r) => r?.filter((x) => x.id !== id) ?? null)
  }
  return { rows, error, reload, setStatus, remove }
}

function List<T extends { id: string }>({ rows, error, empty, render }: {
  rows: T[] | null
  error: string
  empty: string
  render: (row: T) => ReactNode
}) {
  if (error) return <div className="error-box">{error}</div>
  if (!rows) return <Spinner />
  if (!rows.length) return <div className="card card-center muted">{empty}</div>
  return <div className="admin-list">{rows.map((r) => <div key={r.id} className="card admin-item">{render(r)}</div>)}</div>
}

function StatusSelect({ value, options, onChange }: { value: string; options: Record<string, string>; onChange: (v: string) => void }) {
  return (
    <select className={`status status-${value}`} value={value} onChange={(e) => onChange(e.target.value)}>
      {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  )
}

function Meta({ username, date }: { username?: string; date: string }) {
  return (
    <div className="admin-meta">
      <strong>@{username ?? '¿?'}</strong>
      <span title={formatDate(date)}>{timeAgo(date)}</span>
    </div>
  )
}

function PrivateImage({ path, alt = '' }: { path: string | null; alt?: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (path) signedUrl(path).then(setUrl)
  }, [path])
  if (!path) return null
  if (!url) return <div className="admin-img skeleton" />
  return (
    <a href={url} target="_blank" rel="noreferrer" className="admin-img">
      <img src={url} alt={alt} loading="lazy" />
    </a>
  )
}

// ---------------------------------------------------------------------------
// tabs
// ---------------------------------------------------------------------------

function NewsAdmin({ draft, setDraft }: { draft: Partial<News> | null; setDraft: (d: Partial<News> | null) => void }) {
  const { rows, error, reload, remove } = useRows<News>('news', '*')

  if (draft) {
    return <NewsEditor initial={draft} onClose={() => { setDraft(null); reload() }} />
  }
  return (
    <div className="stack">
      <button className="btn btn-pink btn-block" onClick={() => setDraft({})}>+ Nueva noticia</button>
      <List
        rows={rows}
        error={error}
        empty="Todavía no cargaste ninguna noticia."
        render={(n) => (
          <div className="admin-news">
            {n.cover_url ? <img src={n.cover_url} alt="" /> : <div className="admin-news-ph">📰</div>}
            <div className="grow">
              <div className="row-tight">
                <span className="sticker sticker-sm bg-yellow">{n.category}</span>
                {!n.published && <span className="sticker sticker-sm bg-ink">Borrador</span>}
              </div>
              <strong>{n.title}</strong>
              <small className="muted">{formatDate(n.created_at)}</small>
            </div>
            <div className="admin-actions">
              <Link to={`/novedades/${n.slug}`} className="btn btn-sm">Ver</Link>
              <button className="btn btn-sm" onClick={() => setDraft(n)}>Editar</button>
              <button className="btn btn-sm btn-ghost" onClick={() => remove(n.id)}>Borrar</button>
            </div>
          </div>
        )}
      />
    </div>
  )
}

function GossipAdmin({ onCompose }: { onCompose: (g: Gossip) => void }) {
  const { rows, error, setStatus, remove } = useRows<Gossip>('gossip')
  return (
    <List
      rows={rows}
      error={error}
      empty="No hay chismes. El pueblo está callado."
      render={(g) => (
        <div className="stack-sm">
          <Meta username={g.profiles?.username} date={g.created_at} />
          {g.protagonist && <span className="sticker sticker-sm bg-yellow">Protagonista: {g.protagonist}</span>}
          <p className="pre">{g.content}</p>
          <PrivateImage path={g.image_path} />
          <div className="admin-actions">
            <StatusSelect
              value={g.status}
              options={{ nuevo: '🆕 Nuevo', leido: '👀 Leído', publicado: '✅ Publicado', descartado: '🗑️ Descartado' }}
              onChange={(v) => setStatus(g.id, v)}
            />
            <button className="btn btn-sm btn-pink" onClick={() => { if (g.status === 'nuevo') setStatus(g.id, 'leido'); onCompose(g) }}>Armar noticia</button>
            <button className="btn btn-sm btn-ghost" onClick={() => remove(g.id)}>Borrar</button>
          </div>
        </div>
      )}
    />
  )
}

function CandidatesAdmin() {
  const { rows, error, setStatus, remove } = useRows<Candidate>('candidates')
  return (
    <List
      rows={rows}
      error={error}
      empty="Ninguna candidata todavía. Paciencia."
      render={(c) => (
        <div className="stack-sm">
          <Meta username={c.profiles?.username} date={c.created_at} />
          <div className="cand">
            <PrivateImage path={c.photo_path} alt={c.name} />
            <div className="stack-sm grow">
              <h3>{c.name}</h3>
              {c.instagram && (
                <a href={`https://instagram.com/${c.instagram}`} target="_blank" rel="noreferrer" className="btn btn-sm">
                  Ver @{c.instagram} ↗
                </a>
              )}
              {c.reason && <p className="pre muted">“{c.reason}”</p>}
            </div>
          </div>
          <div className="admin-actions">
            <StatusSelect
              value={c.status}
              options={{ en_evaluacion: '🧐 En evaluación', segunda_ronda: '💘 Segunda ronda', descartada: '❌ Descartada' }}
              onChange={(v) => setStatus(c.id, v)}
            />
            <button className="btn btn-sm btn-ghost" onClick={() => remove(c.id)}>Borrar</button>
          </div>
        </div>
      )}
    />
  )
}

function AdsAdmin() {
  const { rows, error, setStatus, remove } = useRows<AdRequest>('ad_requests')
  return (
    <List
      rows={rows}
      error={error}
      empty="Nadie pidió publicidad todavía."
      render={(a) => (
        <div className="stack-sm">
          <Meta username={a.profiles?.username} date={a.created_at} />
          <h3>{a.business_name}</h3>
          <div className="row-tight">
            {a.instagram && <a className="btn btn-sm" href={`https://instagram.com/${a.instagram}`} target="_blank" rel="noreferrer">@{a.instagram} ↗</a>}
            {a.contact && <span className="sticker sticker-sm bg-blue">📞 {a.contact}</span>}
          </div>
          <p className="pre">{a.description}</p>
          <PrivateImage path={a.image_path} />
          <div className="admin-actions">
            <StatusSelect
              value={a.status}
              options={{ pendiente: '⏳ Pendiente', aprobada: '✅ Aprobada', rechazada: '❌ Rechazada' }}
              onChange={(v) => setStatus(a.id, v)}
            />
            <button className="btn btn-sm btn-ghost" onClick={() => remove(a.id)}>Borrar</button>
          </div>
        </div>
      )}
    />
  )
}

function IdeasAdmin() {
  const { rows, error, setStatus, remove } = useRows<VideoIdea>('video_ideas')
  return (
    <List
      rows={rows}
      error={error}
      empty="Sin ideas. Tendrás que pensar vos."
      render={(i) => (
        <div className="stack-sm">
          <Meta username={i.profiles?.username} date={i.created_at} />
          <p className="pre">{i.content}</p>
          <div className="admin-actions">
            <StatusSelect
              value={i.status}
              options={{ nueva: '🆕 Nueva', me_gusta: '⭐ Me gusta', hecha: '🎬 Hecha', descartada: '🗑️ Descartada' }}
              onChange={(v) => setStatus(i.id, v)}
            />
            <button className="btn btn-sm btn-ghost" onClick={() => remove(i.id)}>Borrar</button>
          </div>
        </div>
      )}
    />
  )
}

function CommentsAdmin() {
  const { rows, error, remove } = useRows<Comment>('comments')
  return (
    <List
      rows={rows}
      error={error}
      empty="No hay comentarios."
      render={(c) => (
        <div className="row-between">
          <div className="stack-sm grow">
            <Meta username={c.profiles?.username} date={c.created_at} />
            <p className="pre">{c.content}</p>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={() => remove(c.id)}>Borrar</button>
        </div>
      )}
    />
  )
}

function InstagramAdmin() {
  const { rows, error, reload } = useRows<InstagramPost>('instagram_posts', '*')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function add(e: FormEvent) {
    e.preventDefault()
    const clean = normalizeInstagramUrl(url)
    if (!clean) return setMsg('Ese link no parece de una publicación o reel de Instagram.')
    setBusy(true)
    setMsg('')
    const { error } = await supabase.from('instagram_posts').insert({ url: clean })
    setBusy(false)
    if (error) return setMsg(friendlyError(error))
    setUrl('')
    reload()
  }
  async function remove(id: string) {
    if (!confirmAction('¿Sacar esta publicación de la página?')) return
    const { error } = await supabase.from('instagram_posts').delete().eq('id', id)
    if (error) return alert(friendlyError(error))
    reload()
  }

  return (
    <div className="stack">
      <form className="card stack-sm" onSubmit={add}>
        <strong>Agregar publicación al inicio</strong>
        <small className="muted">En Instagram: ⋯ → Copiar enlace, y pegalo acá. Se muestran las últimas que cargues.</small>
        <div className="row-tight">
          <input className="grow" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.instagram.com/p/..." required />
          <button className="btn btn-pink" disabled={busy}>{busy ? 'Agregando…' : 'Agregar'}</button>
        </div>
        {msg && <div className="error-box">{msg}</div>}
      </form>
      <List
        rows={rows}
        error={error}
        empty="Todavía no agregaste publicaciones. En el inicio se muestra un botón a tu Instagram."
        render={(p) => (
          <div className="row-between">
            <div className="stack-sm grow">
              <small className="muted">{formatDate(p.created_at)}</small>
              <a href={p.url} target="_blank" rel="noreferrer" className="ig-admin-link">{p.url}</a>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => remove(p.id)}>Sacar</button>
          </div>
        )}
      />
    </div>
  )
}
