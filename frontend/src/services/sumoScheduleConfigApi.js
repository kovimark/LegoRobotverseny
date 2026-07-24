const API_URL = 'https://legocompetition.runasp.net/api/Settings'
export const SUMO_CONFIG_CHANGED_EVENT = 'sumoScheduleConfigChanged'

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { accept: '*/*', ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
    ...options
  })
  if (!response.ok) {
    const errorText = await response.text()
    let readableError = errorText
    try {
      const errorData = JSON.parse(errorText)
      readableError = Object.values(errorData.errors || {}).flat().join(' ') || errorData.title || errorText
    } catch {
      // Nem JSON formátumú backendhiba esetén az eredeti választ használjuk.
    }
    throw new Error(readableError || `Szerverhiba (${response.status})`)
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
  const toNullableInteger = (value) => {
    if (value === '' || value === null || value === undefined) return null
    const number = Number(value)
    return Number.isFinite(number) ? Math.round(number) : null
  }
  const payload = {
    ageGroupBreakdown: Number(settings.ageGroupBreakdown) === 1 ? 1 : 0,
    competitionPhase: settings.competitionPhase || '',
    minSumoRoundTime: toNullableInteger(settings.minSumoRoundTime),
    maxSumoRoundTime: toNullableInteger(settings.maxSumoRoundTime),
    psGroupAdvance: toNullableInteger(settings.psGroupAdvance) ?? 0,
    hsGroupAdvance: toNullableInteger(settings.hsGroupAdvance) ?? 0,
    allGroupAdvance: toNullableInteger(settings.allGroupAdvance) ?? 0
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
const putCompetitionPhase = async (oldPhaseName, phase) =>
  request(`/modifyPhase/${encodeURIComponent(oldPhaseName)}`, {
    method: 'PUT',
    body: JSON.stringify(phasePayload(phase))
  })

export const modifyCompetitionPhase = async (oldPhaseName, phase) => {
  try {
    return await putCompetitionPhase(oldPhaseName, phase)
  } catch (error) {
    const unchangedName = oldPhaseName.trim().toLocaleLowerCase('hu-HU')
      === phase.phaseName.trim().toLocaleLowerCase('hu-HU')
    const duplicateNameError = /már létezik|already exists/i.test(error.message)
    if (!unchangedName || !duplicateNameError) throw error

    // A backend jelenleg a módosított rekord saját, változatlan nevét is
    // névütközésnek veszi. Egy rövid, egyedi átnevezéssel elkerüljük ezt,
    // majd ugyanabban a műveletben visszaállítjuk az eredeti nevet.
    const temporaryName = `__phase_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    await putCompetitionPhase(oldPhaseName, { ...phase, phaseName: temporaryName })
    try {
      return await putCompetitionPhase(temporaryName, phase)
    } catch (restoreError) {
      try {
        await putCompetitionPhase(temporaryName, { ...phase, phaseName: oldPhaseName })
      } catch {
        // Az eredeti helyreállítási hibát adjuk tovább.
      }
      throw restoreError
    }
  }
}
export const deleteCompetitionPhase = async (phaseId) => request(`/deletePhase/${encodeURIComponent(phaseId)}`, { method: 'DELETE' })
export const resetSettings = async () => request('/resetSettings', { method: 'DELETE' })
export const resetEveryScore = async () => request('/resetEveryScore', { method: 'DELETE' })

export const loadSumoScheduleConfig = async () => {
  const settings = await getAllSettings()
  return {
    minimumRounds: 4,
    ageGroupBreakdown: Number(settings?.ageGroupBreakdown) === 1 ? 1 : 0,
    competitionPhase: typeof settings?.competitionPhase === 'string' ? settings.competitionPhase : (settings?.competitionPhase?.phaseName || ''),
    minSumoRoundTime: settings?.minSumoRoundTime ?? null,
    maxSumoRoundTime: settings?.maxSumoRoundTime ?? null,
    psGroupAdvance: Number(settings?.psGroupAdvance) || 0,
    hsGroupAdvance: Number(settings?.hsGroupAdvance) || 0,
    allGroupAdvance: Number(settings?.allGroupAdvance) || 0
  }
}
