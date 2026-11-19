import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SITE } from '../config'
import { usePoints } from '../lib/hooks'
import { isConfigured, supabase } from '../lib/supabase'
import type { LeaderRow, News } from '../lib/types'
import InstagramFeed from '../components/InstagramFeed'
import NewsCard from '../components/NewsCard'
import SponsorCard, { AdCards } from '../components/Sponsor'

export default function Home() {
  const [news, setNews] = useState<News[] | null>(null)
  const [top, setTop] = useState<LeaderRow[]>([])
  const points = usePoints()

  useEffect(() => {
    if (!isConfigured) return setNews([])
    supabase
      .from('news').select('*').eq('published', true)
      .order('created_at', { ascending: false }).limit(3)
      .then(({ data }) => setNews((data as News[]) ?? []))
    supabase.rpc('get_leaderboard', { lim: 3 }).then(({ data }) => setTop((data as LeaderRow[]) ?? []))
  }, [])

  return (
    <div className="stack-xl">
      <section className="hero">
        <span className="float-sticker s1" aria-hidden="true">🗞️</span>
        <span className="float-sticker s2" aria-hidden="true">💅</span>
        <span className="float-sticker s3" aria-hidden="true">🚨</span>
        <span className="sticker bg-pink tilt-l">Edición de hoy</span>
        <h1 className="hero-title">
          Pasó algo.<br />
          <span className="hl">Nos enteramos.</span>
        </h1>
        <p className="lead">{SITE.tagline}. Noticias de amigos, chismes sin chequear y la búsqueda de novia más seria del país.</p>
        <div className="row">
          <Link to="/novedades" className="btn btn-ink">Ver novedades</Link>
          <Link to="/chisme" className="btn">Cargá tu chisme 🤫</Link>
        </div>
      </section>

      <section className="promo-grid">
        <Link to="/casting" className="promo promo-casting">
          <span className="promo-kicker">Lo más importante de la página</span>
          <h2>Casting oficial: se busca novia para Santino</h2>
          <p>Postulá a tu candidata (o postulate vos). La evalúo yo personalmente.</p>
          <span className="promo-cta">Postular candidata · +{points.candidata} pts →</span>
          <span className="promo-deco" aria-hidden="true">💘</span>
        </Link>
        <Link to="/publicidad" className="promo promo-ad">
          <span className="promo-kicker">¿Tenés un emprendimiento?</span>
          <h2>Pedí tu publicidad GRATIS</h2>
          <p>Mandame tu marca y la pongo en la página. Sí, gratis. No, no hay letra chica.</p>
          <span className="promo-cta">Pedir publicidad →</span>
          <span className="promo-deco" aria-hidden="true">📣</span>
        </Link>
      </section>

      <section className="stack">
        <div className="section-title">
          <h2>Últimas novedades</h2>
          <Link to="/novedades" className="link-arrow">Ver todas →</Link>
        </div>
        {news === null ? (
          <div className="news-grid">{[0, 1, 2].map((i) => <div key={i} className="card skeleton" />)}</div>
        ) : news.length ? (
          <div className="news-grid">{news.map((n, i) => <NewsCard key={n.id} news={n} big={i === 0} />)}</div>
        ) : (
          <div className="card card-center">
            <div className="big-emoji">🦗</div>
            <p>No pasó nada todavía. Sospechoso.</p>
            <Link to="/chisme" className="btn btn-sm">Cargar el primer chisme</Link>
          </div>
        )}
      </section>

      <SponsorCard />

      <AdCards />

      <InstagramFeed />

      <section className="mini-grid">
        <Link to="/chisme" className="mini bg-yellow">
          <span className="big-emoji">🤫</span>
          <strong>Cargá tu chisme</strong>
          <small>+{points.chisme} pts</small>
        </Link>
        <Link to="/ideas" className="mini bg-green">
          <span className="big-emoji">💡</span>
          <strong>Ideas para videos</strong>
          <small>Proponé</small>
        </Link>
        <Link to="/muro" className="mini bg-blue">
          <span className="big-emoji">💬</span>
          <strong>El muro</strong>
          <small>Dejá tu comentario</small>
        </Link>
        <Link to="/ranking" className="mini bg-purple">
          <span className="big-emoji">🏆</span>
          <strong>Ranking de fans</strong>
          <small>¿Quién es el #1?</small>
        </Link>
      </section>

      {top.length > 0 && (
        <section className="card podium-card">
          <div className="section-title">
            <h2>Los fans del mes</h2>
            <Link to="/ranking" className="link-arrow">Ranking →</Link>
          </div>
          <ol className="podium">
            {top.map((r, i) => (
              <li key={r.user_id} className={`podium-${i + 1}`}>
                <span className="medal">{['🥇', '🥈', '🥉'][i]}</span>
                <strong>{r.username}</strong>
                <span>{r.points} pts</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}
