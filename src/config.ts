// Configuración general del sitio. Tocá esto sin miedo.

export const SITE = {
  name: 'SantinocoCF',
  tagline: 'El portal de noticias que nadie pidió',
  instagramHandle: '@santinococf',
  instagramUrl: 'https://instagram.com/santinococf',
}

// Sponsor oficial (aparece en el inicio y en el pie de página)
export const SPONSOR = {
  name: 'YoureBrand',
  logo: '/sponsors/yourebrand.png',
  tagline: 'Agencia integral de Marketing Digital',
  description: 'Producción de contenido, Community Management, Ads Management y más.',
  stats: [
    { value: '+400', label: 'pymes' },
    { value: '20 mil', label: 'seguidores' },
  ],
  instagramHandle: '@yourebrand.es',
  instagramUrl: 'https://www.instagram.com/yourebrand.es/',
  webUrl: 'https://yourebrand.com.ar',
  webLabel: 'yourebrand.com.ar',
}

// Popup del sponsor (una vez por visita). Poné enabled: false para apagarlo.
export const SPONSOR_POPUP = {
  enabled: true,
  delayMs: 4000,
  title: '¿Tu marca necesita crecer en redes?',
  text: 'YoureBrand te hace el contenido, te maneja las redes y los anuncios. Ya lo hicieron con más de 400 pymes.',
}

// Cuántas publicaciones de Instagram mostrar en el inicio
export const INSTAGRAM_FEED_LIMIT = 6

// Fotos del Casting (están en /public/santino/)
export const CASTING = {
  hero: '/santino/espartano.jpg',
  polaroids: [
    { src: '/santino/gimnasio.jpg', caption: 'Modo gimnasio', pos: 'top' },
    { src: '/santino/selfie.jpg', caption: 'Modo simpático', pos: 'center 20%' },
  ],
  // La "ficha del soltero". Editá libremente.
  facts: [
    { label: 'Estado', value: 'Soltero' },
    { label: 'Experiencia', value: 'Espartano' },
    { label: 'Vive en', value: 'El gimnasio' },
    { label: 'Busca', value: 'Alguien que lo banque' },
  ],
}

export const NEWS_CATEGORIES = [
  'Último momento',
  'Accidentes',
  'Romance',
  'Deportes',
  'Escándalo',
  'Gastronomía',
  'Misterio',
]

// Frases que aparecen en la cinta de noticias cuando todavía no hay novedades
export const TICKER_FALLBACK = [
  'ÚLTIMO MOMENTO: todavía no pasó nada, pero va a pasar',
  'Se buscan chismes con urgencia',
  'Santino sigue soltero (por ahora)',
  'Fuentes confiables confirman que esta página existe',
]
