import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { environment } from '../config/environment.js'

let client: SupabaseClient | null = null

export function getDatabase(): SupabaseClient {
  if (client) return client
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = environment
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured on the backend.')
  }
  client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return client
}
