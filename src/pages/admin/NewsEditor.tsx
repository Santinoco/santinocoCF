import { useRef, useState, type FormEvent } from 'react'
import { ErrorBox, Field } from '../../components/ui'
import { NEWS_CATEGORIES } from '../../config'
import { supabase } from '../../lib/supabase'
import type { News } from '../../lib/types'
import { friendlyError, slugify, uploadNewsImage } from '../../lib/utils'

export default function NewsEditor({ initial, onClose }: { initial: Partial<News>; onClose: () => void }) {
  const isEdit = Boolean(initial.id)
  const [title, setTitle] = useState(initial.title ?? '')
  const [slug, setSlug] = useState(initial.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(isEdit)
  const [category, setCategory] = useState(initial.category ?? NEWS_CATEGORIES[0])
  const [summary, setSummary] = useState(initial.summary ?? '')
  const [body, setBody] = useState(initial.body ?? '')
  const [cover, setCover] = useState<string | null>(initial.cover_url ?? null)
  const [images, setImages] = useState<string[]>(initial.images ?? [])
  const [published, setPublished] = useState(initial.published ?? true)
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const coverRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const finalSlug = slugTouched ? slug : slugify(title)

  async function upload(files: FileList | null, target: 'cover' | 'gallery') {
    if (!files?.length) return
    setUploading(true)
    setError('')
    try {
      const urls = await Promise.all(Array.from(files).map(uploadNewsImage))
      if (target === 'cover') setCover(urls[0])
      else setImages((prev) => [...prev, ...urls])
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setUploading(false)
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (finalSlug.length < 3) return setError('El link (slug) es muy corto.')
    setBusy(true)
    setError('')
    const row = {
      title: title.trim(),
      slug: finalSlug,
      category,
      summary: summary.trim() || null,
      body: body.trim(),
      cover_url: cover,
      images,
      published,
      source_gossip_id: initial.source_gossip_id ?? null,
    }
    const { error } = isEdit
      ? await supabase.from('news').update(row).eq('id', initial.id!)
      : await supabase.from('news').insert(row)
    if (error) {
      setBusy(false)
      return setError(friendlyError(error))
    }
    if (!isEdit && initial.source_gossip_id && published) {
      await supabase.from('gossip').update({ status: 'publicado' }).eq('id', initial.source_gossip_id)
    }
    setBusy(false)
    onClose()
  }

  return (
    <form className="card stack form" onSubmit={save}>
      <div className="row-between">
        <h2>{isEdit ? 'Editar noticia' : 'Nueva noticia'}</h2>
        <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>Cancelar</button>
      </div>
      {initial.source_gossip_id && !isEdit && (
        <div className="info-box">🤫 Armando noticia a partir de un chisme. Al publicarla se marca como "publicado".</div>
      )}

      <Field label="Titular" hint="En mayúsculas queda más amarillista, pero vos decidís">
        <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={160} placeholder="Facu Martínez se cayó y se lastimó el dedo" />
      </Field>
      <Field label="Link de la noticia (slug)" hint={`/novedades/${finalSlug || '...'}`}>
        <input value={finalSlug} onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)) }} required />
      </Field>
      <Field label="Categoría">
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {[...new Set([...NEWS_CATEGORIES, category])].map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Bajada" hint="Una o dos líneas que aparecen en la tarjeta">
        <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} maxLength={300} />
      </Field>
      <Field label="Cuerpo de la noticia" hint="Separá los párrafos con una línea en blanco">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} />
      </Field>

      <Field label="Foto de portada">
        <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files, 'cover')} />
        {cover ? (
          <div className="picker-preview">
            <img src={cover} alt="" />
            <button type="button" className="btn btn-sm" onClick={() => setCover(null)}>Sacar</button>
          </div>
        ) : (
          <button type="button" className="picker-empty" onClick={() => coverRef.current?.click()} disabled={uploading}>
            <span className="big-emoji">🖼️</span>Subir portada
          </button>
        )}
      </Field>

      <Field label="Galería" hint="Podés subir varias juntas">
        <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files, 'gallery')} />
        <div className="gallery gallery-edit">
          {images.map((src) => (
            <div key={src} className="gallery-item">
              <img src={src} alt="" />
              <button type="button" className="gallery-remove" onClick={() => setImages(images.filter((i) => i !== src))} aria-label="Sacar">✕</button>
            </div>
          ))}
          <button type="button" className="gallery-add" onClick={() => galleryRef.current?.click()} disabled={uploading}>
            {uploading ? '…' : '+'}
          </button>
        </div>
      </Field>

      <label className="check">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
        Publicada (si la destildás queda como borrador)
      </label>

      <ErrorBox>{error}</ErrorBox>
      <button className="btn btn-pink btn-block btn-lg" disabled={busy || uploading}>
        {busy ? 'Guardando…' : isEdit ? 'Guardar cambios' : published ? 'Publicar noticia' : 'Guardar borrador'}
      </button>
    </form>
  )
}
