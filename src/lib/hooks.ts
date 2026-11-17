import { useEffect, useState } from 'react'
import { isConfigured, supabase } from './supabase'

let rulesCache: Record<string, number> | null = null

/** Puntos por acción, desde la tabla point_rules. */
export function usePoints() {
  const [rules, setRules] = useState<Record<string, number>>(rulesCache ?? { chisme: 10, candidata: 25 })
  useEffect(() => {
    if (rulesCache || !isConfigured) return
    supabase.from('point_rules').select('action, points').then(({ data }) => {
      if (!data) return
      const next: Record<string, number> = Object.fromEntries(data.map((r) => [r.action, r.points]))
      rulesCache = next
      setRules(next)
    })
  }, [])
  return rules
}
