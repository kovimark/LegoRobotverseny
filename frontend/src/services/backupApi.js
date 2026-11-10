import {
  addCompetitionPhase,
  getAllCompetitionPhases,
  getAllSettings,
  modifyCompetitionPhase,
  modifySettings
} from './sumoScheduleConfigApi'
import { authFetch } from './apiClient'
import { getPrivilegeLabel, isJudgePrivilege, isHelperPrivilege } from '../config/privilegeConfig'

const API_URL = 'https://brickathlon.runasp.net/api'

export const AUTO_BACKUP_CONFIG_CHANGED_EVENT = 'robotverseny_auto_backup_changed'
export const AUTO_BACKUP_TRIGGERED_EVENT = 'robotverseny_auto_backup_triggered'

const SCORES_CONFIG_KEY = 'robotverseny_auto_backup_scores_config'
const SETTINGS_CONFIG_KEY = 'robotverseny_auto_backup_settings_config'
const TEAMS_CONFIG_KEY = 'robotverseny_auto_backup_teams_config'
const STAFF_CONFIG_KEY = 'robotverseny_auto_backup_staff_config'

const KIND_KEY_MAP = {
  scores: SCORES_CONFIG_KEY,
  settings: SETTINGS_CONFIG_KEY,
  teams: TEAMS_CONFIG_KEY,
  staff: STAFF_CONFIG_KEY
}

const DEFAULT_INTERVALS = {
  scores: 10,
  settings: 30,
  teams: 30,
  staff: 60
}

export const getAutoBackupConfig = (kind = 'scores') => {
  const key = KIND_KEY_MAP[kind] || SCORES_CONFIG_KEY
  const defaultInterval = DEFAULT_INTERVALS[kind] || 30
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return { enabled: false, intervalMinutes: defaultInterval, lastRun: null }
    const parsed = JSON.parse(raw)
    return {
      enabled: Boolean(parsed.enabled),
      intervalMinutes: Math.max(1, Number(parsed.intervalMinutes) || defaultInterval),
      lastRun: parsed.lastRun || null
    }
  } catch {
    return { enabled: false, intervalMinutes: defaultInterval, lastRun: null }
  }
}

export const saveAutoBackupConfig = (kind, config) => {
  const key = KIND_KEY_MAP[kind] || SCORES_CONFIG_KEY
  const current = getAutoBackupConfig(kind)
  const defaultInterval = DEFAULT_INTERVALS[kind] || 30
  const updated = {
    ...current,
    ...config,
    intervalMinutes: Math.max(1, Number(config.intervalMinutes ?? current.intervalMinutes) || defaultInterval)
  }
  window.localStorage.setItem(key, JSON.stringify(updated))
  window.dispatchEvent(new CustomEvent(AUTO_BACKUP_CONFIG_CHANGED_EVENT, { detail: { kind, config: updated } }))
  return updated
}

export const recordBackupRun = (kind) => {
  const key = KIND_KEY_MAP[kind] || SCORES_CONFIG_KEY
  const current = getAutoBackupConfig(kind)
  const updated = { ...current, lastRun: new Date().toISOString() }
  window.localStorage.setItem(key, JSON.stringify(updated))
  window.dispatchEvent(new CustomEvent(AUTO_BACKUP_CONFIG_CHANGED_EVENT, { detail: { kind, config: updated } }))
  window.dispatchEvent(new CustomEvent(AUTO_BACKUP_TRIGGERED_EVENT, { detail: { kind, timestamp: updated.lastRun } }))
}

const fetchJson = async (path) => {
  const response = await authFetch(`${API_URL}${path}`, { headers: { accept: '*/*' } })
  if (!response.ok) throw new Error((await response.text()) || `A mentéshez szükséges adat nem tölthető le: ${path}`)
  return response.json()
}

