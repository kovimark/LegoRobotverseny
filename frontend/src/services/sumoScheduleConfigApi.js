const STORAGE_KEY = 'sumoScheduleConfigurationDraft'
export const SUMO_CONFIG_CHANGED_EVENT = 'sumoScheduleConfigChanged'

export const defaultSumoScheduleConfig = {
  minimumRounds: 4,
  expectedRoundMinutes: 12,
  plannedDurationMinutes: 180,
  timeSlots: [
    { id: 'slot-1', type: 'category', category: 0, startTime: '09:00', endTime: '10:00' },
    { id: 'slot-2', type: 'open', category: null, startTime: '10:00', endTime: '11:00' }
  ]
}

export const loadSumoScheduleConfig = async () => {
  // BACKEND TODO: cseréld le például erre: GET /api/Sumo/configuration
  const storedValue = window.localStorage.getItem(STORAGE_KEY)
  if (!storedValue) return defaultSumoScheduleConfig

  const storedConfiguration = JSON.parse(storedValue)
  return {
    ...defaultSumoScheduleConfig,
    ...storedConfiguration,
    timeSlots: (storedConfiguration.timeSlots || []).map((slot) => ({
      id: slot.id,
      type: slot.type === 'open' ? 'open' : 'category',
      category: slot.type === 'open' ? null : Number(slot.category ?? 0),
      startTime: slot.startTime || '',
      endTime: slot.endTime || ''
    }))
  }
}

export const saveSumoScheduleConfig = async (configuration) => {
  // BACKEND TODO: cseréld le például erre: PUT /api/Sumo/configuration, body: configuration
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(configuration))
  window.dispatchEvent(new CustomEvent(SUMO_CONFIG_CHANGED_EVENT, { detail: configuration }))
  return configuration
}
