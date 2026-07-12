import React, { useEffect, useMemo, useState } from 'react'
import { getCompetitionConfig } from '../config/adminScoringConfig'

const competitionConfig = getCompetitionConfig('szumo')
const GROUP_STAGE = 'GS'
const KNOCKOUT_WIN_POINTS = 6
const KNOCKOUT_STAGES = ['RO16', 'QF', 'SF', 'BM', 'F']
const KNOCKOUT_STAGE_PRIORITY = [
  { minTeams: 16, stage: 'RO16' },
  { minTeams: 8, stage: 'QF' },
  { minTeams: 4, stage: 'SF' },
  { minTeams: 2, stage: 'F' }
]

const STAGE_GROUPS = [
  { id: 'group', label: 'Csoportkör', stages: ['GS'] },
  { id: 'knockout', label: 'Kieséses szakasz', stages: ['RO16', 'QF', 'SF', 'BM', 'F'] }
]

const ALL_STAGE_VALUE = 'ALL'

const STAGE_LABELS = {
  [ALL_STAGE_VALUE]: 'összes',
  GS: 'csoportkör',
  RO16: 'legjobb 16',
  QF: 'negyeddöntő',
  SF: 'elődöntő',
  BM: 'bronzmeccs',
  F: 'döntő'
}

const RESULT_POINTS = {
  W: 2,
  D: 1,
  L: 0
}

