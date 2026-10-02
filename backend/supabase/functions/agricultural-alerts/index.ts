import { corsHeaders } from '../_shared/cors.ts'

Deno.serve((request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders })
  return Response.json({ state: 'not_configured', alerts: [], message: 'No verified agricultural health alert source is configured.' }, { status: 503, headers: corsHeaders })
})