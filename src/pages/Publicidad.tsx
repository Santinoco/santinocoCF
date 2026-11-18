import { useState, type FormEvent } from 'react'
import { ErrorBox, Field, ImagePicker, LoginGate, Success } from '../components/ui'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { cleanHandle, friendlyError, notifyAdmin, uploadPrivate } from '../lib/utils'

export default function Publicidad() {
  const { session, profile } = useAuth()
  const [business, setBusiness] = useState('')
  const [instagram, setInstagram] = useState('')
  const [contact, setContact] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const image_path = file ? await uploadPrivate(session!.user.id, 'publicidad', file) : null
      const { error } = await supabase.from('ad_requests').insert({
        business_name: business.trim(),
        instagram: cleanHandle(instagram),
        contact: contact.trim() || null,
        description: description.trim(),
        image_path,
      })
      if (error) throw error
      const ig = cleanHandle(instagram)
      notifyAdmin('Nuevo pedido de publicidad 📣', {
        'Enviado por': profile?.username,
        Marca: business.trim(),
        Instagram: ig ? `https://instagram.com/${ig}` : null,
        Contacto: contact.trim(),
        'Qué quiere que diga': description.trim(),
        Imagen: image_path ? 'Sí (mirala en el panel)' : null,
      })
      setDone(true)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setBusiness(''); setInstagram(''); setContact(''); setDescription(''); setFile(null); setDone(false)
  }

  return (
    <div className="stack-lg narrow">
      <div className="ad-hero">
        <span className="ad-hero-badge spin-slow" aria-hidden="true">100%<br />GRATIS</span>
        <span className="sticker bg-blue">Para emprendedores</span>
        <h1>Pedí tu publicidad <span className="hl hl-blue">gratis</span></h1>
        <p className="lead">Contame de tu marca o emprendimiento, mandame una imagen y la publico en la página. Gratis de verdad.</p>
        <ul className="ad-steps">
          <li><b>1</b> Completás el formulario</li>
          <li><b>2</b> Lo reviso</li>
          <li><b>3</b> Tu publicidad aparece en la página</li>
        </ul>
      </div>

      <LoginGate what="pedir tu publicidad">
        {done ? (
          <Success emoji="📣" title="Pedido recibido" onAgain={reset}>
            Lo reviso y te aviso. Andá preparando el discurso de agradecimiento.
          </Success>
        ) : (
          <form className="card stack form" onSubmit={submit}>
            <Field label="Nombre de tu marca o emprendimiento">
              <input value={business} onChange={(e) => setBusiness(e.target.value)} required minLength={2} maxLength={80} placeholder="Ej: Empanadas Doña Rosa" />
            </Field>
            <Field label="Instagram de la marca" hint="Opcional">
              <div className="input-prefix">
                <span>@</span>
                <input value={instagram} onChange={(e) => setInstagram(e.target.value)} maxLength={80} placeholder="tumarca" autoCapitalize="none" />
              </div>
            </Field>
            <Field label="¿Cómo te contacto?" hint="WhatsApp, mail, lo que prefieras (opcional)">
              <input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={120} placeholder="11 2345-6789" />
            </Field>
            <Field label="¿Qué querés que diga la publicidad?" hint={`${description.length}/1000`}>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} minLength={5} maxLength={1000} required placeholder="Qué vendés, alguna promo, por qué es lo mejor del barrio…" />
            </Field>
            <Field label="Imagen para la publicidad" hint="Opcional. Tu logo o un flyer.">
              <ImagePicker file={file} onChange={setFile} label="Subir logo o flyer" />
            </Field>
            <ErrorBox>{error}</ErrorBox>
            <button className="btn btn-blue btn-block btn-lg" disabled={busy}>{busy ? 'Enviando…' : 'Quiero mi publicidad gratis'}</button>
          </form>
        )}
      </LoginGate>
    </div>
  )
}