const parseResultHistory = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean)
  }

  if (typeof value !== 'string') {
    return []
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

const getTeamName = (team, index) => team.teamName || team.team_name || `Csapat ${index + 1}`

const normalizeTeam = (team, index) => ({
  id: team.id ?? `${getTeamName(team, index)}-${index}`,
  name: getTeamName(team, index)
})

const normalizeMatchesResponse = (data) => {
  if (Array.isArray(data)) {
    return data
  }

  if (data && typeof data === 'object') {
    return [data]
  }

  return []
}

const hasResultHistory = (match) => {
  const team1History = parseResultHistory(match.team1Result ?? match.team1result)
  const team2History = parseResultHistory(match.team2Result ?? match.team2result)
  return team1History.length > 0 || team2History.length > 0
}

const dedupeMatches = (matches) => {
  const byKey = new Map()

  matches.forEach((match) => {
    const key = `${getMatchStage(match)}::${Number(match.table ?? 0)}::${buildPairKey(match.team1Name, match.team2Name)}`
    const existing = byKey.get(key)

    if (!existing) {
      byKey.set(key, match)
      return
    }

    const existingHasResults = hasResultHistory(existing)
    const incomingHasResults = hasResultHistory(match)

    if (incomingHasResults && !existingHasResults) {
      byKey.set(key, match)
      return
    }

    if (incomingHasResults === existingHasResults) {
      const existingPoints = Number(existing.team1Point ?? existing.team1_point ?? 0) + Number(existing.team2Point ?? existing.team2_point ?? 0)
      const incomingPoints = Number(match.team1Point ?? match.team1_point ?? 0) + Number(match.team2Point ?? match.team2_point ?? 0)

      if (incomingPoints >= existingPoints) {
        byKey.set(key, match)
      }
    }
  })

  return Array.from(byKey.values())
}

const normalizeMatch = (match, index) => {
  const team1Name = match.team1Name || match.team1_name || ''
  const team2Name = match.team2Name || match.team2_name || ''
  const tournamentStage = match.tournamentStage || match.tournament_stage || 'GS'
  const table = Number(match.table ?? 0)

  return {
    id: `${tournamentStage}::${table}::${team1Name}::${team2Name}::${index}`,
    team1Name,
    team2Name,
    team1Results: parseResultHistory(match.team1Result ?? match.team1result),
    team2Results: parseResultHistory(match.team2Result ?? match.team2result),
    team1Point: Number(match.team1Point ?? match.team1_point ?? 0),
    team2Point: Number(match.team2Point ?? match.team2_point ?? 0),
    table,
    tournamentStage
  }
}

const getMatchStage = (match) => match.tournamentStage || match.tournament_stage || GROUP_STAGE

const isKnockoutStage = (stage) => KNOCKOUT_STAGES.includes(stage)

const getNextKnockoutStage = (stage) => {
  if (stage === 'RO16') return 'QF'
  if (stage === 'QF') return 'SF'
  if (stage === 'SF') return 'F'
  return null
}

const getResultPoints = (result) => RESULT_POINTS[result] ?? 0

const calculateTotalPoints = (history) => history.reduce((sum, result) => sum + getResultPoints(result), 0)

const getKnockoutWinnerName = (match) => {
  if (!isKnockoutStage(getMatchStage(match))) {
    return null
  }

  if (match.team1Point >= KNOCKOUT_WIN_POINTS && match.team1Point > match.team2Point) {
    return match.team1Name
  }

  if (match.team2Point >= KNOCKOUT_WIN_POINTS && match.team2Point > match.team1Point) {
    return match.team2Name
  }

  return null
}

const getStageLabel = (stage) => STAGE_LABELS[stage] || stage

const buildPairKey = (team1Name, team2Name) => [team1Name, team2Name].sort((left, right) => left.localeCompare(right)).join('::')

const createSumoPayload = (match) => ({
  team1Name: match.team1Name,
  team1_name: match.team1Name,
  team2Name: match.team2Name,
  team2_name: match.team2Name,
  team1Point: match.team1Point,
  team1_point: match.team1Point,
  team2Point: match.team2Point,
  team2_point: match.team2Point,
  table: match.table,
  tournamentStage: match.tournamentStage,
  tournament_stage: match.tournamentStage,
  team1Result: match.team1Result,
  team1result: match.team1Result,
  team2Result: match.team2Result,
  team2result: match.team2Result
})

const logSumoPayload = (label, payload) => {
  if (typeof console !== 'undefined' && typeof console.log === 'function') {
    console.log(`[SumoScoring] ${label}`, payload)
  }
}

const getKnockoutStage = (teamCount) => {
  for (const option of KNOCKOUT_STAGE_PRIORITY) {
    if (teamCount >= option.minTeams) {
      return option.stage
    }
  }

  return 'F'
}

//const getKnockoutStageIndex = (stage) => KNOCKOUT_STAGES.indexOf(stage)

const getPairingSearchResult = (availableTeams, usedPairKeys) => {
  if (availableTeams.length === 0) {
    return { pairings: [], byeTeam: null }
  }

  if (availableTeams.length === 1) {
    return { pairings: [], byeTeam: availableTeams[0] }
  }
 
  const firstTeam = availableTeams[0]

  for (let index = availableTeams.length - 1; index >= 1; index -= 1) {
    const candidateTeam = availableTeams[index]
    const pairKey = buildPairKey(firstTeam.name, candidateTeam.name)

    if (usedPairKeys.has(pairKey)) {
      continue
    }

    const remainingTeams = availableTeams.filter((_, teamIndex) => teamIndex !== 0 && teamIndex !== index)
    const nextResult = getPairingSearchResult(remainingTeams, new Set([...usedPairKeys, pairKey]))

    if (nextResult) {
      return {
        pairings: [
          { team1: firstTeam, team2: candidateTeam },
          ...nextResult.pairings
        ],
        byeTeam: nextResult.byeTeam
      }
    }
  }

  return null
}

const getRoundPairings = (teamsToPair, usedPairKeys) => {
  if (teamsToPair.length === 0) {
    return { pairings: [], byeTeam: null }
  }

  if (teamsToPair.length % 2 === 0) {
    return getPairingSearchResult(teamsToPair, usedPairKeys)
  }

  for (let byeIndex = 0; byeIndex < teamsToPair.length; byeIndex += 1) {
    const byeCandidate = teamsToPair[byeIndex]
    const remainingTeams = teamsToPair.filter((_, teamIndex) => teamIndex !== byeIndex)
    const result = getPairingSearchResult(remainingTeams, usedPairKeys)

    if (result) {
      return {
        pairings: result.pairings,
        byeTeam: byeCandidate
      }
    }
  }

  return null
}

const getGroupRoundCount = (matches) => buildRoundGroups(matches.filter((match) => getMatchStage(match) === GROUP_STAGE)).length

const getPrimaryGenerationLabel = (roundLimit, matches, stageMode, selectedStage) => {
  const groupRoundCount = getGroupRoundCount(matches)
  const isGroupView = stageMode === 'group' || selectedStage === ALL_STAGE_VALUE || selectedStage === GROUP_STAGE

  if (isGroupView && groupRoundCount >= roundLimit) {
    return 'Egyenes kieséses szakasz generálása'
  }

  if (stageMode === 'knockout' || isKnockoutStage(selectedStage)) {
    return 'Következő kieséses kör generálása'
  }

  return 'Meccsek legenerálása'
}

const buildStandings = (teams, matches) => {
  const standings = new Map()

  teams.forEach((team) => {
    standings.set(team.name, {
      id: team.id,
      name: team.name,
      points: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      matchesPlayed: 0
    })
  })

  matches.forEach((match) => {
    const team1Standing = standings.get(match.team1Name)
    const team2Standing = standings.get(match.team2Name)

    if (!team1Standing || !team2Standing) {
      return
    }

    const roundCount = Math.max(match.team1Results.length, match.team2Results.length)

    for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
      const team1Result = match.team1Results[roundIndex]
      const team2Result = match.team2Results[roundIndex]

      if (!team1Result || !team2Result) {
        continue
      }

      team1Standing.matchesPlayed += 1
      team2Standing.matchesPlayed += 1
      team1Standing.points += getResultPoints(team1Result)
      team2Standing.points += getResultPoints(team2Result)

      if (team1Result === 'W') {
        team1Standing.wins += 1
        team2Standing.losses += 1
        continue
      }

      if (team1Result === 'L') {
        team1Standing.losses += 1
        team2Standing.wins += 1
        continue
      }

      if (team1Result === 'D') {
        team1Standing.draws += 1
        team2Standing.draws += 1
      }
    }
  })

  return Array.from(standings.values()).sort((left, right) => {
    if (right.points !== left.points) return right.points - left.points
    if (left.matchesPlayed !== right.matchesPlayed) return left.matchesPlayed - right.matchesPlayed
    return left.name.localeCompare(right.name)
  })
}

