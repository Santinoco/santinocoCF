# SantinocoCF 🗞️

El portal de noticias que nadie pidió. React + Vite + TypeScript + Supabase. Pensado mobile first.

## Qué tiene (MVP)

| Sección | Ruta | Quién lo ve |
|---|---|---|
| Novedades (lista + detalle con galería) | `/novedades` | Todos. Las carga solo el admin |
| Cargá tu chisme | `/chisme` | Lo ve solo el admin (+10 pts) |
| Casting: se busca novia para Santino | `/casting` | Lo ve solo el admin (+25 pts) |
| Pedí tu publicidad gratis | `/publicidad` (+ sticker flotante) | Lo ve solo el admin |
| Ideas para videos | `/ideas` | Lo ve solo el admin |
| Muro de comentarios | `/muro` | Público |
| Ranking de fans | `/ranking` | Público |
| Registro / login con mail | `/entrar` | — |
| Perfil (mis puntos) | `/perfil` | El usuario |
| Panel admin | `/admin` | Solo admin |

Desde el panel admin, en **Chismes**, el botón **"Armar noticia"** abre el editor con el chisme precargado y, al publicar, lo marca como "publicado".

## Puesta en marcha

1. **Supabase**: creá un proyecto, andá a *SQL Editor*, pegá `supabase/schema.sql` y dale Run.
   Crea las tablas, la seguridad (RLS), los límites anti-spam, el ranking y los buckets de Storage.
2. **Variables**: `cp .env.example .env` y completá `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
   (*Project Settings → API*).
3. **Correr**:
   ```bash
   npm install
   npm run dev
   ```
4. **Auth en Supabase** (*Authentication → URL Configuration*): poné tu URL de producción en *Site URL*
   y agregá `http://localhost:5173/**` y `https://tu-dominio/**` en *Redirect URLs*
   (para el link de confirmación de mail y el de recuperar contraseña).
5. **Hacerte admin**: registrate en la página, confirmá el mail y corré en el SQL Editor:
   ```sql
   update public.profiles set is_admin = true where lower(username) = 'tu_usuario';
   ```

## Deploy (gratis)

Supabase es la base de datos y el storage, pero la web (los archivos estáticos) se hostea aparte:
**Vercel** o **Netlify** con subdominio gratis. Ya están `vercel.json` y `public/_redirects` para que las rutas funcionen.
Build: `npm run build` · Output: `dist` · Cargá las mismas variables `VITE_*` en el panel del hosting.

## Barrera anti-bots

- Para comentar, cargar o postular **hay que estar registrado** y **con el mail confirmado**
  (dejá activado *Confirm email* en *Authentication → Providers → Email*, viene así por defecto).
- **Rate limit en la base** (no se puede saltear desde el navegador): 5 comentarios cada 10 min,
  8 chismes, 5 candidatas, 5 ideas y 3 pedidos de publicidad por día. Se ajusta en `schema.sql` (`enforce_rate_limit`).
- **Captcha opcional (recomendado)**: creá un sitio en Cloudflare Turnstile (gratis),
  poné la *site key* en `VITE_TURNSTILE_SITE_KEY` y la *secret key* en Supabase → *Authentication → Attack Protection → Captcha*.
  El widget aparece solo en registro/login.

## Aviso por mail de los formularios

Cada chisme, candidata, pedido de publicidad o idea te llega por mail (además de quedar en `/admin`).
1. Entrá a https://web3forms.com, poné el mail donde querés recibirlos y te mandan una *Access Key*.
2. Cargala como `VITE_WEB3FORMS_KEY` en el panel del hosting (y en `.env` si probás local) y volvé a deployar.

Sin la clave, la página anda igual, solo que no manda mails. Las fotos no viajan en el mail: se ven en el panel.

## Puntos

Se calculan en vivo desde lo cargado, así que **si borrás spam, los puntos de ese usuario bajan solos**.
Para cambiar cuánto vale cada cosa:
```sql
update public.point_rules set points = 15 where action = 'chisme';
```

## Personalizar

- `src/config.ts`: nombre, Instagram, categorías de noticias, frases de la cinta "EN VIVO".
- **Tus fotos bizarras del Casting**: copialas a `public/santino/` y listalas en `SANTINO_PHOTOS`.
- Colores y estilos: variables al principio de `src/index.css`.

## Próximos pasos (fuera del MVP)

- Pop-ups de marcas (rotativos) a partir de los pedidos de publicidad aprobados.
- Santinómetro (medidor de compatibilidad) al postular candidata.
- Likes en el muro que sumen puntos.
