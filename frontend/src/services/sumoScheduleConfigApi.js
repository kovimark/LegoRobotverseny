const API_URL = 'https://legocompetition.runasp.net/api/Settings'
export const SUMO_CONFIG_CHANGED_EVENT = 'sumoScheduleConfigChanged'

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { accept: '*/*', ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
    ...options
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `Szerverhiba (${response.status})`)
  }
  if (response.status === 204) return null
  const contentType = response.headers.get('content-type') || ''
  return contentType.includes('application/json') ? response.json() : response.text()
}

export const getAllSettings = async () => {
  const data = await request('/getAllSettings')
  return Array.isArray(data) ? (data[0] || null) : data
}

export const getAllCompetitionPhases = async () => {
  const data = await request('/getAllCompetitionPhase')
  return Array.isArray(data) ? data : []
}

export const modifySettings = async (settings) => {
  const payload = {
    ageGroupBreakdown: Number(settings.ageGroupBreakdown) === 1 ? 1 : 0,
    competitionPhase: settings.competitionPhase || '',
    minSumoRoundTime: settings.minSumoRoundTime === '' || settings.minSumoRoundTime === null ? null : Number(settings.minSumoRoundTime),
    maxSumoRoundTime: settings.maxSumoRoundTime === '' || settings.maxSumoRoundTime === null ? null : Number(settings.maxSumoRoundTime)
  }
  const result = await request('/modifySettings', { method: 'PUT', body: JSON.stringify(payload) })
  window.dispatchEvent(new CustomEvent(SUMO_CONFIG_CHANGED_EVENT, { detail: payload }))
  return result
}

const phasePayload = (phase) => ({
  phaseName: phase.phaseName.trim(),
  phaseStartTime: phase.phaseStartTime || null,
  phaseEndTime: phase.phaseEndTime || null
})

export const addCompetitionPhase = async (phase) => request('/addCompetitionPhase', { method: 'POST', body: JSON.stringify(phasePayload(phase)) })
export const modifyCompetitionPhase = async (oldPhaseName, phase) => request(`/modifyPhase/${encodeURIComponent(oldPhaseName)}`, { method: 'PUT', body: JSON.stringify(phasePayload(phase)) })
export const resetSettings = async () => request('/resetSettings', { method: 'DELETE' })
export const resetEveryScore = async () => request('/resetEveryScore', { method: 'DELETE' })

export const loadSumoScheduleConfig = async () => {
  const settings = await getAllSettings()
  return {
    minimumRounds: 4,
    minSumoRoundTime: settings?.minSumoRoundTime ?? null,
    maxSumoRoundTime: settings?.maxSumoRoundTime ?? null
  }
}