const buildRoundGroups = (matches, splitByStage = false) => {
  const grouped = new Map()

  matches.forEach((match) => {
    const table = Number(match.table ?? 0) || 1
    const stage = getMatchStage(match)
    const roundKey = splitByStage ? `${stage}::${table}` : String(table)

    if (!grouped.has(roundKey)) {
      grouped.set(roundKey, { stage, table, matches: [] })
    }

    grouped.get(roundKey).matches.push(match)
  })

  return Array.from(grouped.values())
    .sort((left, right) => {
      if (splitByStage) {
        const stageComparison = KNOCKOUT_STAGES.indexOf(left.stage) - KNOCKOUT_STAGES.indexOf(right.stage)

        if (left.stage === GROUP_STAGE && right.stage !== GROUP_STAGE) return -1
        if (left.stage !== GROUP_STAGE && right.stage === GROUP_STAGE) return 1
        if (stageComparison !== 0) return stageComparison
      }

      return left.table - right.table
    })
    .map((roundGroup) => ({
      ...roundGroup,
      matches: roundGroup.matches.sort((left, right) => {
        const leftName = `${left.team1Name} ${left.team2Name}`.toLowerCase()
        const rightName = `${right.team1Name} ${right.team2Name}`.toLowerCase()
        return leftName.localeCompare(rightName)
      })
    }))
}

/*const pickAlternativeOpponent = (availableTeams, opponentName, usedPairKeys) => {
  for (let index = availableTeams.length - 1; index >= 0; index -= 1) {
    const candidate = availableTeams[index]
    if (!usedPairKeys.has(buildPairKey(candidate.name, opponentName))) {
      return index
    }
  }

  return -1
}*/

