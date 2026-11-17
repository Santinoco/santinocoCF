import { useEffect, useState } from 'react'
import NewsCard from '../components/NewsCard'
import { PageHead } from '../components/ui'
import { NEWS_CATEGORIES } from '../config'
import { isConfigured, supabase } from '../lib/supabase'
import type { News } from '../lib/types'

const PAGE = 12

export default function NewsList() {
  const [items, setItems] = useState<News[]>([])
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState(false)
  const [cat, setCat] = useState<string | null>(null)

  async function load(reset: boolean) {
    if (!isConfigured) return setLoading(false)
    setLoading(true)
    const from = reset ? 0 : items.length
    let q = supabase.from('news').select('*').eq('published', true).order('created_at', { ascending: false }).range(from, from + PAGE - 1)
    if (cat) q = q.eq('category', cat)
    const { data } = await q
    const rows = (data as News[]) ?? []
    setItems(reset ? rows : [...items, ...rows])
    setMore(rows.length === PAGE)
    setLoading(false)
  }

  useEffect(() => {
    load(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat])

  return (
    <div className="stack-lg">
      <PageHead kicker="Información no chequeada" title="Novedades" color="pink">
        Todo lo que pasa en el grupo, contado con la seriedad que no se merece.
      </PageHead>

      <div className="chips-scroll" role="tablist">
        <button className={`chip ${!cat ? 'active' : ''}`} onClick={() => setCat(null)}>Todas</button>
        {NEWS_CATEGORIES.map((c) => (
          <button key={c} className={`chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>

      {!loading && items.length === 0 ? (
        <div className="card card-center">
          <div className="big-emoji">🦗</div>
          <p>Nada por acá. Por ahora.</p>
        </div>
      ) : (
        <div className="news-grid">
          {items.map((n) => <NewsCard key={n.id} news={n} />)}
          {loading && [0, 1, 2].map((i) => <div key={'s' + i} className="card skeleton" />)}
        </div>
      )}

      {more && !loading && (
        <button className="btn btn-block" onClick={() => load(false)}>Cargar más</button>
      )}
    </div>
  )
}
