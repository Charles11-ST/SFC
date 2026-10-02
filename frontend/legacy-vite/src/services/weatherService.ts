import type { SupabaseClient } from '@supabase/supabase-js'

export type WeatherLocation = {
  province: string
  district: string
  townArea: string
  latitude: number | null
  longitude: number | null
}

export type WeatherReport = {
  current: {
    temperature: number
    apparentTemperature: number
    relativeHumidity: number
    precipitation: number
    windSpeed: number
    description: string
  }
  daily: Array<{
    date: string
    maximumTemperature: number
    minimumTemperature: number
    precipitationProbability: number | null
    rainfall: number
  }>
  source: string
  sourceUrl: string
  fetchedAt: string
  warningStatus: 'not-provided'
}

export async function getWeather(client: SupabaseClient, location: WeatherLocation): Promise<WeatherReport> {
  const { data, error } = await client.functions.invoke('weather', { body: { location } })
  if (error) {
    if (error.context instanceof Response) {
      const responseBody = await error.context.clone().json().catch(() => null) as { error?: string } | null
      if (responseBody?.error) throw new Error(responseBody.error)
    }
    throw new Error('Live weather is not connected. Deploy the weather function and try again.')
  }
  if (!data?.current || !Array.isArray(data.daily)) throw new Error('The weather provider returned no current conditions for this area.')
  return data as WeatherReport
}