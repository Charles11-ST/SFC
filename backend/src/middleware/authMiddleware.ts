import { createClient } from '@supabase/supabase-js'
import type { RequestHandler } from 'express'
import { environment } from '../config/environment.js'

const supabaseAuth = environment.SUPABASE_URL && environment.SUPABASE_ANON_KEY
  ? createClient(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null

declare global {
  namespace Express {
    interface Request {
      authenticatedUserId?: string
    }
  }
}

export const requireAuthentication: RequestHandler = async (request, response, next) => {
  if (!supabaseAuth) {
    response.status(503).json({ error: 'Authentication service is not configured.' })
    return
  }
  const authorization = request.header('authorization')
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token) {
    response.status(401).json({ error: 'A bearer access token is required.' })
    return
  }
  const { data, error } = await supabaseAuth.auth.getUser(token)
  if (error || !data.user) {
    response.status(401).json({ error: 'The access token is invalid or expired.' })
    return
  }
  request.authenticatedUserId = data.user.id
  next()
}
