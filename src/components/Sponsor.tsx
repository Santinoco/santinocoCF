import { SPONSOR } from '../config'

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
