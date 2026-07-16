import React, { useEffect, useRef, useState } from 'react'
import { getCompetitionConfig } from '../config/adminScoringConfig'

const competitionConfig = getCompetitionConfig('vonalkovetes')
const MIN_FINAL_TEAMS = 3
const LINE_FOLLOWING_STAGES = [
  { value: 1, label: 'Csoportkor' },
  { value: 2, label: 'Legjobb 16' },
  { value: 3, label: 'Negyeddonto' },
  { value: 4, label: 'Legjobb 4 (final four)' }
]

const createEmptyTimeDraft = () => ({
  firstTime: '',
  secondTime: ''
})

const getAdvancingCount = (teamCount) => {
  if (teamCount <= MIN_FINAL_TEAMS) {
    return teamCount
  }

  return Math.max(MIN_FINAL_TEAMS, Math.ceil(teamCount / 2))
}

const getBestTime = (firstTime, secondTime) => {
  const values = [firstTime, secondTime]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)

  if (values.length === 0) {
    return ''
  }

  return Math.min(...values)
}

const getRoundDraft = (roundDrafts, roundId, teamName) => roundDrafts[roundId]?.[teamName] || createEmptyTimeDraft()

const getRoundSavedResult = (roundResults, roundId, teamName) => roundResults[roundId]?.[teamName] || null

const getResultKey = (team) => team.resultKey || team.team_name

const normalizeLineFollowingResult = (result, index) => {
  const teamName = result.team_name || result.teamName || ''
  const time = Number(result.time)
  const stage = Number(result.stage ?? result.tournamentStage ?? result.tournament_stage ?? 1)

  if (!teamName || !Number.isFinite(time) || time <= 0 || !Number.isFinite(stage)) {
    return null
  }

  return {
    id: result.id ?? `${stage}-${teamName}-${time}-${index}`,
    resultKey: `${stage}-${teamName}-${time}-${index}`,
    team_name: teamName,
    time,
    stage
  }
}

const createRoundsFromLineFollowingResults = (results) => LINE_FOLLOWING_STAGES
  .map((stageConfig) => {
    const teams = results
      .filter((result) => result.stage === stageConfig.value)
      .map((result) => ({
        id: result.id,
        resultKey: result.resultKey,
        team_name: result.team_name,
        savedTime: result.time
      }))

    return {
      id: `round-${stageConfig.value}`,
      label: stageConfig.label,
      teams,
      advancingCount: getAdvancingCount(teams.length)
    }
  })
  .filter((round) => round.teams.length > 0)

const createRoundResultsFromLineFollowingResults = (results) => results.reduce((acc, result) => {
  const roundId = `round-${result.stage}`

  return {
    ...acc,
    [roundId]: {
      ...(acc[roundId] || {}),
      [result.resultKey]: {
        firstTime: result.time,
        secondTime: '',
        bestTime: result.time
      }
    }
  }
}, {})

