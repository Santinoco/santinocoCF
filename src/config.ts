// Configuración general del sitio. Tocá esto sin miedo.

export const SITE = {
  name: 'SantinocoCF',
  tagline: 'El portal de noticias que nadie pidió',
  instagramHandle: '@santinococf',
  instagramUrl: 'https://instagram.com/santinococf',
}

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
