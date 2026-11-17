// =====================================================================
// MODO DEMO: imita el cliente de Supabase con datos en memoria
// (se guarda en localStorage del navegador). Solo se usa con VITE_DEMO=1.
// =====================================================================

type Row = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
type Store = Record<string, Row[]>

const KEY = 'santinococf-demo-v1'
const ADMIN_ID = 'demo-admin'
const ago = (h: number) => new Date(Date.now() - h * 3600e3).toISOString()

const svg = (bg: string, emoji: string) =>
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="${bg}"/><text x="400" y="320" font-size="200" text-anchor="middle">${emoji}</text></svg>`,
  )

function seed(): Store {
  const profiles = [
    { id: ADMIN_ID, username: 'santinococf', instagram: 'santinococf', is_admin: true, created_at: ago(900) },
    { id: 'u1', username: 'facu.martinez', instagram: 'facu', is_admin: false, created_at: ago(800) },
    { id: 'u2', username: 'juli_', instagram: null, is_admin: false, created_at: ago(700) },
    { id: 'u3', username: 'tomi.ok', instagram: null, is_admin: false, created_at: ago(600) },
    { id: 'u4', username: 'lucia.b', instagram: null, is_admin: false, created_at: ago(500) },
  ]
  const news = [
    {
      id: 'n1', slug: 'facu-martinez-se-lastimo-el-dedo', category: 'Accidentes',
      title: 'Facu Martínez se cayó y se lastimó el dedo',
      summary: 'Testigos aseguran que intentó hacer una chilena en el picadito del jueves. El dedo no sobrevivió al intento.',
      body: 'Fue un jueves cualquiera hasta que dejó de serlo. Minuto 87, empate en 4 y una pelota que caía del cielo como una oportunidad divina.\n\nFacu Martínez, conocido en el ambiente por su confianza desmedida, decidió que era el momento de intentar una chilena. Nadie le pidió que lo hiciera.\n\n"Escuché un crack y pensé que era el arco", declaró un testigo que prefirió mantener el anonimato. No era el arco.\n\nSegún fuentes cercanas, el dedo ya está mejor. El orgullo, no tanto. La redacción de SantinocoCF le desea una pronta recuperación y le recomienda, con todo respeto, que se dedique al ajedrez.',
      cover_url: svg('#ffd6e5', '🩹'), images: [svg('#d3f2fc', '⚽'), svg('#fff1b8', '🤕'), svg('#cff7e5', '🏥')],
      published: true, source_gossip_id: null, created_at: ago(5),
    },
    {
      id: 'n2', slug: 'juli-quemo-el-asado', category: 'Gastronomía',
      title: 'Juli quemó el asado por tercera vez consecutiva',
      summary: 'Se investiga si fue sabotaje o falta de talento. Las dos hipótesis siguen abiertas.',
      body: 'Otra vez. El domingo, Juli se ofreció como asador y el resultado fue el mismo de siempre: carbón con forma de vacío.\n\nLos comensales comieron ensalada y pan. Mucho pan.',
      cover_url: svg('#fff1b8', '🔥'), images: [], published: true, source_gossip_id: null, created_at: ago(50),
    },
    {
      id: 'n3', slug: 'el-parlante-de-tomi', category: 'Misterio',
      title: 'Nadie sabe dónde quedó el parlante de Tomi',
      summary: 'La búsqueda entra en su segunda semana. Hay sospechosos.',
      body: 'El parlante fue visto por última vez en la previa del sábado. Desde entonces, silencio absoluto (literal).',
      cover_url: null, images: [], published: true, source_gossip_id: null, created_at: ago(150),
    },
  ]
  const comments = [
    { id: 'c1', user_id: 'u1', content: 'La mejor página de noticias del país, sin dudas 🔥', created_at: ago(0.2) },
    { id: 'c2', user_id: 'u2', content: 'Exijo una rectificación sobre lo del asado. El carbón estaba húmedo.', created_at: ago(2) },
    { id: 'c3', user_id: 'u3', content: 'Santino contestá los mensajes', created_at: ago(26) },
    { id: 'c4', user_id: 'u4', content: 'Postulé a mi prima, después no digan que no ayudo', created_at: ago(40) },
  ]
  const gossip = [
    { id: 'g1', user_id: 'u2', protagonist: 'Tomi', content: 'Tomi le dijo a todos que se iba a dormir temprano y lo vieron a las 4 am comprando un pancho en la estación de servicio.', image_path: null, status: 'nuevo', created_at: ago(3) },
    { id: 'g2', user_id: 'u1', protagonist: null, content: 'Alguien del grupo se anotó en un curso de salsa y no le contó a nadie. No voy a decir quién (es Lucía).', image_path: null, status: 'leido', created_at: ago(30) },
    { id: 'g3', user_id: 'u1', protagonist: 'Facu', content: 'Facu se tiró de chilena en el picadito y se hizo pelota el dedo jajaja', image_path: null, status: 'publicado', created_at: ago(8) },
  ]
  const candidates = [
    { id: 'k1', user_id: 'u4', name: 'Martina', instagram: 'martu.ejemplo', photo_path: null, reason: 'Le gusta el fernet y se ríe de los chistes malos. Ideal.', status: 'en_evaluacion', created_at: ago(6) },
    { id: 'k2', user_id: 'u1', name: 'Sofi', instagram: 'sofi.ejemplo', photo_path: null, reason: null, status: 'segunda_ronda', created_at: ago(70) },
  ]
  const video_ideas = [
    { id: 'i1', user_id: 'u3', content: 'Santino intenta cocinar un asado sin ayuda de nadie', status: 'nueva', created_at: ago(10) },
  ]
  const ad_requests = [
    { id: 'a1', user_id: 'u2', business_name: 'Empanadas Doña Rosa', instagram: 'donarosa.ejemplo', contact: '11 2345-6789', description: 'Las mejores empanadas del barrio. 2x1 los martes.', image_path: null, status: 'pendiente', created_at: ago(12) },
  ]
  // puntos de ejemplo extra para que el ranking no quede vacío
  for (let i = 0; i < 4; i++) gossip.push({ id: 'gx' + i, user_id: 'u1', protagonist: null, content: 'Chisme viejo de ejemplo número ' + i, image_path: null, status: 'descartado', created_at: ago(200 + i) })
  for (let i = 0; i < 5; i++) gossip.push({ id: 'gy' + i, user_id: 'u2', protagonist: null, content: 'Chisme viejo de ejemplo número ' + i, image_path: null, status: 'descartado', created_at: ago(300 + i) })
  candidates.push({ id: 'k3', user_id: 'u3', name: 'Cami', instagram: 'cami.ejemplo', photo_path: null, reason: null, status: 'descartada', created_at: ago(400) })
  const point_rules = [
    { action: 'chisme', points: 10, label: 'Cargar un chisme' },
    { action: 'candidata', points: 25, label: 'Postular una candidata' },
  ]
  return { profiles, news, comments, gossip, candidates, video_ideas, ad_requests, point_rules }
}

let db: Store
try {
  db = JSON.parse(localStorage.getItem(KEY) || 'null') || seed()
} catch {
  db = seed()
}
const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(db)) } catch { /* sin storage */ }
}

export function resetDemo() {
  try { localStorage.removeItem(KEY); localStorage.removeItem(KEY + '-session') } catch { /* nada */ }
  location.reload()
}

// ---------------------------------------------------------------------
// auth
// ---------------------------------------------------------------------
type Listener = (event: string, session: Row | null) => void
const listeners = new Set<Listener>()
let session: Row | null = null
try { session = JSON.parse(localStorage.getItem(KEY + '-session') || 'null') } catch { /* nada */ }

function setSession(uid: string | null) {
  session = uid ? { access_token: 'demo', user: { id: uid, email: 'demo@demo' } } : null
  try { localStorage.setItem(KEY + '-session', JSON.stringify(session)) } catch { /* nada */ }
  listeners.forEach((l) => l(uid ? 'SIGNED_IN' : 'SIGNED_OUT', session))
}
const uid = () => session?.user?.id as string | undefined
const isAdmin = () => Boolean(db.profiles.find((p) => p.id === uid())?.is_admin)

export function demoLogin(as: 'admin' | 'fan') {
  if (as === 'admin') return setSession(ADMIN_ID)
  let fan = db.profiles.find((p) => p.username === 'fan.demo')
  if (!fan) {
    fan = { id: 'demo-fan', username: 'fan.demo', instagram: null, is_admin: false, created_at: new Date().toISOString() }
    db.profiles.push(fan)
    save()
  }
  setSession(fan.id)
}

const auth = {
  getSession: async () => ({ data: { session }, error: null }),
  onAuthStateChange: (cb: Listener) => {
    listeners.add(cb)
    return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } }
  },
  signInWithPassword: async ({ email }: { email: string }) => {
    const name = email.split('@')[0].replace(/[^a-zA-Z0-9_.]/g, '').slice(0, 20) || 'fan'
    let p = db.profiles.find((x) => x.username === name)
    if (!p) {
      p = { id: 'u-' + crypto.randomUUID(), username: name.length >= 3 ? name : name + '_fan', instagram: null, is_admin: false, created_at: new Date().toISOString() }
      db.profiles.push(p)
      save()
    }
    setSession(p.id)
    return { data: { session }, error: null }
  },
  signUp: async ({ options }: { options: { data: { username: string; instagram: string } } }) => {
    const p = { id: 'u-' + crypto.randomUUID(), username: options.data.username, instagram: options.data.instagram || null, is_admin: false, created_at: new Date().toISOString() }
    db.profiles.push(p)
    save()
    setSession(p.id)
    return { data: { session }, error: null }
  },
  signOut: async () => { setSession(null); return { error: null } },
  resetPasswordForEmail: async () => ({ error: null }),
  updateUser: async () => ({ error: null }),
}

// ---------------------------------------------------------------------
// tablas
// ---------------------------------------------------------------------
const PRIVATE = ['gossip', 'candidates', 'video_ideas', 'ad_requests']

class Query implements PromiseLike<{ data: unknown; error: unknown; count?: number | null }> {
  private filters: ((r: Row) => boolean)[] = []
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private payload: Row | Row[] | null = null
  private cols = '*'
  private sort: { col: string; asc: boolean } | null = null
  private from = 0
  private to = Infinity
  private mode: 'many' | 'single' | 'maybe' = 'many'
  private head = false
  private returning = false
  private table: string
  constructor(table: string) { this.table = table }

  select(cols = '*', opts?: { head?: boolean }) {
    if (this.op === 'select') this.cols = cols
    else this.returning = true
    this.cols = cols
    this.head = Boolean(opts?.head)
    return this
  }
  insert(p: Row | Row[]) { this.op = 'insert'; this.payload = p; return this }
  update(p: Row) { this.op = 'update'; this.payload = p; return this }
  delete() { this.op = 'delete'; return this }
  eq(col: string, v: unknown) { this.filters.push((r) => r[col] === v); return this }
  ilike(col: string, v: string) {
    const target = v.replace(/\\_/g, '_').toLowerCase()
    this.filters.push((r) => String(r[col]).toLowerCase() === target)
    return this
  }
  order(col: string, o?: { ascending?: boolean }) { this.sort = { col, asc: o?.ascending ?? true }; return this }
  limit(n: number) { this.to = this.from + n - 1; return this }
  range(a: number, b: number) { this.from = a; this.to = b; return this }
  single() { this.mode = 'single'; return this }
  maybeSingle() { this.mode = 'maybe'; return this }

  private visible(rows: Row[]) {
    if (this.table === 'news') return rows.filter((r) => r.published || isAdmin())
    if (PRIVATE.includes(this.table)) return rows.filter((r) => r.user_id === uid() || isAdmin())
    return rows
  }
  private shape(r: Row) {
    const out = { ...r }
    if (this.cols.includes('profiles(')) out.profiles = { username: db.profiles.find((p) => p.id === r.user_id)?.username ?? '¿?' }
    return out
  }

  private run() {
    const table = (db[this.table] ??= [])
    let rows: Row[] = []
    if (this.op === 'insert') {
      if (!uid() && this.table !== 'news') return { data: null, error: { message: 'new row violates row-level security policy' } }
      const items = (Array.isArray(this.payload) ? this.payload : [this.payload!]).map((p) => ({
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...(this.table === 'news' ? {} : { user_id: uid() }),
        ...(this.table === 'gossip' ? { status: 'nuevo' } : {}),
        ...(this.table === 'candidates' ? { status: 'en_evaluacion' } : {}),
        ...(this.table === 'video_ideas' ? { status: 'nueva' } : {}),
        ...(this.table === 'ad_requests' ? { status: 'pendiente' } : {}),
        ...p,
      }))
      if (this.table === 'news' && items.some((i) => table.some((t) => t.slug === i.slug))) {
        return { data: null, error: { message: 'duplicate key value violates unique constraint "news_slug_key"' } }
      }
      table.unshift(...items)
      rows = items
      save()
    } else {
      rows = this.visible(table).filter((r) => this.filters.every((f) => f(r)))
      if (this.op === 'update') {
        rows.forEach((r) => Object.assign(r, this.payload))
        save()
      } else if (this.op === 'delete') {
        const ids = new Set(rows.map((r) => r.id))
        db[this.table] = table.filter((r) => !ids.has(r.id))
        save()
      }
    }
    if (this.op !== 'select' && !this.returning) return { data: null, error: null }
    if (this.head) return { data: null, error: null, count: rows.length }
    if (this.sort) {
      const { col, asc } = this.sort
      rows = [...rows].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (asc ? 1 : -1))
    }
    rows = rows.slice(this.from, this.to + 1).map((r) => this.shape(r))
    if (this.mode === 'single') return rows[0] ? { data: rows[0], error: null } : { data: null, error: { message: 'No rows' } }
    if (this.mode === 'maybe') return { data: rows[0] ?? null, error: null }
    return { data: rows, error: null }
  }

  then<A, B>(ok?: (v: { data: unknown; error: unknown; count?: number | null }) => A | PromiseLike<A>, bad?: (e: unknown) => B | PromiseLike<B>) {
    return new Promise<{ data: unknown; error: unknown; count?: number | null }>((res) => setTimeout(() => res(this.run()), 150)).then(ok, bad)
  }
}

// ---------------------------------------------------------------------
// rpc (ranking)
// ---------------------------------------------------------------------
function leaderboard(lim: number) {
  const pts = Object.fromEntries(db.point_rules.map((r) => [r.action, r.points]))
  return db.profiles
    .filter((p) => !p.is_admin)
    .map((p) => {
      const chismes = db.gossip.filter((g) => g.user_id === p.id).length
      const candidatas = db.candidates.filter((c) => c.user_id === p.id).length
      return { user_id: p.id, username: p.username, chismes, candidatas, points: chismes * pts.chisme + candidatas * pts.candidata }
    })
    .filter((r) => r.chismes + r.candidatas > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, lim)
}

function rpc(fn: string, args?: { lim?: number }) {
  const result = () => {
    if (fn === 'get_leaderboard') return leaderboard(args?.lim ?? 50)
    const board = leaderboard(100000)
    const i = board.findIndex((r) => r.user_id === uid())
    const me = board[i]
    return [{ points: me?.points ?? 0, rank_pos: i >= 0 ? i + 1 : null, chismes: me?.chismes ?? 0, candidatas: me?.candidatas ?? 0 }]
  }
  const p = new Promise<{ data: unknown; error: null }>((res) => setTimeout(() => res({ data: result(), error: null }), 150))
  return Object.assign(p, {
    single: () => p.then((r) => ({ ...r, data: (r.data as unknown[])[0] })),
  })
}

// ---------------------------------------------------------------------
// storage (las imágenes quedan como data URL en el navegador)
// ---------------------------------------------------------------------
const files = new Map<string, string>()
const toDataUrl = (f: Blob) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(f) })

const storage = {
  from: (_bucket: string) => ({
    upload: async (path: string, file: Blob) => {
      files.set(path, await toDataUrl(file))
      return { data: { path }, error: null }
    },
    getPublicUrl: (path: string) => ({ data: { publicUrl: files.get(path) ?? '' } }),
    createSignedUrl: async (path: string) => ({ data: { signedUrl: files.get(path) ?? svg('#e7defe', '🖼️') }, error: null }),
  }),
}

export function createDemoClient() {
  return { auth, from: (t: string) => new Query(t), rpc, storage }
}
