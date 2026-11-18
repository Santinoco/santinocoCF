import { useEffect, useState } from 'react'
import { INSTAGRAM_FEED_LIMIT, SITE } from '../config'
import { isConfigured, supabase } from '../lib/supabase'
import type { InstagramPost } from '../lib/types'

declare global {
  interface Window { instgrm?: { Embeds: { process: () => void } } }
}

const EMBED_SRC = 'https://www.instagram.com/embed.js'

// Carga el script de Instagram una sola vez y procesa los embeds
function processEmbeds() {
  if (window.instgrm) return window.instgrm.Embeds.process()
  if (document.querySelector(`script[src="${EMBED_SRC}"]`)) return
  const s = document.createElement('script')
  s.src = EMBED_SRC
  s.async = true
  document.body.appendChild(s)
}

export default function InstagramFeed() {
  const [posts, setPosts] = useState<InstagramPost[] | null>(null)

  useEffect(() => {
    if (!isConfigured) return setPosts([])
    supabase
      .from('instagram_posts').select('*')
      .order('created_at', { ascending: false }).limit(INSTAGRAM_FEED_LIMIT)
      .then(({ data }) => setPosts((data as InstagramPost[]) ?? []))
  }, [])

  useEffect(() => {
    if (posts?.length) processEmbeds()
  }, [posts])

  return (
    <section className="stack">
      <div className="section-title">
        <h2>Últimas en Instagram</h2>
        <a href={SITE.instagramUrl} target="_blank" rel="noreferrer" className="link-arrow">{SITE.instagramHandle} →</a>
      </div>
      {posts === null ? (
        <div className="ig-grid">{[0, 1, 2].map((i) => <div key={i} className="card skeleton ig-skeleton" />)}</div>
      ) : posts.length ? (
        <div className="ig-grid">
          {posts.map((p) => (
            <div key={p.id} className="ig-item">
              <blockquote className="instagram-media" data-instgrm-permalink={p.url} data-instgrm-version="14">
                <a href={p.url} target="_blank" rel="noreferrer">Ver esta publicación en Instagram</a>
              </blockquote>
            </div>
          ))}
        </div>
      ) : (
        <a href={SITE.instagramUrl} target="_blank" rel="noreferrer" className="card card-center ig-empty">
          <div className="big-emoji">📸</div>
          <strong>Mirá lo último en {SITE.instagramHandle}</strong>
          <span className="btn btn-sm btn-pink">Ir a Instagram ↗</span>
        </a>
      )}
    </section>
  )
}
