import { authFetch } from './apiClient'

const API_BASE = 'https://brickathlon.runasp.net/api/Weight'

export const getAllWeights = async () => {
  const response = await authFetch(`${API_BASE}/getallweight`, {
    headers: { accept: '*/*' }
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || 'Nem sikerült betölteni a mérlegelési adatokat.')
  }
  const data = await response.json()
  return (Array.isArray(data) ? data : []).map((item) => ({
    id: item.id,
    teamName: item.teamName || item.team_name || '',
    competitionType: item.competitionType || item.competitionName || '',
    weight: Number(item.weight ?? item.weight1 ?? 0)
  }))
}

export const getWeightsByTeam = async (teamName) => {
  const response = await authFetch(`${API_BASE}/getweightbyteam/${encodeURIComponent(teamName)}`, {
    headers: { accept: '*/*' }
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `Nem sikerült betölteni a(z) ${teamName} súlyadatait.`)
  }
  const data = await response.json()
  return (Array.isArray(data) ? data : []).map((item) => ({
    id: item.id,
    teamName: item.teamName || item.team_name || '',
    competitionType: item.competitionType || item.competitionName || '',
    weight: Number(item.weight ?? item.weight1 ?? 0)
  }))
}

export const postWeight = async ({ teamName, competitionName, weight }) => {
  const payload = {
    teamName: teamName.trim(),
    competitionName: competitionName.trim(),
    weight: Math.round(Number(weight))
  }
  const response = await authFetch(`${API_BASE}/postweight`, {
    method: 'POST',
    headers: {
      accept: '*/*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || 'A súly rögzítése sikertelen volt.')
  }
  const text = await response.text()
  return text
}

export const deleteWeight = async (id) => {
  const response = await authFetch(`${API_BASE}/deleteweight/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { accept: '*/*' }
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || 'A súly törlése sikertelen volt.')
  }
  const text = await response.text()
  return text
}
