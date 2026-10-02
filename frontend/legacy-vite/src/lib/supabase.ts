import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let client: SupabaseClient<any> | null | undefined

export function getSupabase(): SupabaseClient<any> | null {
  if (client !== undefined) return client
  client = url && anonKey ? createClient(url, anonKey) as SupabaseClient<any> : null
  return client
}