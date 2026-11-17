import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { categoryColor } from '../components/NewsCard'
import { Spinner } from '../components/ui'
import { isConfigured, supabase } from '../lib/supabase'
import type { News } from '../lib/types'
import { formatDate } from '../lib/utils'

export default function NewsDetail() {
  const { slug } = useParams()
  const [news, setNews] = useState<News | null | undefined>(undefined)
  const [zoom, setZoom] = useState<string | null>(null)

  useEffect(() => {
    if (!isConfigured) return setNews(null)
    supabase.from('news').select('*').eq('slug', slug!).maybeSingle().then(({ data }) => setNews(data as News | null))
  }, [slug])

  useEffect(() => {
    if (news) document.title = `${news.title} · SantinocoCF`
    return () => { document.title = 'SantinocoCF' }
  }, [news])

  if (news === undefined) return <Spinner />
  if (!news) {
    return (
      <div className="card card-center">
        <div className="big-emoji">🕵️</div>
        <h2>Esta noticia desapareció</h2>
        <p className="muted">O nunca existió. Las dos opciones son preocupantes.</p>
        <Link to="/novedades" className="btn">Volver a novedades</Link>
      </div>
    )
  }

  const paragraphs = news.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)

  async function share() {
    const data = { title: news!.title, text: news!.summary ?? news!.title, url: location.href }
    if (navigator.share) {
      try { await navigator.share(data) } catch { /* canceló */ }
    } else {
      await navigator.clipboard.writeText(location.href)
      alert('¡Link copiado!')
    }
  }

  return (
    <article className="article stack-lg">
      <Link to="/novedades" className="link-arrow">← Novedades</Link>

      <header className="article-head">
        <div className="row">
          <span className="stamp">Exclusivo</span>
          <span className={`sticker bg-${categoryColor(news.category)}`}>{news.category}</span>
        </div>
        <h1>{news.title}</h1>
        {news.summary && <p className="lead">{news.summary}</p>}
        <p className="news-meta">Por la redacción de SantinocoCF · {formatDate(news.created_at)}</p>
      </header>

      {news.cover_url && (
        <button className="article-cover" onClick={() => setZoom(news.cover_url)}>
          <img src={news.cover_url} alt="" />
        </button>
      )}

      <div className="article-body">
        {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
      </div>

      {news.images.length > 0 && (
        <section className="stack">
          <h3>Material exclusivo 📸</h3>
          <div className="gallery">
            {news.images.map((src) => (
              <button key={src} onClick={() => setZoom(src)} className="gallery-item">
                <img src={src} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="card article-cta">
        <div>
          <strong>¿Sabés algo más de esto?</strong>
          <p className="muted">Contalo. Tu identidad queda protegida (más o menos).</p>
        </div>
        <div className="row">
          <button className="btn" onClick={share}>Compartir</button>
          <Link to="/chisme" className="btn btn-pink">Cargar chisme</Link>
        </div>
      </div>

      {zoom && (
        <div className="lightbox" onClick={() => setZoom(null)} role="dialog">
          <img src={zoom} alt="" />
          <button className="btn btn-sm lightbox-close">Cerrar ✕</button>
        </div>
      )}
    </article>
  )
}
