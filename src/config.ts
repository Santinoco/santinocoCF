// Configuración general del sitio. Tocá esto sin miedo.

export const SITE = {
  name: 'SantinocoCF',
  tagline: 'El portal de noticias que nadie pidió',
  instagramHandle: '@santinococf',
  instagramUrl: 'https://instagram.com/santinococf',
}

// Tus fotos bizarras para el fondo del Casting.
// Ponelas en /public/santino/ y listalas acá, ej: '/santino/foto1.jpg'
export const SANTINO_PHOTOS: string[] = []

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