const postJson = async (path, body, method = 'POST') => {
  const response = await authFetch(`${API_URL}${path}`, {
    method,
    headers: { accept: '*/*', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
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

export const exportSettingsBackup = async (options = {}) => {
  const isAuto = Boolean(options.isAuto)
  const [settings, phases, teams, messageTypes, messages] = await Promise.all([
    getAllSettings().catch(() => ({})),
    getAllCompetitionPhases().catch(() => []),
    fetchJson('/Teams').catch(() => []),
    fetchJson('/Message/allType').catch(() => []),
    fetchJson('/Message/getAllMessage').catch(() => [])
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
    version: 3,
    createdAt: new Date().toISOString(),
    isAuto,
    settings: { ...settings, competitionPhase: selectedPhase },
    phases,
    teamGroups,
    messageTypes: Array.isArray(messageTypes) ? messageTypes : [],
    messages: Array.isArray(messages) ? messages : []
  }
  const prefix = isAuto ? 'robotverseny-beallitasok-auto' : 'robotverseny-beallitasok'
  downloadBackupFile(backup, `${prefix}-${timestamp()}.json`)
  recordBackupRun('settings')
  return backup
}

export const exportScoresBackup = async (options = {}) => {
  const isAuto = Boolean(options.isAuto)
  const [points, lineFollowing, hillClimbing, basketball, sumoMatches, tieBreakers, teams, statistics] = await Promise.all([
    fetchJson('/Points').catch(() => []),
    fetchJson('/LineFollowing/allattempts').catch(() => []),
    fetchJson('/HillClimbing/allattempts').catch(() => []),
    fetchJson('/Basketball/allattempts').catch(() => []),
    fetchJson('/Sumo/matches').catch(() => []),
    fetchJson('/TieBreaker').catch(() => []),
    fetchJson('/Teams').catch(() => []),
    fetchJson('/Statistics/getAllStats').catch(() => ({}))
  ])
  const backup = {
    format: 'robotverseny-scores-backup',
    version: 2,
    createdAt: new Date().toISOString(),
    isAuto,
    points: Array.isArray(points) ? points : [],
    lineFollowing: Array.isArray(lineFollowing) ? lineFollowing : [],
    hillClimbing: Array.isArray(hillClimbing) ? hillClimbing : [],
    basketball: Array.isArray(basketball) ? basketball : [],
    sumoMatches: Array.isArray(sumoMatches) ? sumoMatches : [],
    tieBreakers: Array.isArray(tieBreakers) ? tieBreakers : [],
    teams: Array.isArray(teams) ? teams : [],
    statistics: statistics || {}
  }
  const prefix = isAuto ? 'robotverseny-pontok-auto' : 'robotverseny-pontok'
  downloadBackupFile(backup, `${prefix}-${timestamp()}.json`)
  recordBackupRun('scores')
  return backup
}

export const exportTeamsBackup = async (options = {}) => {
  const isAuto = Boolean(options.isAuto)
  const [teams, privileges] = await Promise.all([
    fetchJson('/Teams').catch(() => []),
    fetchJson('/Privilege').catch(() => [])
  ])

  const safeTeams = Array.isArray(teams) ? teams : []
  const safePrivileges = Array.isArray(privileges) ? privileges : []

  const privByEmail = new Map()
  for (const priv of safePrivileges) {
    if (priv.emailAddress) {
      privByEmail.set(String(priv.emailAddress).trim().toLowerCase(), priv)
    }
  }

  const allMembers = []
  const formattedTeams = safeTeams.map((team) => {
    const rawGroup = team.group
    const validGroup = (rawGroup && rawGroup !== '0' && rawGroup !== 0 && rawGroup !== '-' && String(rawGroup).toLowerCase() !== 'none')
      ? String(rawGroup).trim().toUpperCase()
      : null

    const teamId = team.id
    const teamName = team.teamName || team.team_name || ''
    const schoolName = team.schoolName || ''
    const categoryCode = Number(team.category) === 1 ? 1 : 0
    const categoryLabel = categoryCode === 1 ? 'Középiskola' : 'Általános iskola'

    const members = []

    const addMember = (name, email, className, isCompetitor, isCoach, defaultRole) => {
      if (!name && !email) return
      const normalizedEmail = email ? String(email).trim().toLowerCase() : ''
      const priv = normalizedEmail ? privByEmail.get(normalizedEmail) : null
      const roleCode = priv ? Number(priv.privilege1) : (isCompetitor ? 0 : 0)
      const roleLabel = priv ? getPrivilegeLabel(priv.privilege1) : defaultRole

      const memberObj = {
        name: name || '',
        email: email || '',
        class: className !== null && className !== undefined && className !== '' ? (Number(className) || String(className)) : null,
        isCompetitor: Boolean(isCompetitor),
        isCoach: Boolean(isCoach),
        role: roleLabel,
        privilegeCode: roleCode,
        group: validGroup,
        teamId,
        teamName,
        schoolName,
        category: categoryLabel
      }
      members.push(memberObj)
      allMembers.push(memberObj)
    }

    addMember(team.teamMember1Name, team.teamMember1Email, team.teamMember1Class, true, false, 'Versenyző')
    addMember(team.teamMember2Name, team.teamMember2Email, team.teamMember2Class, true, false, 'Versenyző')
    addMember(team.teamCoach1, team.teamCoach1Email, null, false, true, 'Felkészítő tanár')

    if (Array.isArray(team.members)) {
      team.members.forEach((m) => {
        const alreadyAdded = members.some((existing) => (
          (existing.email && m.email && existing.email.toLowerCase() === m.email.toLowerCase()) ||
          (existing.name && m.name && existing.name.toLowerCase() === m.name.toLowerCase())
        ))
        if (!alreadyAdded && (m.name || m.email)) {
          addMember(m.name, m.email, m.className, !m.isCoach, Boolean(m.isCoach), m.isCoach ? 'Felkészítő tanár' : 'Versenyző')
        }
      })
    }

    return {
      id: teamId,
      teamName,
      schoolName,
      category: categoryLabel,
      categoryCode,
      group: validGroup,
      isDisqualified: Boolean(team.isDisqualified),
      members
    }
  })

  const backup = {
    format: 'robotverseny-teams-backup',
    version: 1,
    createdAt: new Date().toISOString(),
    isAuto,
    totalTeams: formattedTeams.length,
    totalMembers: allMembers.length,
    teams: formattedTeams,
    allMembers,
    rawTeams: safeTeams
  }

  const prefix = isAuto ? 'robotverseny-csapatok-auto' : 'robotverseny-csapatok'
  downloadBackupFile(backup, `${prefix}-${timestamp()}.json`)
  recordBackupRun('teams')
  return backup
}

export const exportStaffBackup = async (options = {}) => {
  const isAuto = Boolean(options.isAuto)
  const [privileges, applications, teams] = await Promise.all([
    fetchJson('/Privilege').catch(() => []),
    fetchJson('/Application').catch(() => []),
    fetchJson('/Teams').catch(() => [])
  ])

  const safePrivileges = Array.isArray(privileges) ? privileges : []
  const safeApplications = Array.isArray(applications) ? applications : []
  const safeTeams = Array.isArray(teams) ? teams : []

  const teamsById = new Map(safeTeams.map((t) => [Number(t.id), t.teamName || '']))

  const appByEmail = new Map()
  for (const app of safeApplications) {
    const email = (app.email || app.emailAddress || '').trim().toLowerCase()
    if (email) appByEmail.set(email, app)
  }

  const allStaff = []
  const judges = []
  const helpers = []
  const admins = []

  for (const priv of safePrivileges) {
    const roleCode = Number(priv.privilege1)
    const label = getPrivilegeLabel(roleCode)
    const isJudge = isJudgePrivilege(roleCode)
    const isHelper = isHelperPrivilege(roleCode)
    const isAdmin = roleCode === 1

    const email = (priv.emailAddress || '').trim().toLowerCase()
    const app = appByEmail.get(email) || null
    const assignedTeamName = priv.teamId ? (teamsById.get(Number(priv.teamId)) || `Csapat #${priv.teamId}`) : null

    const entry = {
      id: priv.id,
      name: priv.name || (app?.name || ''),
      email: priv.emailAddress || '',
      class: priv.class !== null && priv.class !== undefined ? Number(priv.class) : null,
      privilegeCode: roleCode,
      privilegeLabel: label,
      category: isJudge ? 'Versenybíró' : isHelper ? 'Segítő' : isAdmin ? 'Adminisztrátor' : 'Egyéb',
      assignedTeamId: priv.teamId || null,
      assignedTeamName,
      applicationDetails: app ? {
        id: app.id,
        competitionType: app.competitionType || app.role || null,
        isAccepted: Boolean(app.isAccepted),
        notes: app.notes || null,
        submittedAt: app.submittedAt || null
      } : null
    }

    if (isJudge) judges.push(entry)
    else if (isHelper) helpers.push(entry)
    else if (isAdmin) admins.push(entry)

    if (roleCode !== 0) {
      allStaff.push(entry)
    }
  }

  for (const app of safeApplications) {
    const email = (app.email || app.emailAddress || '').trim().toLowerCase()
    const alreadyIncluded = allStaff.some((s) => s.email.toLowerCase() === email)
    if (!alreadyIncluded && email) {
      const isJudgeApp = (app.competitionType || app.role || '').toLowerCase().includes('bíró') || (app.role || '').toLowerCase().includes('judge')
      const entry = {
        id: null,
        name: app.name || '',
        email: app.email || app.emailAddress || '',
        class: app.class ? Number(app.class) : null,
        privilegeCode: null,
        privilegeLabel: app.competitionType || app.role || 'Jelentkező',
        category: isJudgeApp ? 'Versenybíró (jelentkező)' : 'Segítő (jelentkező)',
        assignedTeamId: null,
        assignedTeamName: null,
        applicationDetails: {
          id: app.id,
          competitionType: app.competitionType || app.role || null,
          isAccepted: Boolean(app.isAccepted),
          notes: app.notes || null,
          submittedAt: app.submittedAt || null
        }
      }
      allStaff.push(entry)
      if (isJudgeApp) judges.push(entry)
      else helpers.push(entry)
    }
  }

  const backup = {
    format: 'robotverseny-staff-backup',
    version: 1,
    createdAt: new Date().toISOString(),
    isAuto,
    summary: {
      totalStaff: allStaff.length,
      totalJudges: judges.length,
      totalHelpers: helpers.length,
      totalAdmins: admins.length,
      totalApplications: safeApplications.length
    },
    staff: allStaff,
    judges,
    helpers,
    admins,
    rawPrivileges: safePrivileges,
    rawApplications: safeApplications
  }

  const prefix = isAuto ? 'robotverseny-stab-auto' : 'robotverseny-stab'
  downloadBackupFile(backup, `${prefix}-${timestamp()}.json`)
  recordBackupRun('staff')
  return backup
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
    fetchJson('/LineFollowing/allattempts').catch(() => []),
    fetchJson('/Basketball/allattempts').catch(() => []),
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
    await postJson(`/HillClimbing/${encodeURIComponent(teamName)}/update`, {
      completedLevel: Number(result.completed_level || 0),
      timeSpentOnLevel: Number(result.time_spent_on_level || 0),
      eliminated: Number(result.eliminated || 0)
    }, 'PATCH')
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

export const restoreTeamsBackup = async (backup) => {
  if (backup.format !== 'robotverseny-teams-backup') {
    throw new Error('Ez nem csapatmentési fájl.')
  }

  const teamsToRestore = Array.isArray(backup.rawTeams) && backup.rawTeams.length > 0
    ? backup.rawTeams
    : Array.isArray(backup.teams) ? backup.teams : []

  if (teamsToRestore.length === 0) {
    throw new Error('A mentési fájl nem tartalmaz csapatadatokat.')
  }

  const currentTeams = await fetchJson('/Teams')
  const safeCurrent = Array.isArray(currentTeams) ? currentTeams : []
  const teamsById = new Map(safeCurrent.map((t) => [Number(t.id), t]))
  const teamsByName = new Map(safeCurrent.map((t) => [
    String(t.teamName || t.team_name || '').trim().toLocaleLowerCase('hu-HU'),
    t
  ]))

  for (const team of teamsToRestore) {
    const teamName = String(team.teamName || team.team_name || '').trim()
    if (!teamName) continue

    const existingTeam = (team.id && teamsById.get(Number(team.id))) ||
      teamsByName.get(teamName.toLocaleLowerCase('hu-HU'))

    const payload = {
      teamName,
      teamMember1Name: team.teamMember1Name || team.members?.[0]?.name || '',
      teamMember1Class: Number(team.teamMember1Class ?? team.members?.[0]?.class) || 0,
      teamMember1Email: team.teamMember1Email || team.members?.[0]?.email || '',
      teamMember2Name: team.teamMember2Name || team.members?.[1]?.name || '',
      teamMember2Class: Number(team.teamMember2Class ?? team.members?.[1]?.class) || 0,
      teamMember2Email: team.teamMember2Email || team.members?.[1]?.email || '',
      teamCoach1: team.teamCoach1 || team.members?.find((m) => m.isCoach)?.name || '',
      teamCoach1Email: team.teamCoach1Email || team.members?.find((m) => m.isCoach)?.email || '',
      schoolName: team.schoolName || '',
      category: Number(team.categoryCode ?? (team.category === 'Középiskola' ? 1 : team.category)) === 1 ? 1 : 0,
      group: team.group ? String(team.group).trim().toUpperCase() : null
    }

    if (existingTeam) {
      await postJson(`/Teams/${encodeURIComponent(existingTeam.id)}`, payload, 'PUT')
    } else {
      await postJson('/Teams/registerteam', payload, 'POST')
    }
  }

  window.dispatchEvent(new Event('teamsChanged'))
  window.dispatchEvent(new Event('teamGroupsChanged'))
}

export const restoreStaffBackup = async (backup) => {
  if (backup.format !== 'robotverseny-staff-backup') {
    throw new Error('Ez nem bírói és segítői stábmentési fájl.')
  }

  const privilegesToRestore = Array.isArray(backup.rawPrivileges) && backup.rawPrivileges.length > 0
    ? backup.rawPrivileges
    : Array.isArray(backup.staff) ? backup.staff : []

  if (privilegesToRestore.length === 0) {
    throw new Error('A mentési fájl nem tartalmaz jogosultságadatokat.')
  }

  const currentPrivileges = await fetchJson('/Privilege')
  const safeCurrent = Array.isArray(currentPrivileges) ? currentPrivileges : []
  const privsByEmail = new Map(safeCurrent.map((p) => [
    String(p.emailAddress || '').trim().toLowerCase(),
    p
  ]))

  for (const item of privilegesToRestore) {
    const email = String(item.emailAddress || item.email || '').trim().toLowerCase()
    if (!email) continue

    const role = Number(item.privilege1 ?? item.privilegeCode ?? item.privilege)
    if (isNaN(role)) continue

    const existing = privsByEmail.get(email)
    const payload = {
      id: existing ? Number(existing.id) : 0,
      emailAddress: email,
      privilege1: role,
      name: item.name || existing?.name || null,
      class: item.class !== null && item.class !== undefined ? Number(item.class) : (existing?.class ?? null),
      isCoach: item.isCoach !== null && item.isCoach !== undefined ? Number(item.isCoach) : (existing?.isCoach ?? null),
      teamId: item.teamId ?? item.assignedTeamId ?? existing?.teamId ?? null
    }

    await postJson('/Privilege', payload, existing ? 'PUT' : 'POST')
  }

  window.dispatchEvent(new Event('privilegesChanged'))
}
