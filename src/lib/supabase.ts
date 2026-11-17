import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createDemoClient } from './demo'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

/** VITE_DEMO=1 → datos de ejemplo en el navegador, sin Supabase. */
export const isDemo = import.meta.env.VITE_DEMO === '1'
export const isConfigured = isDemo || Boolean(url && key)

export const supabase: SupabaseClient = isDemo
  ? (createDemoClient() as unknown as SupabaseClient)
  : createClient(url || 'http://localhost:54321', key || 'missing-anon-key')
