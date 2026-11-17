import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { SITE, TICKER_FALLBACK } from '../config'
import { useAuth } from '../lib/auth'
import { isConfigured, supabase } from '../lib/supabase'

const ADD_OPTIONS = [
  { to: '/casting', emoji: '💘', title: 'Postular candidata', sub: 'Casting oficial', color: 'pink' },
  { to: '/chisme', emoji: '🤫', title: 'Cargar un chisme', sub: 'Lo leo yo solo', color: 'yellow' },
  { to: '/publicidad', emoji: '📣', title: 'Pedir publicidad gratis', sub: 'Para tu emprendimiento', color: 'blue' },
  { to: '/ideas', emoji: '💡', title: 'Idea para un video', sub: 'Si la hago, te nombro', color: 'green' },
]

export default function Layout() {
  const { profile, session } = useAuth()
  const [sheet, setSheet] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setSheet(false)
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="logo" aria-label="Inicio">
          <span className="logo-blob">S</span>
          <span className="logo-text">{SITE.name}</span>
        </Link>
        <nav className="desk-nav" aria-label="Principal">
          <NavLink to="/novedades">Novedades</NavLink>
          <NavLink to="/casting" className="hot">Casting 💘</NavLink>
          <NavLink to="/chisme">Chismes</NavLink>
          <NavLink to="/muro">Muro</NavLink>
          <NavLink to="/ranking">Ranking</NavLink>
          <NavLink to="/ideas">Ideas</NavLink>
        </nav>
        {session ? (
          <Link to="/perfil" className="chip chip-user">
            <span className="avatar">{profile?.username?.[0]?.toUpperCase() ?? '?'}</span>
            <span className="chip-name">{profile?.username ?? 'Mi perfil'}</span>
          </Link>
        ) : (
          <Link to="/entrar" className="btn btn-sm btn-ink">Entrar</Link>
        )}
      </header>

      <Ticker />

      {!isConfigured && (
        <div className="config-warning">
          ⚠️ Falta configurar Supabase: copiá <code>.env.example</code> a <code>.env</code> y completá las claves.
        </div>
      )}

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <p>
          {SITE.name} · Portal de noticias no verificadas desde {new Date().getFullYear()}
        </p>
        <a href={SITE.instagramUrl} target="_blank" rel="noreferrer">Seguinos en Instagram {SITE.instagramHandle}</a>
        {profile?.is_admin && <Link to="/admin" className="admin-link">Panel admin</Link>}
      </footer>

      {location.pathname !== '/publicidad' && <AdBadge />}

      <nav className="bottom-nav" aria-label="Navegación">
        <NavLink to="/" end><span className="bn-ico">🏠</span>Inicio</NavLink>
        <NavLink to="/novedades"><span className="bn-ico">📰</span>Novedades</NavLink>
        <button className={`bn-add ${sheet ? 'open' : ''}`} onClick={() => setSheet((s) => !s)} aria-label="Cargar algo" aria-expanded={sheet}>
          <span>+</span>
        </button>
        <NavLink to="/muro"><span className="bn-ico">💬</span>Muro</NavLink>
        <NavLink to="/ranking"><span className="bn-ico">🏆</span>Ranking</NavLink>
      </nav>

      {sheet && (
        <div className="sheet-backdrop" onClick={() => setSheet(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="¿Qué querés cargar?">
            <div className="sheet-handle" />
            <h3>¿Qué traés hoy?</h3>
            <div className="sheet-grid">
              {ADD_OPTIONS.map((o) => (
                <Link key={o.to} to={o.to} className={`sheet-item bg-${o.color}`}>
                  <span className="sheet-emoji">{o.emoji}</span>
                  <strong>{o.title}</strong>
                  <small>{o.sub}</small>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Ticker() {
  const [items, setItems] = useState<{ text: string; slug?: string }[]>(TICKER_FALLBACK.map((text) => ({ text })))

  useEffect(() => {
    if (!isConfigured) return
    supabase
      .from('news')
      .select('title, slug')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (data && data.length) setItems(data.map((n) => ({ text: n.title, slug: n.slug })))
      })
  }, [])

  const row = items.map((it, i) =>
    it.slug ? (
      <Link key={i} to={`/novedades/${it.slug}`} className="ticker-item">{it.text}</Link>
    ) : (
      <span key={i} className="ticker-item">{it.text}</span>
    ),
  )

  return (
    <div className="ticker" aria-label="Últimas noticias">
      <span className="ticker-label">EN VIVO</span>
      <div className="ticker-track">
        <div className="ticker-move">
          {row}
          <span aria-hidden="true" className="ticker-dup">{row}</span>
        </div>
      </div>
    </div>
  )
}

function AdBadge() {
  return (
    <Link to="/publicidad" className="ad-badge" aria-label="Pedí tu publicidad gratis">
      <svg viewBox="0 0 100 100" className="ad-badge-ring" aria-hidden="true">
        <defs>
          <path id="circ" d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0" />
        </defs>
        <text>
          <textPath href="#circ">PEDÍ TU PUBLICIDAD • PEDÍ TU PUBLICIDAD •</textPath>
        </text>
      </svg>
      <span className="ad-badge-center">GRATIS</span>
    </Link>
  )
}
