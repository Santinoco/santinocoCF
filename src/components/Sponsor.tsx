import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ADS, SPONSOR, SPONSOR_POPUP } from '../config'

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

// Publicidades gratis (las que pidieron en /publicidad y se aprobaron)
export function AdCards() {
  if (!ADS.length) return null
  return (
    <section className="stack" aria-label="Publicidades">
      {ADS.map((ad) => (
        <article key={ad.name} className="ad-card">
          <span className="sticker sticker-sm bg-blue sponsor-kicker">Publicidad</span>
          <img src={ad.logo} alt={`Logo de ${ad.name}`} className="ad-logo" />
          <p className="ad-desc">{ad.description}</p>
          <div className="sponsor-actions">
            <a href={ad.instagramUrl} target="_blank" rel="noreferrer sponsored" className="btn btn-pink">
              {ad.instagramHandle} ↗
            </a>
            <a href={ad.whatsappUrl} target="_blank" rel="noreferrer sponsored" className="btn">
              📞 {ad.phone}
            </a>
          </div>
        </article>
      ))}
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

type Ad = (typeof ADS)[number]
type PopupPick = { kind: 'sponsor' } | { kind: 'ad'; ad: Ad }

// Sortea qué publicidad sale en el popup según los pesos de config.ts
function pickPopup(): PopupPick | null {
  const options: { pick: PopupPick; weight: number }[] = [
    { pick: { kind: 'sponsor' } as PopupPick, weight: SPONSOR_POPUP.sponsorWeight },
    ...ADS.map((ad) => ({ pick: { kind: 'ad', ad } as PopupPick, weight: ad.popupWeight })),
  ].filter((o) => o.weight > 0)
  const total = options.reduce((sum, o) => sum + o.weight, 0)
  if (!total) return null
  let r = Math.random() * total
  for (const o of options) {
    r -= o.weight
    if (r < 0) return o.pick
  }
  return options[options.length - 1].pick
}

// Popup de publicidad: aparece una vez por visita, a los pocos segundos de entrar.
// Cada vez sale una marca distinta, sorteada según los pesos.
export function SponsorPopup() {
  const [pick, setPick] = useState<PopupPick | null>(null)
  const { pathname } = useLocation()
  const blocked = pathname.startsWith('/admin') || pathname.startsWith('/entrar')
  const close = () => setPick(null)

  useEffect(() => {
    if (!SPONSOR_POPUP.enabled || blocked || alreadySeen()) return
    const t = setTimeout(() => {
      const p = pickPopup()
      if (p) setPick(p)
      markSeen()
    }, SPONSOR_POPUP.delayMs)
    return () => clearTimeout(t)
  }, [blocked])

  useEffect(() => {
    if (!pick) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPick(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pick])

  if (!pick) return null
  const name = pick.kind === 'sponsor' ? SPONSOR.name : pick.ad.name
  return (
    <div className="sponsor-pop-backdrop" onClick={close}>
      <div className="sponsor-pop" role="dialog" aria-modal="true" aria-label={`Publicidad: ${name}`} onClick={(e) => e.stopPropagation()}>
        <button className="sponsor-pop-close" onClick={close} aria-label="Cerrar">✕</button>
        {pick.kind === 'sponsor' ? (
          <>
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
            <a href={SPONSOR.instagramUrl} target="_blank" rel="noreferrer sponsored" className="btn btn-pink btn-block" onClick={close}>
              Seguir {SPONSOR.instagramHandle} ↗
            </a>
            <a href={SPONSOR.webUrl} target="_blank" rel="noreferrer sponsored" className="btn btn-block" onClick={close}>
              {SPONSOR.webLabel} ↗
            </a>
          </>
        ) : (
          <>
            <span className="sticker sticker-sm bg-blue sponsor-kicker">Publicidad</span>
            <div className="sponsor-pop-banner">
              <img src={pick.ad.logo} alt={`Logo de ${pick.ad.name}`} />
            </div>
            {pick.ad.popupTitle && <h2>{pick.ad.popupTitle}</h2>}
            <p className="sponsor-desc">{pick.ad.description}</p>
            <a href={pick.ad.instagramUrl} target="_blank" rel="noreferrer sponsored" className="btn btn-pink btn-block" onClick={close}>
              Seguir {pick.ad.instagramHandle} ↗
            </a>
            <a href={pick.ad.whatsappUrl} target="_blank" rel="noreferrer sponsored" className="btn btn-block" onClick={close}>
              📞 {pick.ad.phone}
            </a>
          </>
        )}
        <button className="sponsor-pop-skip" onClick={close}>Ahora no</button>
      </div>
    </div>
  )
}
