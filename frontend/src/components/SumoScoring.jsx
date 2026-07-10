import React, { useEffect, useMemo, useState } from 'react'
import { getCompetitionConfig } from '../config/adminScoringConfig'

const competitionConfig = getCompetitionConfig('szumo')
const MAX_TEAMS = 64
const MAX_GROUPS = 8
const MAX_TEAMS_PER_GROUP = 8

const getRequiredGroupCount = (teamCount, maxTeamsPerGroup = MAX_TEAMS_PER_GROUP, maxGroups = MAX_GROUPS) => {
  if (!teamCount || teamCount <= 0) {
    return 1
  }

  return Math.min(maxGroups, Math.max(1, Math.ceil(Math.min(teamCount, MAX_TEAMS) / maxTeamsPerGroup)))
}

const createInitialGroupSizes = (groupCount, teamCount, maxTeamsPerGroup = MAX_TEAMS_PER_GROUP, maxGroups = MAX_GROUPS) => {
  const sizes = {}
  const safeTeamCount = Math.min(Math.max(0, teamCount || 0), MAX_TEAMS)
  const requiredGroupCount = getRequiredGroupCount(safeTeamCount, maxTeamsPerGroup, maxGroups)
  const resolvedGroupCount = Math.min(maxGroups, Math.max(requiredGroupCount, Math.max(1, groupCount || 1)))
  const baseSize = Math.floor(safeTeamCount / resolvedGroupCount)
  const remainder = safeTeamCount % resolvedGroupCount

  for (let index = 0; index < resolvedGroupCount; index += 1) {
    const size = baseSize + (index < remainder ? 1 : 0)
    sizes[index] = Math.min(maxTeamsPerGroup, Math.max(0, size))
  }

  return sizes
}

const shuffleTeams = (items) => {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }

  return shuffled
}

const createGroupMatches = (groupTeams, groupIndex) => {
  const pairMatches = []
  let pairIndex = 0

  for (let homeIndex = 0; homeIndex < groupTeams.length; homeIndex += 1) {
    for (let awayIndex = homeIndex + 1; awayIndex < groupTeams.length; awayIndex += 1) {
      const pairId = `group-${groupIndex}-pair-${pairIndex}`
      pairMatches.push({
        id: pairId,
        team1: groupTeams[homeIndex],
        team2: groupTeams[awayIndex]
      })
      pairIndex += 1
    }
  }

  return pairMatches
}

const buildTeamStats = (groups, matchResults) => {
  const stats = {}

  groups.forEach((group) => {
    group.teams.forEach((team) => {
      stats[team.id] = {
        wins: 0,
        losses: 0,
        draws: 0,
        history: []
      }
    })

    group.matches.forEach((pairMatch) => {
      const team1Stats = stats[pairMatch.team1.id]
      const team2Stats = stats[pairMatch.team2.id]
      const rawResultHistory = matchResults[pairMatch.id]
      const resultHistory = Array.isArray(rawResultHistory)
        ? rawResultHistory
        : rawResultHistory
          ? [rawResultHistory]
          : []

      if (!team1Stats || !team2Stats || resultHistory.length === 0) {
        return
      }

      resultHistory.forEach((result) => {
        if (result === 'draw') {
          team1Stats.draws += 1
          team2Stats.draws += 1
          team1Stats.history.push('D')
          team2Stats.history.push('D')
          return
        }

        if (result === pairMatch.team1.id) {
          team1Stats.wins += 1
          team2Stats.losses += 1
          team1Stats.history.push('W')
          team2Stats.history.push('L')
          return
        }

        if (result === pairMatch.team2.id) {
          team2Stats.wins += 1
          team1Stats.losses += 1
          team2Stats.history.push('W')
          team1Stats.history.push('L')
        }
      })
    })
  })

  return stats
}

