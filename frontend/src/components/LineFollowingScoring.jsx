import React, { useEffect, useState } from 'react'
import { getCompetitionConfig } from '../config/adminScoringConfig'

const competitionConfig = getCompetitionConfig('vonalkovetes')
const MIN_FINAL_TEAMS = 3

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

export default function LineFollowingScoring() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rounds, setRounds] = useState([])
  const [roundDrafts, setRoundDrafts] = useState({})
  const [roundResults, setRoundResults] = useState({})
  const [openEntries, setOpenEntries] = useState({})
  const [actionMessage, setActionMessage] = useState(null)
  const [sortBy, setSortBy] = useState('name')

  useEffect(() => {
    const loadTeams = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(`https://legocompetition.runasp.net/api/${competitionConfig.apiPath}`)
        if (!response.ok) throw new Error('Nem sikerült betölteni a csapatokat.')

        const data = await response.json()
        const normalizedTeams = Array.isArray(data)
          ? data.map((team, index) => ({
              id: team.id ?? `${team.team_name || team.teamName || 'team'}-${index}`,
              team_name: team.team_name || team.teamName || `Csapat ${index + 1}`
            }))
          : []

        setTeams(normalizedTeams)
        setRounds(
          normalizedTeams.length > 0
            ? [{ id: 'round-1', label: '1. kör', teams: normalizedTeams, advancingCount: getAdvancingCount(normalizedTeams.length) }]
            : []
        )
        setRoundDrafts({})
        setRoundResults({})
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
        const aDraft = getRoundDraft(roundDrafts, roundId, a.team_name)
        const bDraft = getRoundDraft(roundDrafts, roundId, b.team_name)
        const aSaved = getRoundSavedResult(roundResults, roundId, a.team_name)
        const bSaved = getRoundSavedResult(roundResults, roundId, b.team_name)
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
      setActionMessage({ type: 'danger', text: 'Mindkét időt ki kell tölteni másodpercben.' })
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

      setActionMessage({ type: 'success', text: 'A frissítés sikeres volt.' })
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

  const getRoundEntries = (round) => getSortedTeams(round.teams, round.id).map((team) => {
    const savedResult = getRoundSavedResult(roundResults, round.id, team.team_name)
    const draft = getRoundDraft(roundDrafts, round.id, team.team_name)
    const firstTime = draft.firstTime || savedResult?.firstTime || ''
    const secondTime = draft.secondTime || savedResult?.secondTime || ''
    const bestTime = getBestTime(firstTime, secondTime)

    return {
      team,
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
        label: advancingTeams.length <= MIN_FINAL_TEAMS ? 'Top 3 döntő' : `${roundIndex + 2}. kör`,
        teams: advancingTeams,
        advancingCount: getAdvancingCount(advancingTeams.length)
      }
    ])
  }

  const isLatestRound = (roundIndex) => roundIndex === rounds.length - 1

  return (
    <div>
      <div className="alert alert-info">Kiválasztott versenyszám: <strong>{competitionConfig.label}</strong></div>

      {actionMessage && <div className={`alert ${actionMessage.type === 'success' ? 'alert-success' : 'alert-danger'} mb-3`} role="status">{actionMessage.text}</div>}
      {loading && <div className="alert alert-secondary">Csapatok betöltése...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      {!loading && !error && teams.length === 0 && <div className="alert alert-secondary">Ebben a versenyszámban még nincs csapat.</div>}

      {!loading && !error && teams.length > 0 && (
        <div className="d-flex justify-content-end mb-3">
          <div className="btn-group" role="group" aria-label="Rendezés">
            <button type="button" className={`btn btn-sm ${sortBy === 'name' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setSortBy('name')}>
              Név szerint
            </button>
            <button type="button" className={`btn btn-sm ${sortBy === 'time' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setSortBy('time')}>
              Idő szerint
            </button>
          </div>
        </div>
      )}

      <div className="d-grid gap-3">
        {rounds.map((round, roundIndex) => {
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
          const roundComplete = round.teams.every((team) => Boolean(getRoundSavedResult(roundResults, round.id, team.team_name)))
          const isFinalRound = round.teams.length <= MIN_FINAL_TEAMS
          const canAdvance = roundIndex === rounds.length - 1 && !isFinalRound && roundComplete

          return (
            <div key={round.id} className="card shadow-sm team-card no-hover-card">
              <div className="card-body p-3 p-md-4 border-bottom">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div>
                    <div className="home-kicker">Vonalkövetés</div>
                    <h4 className="mb-1">{round.label}</h4>
                    <p className="text-muted mb-0">Két időt adj meg másodpercben, a gyorsabb eredmény számít.</p>
                  </div>
                  
                </div>
              </div>

              <div className="card-body p-3 p-md-4">
                <div className="d-grid gap-3">
                  {roundEntries.map((entry) => {
                    const teamName = entry.team.team_name
                    const isOpen = openEntries[`${round.id}:${teamName}`] === true

                    return (
                      <div key={`${round.id}-${teamName}`} className="card shadow-sm team-card no-hover-card">
                        <button
                          type="button"
                          className="btn btn-outline-secondary w-100 text-start rounded-0 border-0 py-3 px-3 team-toggle"
                          onClick={() => toggleEntry(round.id, teamName)}
                          aria-expanded={isOpen}
                        >
                          <div className="d-flex justify-content-between align-items-center gap-3">
                            <span className="fw-semibold">{teamName}</span>
                            <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end">
                              <span className="badge rounded-pill bg-light text-dark">{entry.bestTime === '' ? '–' : `${entry.bestTime} s`}</span>
                              <span className="small text-muted">{entry.saved ? 'Mentve' : 'Várakozik'}</span>
                              <span>{isOpen ? '▴' : '▾'}</span>
                            </div>
                          </div>
                        </button>

                        <div className={`team-details ${isOpen ? 'open' : ''}`}>
                          <div className="card-body border-top bg-white">
                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                              <div className="small text-muted">Legjobb idő: {entry.bestTime === '' ? '–' : `${entry.bestTime} s`}</div>
                              <div className="small text-muted">Két időt adj meg másodpercben</div>
                            </div>

                            <div className="row g-3">
                              <div className="col-12 col-md-4">
                                <label className="form-label mb-1">1. idő (s)</label>
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
                                <label className="form-label mb-1">2. idő (s)</label>
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
                                  Mentés
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>                  
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mt-4">
                  <div>
                    <div className="fw-semibold mb-1">Továbbjutó csapatok</div>
                    <div className="d-flex flex-wrap gap-2">
                      {advancingTeams.map((entry) => (
                        <span key={`${round.id}-advance-${entry.team.team_name}`} className="badge rounded-pill bg-light text-dark border border-dark">
                          {entry.team.team_name} ({entry.bestTime === '' ? '–' : `${entry.bestTime} s`})
                        </span>
                      ))}
                    </div>
                  </div>

                  {canAdvance && (
                    <div className="d-flex flex-column align-items-start align-items-md-end gap-2">
                      <label className="form-label mb-0 fw-semibold" htmlFor={`advancing-count-${round.id}`}>
                        Hány csapat jut tovább
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
                      <div className="text-muted small">A következő körbe ennyi legjobb csapat megy tovább.</div>
                      <button type="button" className="btn btn-outline-primary" onClick={() => createNextRound(round, roundIndex)} disabled={!roundComplete}>
                        Következő kör létrehozása
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}