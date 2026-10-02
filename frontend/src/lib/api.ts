const apiBaseUrl = process.env.BACKEND_API_URL?.replace(/\/$/, '')

export type ApiHealth = {
  status: 'ok'
  service: string
  environment: string
  timestamp: string
}

export async function getApiHealth(): Promise<ApiHealth | null> {
  if (!apiBaseUrl) return null
  try {
    const response = await fetch(`${apiBaseUrl}/api/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3500),
    })
    if (!response.ok) return null
    const result = await response.json() as Partial<ApiHealth>
    if (result.status !== 'ok' || result.service !== 'smart-farmer-connect-api') return null
    return result as ApiHealth
  } catch {
    return null
  }
}
