/** Shared Mirror / Mirror context page */

export const DEFAULT_ADVANCED_PROMPT = `Detected garments (YOLO):
- Navy blazer (0.94), grey trousers (0.91), white sneakers (0.96)
Pose: upright, balanced. Profile: minimal smart casual.
Context: business casual meeting, 16°C, afternoon.
Evaluate outfit and detect new items.`

export const WEATHER_CODES = {
  0: 'clear',
  1: 'mainly clear',
  2: 'partly cloudy',
  3: 'overcast',
  45: 'foggy',
  48: 'frost',
  51: 'drizzle',
  53: 'drizzle',
  55: 'dense drizzle',
  61: 'light rain',
  63: 'rain',
  65: 'heavy rain',
  71: 'light snow',
  73: 'snow',
  75: 'heavy snow',
  80: 'showers',
  81: 'showers',
  82: 'heavy showers',
  95: 'thunderstorm',
  96: 'thunderstorm with hail',
  99: 'severe thunderstorm'
}

export const OCCASION_OPTIONS = [
  { id: 'business-casual', label: 'Business casual' },
  { id: 'streetwear', label: 'Streetwear' },
  { id: 'casual', label: 'Casual' },
  { id: 'gym', label: 'Gym / Sport' },
  { id: 'smart-casual', label: 'Smart casual' },
  { id: 'formal', label: 'Formal' },
  { id: 'date-night', label: 'Date night' },
  { id: 'beach', label: 'Beach / Vacation' },
  { id: 'work-from-home', label: 'Work from home' }
]