export default function LineFollowingScoring() {
  const [teams, setTeams] = useState([])
  const [teamNames, setTeamNames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rounds, setRounds] = useState([])
  const [roundDrafts, setRoundDrafts] = useState({})
  const [roundResults, setRoundResults] = useState({})
  const [openEntries, setOpenEntries] = useState({})
  const [actionMessage, setActionMessage] = useState(null)
  const [sortBy, setSortBy] = useState('name')
  const [resultSearchTerm, setResultSearchTerm] = useState('')
  const [selectedResultTeam, setSelectedResultTeam] = useState(null)
  const [resultTime, setResultTime] = useState('')
  const [resultStage, setResultStage] = useState(1)
  const [resultToDelete, setResultToDelete] = useState(null)
  const [displaySearchTerm, setDisplaySearchTerm] = useState('')
  const resultSearchInputRef = useRef(null)
  const [resultDropdownStyle, setResultDropdownStyle] = useState({})

  useEffect(() => {
    const loadTeams = async () => {
      setLoading(true)
      setError('')

      try {
        const [response, teamNamesResponse] = await Promise.all([
          fetch(`https://legocompetition.runasp.net/api/${competitionConfig.apiPath}`),
          fetch('https://legocompetition.runasp.net/api/Teams/teamnames')
        ])
        if (!response.ok) throw new Error('Nem sikerult betolteni a csapatokat.')

        const data = await response.json()
        const teamNamesData = teamNamesResponse.ok ? await teamNamesResponse.json() : []
        const normalizedResults = Array.isArray(data)
          ? data.map(normalizeLineFollowingResult).filter(Boolean)
          : []
        const normalizedTeams = Array.from(new Map(normalizedResults.map((result) => [
          result.team_name,
          {
            id: result.team_name,
            team_name: result.team_name
          }
        ])).values())

        setTeams(normalizedTeams)
        setTeamNames(Array.isArray(teamNamesData) && teamNamesData.length > 0
          ? teamNamesData.filter(Boolean)
          : normalizedTeams.map((team) => team.team_name).filter(Boolean))
        setRounds(createRoundsFromLineFollowingResults(normalizedResults))
        setRoundDrafts({})
        setRoundResults(createRoundResultsFromLineFollowingResults(normalizedResults))
        setOpenEntries({})
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadTeams()
  }, [])

  useEffect(() => {
    if (!actionMessage) return undefined

    const timeoutId = window.setTimeout(() => setActionMessage(null), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [actionMessage])

  const hasPendingChange = (roundId, team) => {
    const teamName = team.team_name
    if (!teamName) return false

    const draft = getRoundDraft(roundDrafts, roundId, teamName)
    const saved = getRoundSavedResult(roundResults, roundId, teamName)

    return Number(draft.firstTime ?? '') !== Number(saved?.firstTime ?? '') || Number(draft.secondTime ?? '') !== Number(saved?.secondTime ?? '')
  }

  const toggleEntry = (roundId, teamName) => {
    setOpenEntries((prev) => ({
      ...prev,
      [`${roundId}:${teamName}`]: !prev[`${roundId}:${teamName}`]
    }))
  }

  const handleAdvancingCountChange = (roundId, value, teamCount) => {
    const parsedValue = Number.parseInt(value, 10)
    const safeValue = Number.isNaN(parsedValue)
      ? getAdvancingCount(teamCount)
      : Math.min(teamCount, Math.max(MIN_FINAL_TEAMS, parsedValue))

    setRounds((prev) => prev.map((round) => (
      round.id === roundId
        ? { ...round, advancingCount: safeValue }
        : round
    )))
  }

  const getSortedTeams = (items, roundId = null) => {
    const sorted = [...items]

    sorted.sort((a, b) => {
      const aName = (a.team_name || '').toLowerCase()
      const bName = (b.team_name || '').toLowerCase()

      if (sortBy === 'time' && roundId) {
        const aDraft = getRoundDraft(roundDrafts, roundId, getResultKey(a))
        const bDraft = getRoundDraft(roundDrafts, roundId, getResultKey(b))
        const aSaved = getRoundSavedResult(roundResults, roundId, getResultKey(a))
        const bSaved = getRoundSavedResult(roundResults, roundId, getResultKey(b))
        const aBest = getBestTime(aDraft.firstTime || aSaved?.firstTime || '', aDraft.secondTime || aSaved?.secondTime || '')
        const bBest = getBestTime(bDraft.firstTime || bSaved?.firstTime || '', bDraft.secondTime || bSaved?.secondTime || '')
        const aSortValue = aBest === '' ? Number.POSITIVE_INFINITY : aBest
        const bSortValue = bBest === '' ? Number.POSITIVE_INFINITY : bBest

        return aSortValue - bSortValue || aName.localeCompare(bName)
      }

      return aName.localeCompare(bName)
    })

    return sorted
  }

  const selectedStageRoundId = `round-${resultStage}`
  const resultSearchResults = resultSearchTerm.trim()
    ? teamNames
        .filter((teamName) => teamName.toLowerCase().includes(resultSearchTerm.trim().toLowerCase()))
        .slice(0, 8)
    : []

  useEffect(() => {
    const updateDropdownPosition = () => {
      if (!resultSearchInputRef.current || resultSearchResults.length === 0) {
        return
      }

      const rect = resultSearchInputRef.current.getBoundingClientRect()
      setResultDropdownStyle({
        position: 'fixed',
        top: `${rect.bottom + 8}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        maxHeight: '260px',
        overflowY: 'auto',
        zIndex: 2000
      })
    }

    updateDropdownPosition()
    window.addEventListener('resize', updateDropdownPosition)
    window.addEventListener('scroll', updateDropdownPosition, true)

    return () => {
      window.removeEventListener('resize', updateDropdownPosition)
      window.removeEventListener('scroll', updateDropdownPosition, true)
    }
  }, [resultSearchResults.length, resultSearchTerm])

  const handleFieldChange = (roundId, teamName, field, value) => {
    setRoundDrafts((prev) => ({
      ...prev,
      [roundId]: {
        ...(prev[roundId] || {}),
        [teamName]: {
          ...(prev[roundId]?.[teamName] || createEmptyTimeDraft()),
          [field]: value
        }
      }
    }))
  }

  const handleSave = async (roundId, team) => {
    const teamName = team.team_name
    const draft = getRoundDraft(roundDrafts, roundId, teamName)
    const firstTime = Number(draft.firstTime)
    const secondTime = Number(draft.secondTime)

    if (!teamName || !Number.isFinite(firstTime) || !Number.isFinite(secondTime) || firstTime <= 0 || secondTime <= 0) {
      setActionMessage({ type: 'danger', text: 'Mindket idot ki kell tolteni masodpercben.' })
      return
    }

    if (!hasPendingChange(roundId, team)) {
      return
    }

    try {
      const bestTime = getBestTime(firstTime, secondTime)

      await fetch(`https://legocompetition.runasp.net/api/${competitionConfig.apiPath}/${encodeURIComponent(teamName)}/${bestTime}`, {
        method: 'PATCH'
      })

      setActionMessage({ type: 'success', text: 'A frissites sikeres volt.' })
      setRoundResults((prev) => ({
        ...prev,
        [roundId]: {
          ...(prev[roundId] || {}),
          [teamName]: {
            firstTime,
            secondTime,
            bestTime
          }
        }
      }))
      setRoundDrafts((prev) => {
        const next = { ...prev }
        const nextRoundDrafts = { ...(next[roundId] || {}) }
        delete nextRoundDrafts[teamName]

        if (Object.keys(nextRoundDrafts).length === 0) {
          delete next[roundId]
        } else {
          next[roundId] = nextRoundDrafts
        }

        return next
      })
      setOpenEntries((prev) => ({
        ...prev,
        [`${roundId}:${teamName}`]: false
      }))
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.message })
    }
  }

  const handleSaveTopResult = async () => {
    const teamName = selectedResultTeam?.team_name || resultSearchTerm.trim()
    const time = Number(resultTime)
    const tournamentStage = Number(resultStage)

    if (!teamName) {
      setActionMessage({ type: 'danger', text: 'Adj meg egy csapatnevet.' })
      return
    }

    if (!Number.isFinite(time) || time <= 0) {
      setActionMessage({ type: 'danger', text: 'Adj meg egy ervenyes idot masodpercben.' })
      return
    }

    try {
      const response = await fetch(`https://legocompetition.runasp.net/api/${competitionConfig.apiPath}`, {
        method: 'POST',
        headers: {
          accept: '*/*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          teamName,
          time,
          tournamentStage
        })
      })
      let errorText = ''

      if (!response.ok) {
        errorText = await response.text()
        throw new Error(errorText || 'Az eredmeny mentese sikertelen volt.')
      }

      const resultKey = `${tournamentStage}-${teamName}-${time}-${Date.now()}`

      setRoundResults((prev) => ({
        ...prev,
        [selectedStageRoundId]: {
          ...(prev[selectedStageRoundId] || {}),
          [resultKey]: {
            firstTime: time,
            secondTime: '',
            bestTime: time
          }
        }
      }))
      setRounds((prev) => {
        const stageConfig = LINE_FOLLOWING_STAGES.find((stage) => stage.value === tournamentStage)
        const nextTeam = { id: resultKey, resultKey, team_name: teamName, savedTime: time }
        const existingRound = prev.find((round) => round.id === selectedStageRoundId)

        if (!existingRound) {
          return [
            ...prev,
            {
              id: selectedStageRoundId,
              label: stageConfig?.label || `${tournamentStage}. szakasz`,
              teams: [nextTeam],
              advancingCount: 1
            }
          ].sort((a, b) => Number(a.id.replace('round-', '')) - Number(b.id.replace('round-', '')))
        }

        return prev.map((round) => {
          if (round.id !== selectedStageRoundId) {
            return round
          }

          const teams = [...round.teams, nextTeam]

          return {
            ...round,
            teams,
            advancingCount: getAdvancingCount(teams.length)
          }
        })
      })
      setRoundDrafts((prev) => {
        const next = { ...prev }
        const nextRoundDrafts = { ...(next[selectedStageRoundId] || {}) }
        delete nextRoundDrafts[teamName]

        if (Object.keys(nextRoundDrafts).length === 0) {
          delete next[selectedStageRoundId]
        } else {
          next[selectedStageRoundId] = nextRoundDrafts
        }

        return next
      })
      setActionMessage({ type: 'success', text: 'Az eredmeny mentese sikeres volt.' })
      setResultTime('')
      setResultSearchTerm('')
      setSelectedResultTeam(null)
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.message })
    }
  }

  const handleDeleteResult = async () => {
    const result = resultToDelete

    if (!result) {
      return
    }

    const time = Number(result.time)
    const stage = Number(result.stage)

    if (!result.teamName || !Number.isFinite(time) || !Number.isInteger(time) || !Number.isFinite(stage)) {
      setActionMessage({ type: 'danger', text: 'Az eredmeny torlesehez hianyos vagy hibas adat tartozik.' })
      setResultToDelete(null)
      return
    }

    try {
      const response = await fetch(`https://legocompetition.runasp.net/api/${competitionConfig.apiPath}/${encodeURIComponent(result.teamName)}/${time}/${stage}`, {
        method: 'DELETE',
        headers: {
          accept: '*/*'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Az eredmeny torlese sikertelen volt.')
      }

      const roundId = `round-${stage}`

      setRoundResults((prev) => {
        const next = { ...prev }
        const nextRoundResults = { ...(next[roundId] || {}) }
        delete nextRoundResults[result.resultKey || result.teamName]

        if (Object.keys(nextRoundResults).length === 0) {
          delete next[roundId]
        } else {
          next[roundId] = nextRoundResults
        }

        return next
      })
      setRounds((prev) => prev
        .map((round) => {
          if (round.id !== roundId) {
            return round
          }

          const teams = round.teams.filter((team) => getResultKey(team) !== (result.resultKey || result.teamName))

          return {
            ...round,
            teams,
            advancingCount: teams.length > 0 ? getAdvancingCount(teams.length) : 0
          }
        })
        .filter((round) => round.teams.length > 0))
      setOpenEntries((prev) => {
        const next = { ...prev }
        delete next[`${roundId}:${result.resultKey || result.teamName}`]
        return next
      })
      setActionMessage({ type: 'success', text: 'Az eredmeny torolve lett.' })
      setResultToDelete(null)
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.message })
      setResultToDelete(null)
    }
  }

  const getRoundEntries = (round) => getSortedTeams(round.teams, round.id).map((team) => {
    const resultKey = getResultKey(team)
    const savedResult = getRoundSavedResult(roundResults, round.id, resultKey)
    const draft = getRoundDraft(roundDrafts, round.id, resultKey)
    const firstTime = draft.firstTime || savedResult?.firstTime || ''
    const secondTime = draft.secondTime || savedResult?.secondTime || ''
    const bestTime = getBestTime(firstTime, secondTime)

    return {
      team,
      resultKey,
      firstTime,
      secondTime,
      bestTime,
      changed: hasPendingChange(round.id, team),
      saved: Boolean(savedResult)
    }
  })

  const createNextRound = (round, roundIndex) => {
    const roundEntries = getRoundEntries(round)
    const advancingCount = Math.min(round.teams.length, Math.max(MIN_FINAL_TEAMS, round.advancingCount || getAdvancingCount(round.teams.length)))
    const advancingTeams = roundEntries
      .slice()
      .sort((a, b) => {
        const aBest = a.bestTime === '' ? Number.POSITIVE_INFINITY : a.bestTime
        const bBest = b.bestTime === '' ? Number.POSITIVE_INFINITY : b.bestTime
        return aBest - bBest || a.team.team_name.localeCompare(b.team.team_name)
      })
      .slice(0, advancingCount)
      .map((entry) => entry.team)

    if (advancingTeams.length < MIN_FINAL_TEAMS) {
      return
    }

    setRounds((prev) => [
      ...prev,
      {
        id: `round-${roundIndex + 2}`,
        label: advancingTeams.length <= MIN_FINAL_TEAMS ? 'Top 3 donto' : `${roundIndex + 2}. kor`,
        teams: advancingTeams,
        advancingCount: getAdvancingCount(advancingTeams.length)
      }
    ])
  }

  return (
    <div>
      <div className="alert alert-info">Kivalasztott versenyszam: <strong>{competitionConfig.label}</strong></div>

      {actionMessage && <div className={`alert ${actionMessage.type === 'success' ? 'alert-success' : 'alert-danger'} mb-3`} role="status">{actionMessage.text}</div>}
      {loading && <div className="alert alert-secondary">Csapatok betoltese...</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && (
        <>
        <div className="card shadow-sm team-card no-hover-card mb-3">
          <div className="card-body p-3 p-md-4">
            <div className="home-kicker">Eredmenyfelvitel</div>
            <h4 className="mb-1">Vonalkovetes eredmeny rogzitese</h4>
            <p className="text-muted">Keress csapatot, valaszd ki a szakaszt, majd add meg az idot masodpercben.</p>

            <div className="row g-3 align-items-end">
              <div className="col-12 col-lg-3">
                <label className="form-label" htmlFor="line-stage-select">Szakasz</label>
                <select
                  id="line-stage-select"
                  className="form-control"
                  value={resultStage}
                  onChange={(event) => {
                    setResultStage(Number(event.target.value))
                    setSelectedResultTeam(null)
                    setResultSearchTerm('')
                  }}
                >
                  {LINE_FOLLOWING_STAGES.map((stage) => (
                    <option key={stage.value} value={stage.value}>{stage.value} - {stage.label}</option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-lg-5 position-relative">
                <label className="form-label" htmlFor="line-team-search">Csapat keresese</label>
                <input
                  ref={resultSearchInputRef}
                  id="line-team-search"
                  type="text"
                  className="form-control"
                  value={resultSearchTerm}
                  placeholder="Kezdj el gepelni..."
                  onChange={(event) => {
                    setResultSearchTerm(event.target.value)
                    setSelectedResultTeam(null)
                  }}
                />
                {!selectedResultTeam && resultSearchResults.length > 0 && (
                    <div className="list-group shadow-lg bg-white border border-dark rounded overflow-hidden" style={resultDropdownStyle}>
      {resultSearchResults.map((teamName) => (
        <button
          key={`${resultStage}-${teamName}`}
          type="button"
          className="list-group-item list-group-item-action"
          onClick={() => {
            setSelectedResultTeam({ id: teamName, team_name: teamName })
            setResultSearchTerm(teamName)
          }}
        >
          {teamName}
        </button>
      ))}
                  </div>
                )}
                {selectedResultTeam && <div className="small text-muted mt-2">Kivalasztva: {selectedResultTeam.team_name}</div>}
              </div>

              <div className="col-12 col-lg-2">
                <label className="form-label" htmlFor="line-result-time">Ido (s)</label>
                <input
                  id="line-result-time"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  className="form-control"
                  value={resultTime}
                  onChange={(event) => setResultTime(event.target.value)}
                />
              </div>

              <div className="col-12 col-lg-2">
                <button type="button" className="btn btn-primary w-100" onClick={handleSaveTopResult}>
                  Mentes
                </button>
              </div>
            </div>
          </div>
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="line-display-search">Eredmenyek keresese</label>
            <input
              id="line-display-search"
              type="text"
              className="form-control"
              value={displaySearchTerm}
              placeholder="Kereses nev, ido, szakasz vagy allapot alapjan"
              onChange={(event) => setDisplaySearchTerm(event.target.value)}
            />
          </div>

          <div className="d-flex justify-content-end mb-3">
          <div className="btn-group" role="group" aria-label="Rendezes">
            <button type="button" className={`btn btn-sm ${sortBy === 'name' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setSortBy('name')}>
              Nev szerint
            </button>
            <button type="button" className={`btn btn-sm ${sortBy === 'time' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setSortBy('time')}>
              Ido szerint
            </button>
          </div>
        </div>
        </>
      )}

      <div className="d-grid gap-3">
        {rounds.map((round, roundIndex) => {
          const roundEntries = getRoundEntries(round)
          const normalizedDisplaySearch = displaySearchTerm.trim().toLowerCase()
          const visibleRoundEntries = normalizedDisplaySearch
            ? roundEntries.filter((entry) => {
                const values = [
                  entry.team.team_name,
                  entry.bestTime === '' ? 'nincs eredmeny' : `${entry.bestTime} s`,
                  entry.saved ? 'mentve' : 'varakozik',
                  round.label
                ]

                return values.some((value) => value.toLowerCase().includes(normalizedDisplaySearch))
              })
            : roundEntries
          const advancingCount = Math.min(round.teams.length, Math.max(MIN_FINAL_TEAMS, round.advancingCount || getAdvancingCount(round.teams.length)))
          const advancingTeams = roundEntries
            .slice()
            .sort((a, b) => {
              const aBest = a.bestTime === '' ? Number.POSITIVE_INFINITY : a.bestTime
              const bBest = b.bestTime === '' ? Number.POSITIVE_INFINITY : b.bestTime
              return aBest - bBest || a.team.team_name.localeCompare(b.team.team_name)
            })
            .slice(0, advancingCount)
          const roundComplete = round.teams.every((team) => Boolean(getRoundSavedResult(roundResults, round.id, getResultKey(team))))
          const isFinalRound = round.teams.length <= MIN_FINAL_TEAMS
          const canAdvance = roundIndex === rounds.length - 1 && !isFinalRound && roundComplete

          return (
            <div key={round.id} className="card shadow-sm team-card no-hover-card">
              <div className="card-body p-3 p-md-4 border-bottom">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div>
                    <div className="home-kicker">Vonalkovetes</div>
                    <h4 className="mb-1">{round.label}</h4>
                    <p className="text-muted mb-0">Ket idot adj meg masodpercben, a gyorsabb eredmeny szamit.</p>
                  </div>
                  
                </div>
              </div>

              <div className="card-body p-3 p-md-4">
                <div className="d-grid gap-3">
                  {visibleRoundEntries.map((entry, entryIndex) => {
                    const teamName = entry.team.team_name
                    const entryKey = entry.resultKey || teamName
                    const isOpen = openEntries[`${round.id}:${entryKey}`] === true

                    return (
                      <div key={`${round.id}-${entry.team.id ?? entryKey}-${entryIndex}`} className="card shadow-sm team-card no-hover-card">
                        <button
                          type="button"
                          className="btn btn-outline-secondary w-100 text-start rounded-0 border-0 py-3 px-3 team-toggle"
                          onClick={() => toggleEntry(round.id, entryKey)}
                          aria-expanded={isOpen}
                        >
                          <div className="d-flex justify-content-between align-items-center gap-3">
                            <span className="fw-semibold">{teamName}</span>
                            <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end">
                              <span className="badge rounded-pill bg-light text-dark">{entry.bestTime === '' ? '-' : `${entry.bestTime} s`}</span>
                              <span className="small text-muted">{entry.saved ? 'Mentve' : 'Varakozik'}</span>
                              <span>{isOpen ? '^' : 'v'}</span>
                            </div>
                          </div>
                        </button>

                        <div className={`team-details ${isOpen ? 'open' : ''}`}>
                          <div className="card-body border-top bg-white">
                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                              <div className="small text-muted">Legjobb ido: {entry.bestTime === '' ? '-' : `${entry.bestTime} s`}</div>
                              <div className="small text-muted">Ket idot adj meg masodpercben</div>
                            </div>

                            <div className="row g-3 d-none">
                              <div className="col-12 col-md-4">
                                <label className="form-label mb-1">1. ido (s)</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  inputMode="decimal"
                                  className="form-control form-control-sm scoring-number-input"
                                  value={entry.firstTime}
                                  onFocus={(event) => event.target.select()}
                                  onClick={(event) => event.target.select()}
                                  onChange={(event) => handleFieldChange(round.id, teamName, 'firstTime', event.target.value === '' ? '' : Number(event.target.value))}
                                />
                              </div>
                              <div className="col-12 col-md-4">
                                <label className="form-label mb-1">2. ido (s)</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  inputMode="decimal"
                                  className="form-control form-control-sm scoring-number-input"
                                  value={entry.secondTime}
                                  onFocus={(event) => event.target.select()}
                                  onClick={(event) => event.target.select()}
                                  onChange={(event) => handleFieldChange(round.id, teamName, 'secondTime', event.target.value === '' ? '' : Number(event.target.value))}
                                />
                              </div>
                              <div className="col-12 col-md-4 d-flex align-items-end justify-content-md-end">
                                <button type="button" className="btn btn-primary w-100 w-md-auto" onClick={() => handleSave(round.id, entry.team)} disabled={!entry.changed}>
                                  Mentes
                                </button>
                              </div>
                            </div>
                            <div className="row g-3">
                              <div className="col-12 col-md-4">
                                <div className="border rounded p-3 bg-light h-100">
                                  <div className="small text-muted">Rogzitett ido</div>
                                  <div className="fw-bold">{entry.bestTime === '' ? 'Nincs eredmeny' : `${entry.bestTime} s`}</div>
                                </div>
                              </div>
                              <div className="col-12 col-md-4">
                                <div className="border rounded p-3 bg-light h-100">
                                  <div className="small text-muted">Szakasz</div>
                                  <div className="fw-bold">{round.label}</div>
                                </div>
                              </div>
                              <div className="col-12 col-md-4">
                                <div className="border rounded p-3 bg-light h-100">
                                  <div className="small text-muted">Allapot</div>
                                  <div className="fw-bold">{entry.saved ? 'Mentve' : 'Nincs meg mentett eredmeny'}</div>
                                </div>
                              </div>
                            </div>
                            <div className="d-flex justify-content-end mt-3">
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => setResultToDelete({
                                  teamName,
                                  resultKey: entry.resultKey,
                                  time: entry.bestTime,
                                  stage: Number(round.id.replace('round-', '')),
                                  stageLabel: round.label
                                })}
                                disabled={!entry.saved || entry.bestTime === ''}
                              >
                                torles
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {visibleRoundEntries.length === 0 && (
                    <div className="alert alert-secondary mb-0">Nincs talalat ebben a korben.</div>
                  )}
                </div>                  
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mt-4">
                  <div>
                    <div className="fw-semibold mb-1">Továbbjutó</div>
                    <div className="d-flex flex-wrap gap-2">
                      {advancingTeams.map((entry, entryIndex) => (
                        <span key={`${round.id}-advance-${entry.team.id ?? entryIndex}-${entry.team.team_name}-${entryIndex}`} className="badge rounded-pill bg-light text-dark border border-dark">
                          {entry.team.team_name} ({entry.bestTime === '' ? '-' : `${entry.bestTime} s`})
                        </span>
                      ))}
                    </div>
                  </div>

                  {canAdvance && (
                    <div className="d-flex flex-column align-items-start align-items-md-end gap-2">
                      <label className="form-label mb-0 fw-semibold" htmlFor={`advancing-count-${round.id}`}>
                        Hany csapat jut tovabb
                      </label>
                      <input
                        id={`advancing-count-${round.id}`}
                        type="number"
                        min={MIN_FINAL_TEAMS}
                        max={round.teams.length}
                        step="1"
                        className="form-control form-control-sm scoring-number-input text-end"
                        value={advancingCount}
                        onFocus={(event) => event.target.select()}
                        onClick={(event) => event.target.select()}
                        onChange={(event) => handleAdvancingCountChange(round.id, event.target.value, round.teams.length)}
                      />
                      <div className="text-muted small">A kovetkezo korbe ennyi legjobb csapat megy tovabb.</div>
                      <button type="button" className="btn btn-outline-primary" onClick={() => createNextRound(round, roundIndex)} disabled={!roundComplete}>
                        Kovetkezo kor letrehozasa
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {resultToDelete && (
        <>
          <div className="modal d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold text-dark">Vonalkovetes eredmeny torlese</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={() => setResultToDelete(null)}></button>
                </div>
                <div className="modal-body">
                  <p className="mb-2 text-dark">Biztosan torlod ezt az eredmenyt?</p>
                  <p className="fw-semibold mb-1 text-dark">{resultToDelete.teamName}</p>
                  <p className="small mb-0 text-dark">Ido: {resultToDelete.time} s</p>
                  <p className="small mb-0 text-dark">Szakasz: {resultToDelete.stageLabel}</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setResultToDelete(null)}>Megse</button>
                  <button type="button" className="btn btn-danger" onClick={handleDeleteResult}>torles</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop show"></div>
        </>
      )}
    </div>
  )
}
