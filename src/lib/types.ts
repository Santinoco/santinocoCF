export interface Profile {
  id: string
  username: string
  instagram: string | null
  is_admin: boolean
}

export interface News {
  id: string
  slug: string
  title: string
  summary: string | null
  body: string
  category: string
  cover_url: string | null
  images: string[]
  published: boolean
  source_gossip_id: string | null
  created_at: string
}

interface Submission {
  id: string
  user_id: string
  created_at: string
  profiles?: { username: string } | null
}

export interface Gossip extends Submission {
  protagonist: string | null
  content: string
  image_path: string | null
  status: 'nuevo' | 'leido' | 'publicado' | 'descartado'
}

export interface Candidate extends Submission {
  name: string
  instagram: string | null
  photo_path: string | null
  reason: string | null
  status: 'en_evaluacion' | 'segunda_ronda' | 'descartada'
}

export interface VideoIdea extends Submission {
  content: string
  status: 'nueva' | 'me_gusta' | 'hecha' | 'descartada'
}

export interface AdRequest extends Submission {
  business_name: string
  instagram: string | null
  contact: string | null
  description: string
  image_path: string | null
  status: 'pendiente' | 'aprobada' | 'rechazada'
}

export interface Comment extends Submission {
  content: string
}

export interface LeaderRow {
  user_id: string
  username: string
  points: number
  chismes: number
  candidatas: number
}

export interface PointRule {
  action: 'chisme' | 'candidata'
  points: number
  label: string
}

export interface InstagramPost {
  id: string
  url: string
  created_at: string
}
