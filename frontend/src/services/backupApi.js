import {
  addCompetitionPhase,
  getAllCompetitionPhases,
  getAllSettings,
  modifyCompetitionPhase,
  modifySettings
} from './sumoScheduleConfigApi'

const API_URL = 'https://legocompetition.runasp.net/api'

const fetchJson = async (path) => {
  const response = await fetch(`${API_URL}${path}`, { headers: { accept: '*/*' } })
  if (!response.ok) throw new Error((await response.text()) || `A mentéshez szükséges adat nem tölthető le: ${path}`)
  return response.json()
}

const postJson = async (path, body, method = 'POST') => {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: { accept: '*/*', 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!response.ok) throw new Error((await response.text()) || `A visszaállítás sikertelen: ${path}`)
}

export const downloadBackupFile = (data, fileName) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const timestamp = () => new Date().toISOString().replace(/[:.]/g, '-')

export const exportSettingsBackup = async () => {
  const [settings, phases, teams] = await Promise.all([
    getAllSettings(),
    getAllCompetitionPhases(),
    fetchJson('/Teams')
  ])
  const selectedPhase = typeof settings?.competitionPhase === 'string'
    ? settings.competitionPhase
    : (settings?.competitionPhase?.phaseName || phases.find((phase) => Number(phase.id) === Number(settings?.competitionPhaseId))?.phaseName || '')
  const teamGroups = (Array.isArray(teams) ? teams : []).map((team) => ({
    teamId: team.id,
    teamName: team.teamName || team.team_name || '',
    group: team.group == null ? null : String(team.group).trim().toUpperCase()
  }))
  const backup = {
    format: 'robotverseny-settings-backup',
    version: 2,
    createdAt: new Date().toISOString(),
    settings: { ...settings, competitionPhase: selectedPhase },
    phases,
    teamGroups
  }
  downloadBackupFile(backup, `robotverseny-beallitasok-${timestamp()}.json`)
}

export const exportScoresBackup = async () => {
  const [points, lineFollowing, hillClimbing, basketball, sumoMatches, tieBreakers] = await Promise.all([
    fetchJson('/Points'),
    fetchJson('/LineFollowing'),
    fetchJson('/HillClimbing'),
    fetchJson('/Basketball'),
    fetchJson('/Sumo/matches'),
    fetchJson('/TieBreaker')
  ])
  const backup = {
    format: 'robotverseny-scores-backup',
    version: 1,
    createdAt: new Date().toISOString(),
    points,
    lineFollowing,
    hillClimbing,
    basketball,
    sumoMatches,
    tieBreakers
  }
  downloadBackupFile(backup, `robotverseny-pontok-${timestamp()}.json`)
}

export const readBackupFile = async (file) => {
  let data
  try { data = JSON.parse(await file.text()) } catch { throw new Error('A kiválasztott fájl nem érvényes JSON-mentés.') }
  if (!data?.format || !Number(data.version)) throw new Error('A fájl nem felismerhető Robotverseny-mentés.')
  return data
}

export const restoreSettingsBackup = async (backup) => {
  if (backup.format !== 'robotverseny-settings-backup' || !backup.settings || !Array.isArray(backup.phases)) {
    throw new Error('Ez nem beállításmentési fájl.')
  }

  // Az aktív versenyszakaszt csak azután szabad beállítani, hogy maga a
  // szakasz már létezik a backendben. Ellenkező esetben a modifySettings
  // "A verseny szakasz nem található" hibával elutasítja a visszaállítást.
  const existing = await getAllCompetitionPhases()
  const existingByName = new Map(existing.map((phase) => [String(phase.phaseName || phase.name || '').toLocaleLowerCase('hu-HU'), phase]))
  for (const phase of backup.phases) {
    const phaseName = String(phase.phaseName || phase.name || '').trim()
    if (!phaseName) continue
    const payload = {
      phaseName,
      phaseStartTime: phase.phaseStartTime ?? phase.startTime ?? null,
      phaseEndTime: phase.phaseEndTime ?? phase.endTime ?? null
    }
    const current = existingByName.get(phaseName.toLocaleLowerCase('hu-HU'))
    if (current) await modifyCompetitionPhase(phaseName, payload)
    else {
      await addCompetitionPhase(payload)
      existingByName.set(phaseName.toLocaleLowerCase('hu-HU'), payload)
    }
  }

  const selectedPhase = typeof backup.settings.competitionPhase === 'string'
    ? backup.settings.competitionPhase.trim()
    : String(backup.settings.competitionPhase?.phaseName || '').trim()

  // Régebbi mentésben előfordulhat, hogy az aktív szakasz nincs benne a
  // menetrendi elemek listájában. Ilyenkor létrehozzuk időpont nélkül.
  if (selectedPhase && !existingByName.has(selectedPhase.toLocaleLowerCase('hu-HU'))) {
    await addCompetitionPhase({
      phaseName: selectedPhase,
      phaseStartTime: null,
      phaseEndTime: null
    })
  }

  await modifySettings({ ...backup.settings, competitionPhase: selectedPhase })

  const savedGroups = Array.isArray(backup.teamGroups) ? backup.teamGroups : []
  if (savedGroups.length > 0) {
    const currentTeams = await fetchJson('/Teams')
    const teams = Array.isArray(currentTeams) ? currentTeams : []
    const teamsById = new Map(teams.map((team) => [Number(team.id), team]))
    const teamsByName = new Map(teams.map((team) => [
      String(team.teamName || team.team_name || '').trim().toLocaleLowerCase('hu-HU'),
      team
    ]))

    for (const saved of savedGroups) {
      const group = String(saved.group || '').trim().toUpperCase()
      if (!/^[A-Z]$/.test(group)) continue
      const team = teamsById.get(Number(saved.teamId))
        || teamsByName.get(String(saved.teamName || '').trim().toLocaleLowerCase('hu-HU'))
      if (!team) continue

      await postJson(`/Teams/${encodeURIComponent(team.id)}`, {
        teamName: team.teamName || '',
        teamMember1Name: team.teamMember1Name || '',
        teamMember1Class: Number(team.teamMember1Class) || 0,
        teamMember1Email: team.teamMember1Email || '',
        teamMember2Name: team.teamMember2Name || '',
        teamMember2Class: Number(team.teamMember2Class) || 0,
        teamMember2Email: team.teamMember2Email || '',
        teamCoach1: team.teamCoach1 || '',
        teamCoach1Email: team.teamCoach1Email || '',
        schoolName: team.schoolName || '',
        category: Number(team.category) === 1 ? 1 : 0,
        group
      }, 'PUT')
    }
    window.dispatchEvent(new Event('teamGroupsChanged'))
  }
}

