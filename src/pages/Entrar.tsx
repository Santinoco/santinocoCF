import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Turnstile, { TURNSTILE_KEY } from '../components/Turnstile'
import { ErrorBox, Field } from '../components/ui'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { cleanHandle, friendlyError } from '../lib/utils'

type Mode = 'login' | 'registro' | 'olvide'

export default function Entrar() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const next = params.get('next') || '/'
  const [mode, setMode] = useState<Mode>(params.get('modo') === 'registro' ? 'registro' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [instagram, setInstagram] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [captchaKey, setCaptchaKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => {
    if (session) navigate(next, { replace: true })
  }, [session, next, navigate])

  function switchMode(m: Mode) {
    setMode(m); setError(''); setInfo('')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(''); setInfo('')
    if (TURNSTILE_KEY && !token) return setError('Completá la verificación anti-bots.')
    setBusy(true)
    try {
      const captchaToken = token ?? undefined
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } })
        if (error) throw error
      } else if (mode === 'registro') {
        const u = username.trim()
        if (!/^[a-zA-Z0-9_.]{3,20}$/.test(u)) throw new Error('El usuario tiene que tener de 3 a 20 caracteres: letras, números, punto o guion bajo.')
        const { data: taken } = await supabase.from('profiles').select('id').ilike('username', u.replace(/_/g, '\\_')).maybeSingle()
        if (taken) throw new Error('Ese nombre de usuario ya está tomado.')
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            captchaToken,
            emailRedirectTo: window.location.origin + next,
            data: { username: u, instagram: cleanHandle(instagram) ?? '' },
          },
        })
        if (error) throw error
        if (!data.session) {
          setInfo(`¡Listo! Te mandamos un mail a ${email}. Confirmalo para poder entrar (mirá en spam también).`)
          setMode('login')
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          captchaToken,
          redirectTo: window.location.origin + '/perfil?cambiar=1',
        })
        if (error) throw error
        setInfo('Si el mail existe, te llegó un link para cambiar la contraseña.')
      }
    } catch (err) {
      setError(err instanceof Error && !('status' in err) ? err.message : friendlyError(err))
    } finally {
      setBusy(false)
      setToken(null)
      setCaptchaKey((k) => k + 1)
    }
  }

  return (
    <div className="narrow-sm stack-lg">
      <div className="page-head center">
        <div className="big-emoji wobble">{mode === 'registro' ? '🎟️' : '🚪'}</div>
        <h1>{mode === 'registro' ? 'Sumate' : mode === 'login' ? 'Entrá' : 'Recuperar acceso'}</h1>
        <p className="lead">
          {mode === 'registro'
            ? 'Con tu cuenta sumás puntos y competís en el ranking.'
            : mode === 'login'
              ? 'Bienvenido de vuelta al medio más serio del país.'
              : 'Te mandamos un link para cambiar la contraseña.'}
        </p>
      </div>

      {mode !== 'olvide' && (
        <div className="segmented">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Entrar</button>
          <button className={mode === 'registro' ? 'active' : ''} onClick={() => switchMode('registro')}>Crear cuenta</button>
        </div>
      )}

      {info && <div className="info-box">✉️ {info}</div>}

      <form className="card stack form" onSubmit={submit}>
        {mode === 'registro' && (
          <>
            <Field label="Nombre de usuario" hint="Así vas a aparecer en el ranking y el muro">
              <input value={username} onChange={(e) => setUsername(e.target.value)} required autoCapitalize="none" autoComplete="username" placeholder="facu.martinez" />
            </Field>
            <Field label="Tu Instagram" hint="Opcional">
              <div className="input-prefix">
                <span>@</span>
                <input value={instagram} onChange={(e) => setInstagram(e.target.value)} autoCapitalize="none" placeholder="usuario" />
              </div>
            </Field>
          </>
        )}
        <Field label="Mail">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="vos@mail.com" />
        </Field>
        {mode !== 'olvide' && (
          <Field label="Contraseña" hint={mode === 'registro' ? 'Mínimo 6 caracteres' : undefined}>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'registro' ? 'new-password' : 'current-password'} />
          </Field>
        )}
        <Turnstile onToken={setToken} resetKey={captchaKey} />
        <ErrorBox>{error}</ErrorBox>
        <button className="btn btn-pink btn-block btn-lg" disabled={busy}>
          {busy ? 'Un segundo…' : mode === 'registro' ? 'Crear cuenta' : mode === 'login' ? 'Entrar' : 'Mandarme el link'}
        </button>
        {mode === 'login' && <button type="button" className="link-btn center" onClick={() => switchMode('olvide')}>Me olvidé la contraseña</button>}
        {mode === 'olvide' && <button type="button" className="link-btn center" onClick={() => switchMode('login')}>← Volver</button>}
      </form>
    </div>
  )
}
