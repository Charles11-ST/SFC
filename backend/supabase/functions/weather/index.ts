import { corsHeaders } from '../_shared/cors.ts'

type LocationInput = {
  province?: string
  district?: string
  townArea?: string
  latitude?: number | null
  longitude?: number | null
}

const weatherDescriptions: Record<number, string> = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Depositing rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle',
  56: 'Freezing drizzle', 57: 'Dense freezing drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  66: 'Freezing rain', 67: 'Heavy freezing rain', 71: 'Light snowfall', 73: 'Snowfall', 75: 'Heavy snowfall',
  77: 'Snow grains', 80: 'Rain showers', 81: 'Rain showers', 82: 'Heavy rain showers',
  85: 'Snow showers', 86: 'Heavy snow showers', 95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders })
  try {
    const body = await request.json()
    const location = body.location as LocationInput | undefined
    if (!location?.province || !location.district || !location.townArea) {
      return Response.json({ error: 'A saved Zimbabwe location is required.' }, { status: 400, headers: corsHeaders })
    }

    let latitude = location.latitude
    let longitude = location.longitude
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      const geocodeUrl = new URL('https://geocoding-api.open-meteo.com/v1/search')
      geocodeUrl.search = new URLSearchParams({ name: location.townArea, count: '10', language: 'en', format: 'json', countryCode: 'ZW' }).toString()
      const geoResponse = await fetch(geocodeUrl, { signal: AbortSignal.timeout(8000) })
      if (!geoResponse.ok) throw new Error('Location lookup is temporarily unavailable.')
      const geoData = await geoResponse.json()
      const matches = (geoData.results ?? []).filter((item: { country_code?: string }) => item.country_code === 'ZW')
      const normalize = (value: string) => value.toLocaleLowerCase().replace(/[^a-z0-9]/g, '')
      const town = normalize(location.townArea)
      const province = normalize(location.province)
      const district = normalize(location.district)
      const place = matches.find((item: { name?: string; admin1?: string; admin2?: string }) => {
        const name = normalize(item.name ?? '')
        const admin1 = normalize(item.admin1 ?? '')
        const admin2 = normalize(item.admin2 ?? '')
        const provinceMatches = admin1.length > 0 && (admin1.includes(province) || province.includes(admin1))
        const districtMatches = admin2.length === 0 || admin2.includes(district) || district.includes(admin2)
        return name === town && provinceMatches && districtMatches
      })
      if (!place) {
        return Response.json({ error: 'The weather provider could not locate this area. Check the town or use optional device location.' }, { status: 404, headers: corsHeaders })
      }
      latitude = place.latitude
      longitude = place.longitude
    }
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || latitude < -23 || latitude > -15 || longitude < 24 || longitude > 34) {
      return Response.json({ error: 'Weather coordinates must be within Zimbabwe. Your manual location can still be used.' }, { status: 400, headers: corsHeaders })
    }

    const params = new URLSearchParams({
      latitude: String(latitude), longitude: String(longitude),
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m',
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum',
      forecast_days: '5', timezone: 'auto',
    })
    const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: AbortSignal.timeout(8000) })
    if (!weatherResponse.ok) throw new Error('Weather provider request failed.')
    const data = await weatherResponse.json()
    const current = data.current
    if (!current || !data.daily) throw new Error('Weather provider returned an incomplete response.')

    return Response.json({
      current: {
        temperature: current.temperature_2m,
        apparentTemperature: current.apparent_temperature,
        relativeHumidity: current.relative_humidity_2m,
        precipitation: current.precipitation,
        windSpeed: current.wind_speed_10m,
        description: weatherDescriptions[current.weather_code] ?? 'Conditions reported by provider',
      },
      daily: data.daily.time.map((date: string, index: number) => ({
        date,
        maximumTemperature: data.daily.temperature_2m_max[index],
        minimumTemperature: data.daily.temperature_2m_min[index],
        precipitationProbability: data.daily.precipitation_probability_max[index],
        rainfall: data.daily.precipitation_sum[index],
      })),
      source: 'Open-Meteo',
      sourceUrl: 'https://open-meteo.com/',
      fetchedAt: new Date().toISOString(),
      warningStatus: 'not-provided',
    }, { headers: { ...corsHeaders, 'Cache-Control': 'public, max-age=900' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Weather is temporarily unavailable.'
    return Response.json({ error: message }, { status: 502, headers: corsHeaders })
  }
})