export default function SumoScoring() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [groupCount, setGroupCount] = useState('1')
  const [groupSizes, setGroupSizes] = useState({})
  const [groups, setGroups] = useState([])
  const [matchResults, setMatchResults] = useState({})
  const [matchDrafts, setMatchDrafts] = useState({})
  const [openPairs, setOpenPairs] = useState({})
  const [openGroups, setOpenGroups] = useState({})

  useEffect(() => {
    const loadTeams = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await fetch('https://legocompetition.runasp.net/api/Teams')
        if (!response.ok) throw new Error('Nem sikerült betölteni a csapatokat.')

        const data = await response.json()
        const normalizedTeams = Array.isArray(data)
          ? data.map((team, index) => ({
              id: team.id ?? `${team.teamName || 'team'}-${index}`,
              name: team.teamName || `Csapat ${index + 1}`
            }))
          : []

        setTeams(normalizedTeams)

        if (normalizedTeams.length === 0) {
          setGroupCount('1')
          setGroupSizes({})
          setGroups([])
          setMatchResults({})
          setMatchDrafts({})
          setOpenGroups({})
          setOpenPairs({})
          return
        }

        const requiredGroupCount = getRequiredGroupCount(normalizedTeams.length)
        setGroupCount((currentGroupCount) => String(Math.max(requiredGroupCount, Number(currentGroupCount) || 1)))
        setGroupSizes(createInitialGroupSizes(requiredGroupCount, normalizedTeams.length))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadTeams()
  }, [])

  const totalGroupSize = useMemo(() => Object.values(groupSizes).reduce((sum, value) => sum + (Number(value) || 0), 0), [groupSizes])
  const teamStats = useMemo(() => buildTeamStats(groups, matchResults), [groups, matchResults])

  const handleGroupCountChange = (value) => {
    if (value === '') {
      setGroupCount('')
      return
    }

    const parsed = Number.parseInt(value, 10)
    const nextGroupCount = Number.isNaN(parsed) ? '' : String(Math.min(MAX_GROUPS, Math.max(1, parsed)))

    setGroupCount(nextGroupCount)
    setGroupSizes(createInitialGroupSizes(Number(nextGroupCount) || 1, teams.length))
  }

  const handleSizeChange = (groupIndex, size) => {
    if (size === '') {
      setGroupSizes((prev) => ({
        ...prev,
        [groupIndex]: ''
      }))
      return
    }

    const parsed = Number.parseInt(size, 10)
    setGroupSizes((prev) => ({
      ...prev,
      [groupIndex]: Number.isNaN(parsed) ? '' : String(Math.min(MAX_TEAMS_PER_GROUP, Math.max(0, parsed)))
    }))
  }

  const handleRandomDraw = () => {
    if (!teams.length) {
      setError('Előbb töltsd be a nevezett csapatokat.')
      return
    }

    if (teams.length > MAX_TEAMS) {
      setError(`Maximum ${MAX_TEAMS} csapat lehet a versenyen.`)
      return
    }

    const resolvedGroupCount = Number(groupCount) || 0

    if (resolvedGroupCount > MAX_GROUPS) {
      setError(`Maximum ${MAX_GROUPS} csoport lehet.`)
      return
    }

    if (totalGroupSize !== teams.length) {
      setError(`A csoportméretek összege ${totalGroupSize}, de ${teams.length} csapatot kell kiosztani.`)
      return
    }

    const hasTooLargeGroup = Object.values(groupSizes).some((value) => Number(value || 0) > MAX_TEAMS_PER_GROUP)
    if (hasTooLargeGroup) {
      setError(`Egy csoportban maximum ${MAX_TEAMS_PER_GROUP} csapat lehet.`)
      return
    }

    const shuffled = shuffleTeams(teams)
    const generatedGroups = []
    let teamIndex = 0

    for (let index = 0; index < resolvedGroupCount; index += 1) {
      const currentSize = Number(groupSizes[index] || 0)
      const groupTeams = shuffled.slice(teamIndex, teamIndex + currentSize)

      generatedGroups.push({
        id: `group-${index}`,
        name: `${String.fromCharCode(65 + index)} csoport`,
        teams: groupTeams,
        matches: createGroupMatches(groupTeams, index)
      })

      teamIndex += currentSize
    }

    setGroups(generatedGroups)
    setMatchResults({})
    setMatchDrafts({})
    setOpenGroups({})
    setOpenPairs({})
    setError('')
  }

  const handleMatchResultChange = (matchId, value) => {
    setMatchDrafts((prev) => ({
      ...prev,
      [matchId]: value
    }))
  }

  const saveMatchResult = (matchId) => {
    const nextResult = matchDrafts[matchId]

    if (!nextResult) {
      return
    }

    setMatchResults((prev) => ({
      ...prev,
      [matchId]: [
        ...(Array.isArray(prev[matchId]) ? prev[matchId] : prev[matchId] ? [prev[matchId]] : []),
        nextResult
      ]
    }))

    setMatchDrafts((prev) => {
      const nextDrafts = { ...prev }
      delete nextDrafts[matchId]
      return nextDrafts
    })
  }

  const deleteMatchResultAtIndex = (matchId, resultIndex) => {
    setMatchResults((prev) => {
      const existingHistory = Array.isArray(prev[matchId]) ? prev[matchId] : prev[matchId] ? [prev[matchId]] : []

      if (resultIndex < 0 || resultIndex >= existingHistory.length) {
        return prev
      }

      return {
        ...prev,
        [matchId]: existingHistory.filter((_, index) => index !== resultIndex)
      }
    })
  }

  const toggleGroup = (groupId) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId]
    }))
  }

  return (
    <div>
      <div className="alert alert-info mb-3">
        Kiválasztott versenyszám: <strong>{competitionConfig?.label || 'Szumó'}</strong>
      </div>

      {loading && <div className="alert alert-secondary">Csapatok betöltése...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      {!loading && !error && teams.length === 0 && <div className="alert alert-secondary">Ebben a versenyszámban még nincs csapat.</div>}

      {!loading && !error && teams.length > 0 && (
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body p-4">
            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
              <div>
                <div className="home-kicker">Szumó csoportkör</div>
                <h3 className="mb-2">Csoportok és meccsek kezelése</h3>
                <p className="text-muted mb-0">A sorsolás csak csoportokat hoz létre, és minden csapatpár három meccset játszik egymás ellen.</p>
              </div>
              <button type="button" className="btn btn-primary px-4" onClick={handleRandomDraw} disabled={loading}>
                Sorsolás
              </button>
            </div>

            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <label className="form-label fw-semibold" htmlFor="sumo-group-count">Csoportok száma</label>
                <input
                  id="sumo-group-count"
                  type="number"
                  className="form-control"
                  min="1"
                  max={MAX_GROUPS}
                  value={groupCount}
                  onFocus={(event) => event.target.select()}
                  onChange={(event) => handleGroupCountChange(event.target.value)}
                />
              </div>
              <div className="col-md-8 d-flex align-items-end">
                <div>
                  <div className="text-muted small">Összesen nevezett csapatok: {teams.length}</div>
                  <div className="text-muted small">Javasolt csoportméret: {Math.max(1, Math.ceil(teams.length / Math.min(MAX_GROUPS, Number(groupCount) || 1)))} fő / csoport</div>
                </div>
              </div>
            </div>

            <h5 className="mb-3">Csapatok száma csoportonként</h5>
            <div className="row g-3 mb-4">
              {Array.from({ length: Number(groupCount) || 1 }).map((_, index) => (
                <div className="col-md-6 col-xl-4" key={`group-size-${index}`}>
                  <label className="form-label fw-semibold" htmlFor={`group-size-${index}`}>
                    {String.fromCharCode(65 + index)} csoport
                  </label>
                  <input
                    id={`group-size-${index}`}
                    type="number"
                    className="form-control"
                    min="0"
                    max={MAX_TEAMS_PER_GROUP}
                    value={groupSizes[index] ?? ''}
                    onFocus={(event) => event.target.select()}
                    onChange={(event) => handleSizeChange(index, event.target.value)}
                  />
                </div>
              ))}
            </div>

            <div className="d-flex flex-wrap gap-2 align-items-center">
              <div className="text-muted">Összesen: {totalGroupSize} / {teams.length} csapat beállítva</div>
            </div>
          </div>
        </div>
      )}

      {groups.length > 0 && (
        <div className="d-grid gap-3">
          {groups.map((group) => {
            const isGroupOpen = openGroups[group.id] === true

            return (
              <div className="card shadow-sm team-card no-hover-card" key={group.id}>
                <button
                  type="button"
                  className="btn btn-outline-secondary w-100 text-start rounded-0 border-0 py-3 px-3 team-toggle"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={isGroupOpen}
                >
                  <div className="d-flex align-items-center justify-content-between gap-3 pair-toggle-header">
                    <span className="fw-semibold pair-toggle-team pair-toggle-team--left">{group.name}</span>
                    <span className="pair-toggle-chevron">{isGroupOpen ? '▴' : '▾'}</span>
                    <span className="fw-semibold pair-toggle-team pair-toggle-team--right">{group.teams.length} csapat</span>
                  </div>
                </button>

                <div className={`team-details ${isGroupOpen ? 'open' : ''}`}>
                  <div className="card-body p-3 p-md-4 border-top">
                    <div className="row g-4">
                      <div className="col-12 col-lg-4">
                        <div className="team-detail-section h-100">
                          <h5 className="mb-3">Csapatok és eredmények</h5>
                          <div className="d-grid gap-3">
                            {group.teams.map((team) => {
                              const stats = teamStats[team.id] || { wins: 0, losses: 0, draws: 0, history: [] }
                              const historyLabel = stats.history.length > 0 ? stats.history.join(', ') : 'Még nincs eredmény'

                              return (
                                <div key={team.id} className="border rounded p-3 bg-white">
                                  <div className="fw-semibold mb-1">{team.name}</div>
                                  <div className="small text-muted mb-1">W/L/D: {stats.wins}/{stats.losses}/{stats.draws}</div>
                                  <div className="small text-muted">Eredmények: {historyLabel}</div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="col-12 col-lg-8">
                        <div className="team-detail-section">
                          <h5 className="mb-3">Meccsek</h5>
                          {group.matches.length > 0 ? (
                            <div className="d-grid gap-3">
                              {group.matches.map((pairMatch) => {
                                const isOpen = openPairs[pairMatch.id] === true
                                const selectedValue = matchDrafts[pairMatch.id] ?? ''
                                const savedHistory = matchResults[pairMatch.id] || []

                                const pairTeamStats = savedHistory.reduce(
                                  (accumulator, result) => {
                                    if (result === 'draw') {
                                      accumulator.team1.draws += 1
                                      accumulator.team2.draws += 1
                                      accumulator.team1.history.push('D')
                                      accumulator.team2.history.push('D')
                                      return accumulator
                                    }

                                    if (result === pairMatch.team1.id) {
                                      accumulator.team1.wins += 1
                                      accumulator.team2.losses += 1
                                      accumulator.team1.history.push('W')
                                      accumulator.team2.history.push('L')
                                      return accumulator
                                    }

                                    if (result === pairMatch.team2.id) {
                                      accumulator.team2.wins += 1
                                      accumulator.team1.losses += 1
                                      accumulator.team2.history.push('W')
                                      accumulator.team1.history.push('L')
                                    }

                                    return accumulator
                                  },
                                  {
                                    team1: { wins: 0, losses: 0, draws: 0, history: [] },
                                    team2: { wins: 0, losses: 0, draws: 0, history: [] }
                                  }
                                )

                                return (
                                  <div key={pairMatch.id} className="card shadow-sm team-card no-hover-card">
                                    <button
                                      type="button"
                                      className="btn btn-outline-secondary w-100 text-start rounded-0 border-0 py-3 px-3 team-toggle"
                                      onClick={() => setOpenPairs((prev) => ({ ...prev, [pairMatch.id]: !isOpen }))}
                                      aria-expanded={isOpen}
                                    >
                                      <div className="d-flex align-items-center justify-content-between gap-3 pair-toggle-header">
                                        <span className="fw-semibold pair-toggle-team pair-toggle-team--left">{pairMatch.team1.name}</span>
                                        <span className="pair-toggle-chevron">{isOpen ? '▴' : '▾'}</span>
                                        <span className="fw-semibold pair-toggle-team pair-toggle-team--right">{pairMatch.team2.name}</span>
                                      </div>
                                    </button>

                                    <div className={`team-details ${isOpen ? 'open' : ''}`}>
                                      <div className="card-body border-top">
                                        <div className="border rounded p-3 bg-light">
                                          <div className="row g-3 mb-3">
                                            <div className="col-12 col-md-6">
                                              <div className="border rounded p-2 bg-white h-100">
                                                <div className="fw-semibold">{pairMatch.team1.name}</div>
                                                <div className="small text-muted">W/L/D: {pairTeamStats.team1.wins}/{pairTeamStats.team1.losses}/{pairTeamStats.team1.draws}</div>
                                                {savedHistory.length > 0 && (
                                                  <div className="d-flex flex-wrap gap-2 mt-2">
                                                    {savedHistory.map((result, resultIndex) => (
                                                      <button
                                                        key={`${pairMatch.id}-team1-saved-${resultIndex}`}
                                                        type="button"
                                                        className={`btn btn-sm sumo-history-chip ${result === pairMatch.team1.id ? 'sumo-history-chip--win' : result === pairMatch.team2.id ? 'sumo-history-chip--loss' : 'sumo-history-chip--draw'}`}
                                                        onClick={() => deleteMatchResultAtIndex(pairMatch.id, resultIndex)}
                                                        aria-label={`Törlés: ${result === pairMatch.team1.id ? 'W' : result === pairMatch.team2.id ? 'L' : 'D'}`}
                                                      >
                                                        {result === pairMatch.team1.id ? 'W' : result === pairMatch.team2.id ? 'L' : result === 'draw' ? 'D' : '?'}
                                                      </button>
                                                    ))}
                                                  </div>
                                                )}
                                                <div className="small text-muted mt-1">Törléshez kattints a W, L vagy D jelölésre.</div>
                                              </div>
                                            </div>
                                            <div className="col-12 col-md-6">
                                              <div className="border rounded p-2 bg-white h-100">
                                                <div className="fw-semibold">{pairMatch.team2.name}</div>
                                                <div className="small text-muted">W/L/D: {pairTeamStats.team2.wins}/{pairTeamStats.team2.losses}/{pairTeamStats.team2.draws}</div>
                                                 {savedHistory.length > 0 && (
                                                  <div className="d-flex flex-wrap gap-2 mt-2">
                                                    {savedHistory.map((result, resultIndex) => (
                                                      <button
                                                        key={`${pairMatch.id}-team2-saved-${resultIndex}`}
                                                        type="button"
                                                        className={`btn btn-sm sumo-history-chip ${result === pairMatch.team2.id ? 'sumo-history-chip--win' : result === pairMatch.team1.id ? 'sumo-history-chip--loss' : 'sumo-history-chip--draw'}`}
                                                        onClick={() => deleteMatchResultAtIndex(pairMatch.id, resultIndex)}
                                                        aria-label={`Törlés: ${result === pairMatch.team2.id ? 'W' : result === pairMatch.team1.id ? 'L' : 'D'}`}
                                                      >
                                                        {result === pairMatch.team2.id ? 'W' : result === pairMatch.team1.id ? 'L' : result === 'draw' ? 'D' : '?'}
                                                      </button>
                                                    ))}
                                                  </div>
                                                )}
                                                <div className="small text-muted mt-1">Törléshez kattints a W, L vagy D jelölésre.</div>
                                              </div>
                                            </div>
                                          </div>                                          
                                          <div className="d-flex flex-column flex-md-row gap-2 align-items-stretch">
                                            <div className="d-grid gap-2 flex-grow-1" role="group" aria-label={`${pairMatch.team1.name} vs ${pairMatch.team2.name}`}>
                                              <button
                                                type="button"
                                                className={`btn btn-sm sumo-result-btn ${selectedValue === pairMatch.team1.id ? 'active' : ''}`}
                                                onClick={() => handleMatchResultChange(pairMatch.id, pairMatch.team1.id)}
                                              >
                                                {pairMatch.team1.name}
                                              </button>
                                              <button
                                                type="button"
                                                className={`btn btn-sm sumo-result-btn ${selectedValue === pairMatch.team2.id ? 'active' : ''}`}
                                                onClick={() => handleMatchResultChange(pairMatch.id, pairMatch.team2.id)}
                                              >
                                                {pairMatch.team2.name}
                                              </button>
                                              <button
                                                type="button"
                                                className={`btn btn-sm sumo-result-btn ${selectedValue === 'draw' ? 'active' : ''}`}
                                                onClick={() => handleMatchResultChange(pairMatch.id, 'draw')}
                                              >
                                                Döntetlen
                                              </button>
                                            </div>

                                            <button
                                              type="button"
                                              className="btn btn-outline-success align-self-md-center"
                                              disabled={!selectedValue}
                                              onClick={() => saveMatchResult(pairMatch.id)}
                                            >
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
                          ) : (
                            <div className="alert alert-secondary mb-0">Ebben a csoportban még nincs meccs.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
