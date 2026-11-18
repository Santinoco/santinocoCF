import { isDemo, supabase } from './supabase'

/** confirm() del navegador; en la demo se saltea porque el visor no muestra diálogos. */
export const confirmAction = (msg: string) => isDemo || window.confirm(msg)

export function friendlyError(e: unknown): string {
  const msg = String((e as { message?: string })?.message ?? e)
  if (msg.includes('RATE_LIMIT')) return 'Pará la mano, campeón. Llegaste al límite, probá más tarde.'
  if (msg.includes('Invalid login credentials')) return 'Mail o contraseña incorrectos.'
  if (msg.includes('Email not confirmed')) return 'Todavía no confirmaste tu mail. Revisá tu casilla (y el spam).'
  if (msg.includes('User already registered')) return 'Ese mail ya está registrado. Probá entrando.'
  if (msg.includes('Database error saving new user')) return 'Ese nombre de usuario ya está tomado.'
  if (msg.includes('duplicate key') && msg.includes('slug')) return 'Ya hay una noticia con ese link (slug).'
  if (msg.includes('duplicate key')) return 'Eso ya existe.'
  if (msg.toLowerCase().includes('captcha')) return 'Falló la verificación anti-bots. Probá de nuevo.'
  if (msg.includes('Password should be')) return 'La contraseña tiene que tener al menos 6 caracteres.'
  if (msg.includes('Failed to fetch')) return 'No hay conexión con el servidor. Probá de nuevo.'
  return 'Algo se rompió: ' + msg
}

const rtf = new Intl.RelativeTimeFormat('es-AR', { numeric: 'auto' })
export function timeAgo(iso: string): string {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000], ['month', 2592000], ['week', 604800],
    ['day', 86400], ['hour', 3600], ['minute', 60],
  ]
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit)
  }
  return 'recién'
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function slugify(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function cleanHandle(s: string): string | null {
  const h = s.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/.*$/, '')
  return h ? h.slice(0, 40) : null
}

// ---------- imágenes ----------
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/** Achica fotos grandes del celu antes de subirlas (máx 1600px, JPEG). */
export async function prepareImage(file: File): Promise<File> {
  if (!IMAGE_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
    throw new Error('Solo se pueden subir imágenes (JPG, PNG, WEBP o GIF).')
  }
  if (file.type === 'image/gif') {
    if (file.size > 5 * 1024 * 1024) throw new Error('El GIF pesa más de 5 MB.')
    return file
  }
  const bitmap = await createImageBitmap(file)
  const max = 1600
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85))
  if (!blob) throw new Error('No pude procesar la imagen.')
  return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
}

/** Sube a bucket privado `uploads/<uid>/<folder>/...` y devuelve el path. */
export async function uploadPrivate(userId: string, folder: string, file: File): Promise<string> {
  const img = await prepareImage(file)
  const ext = img.type === 'image/gif' ? 'gif' : 'jpg'
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('uploads').upload(path, img, { contentType: img.type })
  if (error) throw error
  return path
}

/** Sube al bucket público `news` (solo admin) y devuelve la URL pública. */
export async function uploadNewsImage(file: File): Promise<string> {
  const img = await prepareImage(file)
  const ext = img.type === 'image/gif' ? 'gif' : 'jpg'
  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('news').upload(path, img, { contentType: img.type })
  if (error) throw error
  return supabase.storage.from('news').getPublicUrl(path).data.publicUrl
}

export async function signedUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('uploads').createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}

// Normaliza un link de post/reel: saca parámetros (?igsh=...) y deja la barra final
export function normalizeInstagramUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim())
    if (!/(^|\.)instagram\.com$/.test(u.hostname)) return null
    const m = u.pathname.match(/^\/(?:[\w.]+\/)?(p|reel|tv)\/([\w-]+)/)
    if (!m) return null
    return `https://www.instagram.com/${m[1]}/${m[2]}/`
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------
// Aviso por mail al admin cada vez que alguien manda un formulario.
// Usa Web3Forms (gratis): la clave VITE_WEB3FORMS_KEY está atada al mail
// que la creó, así que el mail nunca queda escrito en el código.
// Nunca rompe el envío: si falla, el formulario igual quedó guardado.
// ---------------------------------------------------------------------
const WEB3FORMS_KEY = import.meta.env.VITE_WEB3FORMS_KEY

export function notifyAdmin(subject: string, fields: Record<string, string | null | undefined>) {
  if (isDemo || !WEB3FORMS_KEY) return
  const data: Record<string, string> = {}
  for (const [k, v] of Object.entries(fields)) if (v) data[k] = v
  fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      access_key: WEB3FORMS_KEY,
      subject: `SantinocoCF · ${subject}`,
      from_name: 'SantinocoCF',
      ...data,
      'Ver en el panel': `${location.origin}/admin`,
    }),
  }).catch(() => { /* el aviso es opcional */ })
}
