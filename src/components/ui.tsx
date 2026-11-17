import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export function PageHead({ kicker, title, children, color = 'yellow' }: {
  kicker?: string
  title: ReactNode
  children?: ReactNode
  color?: 'yellow' | 'pink' | 'blue' | 'green' | 'purple'
}) {
  return (
    <div className="page-head">
      {kicker && <span className={`sticker bg-${color}`}>{kicker}</span>}
      <h1>{title}</h1>
      {children && <p className="lead">{children}</p>}
    </div>
  )
}

/** Muestra el contenido solo si hay sesión; si no, una tarjeta para entrar. */
export function LoginGate({ children, what }: { children: ReactNode; what: string }) {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner />
  if (session) return <>{children}</>
  return (
    <div className="card card-center gate">
      <div className="big-emoji wobble">🔒</div>
      <h3>Para {what} tenés que estar registrado</h3>
      <p className="muted">Así sumás puntos para el ranking y los bots no nos llenan de basura.</p>
      <div className="row-center">
        <Link to={`/entrar?next=${encodeURIComponent(location.pathname)}`} className="btn btn-pink">Entrar</Link>
        <Link to={`/entrar?modo=registro&next=${encodeURIComponent(location.pathname)}`} className="btn">Crear cuenta</Link>
      </div>
    </div>
  )
}

export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="spinner-wrap" role="status">
      <span className="spinner" />
      <span className="muted">{label}</span>
    </div>
  )
}

export function ErrorBox({ children }: { children: ReactNode }) {
  if (!children) return null
  return <div className="error-box" role="alert">💥 {children}</div>
}

export function Success({ emoji, title, points, children, onAgain }: {
  emoji: string
  title: string
  points?: number
  children?: ReactNode
  onAgain: () => void
}) {
  return (
    <div className="card card-center success pop-in">
      <div className="big-emoji bounce">{emoji}</div>
      <h2>{title}</h2>
      {points ? <div className="points-burst">+{points} puntos</div> : null}
      {children && <p className="muted">{children}</p>}
      <div className="row-center">
        <button className="btn" onClick={onAgain}>Cargar otro</button>
        <Link to="/ranking" className="btn btn-ink">Ver ranking</Link>
      </div>
    </div>
  )
}

export function ImagePicker({ file, onChange, label = 'Subir foto' }: {
  file: File | null
  onChange: (f: File | null) => void
  label?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!file) return setPreview(null)
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  return (
    <div className="image-picker">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {preview ? (
        <div className="picker-preview">
          <img src={preview} alt="Vista previa" />
          <button type="button" className="btn btn-sm" onClick={() => { onChange(null); if (inputRef.current) inputRef.current.value = '' }}>
            Sacar
          </button>
        </div>
      ) : (
        <button type="button" className="picker-empty" onClick={() => inputRef.current?.click()}>
          <span className="big-emoji">📸</span>
          {label}
        </button>
      )}
    </div>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}
