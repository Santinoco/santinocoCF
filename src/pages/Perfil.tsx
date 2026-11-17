import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { ErrorBox, Field, Spinner } from '../components/ui'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../lib/utils'

interface Stats { points: number; rank_pos: number | null; chismes: number; candidatas: number }

export default function Perfil() {
  const { session, profile, loading, signOut } = useAuth()
  const [params] = useSearchParams()
  const [stats, setStats] = useState<Stats | null>(null)
  const [showPass, setShowPass] = useState(params.get('cambiar') === '1')
  const [pass, setPass] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session) return
    supabase.rpc('get_my_stats').single().then(({ data }) => setStats(data as Stats))
  }, [session])

  if (loading) return <Spinner />
  if (!session) return <Navigate to="/entrar?next=/perfil" replace />

  async function changePassword(e: FormEvent) {
    e.preventDefault()
    setError(''); setMsg('')
    const { error } = await supabase.auth.updateUser({ password: pass })
    if (error) return setError(friendlyError(error))
    setPass(''); setShowPass(false); setMsg('Contraseña actualizada ✅')
  }

  return (
    <div className="narrow-sm stack-lg">
      <div className="card profile-card card-center">
        <span className="avatar avatar-xl">{profile?.username?.[0]?.toUpperCase() ?? '?'}</span>
        <h1>@{profile?.username}</h1>
        {profile?.instagram && (
          <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noreferrer" className="muted">IG: @{profile.instagram}</a>
        )}
        {profile?.is_admin && <span className="sticker bg-yellow">Admin supremo</span>}
      </div>

      <div className="stats-grid">
        <div className="stat bg-yellow"><b>{stats?.points ?? 0}</b><span>puntos</span></div>
        <div className="stat bg-purple"><b>{stats?.rank_pos ? `#${stats.rank_pos}` : '—'}</b><span>ranking</span></div>
        <div className="stat bg-blue"><b>{stats?.chismes ?? 0}</b><span>chismes</span></div>
        <div className="stat bg-pink"><b>{stats?.candidatas ?? 0}</b><span>candidatas</span></div>
      </div>

      {msg && <div className="info-box">{msg}</div>}

      <div className="stack">
        {profile?.is_admin && <Link to="/admin" className="btn btn-ink btn-block">Ir al panel admin</Link>}
        {showPass ? (
          <form className="card stack form" onSubmit={changePassword}>
            <Field label="Nueva contraseña">
              <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} minLength={6} required autoComplete="new-password" />
            </Field>
            <ErrorBox>{error}</ErrorBox>
            <button className="btn btn-block">Guardar contraseña</button>
          </form>
        ) : (
          <button className="btn btn-block" onClick={() => setShowPass(true)}>Cambiar contraseña</button>
        )}
        <button className="btn btn-block btn-ghost" onClick={signOut}>Cerrar sesión</button>
      </div>
    </div>
  )
}
