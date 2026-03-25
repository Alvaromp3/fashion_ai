import { DEFAULT_ADVANCED_PROMPT } from './mirrorConstants'

const STORAGE_KEY = 'fashion-ai-mirror-context-v1'

export function getDefaultMirrorContext() {
  return {
    occasionId: 'business-casual',
    weather: '16°C',
    timeOfDay: 'afternoon',
    stylePref: 'minimal smart casual',
    userNotes: '',
    locationLabel: '',
    userPrompt: DEFAULT_ADVANCED_PROMPT,
    showAdvanced: false
  }
}

export function loadMirrorContext() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return getDefaultMirrorContext()
    const parsed = JSON.parse(raw)
    return { ...getDefaultMirrorContext(), ...parsed }
  } catch {
    return getDefaultMirrorContext()
  }
}

/** Merge partial into stored context and persist. */
export function saveMirrorContext(partial) {
  const next = { ...loadMirrorContext(), ...partial }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota */
  }
  return next
}