export default function SumoScoring() {
  const [teams, setTeams] = useState([])
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stageMode, setStageMode] = useState('group')
  const [selectedStage, setSelectedStage] = useState(ALL_STAGE_VALUE)
  const [roundLimit, setRoundLimit] = useState(5)
  const [matchDrafts, setMatchDrafts] = useState({})
  const [openMatches, setOpenMatches] = useState({})
  const [actionMessage, setActionMessage] = useState(null)
  const [matchToDelete, setMatchToDelete] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError('')

      try {
        const [teamsResponse, matchesResponse] = await Promise.all([
          fetch('https://legocompetition.runasp.net/api/Teams'),
          fetch('https://legocompetition.runasp.net/api/Sumo/matches')
        ])

        if (!teamsResponse.ok) {
          throw new Error('Nem sikerült betölteni a csapatokat.')
        }

        if (!matchesResponse.ok) {
          throw new Error('Nem sikerült betölteni a szumó meccseket.')
        }

        const teamsData = await teamsResponse.json()
        const matchesData = await matchesResponse.json()

        setTeams(Array.isArray(teamsData) ? teamsData.map(normalizeTeam) : [])
        setMatches(dedupeMatches(normalizeMatchesResponse(matchesData).map(normalizeMatch)))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    if (!actionMessage) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => setActionMessage(null), 4500)
    return () => window.clearTimeout(timeoutId)
  }, [actionMessage])

  useEffect(() => {
    if (matches.length === 0) {
      setSelectedStage(ALL_STAGE_VALUE)
      return
    }

    const availableStages = Array.from(new Set(matches.map((match) => match.tournamentStage).filter(Boolean)))
    const visibleStages = STAGE_GROUPS.find((group) => group.id === stageMode)?.stages || ['GS']
    const hasVisibleMatch = selectedStage === ALL_STAGE_VALUE || (visibleStages.includes(selectedStage) && availableStages.includes(selectedStage))

    if (!hasVisibleMatch) {
      setSelectedStage(availableStages[0] || ALL_STAGE_VALUE)
    }
  }, [matches, selectedStage, stageMode])

  const stageMatches = useMemo(
    () => {
      if (selectedStage === ALL_STAGE_VALUE) {
        return matches
      }

      if (stageMode === 'knockout') {
        return matches.filter((match) => isKnockoutStage(getMatchStage(match)))
      }

      return matches.filter((match) => getMatchStage(match) === selectedStage)
    },
    [matches, selectedStage, stageMode]
  )

  const groupStageMatches = useMemo(
    () => matches.filter((match) => getMatchStage(match) === GROUP_STAGE),
    [matches]
  )

  const groupRoundCount = useMemo(() => buildRoundGroups(groupStageMatches).length, [groupStageMatches])
  const isGroupStageComplete = roundLimit > 0 && groupRoundCount >= roundLimit
  const primaryActionLabel = getPrimaryGenerationLabel(roundLimit, matches, stageMode, selectedStage)

  const shouldSplitRoundGroupsByStage = selectedStage === ALL_STAGE_VALUE || stageMode === 'knockout'
  const roundGroups = useMemo(() => buildRoundGroups(stageMatches, shouldSplitRoundGroupsByStage), [stageMatches, shouldSplitRoundGroupsByStage])
  const standings = useMemo(() => buildStandings(teams, stageMatches), [teams, stageMatches])
  const standingsByName = useMemo(() => new Map(standings.map((item) => [item.name, item])), [standings])
  const isKnockoutView = stageMode === 'knockout' || isKnockoutStage(selectedStage)
  const hasKnockoutStarted = useMemo(
    () => matches.some((match) => isKnockoutStage(getMatchStage(match))),
    [matches]
  )
  const finalWinnerName = useMemo(() => {
    const finalMatch = matches.find((match) => getMatchStage(match) === 'F')
    return finalMatch ? getKnockoutWinnerName(finalMatch) : null
  }, [matches])
  const isGroupGenerationLocked = hasKnockoutStarted && (stageMode === 'group' || selectedStage === GROUP_STAGE)

  const nextRoundNumber = roundGroups.length > 0 ? Math.max(...roundGroups.map((round) => round.table)) + 1 : 1
  //const canGenerateAnotherRound = roundLimit > 0 && nextRoundNumber <= roundLimit

  const handleStageModeChange = (mode) => {
    setStageMode(mode)

    if (mode === 'group') {
      setSelectedStage(GROUP_STAGE)
      return
    }

    const knockoutStage = Array.from(new Set(matches.map((match) => getMatchStage(match)).filter((stage) => KNOCKOUT_STAGES.includes(stage))))[0]
    setSelectedStage(knockoutStage || KNOCKOUT_STAGES[0])
  }

  const handleStageChange = (stage) => {
    setSelectedStage(stage)
  }

  const handleMatchDraftChange = (matchId, value) => {
    setMatchDrafts((prev) => ({
      ...prev,
      [matchId]: value
    }))
  }

  const updateMatchLocally = (matchId, updater) => {
    setMatches((prev) => prev.map((match) => (match.id === matchId ? updater(match) : match)))
  }

  const refreshMatches = async () => {
    const response = await fetch('https://legocompetition.runasp.net/api/Sumo/matches')
    if (!response.ok) {
      return
    }

    const refreshedData = await response.json()
    setMatches(dedupeMatches(normalizeMatchesResponse(refreshedData).map(normalizeMatch)))
  }

  const getCurrentRoundTeams = () => {
    const sortedTeams = teams
      .map((team) => ({
        ...team,
        points: standingsByName.get(team.name)?.points ?? 0,
        matchesPlayed: standingsByName.get(team.name)?.matchesPlayed ?? 0
      }))
      .sort((left, right) => {
        if (right.points !== left.points) return right.points - left.points
        if (left.matchesPlayed !== right.matchesPlayed) return left.matchesPlayed - right.matchesPlayed
        return left.name.localeCompare(right.name)
      })

    return sortedTeams
  }

  const generateKnockoutPairings = () => {
    const teamByName = new Map(teams.map((team) => [team.name, team]))
    const knockoutMatches = matches.filter((match) => isKnockoutStage(getMatchStage(match)))
    const existingStages = KNOCKOUT_STAGES.filter((stage) => knockoutMatches.some((match) => getMatchStage(match) === stage))

    if (existingStages.length === 0) {
      const groupStandingsByName = new Map(buildStandings(teams, groupStageMatches).map((item) => [item.name, item]))
      const sortedTeams = teams
        .map((team) => ({
          ...team,
          points: groupStandingsByName.get(team.name)?.points ?? 0,
          matchesPlayed: groupStandingsByName.get(team.name)?.matchesPlayed ?? 0
        }))
        .sort((left, right) => {
          if (right.points !== left.points) return right.points - left.points
          if (left.matchesPlayed !== right.matchesPlayed) return left.matchesPlayed - right.matchesPlayed
          return left.name.localeCompare(right.name)
        })
      const stage = getKnockoutStage(sortedTeams.length)
      const bracketSize = stage === 'RO16' ? 16 : stage === 'QF' ? 8 : stage === 'SF' ? 4 : 2
      const bracketTeams = sortedTeams.slice(0, Math.min(sortedTeams.length, bracketSize))
      const half = Math.floor(bracketTeams.length / 2)
      const pairings = []

      for (let index = 0; index < half; index += 1) {
        const team1 = bracketTeams[index]
        const team2 = bracketTeams[bracketTeams.length - 1 - index]

        if (team1 && team2) {
          pairings.push({ team1, team2, table: 1, stage })
        }
      }

      return pairings
    }

    const currentStage = existingStages[existingStages.length - 1]
    const currentStageMatches = knockoutMatches.filter((match) => getMatchStage(match) === currentStage)
    const winners = []
    const losers = []

    for (const match of currentStageMatches) {
      const winnerName = getKnockoutWinnerName(match)

      if (!winnerName) {
        setActionMessage({
          type: 'info',
          text: 'A következő kieséses kör csak akkor generálható, ha az aktuális szakasz minden meccsén van 6 pontos győztes.'
        })
        return []
      }

      const loserName = winnerName === match.team1Name ? match.team2Name : match.team1Name
      winners.push(teamByName.get(winnerName) || { id: winnerName, name: winnerName })
      losers.push(teamByName.get(loserName) || { id: loserName, name: loserName })
    }

    if (currentStage === 'F') {
      setActionMessage({ type: 'success', text: 'A döntőnek már van győztese, nincs több generálható szakasz.' })
      return []
    }

    if (currentStage === 'SF') {
      const nextPairings = []

      if (!matches.some((match) => getMatchStage(match) === 'F') && winners.length >= 2) {
        nextPairings.push({ team1: winners[0], team2: winners[1], table: 1, stage: 'F' })
      }

      if (!matches.some((match) => getMatchStage(match) === 'BM') && losers.length >= 2) {
        nextPairings.push({ team1: losers[0], team2: losers[1], table: 1, stage: 'BM' })
      }

      return nextPairings
    }

    const nextStage = getNextKnockoutStage(currentStage)

    if (!nextStage || matches.some((match) => getMatchStage(match) === nextStage)) {
      return []
    }

    const pairings = []

    for (let index = 0; index < winners.length; index += 2) {
      if (winners[index] && winners[index + 1]) {
        pairings.push({ team1: winners[index], team2: winners[index + 1], table: 1, stage: nextStage })
      }
    }

    return pairings
  }

  const generateRoundMatches = () => {
    const sortedTeams = getCurrentRoundTeams()
    const usedPairKeys = new Set(matches.map((match) => buildPairKey(match.team1Name, match.team2Name)))
    const roundTeams = [...sortedTeams]
    const pairings = []

    if (roundTeams.length < 2) {
      return pairings
    }

    const result = getRoundPairings(roundTeams, usedPairKeys)

    if (!result) {
      return null
    }

    if (result.byeTeam) {
      setActionMessage({
        type: 'info',
        text: `${result.byeTeam.name} most pihenővel kimarad a ${nextRoundNumber}. fordulóból.`
      })
    }

    return result.pairings.map((pairing) => ({
      ...pairing,
      table: nextRoundNumber
    }))
  }

  const handleGenerateMatches = async () => {
    if (!teams.length) {
      setActionMessage({ type: 'danger', text: 'Előbb töltsd be a nevezett csapatokat.' })
      return
    }

    if (finalWinnerName) {
      setActionMessage({ type: 'success', text: `A szumó döntő győztese: ${finalWinnerName}. Nem lehet több meccset generálni.` })
      return
    }

    if (isGroupGenerationLocked) {
      setActionMessage({ type: 'info', text: 'A csoportkörben már nem lehet új meccset generálni, mert elkezdődött az egyenes kieséses szakasz.' })
      return
    }

    const isGroupToKnockoutGeneration = isGroupStageComplete && (stageMode === 'group' || selectedStage === ALL_STAGE_VALUE || selectedStage === GROUP_STAGE)
    const shouldGenerateKnockout = isGroupToKnockoutGeneration || stageMode === 'knockout' || isKnockoutStage(selectedStage)
    const pairings = shouldGenerateKnockout ? generateKnockoutPairings() : generateRoundMatches()

    if (!pairings || pairings.length === 0) {
      if (shouldGenerateKnockout) {
        const finalMatch = matches.find((match) => getMatchStage(match) === 'F')
        const finalWinnerName = finalMatch ? getKnockoutWinnerName(finalMatch) : null

        setActionMessage({
          type: finalWinnerName ? 'success' : 'info',
          text: finalWinnerName
            ? `A szumó döntő győztese: ${finalWinnerName}.`
            : 'A következő kieséses kör még nem generálható. Az aktuális szakasz minden meccsén 6 pontos győztes kell.'
        })
        return
      }
      if (shouldGenerateKnockout) {
        setActionMessage({ type: 'danger', text: 'Nem sikerült egyenes kieséses párosítást generálni a jelenlegi csapatszámmal.' })
      } else {
        setActionMessage({ type: 'danger', text: 'Nem sikerült új fordulót generálni visszavágó nélkül.' })
      }
      return
    }

    try {
      for (const pairing of pairings) {
        const stageToGenerate = shouldGenerateKnockout ? pairing.stage : GROUP_STAGE
        const payload = createSumoPayload({
          team1Name: pairing.team1.name,
          team2Name: pairing.team2.name,
          team1Point: 0,
          team2Point: 0,
          table: pairing.table,
          tournamentStage: stageToGenerate,
          team1Result: '',
          team2Result: ''
        })

        logSumoPayload('POST payload', payload)

        const response = await fetch('https://legocompetition.runasp.net/api/Sumo', {
          method: 'POST',
          headers: {
            accept: '*/*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          const errorText = await response.text()
          logSumoPayload('POST failed response', { status: response.status, body: errorText, payload })
          throw new Error(errorText || 'A meccsek létrehozása sikertelen volt.')
        }
      }

      const generatedMatches = pairings.map((pairing) => ({
        id: `${shouldGenerateKnockout ? pairing.stage : GROUP_STAGE}::${pairing.table}::${pairing.team1.name}::${pairing.team2.name}::local`,
        team1Name: pairing.team1.name,
        team2Name: pairing.team2.name,
        team1Results: [],
        team2Results: [],
        team1Point: 0,
        team2Point: 0,
        table: pairing.table,
        tournamentStage: shouldGenerateKnockout ? pairing.stage : GROUP_STAGE
      }))

      logSumoPayload('Generated matches', generatedMatches)
      setMatches((prev) => [...prev, ...generatedMatches])
      if (shouldGenerateKnockout) {
        setSelectedStage(generatedMatches[0]?.tournamentStage || KNOCKOUT_STAGES[0])
        setStageMode('knockout')
      }
      setActionMessage({ type: 'success', text: 'A meccsek sikeresen legenerálva.' })
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.message })
    }
  }

  const handleDeleteMatch = async () => {
    const match = matchToDelete

    if (!match) {
      return
    }

    try {
      const response = await fetch(
        `https://legocompetition.runasp.net/api/Sumo/${encodeURIComponent(match.team1Name)}/${encodeURIComponent(match.team2Name)}/${encodeURIComponent(match.tournamentStage)}`,
        {
          method: 'DELETE',
          headers: {
            accept: '*/*'
          }
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        logSumoPayload('DELETE failed response', {
          status: response.status,
          body: errorText,
          team1: match.team1Name,
          team2: match.team2Name,
          tournamentStage: match.tournamentStage
        })
        throw new Error(errorText || 'A szumo meccs torlese sikertelen volt.')
      }

      setMatches((prev) => prev.filter((item) => item.id !== match.id))
      setOpenMatches((prev) => {
        const next = { ...prev }
        delete next[match.id]
        return next
      })
      setMatchDrafts((prev) => {
        const next = { ...prev }
        delete next[match.id]
        return next
      })
      setMatchToDelete(null)
      setActionMessage({ type: 'success', text: 'A szumo meccs torolve lett.' })
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.message })
      setMatchToDelete(null)
    }
  }

  const handleSaveMatch = async (matchId) => {
    const selectedValue = matchDrafts[matchId]
    const match = matches.find((item) => item.id === matchId)

    if (!match || !selectedValue) {
      return
    }

    if (getKnockoutWinnerName(match)) {
      setActionMessage({ type: 'info', text: 'Ez a kieséses meccs már lezárult, mert az egyik csapat elérte a 6 pontot.' })
      return
    }

    const nextTeam1Result = selectedValue === 'team1' ? 'W' : selectedValue === 'team2' ? 'L' : 'D'
    const nextTeam2Result = selectedValue === 'team1' ? 'L' : selectedValue === 'team2' ? 'W' : 'D'
    const nextTeam1Results = [...match.team1Results, nextTeam1Result]
    const nextTeam2Results = [...match.team2Results, nextTeam2Result]
    const payload = createSumoPayload({
      team1Name: match.team1Name,
      team2Name: match.team2Name,
      team1Point: calculateTotalPoints(nextTeam1Results),
      team2Point: calculateTotalPoints(nextTeam2Results),
      table: match.table,
      tournamentStage: match.tournamentStage,
      team1Result: nextTeam1Results.join(','),
      team2Result: nextTeam2Results.join(',')
    })

    logSumoPayload('PATCH payload', payload)

    try {
      const response = await fetch('https://legocompetition.runasp.net/api/Sumo', {
        method: 'PATCH',
        headers: {
          accept: '*/*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorText = await response.text()
        logSumoPayload('PATCH failed response', { status: response.status, body: errorText, payload })
        const shouldFallbackToPost = response.status === 400 && /Object reference not set to an instance of an object/i.test(errorText || '')

        if (!shouldFallbackToPost) {
          throw new Error(errorText || 'A meccs frissítése sikertelen volt.')
        }

        logSumoPayload('PATCH fallback to POST', payload)

        const fallbackResponse = await fetch('https://legocompetition.runasp.net/api/Sumo', {
          method: 'POST',
          headers: {
            accept: '*/*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        if (!fallbackResponse.ok) {
          const fallbackErrorText = await fallbackResponse.text()
          logSumoPayload('POST fallback failed response', { status: fallbackResponse.status, body: fallbackErrorText, payload })
          throw new Error(fallbackErrorText || errorText || 'A meccs frissítése sikertelen volt.')
        }

        await refreshMatches()
        setMatchDrafts((prev) => {
          const next = { ...prev }
          delete next[matchId]
          return next
        })

        setActionMessage({ type: 'success', text: 'A meccs eredménye mentve lett.' })
        return
      }

      updateMatchLocally(matchId, () => ({
        ...match,
        team1Results: nextTeam1Results,
        team2Results: nextTeam2Results,
        team1Point: payload.team1Point,
        team2Point: payload.team2Point
      }))

      setMatchDrafts((prev) => {
        const next = { ...prev }
        delete next[matchId]
        return next
      })

      setActionMessage({ type: 'success', text: 'A meccs eredménye frissítve.' })
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.message })
    }
  }

  const handleDeleteRoundResult = async (matchId, resultIndex) => {
    const match = matches.find((item) => item.id === matchId)

    if (!match) {
      return
    }

    const nextTeam1Results = match.team1Results.filter((_, index) => index !== resultIndex)
    const nextTeam2Results = match.team2Results.filter((_, index) => index !== resultIndex)
    const payload = createSumoPayload({
      team1Name: match.team1Name,
      team2Name: match.team2Name,
      team1Point: calculateTotalPoints(nextTeam1Results),
      team2Point: calculateTotalPoints(nextTeam2Results),
      table: match.table,
      tournamentStage: match.tournamentStage,
      team1Result: nextTeam1Results.join(','),
      team2Result: nextTeam2Results.join(',')
    })

    logSumoPayload('PATCH delete payload', payload)

    try {
      const response = await fetch('https://legocompetition.runasp.net/api/Sumo', {
        method: 'PATCH',
        headers: {
          accept: '*/*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorText = await response.text()
        logSumoPayload('PATCH delete failed response', { status: response.status, body: errorText, payload })
        await refreshMatches()
        throw new Error(errorText || 'A meccs eredményének törlése sikertelen volt.')
      }

      updateMatchLocally(matchId, () => ({
        ...match,
        team1Results: nextTeam1Results,
        team2Results: nextTeam2Results,
        team1Point: payload.team1Point,
        team2Point: payload.team2Point
      }))

      setActionMessage({ type: 'success', text: 'A kiválasztott kör törölve lett.' })
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.message })
    }
  }

  const currentRoundLabel = stageMatches.length > 0 ? `${stageMatches.length} meccs` : 'Nincsenek még meccsek'

  return (
    <div>
      <div className="alert alert-info mb-3">
        Kiválasztott versenyszám: <strong>{competitionConfig?.label || 'Szumó'}</strong>
      </div>

      {actionMessage && (
        <div className={`alert alert-${actionMessage.type === 'success' ? 'success' : actionMessage.type === 'info' ? 'info' : 'danger'} mb-3`} role="status">
          {actionMessage.text}
        </div>
      )}

      {loading && <div className="alert alert-secondary">Csapatok és meccsek betöltése...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      {!loading && !error && teams.length === 0 && <div className="alert alert-secondary">Ebben a versenyszámban még nincs csapat.</div>}

      {!loading && !error && teams.length > 0 && (
        <>
          <div className="card shadow-sm team-card mb-4">
            <div className="card-body p-4">
              <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
                <div>
                  <div className="home-kicker">Szumó {getStageLabel(selectedStage)}</div>
                  <h3 className="mb-2">Meccsek, fordulók és eredmények</h3>
                  <p className="text-muted mb-0">
                    A generálás a jelenlegi állás alapján történik, visszavágó nélkül. A pontos eredményeket a meccskártyákon lehet rögzíteni.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary px-4"
                  onClick={handleGenerateMatches}
                  disabled={!teams.length || Boolean(finalWinnerName) || isGroupGenerationLocked}
                >
                  {primaryActionLabel}
                </button>
              </div>

              <div className="row g-3 align-items-end mb-3">
                {!isKnockoutView && (
                  <div className="col-md-3 col-lg-2">
                    <label className="form-label fw-semibold" htmlFor="sumo-round-limit">Max. fordulók</label>
                    <input
                      id="sumo-round-limit"
                      type="number"
                      min="1"
                      max="20"
                      className="form-control"
                      value={roundLimit}
                      onChange={(event) => {
                        const parsedValue = Number.parseInt(event.target.value, 10)
                        setRoundLimit(Number.isNaN(parsedValue) ? 1 : Math.min(20, Math.max(1, parsedValue)))
                      }}
                    />
                  </div>
                )}

                <div className={isKnockoutView ? 'col-12' : 'col-md-9 col-lg-10'}>
                  <div className="d-flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`btn btn-sm px-3 ${selectedStage === ALL_STAGE_VALUE ? 'btn-dark' : 'btn-outline-dark'}`}
                      onClick={() => handleStageChange(ALL_STAGE_VALUE)}
                    >
                      Összes
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm px-3 ${stageMode === 'group' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handleStageModeChange('group')}
                    >
                      Csoportkör
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm px-3 ${stageMode === 'knockout' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handleStageModeChange('knockout')}
                    >
                      Egyenes kiesés
                    </button>
                  </div>
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2 align-items-center">
                <div className="text-muted">Jelenlegi nézet: {stageMode === 'knockout' ? 'egyenes kiesés' : getStageLabel(selectedStage)} ({currentRoundLabel})</div>
                <div className="text-muted">
                  {isKnockoutView
                    ? 'Kieséses szakaszban minden meccs addig tart, amíg valamelyik csapat eléri a 6 pontot.'
                    : `Legfeljebb ${roundLimit} forduló generálható ezen a nézeten.`}
                </div>
              </div>
            </div>
          </div>

          <div className="card shadow-sm team-card mb-4">
            <div className="card-body p-4">
              <h5 className="mb-3">Aktuális sorrend</h5>
              {standings.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Csapat</th>
                        <th className="text-end">Pont</th>
                        <th className="text-end">Meccsek</th>
                        <th className="text-end">W</th>
                        <th className="text-end">D</th>
                        <th className="text-end">L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((team) => (
                        <tr key={team.id}>
                          <td>{team.name}</td>
                          <td className="text-end">{team.points}</td>
                          <td className="text-end">{team.matchesPlayed}</td>
                          <td className="text-end">{team.wins}</td>
                          <td className="text-end">{team.draws}</td>
                          <td className="text-end">{team.losses}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="alert alert-secondary mb-0">Még nincs rögzített eredmény ebben a szakaszban.</div>
              )}
            </div>
          </div>
        </>
      )}

      {!loading && !error && teams.length > 0 && roundGroups.length === 0 && (
        <div className="alert alert-secondary">Ebben a szakaszban még nincs meccs. A fenti gombbal legenerálhatod az első fordulót.</div>
      )}

      {roundGroups.length > 0 && (
        <div className="d-grid gap-3">
          {roundGroups.map((round) => (
            <div className="card shadow-sm team-card no-hover-card" key={`round-${round.stage}-${round.table}`}>
              <div className="card-body border-bottom py-3 px-4 bg-light">
                <div className="d-flex justify-content-between align-items-center gap-3">
                  <h5 className="mb-0">
                    {shouldSplitRoundGroupsByStage ? `${getStageLabel(round.stage)} - ` : ''}{round.table}. forduló
                  </h5>
                  <span className="text-muted">{round.matches.length} meccs</span>
                </div>
              </div>

              <div className="card-body p-3 p-md-4">
                <div className="d-grid gap-3">
                  {round.matches.map((match) => {
                    const isOpen = openMatches[match.id] === true
                    const selectedValue = matchDrafts[match.id] ?? ''
                    const knockoutWinnerName = getKnockoutWinnerName(match)
                    const isMatchComplete = Boolean(knockoutWinnerName)
                    const team1History = match.team1Results
                    const team2History = match.team2Results

                    const team1Wins = team1History.filter((result) => result === 'W').length
                    const team1Draws = team1History.filter((result) => result === 'D').length
                    const team1Losses = team1History.filter((result) => result === 'L').length
                    const team2Wins = team2History.filter((result) => result === 'W').length
                    const team2Draws = team2History.filter((result) => result === 'D').length
                    const team2Losses = team2History.filter((result) => result === 'L').length

                    return (
                      <div key={match.id} className="card shadow-sm team-card no-hover-card">
                        <button
                          type="button"
                          className="btn btn-outline-secondary w-100 text-start rounded-0 border-0 py-3 px-3 team-toggle"
                          onClick={() => setOpenMatches((prev) => ({ ...prev, [match.id]: !isOpen }))}
                          aria-expanded={isOpen}
                        >
                          <div className="d-flex align-items-center justify-content-between gap-3 pair-toggle-header">
                            <span className="fw-semibold pair-toggle-team pair-toggle-team--left">{match.team1Name}</span>
                            <span className="pair-toggle-chevron">{isOpen ? '▴' : '▾'}</span>
                            <span className="fw-semibold pair-toggle-team pair-toggle-team--right">{match.team2Name}</span>
                          </div>
                        </button>

                        <div className={`team-details ${isOpen ? 'open' : ''}`}>
                          <div className="card-body border-top">
                            <div className="border rounded p-3 bg-light">
                              <div className="row g-3 mb-3">
                                <div className="col-12 col-md-6">
                                  <div className="border rounded p-2 bg-white h-100">
                                    <div className="fw-semibold">{match.team1Name}</div>
                                    <div className="small text-muted">Pont: {match.team1Point}</div>
                                    <div className="small text-muted">W/L/D: {team1Wins}/{team1Losses}/{team1Draws}</div>
                                    {team1History.length > 0 && (
                                      <div className="d-flex flex-wrap gap-2 mt-2">
                                        {team1History.map((result, resultIndex) => (
                                          <button
                                            key={`${match.id}-team1-${resultIndex}`}
                                            type="button"
                                            className={`btn btn-sm sumo-history-chip ${result === 'W' ? 'sumo-history-chip--win' : result === 'L' ? 'sumo-history-chip--loss' : 'sumo-history-chip--draw'}`}
                                            onClick={() => handleDeleteRoundResult(match.id, resultIndex)}
                                            aria-label={`Törlés: ${result}`}
                                          >
                                            {result}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                    <div className="small text-muted mt-1">Törléshez kattints a W, L vagy D jelölésre.</div>
                                  </div>
                                </div>
                                <div className="col-12 col-md-6">
                                  <div className="border rounded p-2 bg-white h-100">
                                    <div className="fw-semibold">{match.team2Name}</div>
                                    <div className="small text-muted">Pont: {match.team2Point}</div>
                                    <div className="small text-muted">W/L/D: {team2Wins}/{team2Losses}/{team2Draws}</div>
                                    {team2History.length > 0 && (
                                      <div className="d-flex flex-wrap gap-2 mt-2">
                                        {team2History.map((result, resultIndex) => (
                                          <button
                                            key={`${match.id}-team2-${resultIndex}`}
                                            type="button"
                                            className={`btn btn-sm sumo-history-chip ${result === 'W' ? 'sumo-history-chip--win' : result === 'L' ? 'sumo-history-chip--loss' : 'sumo-history-chip--draw'}`}
                                            onClick={() => handleDeleteRoundResult(match.id, resultIndex)}
                                            aria-label={`Törlés: ${result}`}
                                          >
                                            {result}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                    <div className="small text-muted mt-1">Törléshez kattints a W, L vagy D jelölésre.</div>
                                  </div>
                                </div>
                              </div>

                              <div className="d-flex flex-column flex-md-row gap-2 align-items-stretch">
                                <div className="d-grid gap-2 flex-grow-1" role="group" aria-label={`${match.team1Name} vs ${match.team2Name}`}>
                                  {isMatchComplete && (
                                    <div className="alert alert-success py-2 mb-1">
                                      Győztes: {knockoutWinnerName} ({KNOCKOUT_WIN_POINTS} pont)
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    className={`btn btn-sm sumo-result-btn ${selectedValue === 'team1' ? 'active' : ''}`}
                                    disabled={isMatchComplete}
                                    onClick={() => handleMatchDraftChange(match.id, 'team1')}
                                  >
                                    {match.team1Name}
                                  </button>
                                  <button
                                    type="button"
                                    className={`btn btn-sm sumo-result-btn ${selectedValue === 'team2' ? 'active' : ''}`}
                                    disabled={isMatchComplete}
                                    onClick={() => handleMatchDraftChange(match.id, 'team2')}
                                  >
                                    {match.team2Name}
                                  </button>
                                  <button
                                    type="button"
                                    className={`btn btn-sm sumo-result-btn ${selectedValue === 'draw' ? 'active' : ''}`}
                                    disabled={isMatchComplete}
                                    onClick={() => handleMatchDraftChange(match.id, 'draw')}
                                  >
                                    Döntetlen
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  className="btn btn-outline-success align-self-md-center"
                                  disabled={!selectedValue || isMatchComplete}
                                  onClick={() => handleSaveMatch(match.id)}
                                >
                                  Mentés
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-danger align-self-md-center"
                                  onClick={() => setMatchToDelete(match)}
                                >
                                  Meccs törlése
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {matchToDelete && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)', zIndex: 1050 }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-sm m-0" role="document">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden bg-white text-dark">
              <div className="modal-header border-0 px-4 py-3 bg-white">
                <h5 className="modal-title fw-bold text-dark">Szumó meccs törlése</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setMatchToDelete(null)}></button>
              </div>
              <div className="modal-body px-4 py-4">
                <p className="mb-2 text-dark">Biztosan törölni szeretnéd ezt a szumó meccset?</p>
                <p className="fw-semibold mb-1 text-dark">{matchToDelete.team1Name} vs {matchToDelete.team2Name}</p>
                <p className="small mb-0 text-dark">Szakasz: {getStageLabel(matchToDelete.tournamentStage)}</p>
              </div>
              <div className="modal-footer border-0 px-4 pb-4 pt-0">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setMatchToDelete(null)}>Mégse</button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteMatch}>Törlés</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
