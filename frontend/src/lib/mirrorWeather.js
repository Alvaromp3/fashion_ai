/**
 * Live weather + local time for Mirror context using Open-Meteo (no API key).
 * Optional place name via BigDataCloud reverse-geocode (browser client API, no key).
 * @see https://open-meteo.com/en/docs
 */
import { WEATHER_CODES } from './mirrorConstants'

/**
 * @param {string} [isoTime] - e.g. from Open-Meteo current.time
 * @returns {string|null} e.g. "afternoon, 14:30"
 */
export function timeOfDayFromOpenMeteoTime(isoTime) {
  if (!isoTime || typeof isoTime !== 'string') return null
  const timePart = isoTime.split('T')[1] || ''
  const [hRaw, minRaw] = timePart.split(':')
  const h = parseInt(hRaw, 10)
  const min = parseInt(minRaw, 10) || 0
  if (Number.isNaN(h)) return null
  const hour = Math.max(0, Math.min(23, h))
  const minute = Math.max(0, Math.min(59, Number.isNaN(min) ? 0 : min))
  const period = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  const timeLabel = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  return `${period}, ${timeLabel}`
}

/**
 * @returns {Promise<string|null>} Human-readable place, or null
 */
export async function reverseGeocodeLabel(latitude, longitude) {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&localityLanguage=en`
    const res = await fetch(url)
    if (!res.ok) return null
    const d = await res.json()
    const city = d.city || d.locality || d.principalSubdivision
    const country = d.countryName
    if (city && country) return `${city}, ${country}`
    if (city) return String(city)
    return null
  } catch {
    return null
  }
}

/**
 * @returns {Promise<{ weather: string, timeOfDay: string, locationLabel: string }>}
 */
export async function buildMirrorWeatherPartialFromCoords(latitude, longitude) {
  const lat = Number(latitude)
  const lon = Number(longitude)
  const coordsLabel = `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`

  const [place] = await Promise.all([reverseGeocodeLabel(lat, lon)])
  const locationLabel = place || coordsLabel

  let weather = '—'
  let timeOfDay = 'afternoon'

  try {
    // Open-Meteo rejects unknown `current` variables; `time` is still returned on `current` without listing it.
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current: 'temperature_2m,weather_code',
      timezone: 'auto'
    })
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
    if (!res.ok) throw new Error('Open-Meteo HTTP error')
    const data = await res.json()
    const current = data?.current ?? {}
    const temp = current.temperature_2m
    const code = current.weather_code ?? 0
    const weatherText = WEATHER_CODES[code] || 'clear'
    weather = temp != null ? `${Math.round(Number(temp))}°C, ${weatherText}` : weatherText
    const t = timeOfDayFromOpenMeteoTime(current.time)
    if (t) timeOfDay = t
  } catch {
    weather = '— (weather unavailable)'
    const now = new Date()
    const h = now.getHours()
    const m = now.getMinutes()
    const period = h < 6 ? 'night' : h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'
    timeOfDay = `${period}, ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  return { weather, timeOfDay, locationLabel }
}

export const GEO_OPTIONS_DEFAULT = {
  enableHighAccuracy: false,
  timeout: 15000,
  maximumAge: 300000
}