const normalizeStage = (value) => Number(value ?? 1) || 1
const sumoStageValue = (value) => ({ GS: 1, RO16: 2, QF: 3, SF: 4, BM: 5, F: 6 }[value] || Number(value) || 1)

export const restoreScoresBackup = async (backup) => {
  if (backup.format !== 'robotverseny-scores-backup') throw new Error('Ez nem pont- és eredménymentési fájl.')
  const lineFollowing = Array.isArray(backup.lineFollowing) ? backup.lineFollowing : []
  const hillClimbing = Array.isArray(backup.hillClimbing) ? backup.hillClimbing : []
  const basketball = Array.isArray(backup.basketball) ? backup.basketball : []
  const sumoMatches = Array.isArray(backup.sumoMatches) ? backup.sumoMatches : []
  const [currentLine, currentBasketball, currentSumo] = await Promise.all([
    fetchJson('/LineFollowing').catch(() => []),
    fetchJson('/Basketball').catch(() => []),
    fetchJson('/Sumo/matches').catch(() => [])
  ])
  const lineKeys = new Set((Array.isArray(currentLine) ? currentLine : []).map((item) => `${item.team_name || item.teamName}|${Number(item.time)}|${normalizeStage(item.stage ?? item.tournamentStage)}`))
  const basketballKeys = new Set((Array.isArray(currentBasketball) ? currentBasketball : []).map(
    (item) => `${item.team_name || item.teamName}|${Number(item.throwNumber ?? item.throw_number ?? 1)}`
  ))
  const sumoKeys = new Set((Array.isArray(currentSumo) ? currentSumo : []).map((item) => `${sumoStageValue(item.tournamentStage ?? item.tournament_stage)}|${Number(item.table || 1)}|${item.team1Name || item.team1_name}|${item.team2Name || item.team2_name}`))

  for (const result of lineFollowing) {
    const key = `${result.team_name || result.teamName}|${Number(result.time)}|${normalizeStage(result.stage ?? result.tournamentStage)}`
    if (lineKeys.has(key)) continue
    await postJson('/LineFollowing', {
      teamName: result.team_name || result.teamName,
      time: Number(result.time),
      tournamentStage: normalizeStage(result.stage ?? result.tournamentStage)
    })
  }
  for (const result of hillClimbing) {
    const teamName = result.team_name || result.teamName
    await postJson(`/HillClimbing/${encodeURIComponent(teamName)}/${Number(result.completed_level || 0)}/${Number(result.time_spent_on_level || 0)}`, null, 'PATCH')
    await postJson(`/HillClimbing/${encodeURIComponent(teamName)}/${Number(result.eliminated || 0)}`, null, 'PATCH')
  }
  for (const result of basketball) {
    const basketballKey = `${result.team_name || result.teamName}|${Number(result.throwNumber ?? result.throw_number ?? 1)}`
    if (basketballKeys.has(basketballKey)) continue
    await postJson('/Basketball', {
      teamName: result.team_name || result.teamName,
      hoop1: Number(result.hoop1 || 0),
      hoop2: Number(result.hoop2 || 0),
      hoop3: Number(result.hoop3 || 0),
      hoop4: Number(result.hoop4 || 0),
      hoop5: Number(result.hoop5 || 0),
      time: Number(result.time || 0),
      throwNumber: Number(result.throwNumber ?? result.throw_number ?? 1)
    }, 'PUT')
  }
  for (const match of sumoMatches) {
    const key = `${sumoStageValue(match.tournamentStage ?? match.tournament_stage)}|${Number(match.table || 1)}|${match.team1Name || match.team1_name}|${match.team2Name || match.team2_name}`
    if (sumoKeys.has(key)) continue
    await postJson('/Sumo', {
      team1Name: match.team1Name || match.team1_name,
      team2Name: match.team2Name || match.team2_name,
      team1Point: Number(match.team1Point ?? match.team1_point ?? 0),
      team2Point: Number(match.team2Point ?? match.team2_point ?? 0),
      table: Number(match.table || 1),
      tournamentStage: sumoStageValue(match.tournamentStage ?? match.tournament_stage ?? 1),
      team1Result: match.team1Result ?? match.team1result ?? '',
      team2Result: match.team2Result ?? match.team2result ?? ''
    })
  }
}
