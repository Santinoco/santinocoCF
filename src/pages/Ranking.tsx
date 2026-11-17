import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHead, Spinner } from '../components/ui'
import { useAuth } from '../lib/auth'
import { isConfigured, supabase } from '../lib/supabase'
import type { LeaderRow, PointRule } from '../lib/types'

export default function Ranking() {
  const { session } = useAuth()
  const [rows, setRows] = useState<LeaderRow[] | null>(null)
  const [rules, setRules] = useState<PointRule[]>([])
  const [me, setMe] = useState<{ points: number; rank_pos: number | null } | null>(null)

  useEffect(() => {
    if (!isConfigured) return setRows([])
    supabase.rpc('get_leaderboard', { lim: 50 }).then(({ data }) => setRows((data as LeaderRow[]) ?? []))
    supabase.from('point_rules').select('*').order('points').then(({ data }) => setRules((data as PointRule[]) ?? []))
  }, [])

  useEffect(() => {
    if (!session) return setMe(null)
    supabase.rpc('get_my_stats').single().then(({ data }) => setMe(data as { points: number; rank_pos: number | null }))
  }, [session])

  return (
    <div className="stack-lg narrow">
      <PageHead kicker="Salón de la fama" title={<>Ranking de <span className="hl hl-purple">fans</span></>} color="purple">
        Los que más aportan a la causa. Sumá puntos cargando cosas.
      </PageHead>

      <div className="rules">
        {rules.map((r) => (
          <div key={r.action} className="rule">
            <span>{r.label}</span>
            <b>+{r.points}</b>
          </div>
        ))}
      </div>

      {session && me && (
        <div className="card me-card">
          <div>
            <small className="muted">Tu posición</small>
            <div className="me-big">{me.rank_pos ? `#${me.rank_pos}` : '—'}</div>
          </div>
          <div>
            <small className="muted">Tus puntos</small>
            <div className="me-big">{me.points}</div>
          </div>
          {!me.rank_pos && <Link to="/chisme" className="btn btn-sm btn-pink">Sumar puntos</Link>}
        </div>
      )}

      {rows === null ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <div className="card card-center">
          <div className="big-emoji">🏆</div>
          <p>El podio está vacío. El primero que carga algo es #1 automáticamente.</p>
          <Link to="/chisme" className="btn btn-pink">Quiero ser #1</Link>
        </div>
      ) : (
        <ol className="board">
          {rows.map((r, i) => (
            <li key={r.user_id} className={`board-row ${i < 3 ? 'top' + (i + 1) : ''} ${session?.user.id === r.user_id ? 'is-me' : ''}`}>
              <span className="board-pos">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
              <div className="board-name">
                <strong>{r.username}</strong>
                <small className="muted">{r.chismes} {r.chismes === 1 ? 'chisme' : 'chismes'} · {r.candidatas} {r.candidatas === 1 ? 'candidata' : 'candidatas'}</small>
              </div>
              <span className="board-pts">{r.points}<small> pts</small></span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
