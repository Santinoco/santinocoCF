import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { SPONSOR, SPONSOR_POPUP } from '../config'

export default function SponsorCard() {
  return (
    <section className="sponsor" aria-label={`Sponsor oficial: ${SPONSOR.name}`}>
      <span className="sticker sticker-sm bg-yellow sponsor-kicker">Sponsor oficial</span>
      <div className="sponsor-body">
        <img src={SPONSOR.logo} alt={`Logo de ${SPONSOR.name}`} className="sponsor-logo" width={96} height={96} />
        <div className="stack-sm grow">
          <h2>{SPONSOR.name}</h2>
          <p className="sponsor-tagline">{SPONSOR.tagline}</p>
          <p className="sponsor-desc">{SPONSOR.description}</p>
          <ul className="sponsor-stats">
            {SPONSOR.stats.map((s) => (
              <li key={s.label}><b>{s.value}</b> {s.label}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="sponsor-actions">
        <a href={SPONSOR.instagramUrl} target="_blank" rel="noreferrer sponsored" className="btn btn-pink">
          Seguir {SPONSOR.instagramHandle} ↗
        </a>
        <a href={SPONSOR.webUrl} target="_blank" rel="noreferrer sponsored" className="btn">
          {SPONSOR.webLabel} ↗
        </a>
      </div>
    </section>
  )
}

export function SponsorStrip() {
  return (
    <a href={SPONSOR.instagramUrl} target="_blank" rel="noreferrer sponsored" className="sponsor-strip">
      <img src={SPONSOR.logo} alt="" width={28} height={28} />
      <span>Con el apoyo de <b>{SPONSOR.name}</b></span>
    </a>
  )
}

const SEEN_KEY = 'sponsor-popup-seen'

function alreadySeen() {
  try { return sessionStorage.getItem(SEEN_KEY) === '1' } catch { return false }
}
function markSeen() {
  try { sessionStorage.setItem(SEEN_KEY, '1') } catch { /* sin storage */ }
}

// Popup del sponsor: aparece una vez por visita, a los pocos segundos de entrar
export function SponsorPopup() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const blocked = pathname.startsWith('/admin') || pathname.startsWith('/entrar')

  useEffect(() => {
    if (!SPONSOR_POPUP.enabled || blocked || alreadySeen()) return
    const t = setTimeout(() => { setOpen(true); markSeen() }, SPONSOR_POPUP.delayMs)
    return () => clearTimeout(t)
  }, [blocked])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null
  return (
    <div className="sponsor-pop-backdrop" onClick={() => setOpen(false)}>
      <div className="sponsor-pop" role="dialog" aria-modal="true" aria-label={`Publicidad: ${SPONSOR.name}`} onClick={(e) => e.stopPropagation()}>
        <button className="sponsor-pop-close" onClick={() => setOpen(false)} aria-label="Cerrar">✕</button>
        <span className="sticker sticker-sm bg-yellow sponsor-kicker">Sponsor oficial</span>
        <img src={SPONSOR.logo} alt={`Logo de ${SPONSOR.name}`} className="sponsor-pop-logo" width={110} height={110} />
        <h2>{SPONSOR_POPUP.title}</h2>
        <p className="sponsor-tagline">{SPONSOR.tagline}</p>
        <p className="sponsor-desc">{SPONSOR_POPUP.text}</p>
        <ul className="sponsor-stats">
          {SPONSOR.stats.map((s) => (
            <li key={s.label}><b>{s.value}</b> {s.label}</li>
          ))}
        </ul>
        <a href={SPONSOR.instagramUrl} target="_blank" rel="noreferrer sponsored" className="btn btn-pink btn-block" onClick={() => setOpen(false)}>
          Seguir {SPONSOR.instagramHandle} ↗
        </a>
        <a href={SPONSOR.webUrl} target="_blank" rel="noreferrer sponsored" className="btn btn-block" onClick={() => setOpen(false)}>
          {SPONSOR.webLabel} ↗
        </a>
        <button className="sponsor-pop-skip" onClick={() => setOpen(false)}>Ahora no</button>
      </div>
    </div>
  )
}
