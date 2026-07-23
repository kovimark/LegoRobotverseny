import React, { useEffect, useState } from 'react'
import FloatingFeedback from './FloatingFeedback'
import CategorizedResultsStandings from './CategorizedResultsStandings'
import { getCompetitionConfig } from '../config/adminScoringConfig'

const competitionConfig = getCompetitionConfig('hegymaszas')

export default function HillClimbingScoring() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openTeamName, setOpenTeamName] = useState(null)
  const [pendingUpdates, setPendingUpdates] = useState({})
  const [actionMessage, setActionMessage] = useState(null)
  const [sortBy, setSortBy] = useState('name')
  const [allTeams, setAllTeams] = useState([])

  useEffect(() => {
    const loadTeams = async () => {
      setLoading(true)
      setError('')
      setOpenTeamName(null)

      try {
        const [response, teamsResponse] = await Promise.all([fetch(`https://legocompetition.runasp.net/api/${competitionConfig.apiPath}`), fetch('https://legocompetition.runasp.net/api/Teams')])
        if (!response.ok) throw new Error('Nem sikerült betölteni a csapatokat.')
        const data = await response.json()
        const teamsData = teamsResponse.ok ? await teamsResponse.json() : []
        setTeams(Array.isArray(data) ? data : [])
        setAllTeams(Array.isArray(teamsData) ? teamsData : [])
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

  const toggleTeam = (teamName) => {
    setOpenTeamName((prev) => (prev === teamName ? null : teamName))
  }

  const getSortedTeams = (items) => {
    const sorted = [...items]

    sorted.sort((a, b) => {
      const aName = (a.team_name || '').toLowerCase()
      const bName = (b.team_name || '').toLowerCase()
      const aPoints = Number(a.points_scored ?? 0)
      const bPoints = Number(b.points_scored ?? 0)

      if (sortBy === 'points') {
        return bPoints - aPoints || aName.localeCompare(bName)
      }

      return aName.localeCompare(bName)
    })

    return sorted
  }

  const categoryByTeamName = new Map(allTeams.map((team) => [team.teamName || team.team_name, Number(team.category) === 1 ? 1 : 0]))
  const standings = [...teams].sort((left, right) => Number(right.completed_level || 0) - Number(left.completed_level || 0) || Number(left.time_spent_on_level || 0) - Number(right.time_spent_on_level || 0) || String(left.team_name).localeCompare(String(right.team_name))).map((team) => ({ ...team, category: categoryByTeamName.get(team.team_name) ?? 0 }))

  const handleFieldChange = (teamName, field, value) => {
    setPendingUpdates((prev) => ({
      ...prev,
      [teamName]: {
        ...(prev[teamName] || {}),
        [field]: value
      }
    }))
  }

  const normalizeRaceState = (value) => {
    if (value === true || value === 'true') return 0
    if (value === false || value === 'false') return 1
    if (value === 0 || value === '0') return 0
    if (value === 1 || value === '1') return 1
    return 0
  }

  const hasPendingChange = (team) => {
    const teamName = team.team_name
    if (!teamName) return false

    const currentLevel = Number(team.completed_level ?? 0)
    const currentTime = Number(team.time_spent_on_level ?? 0)
    const currentRaceState = normalizeRaceState(team.eliminated)
    const pendingLevel = Number(pendingUpdates[teamName]?.completed_level ?? team.completed_level ?? 0)
    const pendingTime = Number(pendingUpdates[teamName]?.time_spent_on_level ?? team.time_spent_on_level ?? 0)
    const pendingRaceState = normalizeRaceState(pendingUpdates[teamName]?.eliminated ?? team.eliminated)

    return pendingLevel !== currentLevel || pendingTime !== currentTime || pendingRaceState !== currentRaceState
  }

  const handleSave = async (team) => {
    const update = pendingUpdates[team.team_name] || {}
    const teamName = team.team_name
    if (!teamName || !hasPendingChange(team)) return

    try {
      const currentLevel = Number(team.completed_level ?? 0)
      const currentTime = Number(team.time_spent_on_level ?? 0)
      const currentRaceState = normalizeRaceState(team.eliminated)
      const level = Number(update.completed_level ?? team.completed_level ?? 0)
      const timeSpent = Number(update.time_spent_on_level ?? team.time_spent_on_level ?? 0)
      const raceStateValue = normalizeRaceState(update.eliminated === undefined ? team.eliminated : update.eliminated)

      const hasLevelTimeChange = level !== currentLevel || timeSpent !== currentTime
      const hasRaceStateChange = raceStateValue !== currentRaceState

      if (hasLevelTimeChange) {
        await fetch(`https://legocompetition.runasp.net/api/${competitionConfig.apiPath}/${encodeURIComponent(teamName)}/${level}/${timeSpent}`, {
          method: 'PATCH'
        })
      }

      if (hasRaceStateChange) {
        await fetch(`https://legocompetition.runasp.net/api/${competitionConfig.apiPath}/${encodeURIComponent(teamName)}/${raceStateValue}`, {
          method: 'PATCH'
        })
      }

      setActionMessage({ type: 'success', text: 'A frissítés sikeres volt.' })
      setPendingUpdates((prev) => {
        const next = { ...prev }
        delete next[teamName]
        return next
      })

      const response = await fetch(`https://legocompetition.runasp.net/api/${competitionConfig.apiPath}`)
      const data = await response.json()
      setTeams(Array.isArray(data) ? data : [])
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.message })
    }
  }

  return (
    <div>
      <div className="alert alert-info">Kiválasztott versenyszám: <strong>{competitionConfig.label}</strong></div>
      <FloatingFeedback message={actionMessage} onClose={() => setActionMessage(null)} />
      {loading && <div className="alert alert-secondary">Csapatok betöltése...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      {!loading && !error && teams.length === 0 && <div className="alert alert-secondary">Ebben a versenyszámban még nincs csapat.</div>}

      {!loading && !error && teams.length > 0 && (
        <><CategorizedResultsStandings title="Hegymászás eredménytáblája" rows={standings} getKey={(team) => team.team_name} columns={[{ key: 'team', label: 'Csapat', render: (team) => team.team_name }, { key: 'level', label: 'Elért szint', align: 'end', render: (team) => Number(team.completed_level || 0) }, { key: 'time', label: 'Idő', align: 'end', render: (team) => `${Number(team.time_spent_on_level || 0)} s` }, { key: 'status', label: 'Állapot', render: (team) => Number(team.eliminated) === 1 ? 'Kiesett' : 'Versenyben' }]} /><div className="d-flex justify-content-end mb-3">
          <div className="btn-group" role="group" aria-label="Rendezés">
            <button type="button" className={`btn btn-sm ${sortBy === 'name' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setSortBy('name')}>
              Név szerint
            </button>
            <button type="button" className={`btn btn-sm ${sortBy === 'points' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setSortBy('points')}>
              Pont szerint
            </button>
          </div>
        </div></>
      )}

      <div className="d-flex flex-column gap-3">
        {getSortedTeams(teams).map((team) => {
          const isOpen = openTeamName === team.team_name
          const draft = pendingUpdates[team.team_name] || {}
          const completedLevel = draft.completed_level ?? team.completed_level ?? 0
          const changed = hasPendingChange(team)
          const timeSpent = draft.time_spent_on_level ?? team.time_spent_on_level ?? 0
          const raceState = normalizeRaceState(draft.eliminated ?? team.eliminated)
          const points = draft.points_scored ?? team.points_scored ?? 0
          const isEliminated = raceState === 1

          return (
            <div key={team.team_name} className="card shadow-sm team-card">
              <button type="button" className="btn btn-outline-secondary w-100 text-start rounded-0 border-0 py-3 px-3 team-toggle" onClick={() => toggleTeam(team.team_name)} aria-expanded={isOpen}>
                <div className="d-flex justify-content-between align-items-center gap-3">
                  <span className="fw-semibold">{team.team_name || 'Ismeretlen csapat'}</span>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span className={`badge rounded-pill ${isEliminated ? 'bg-danger text-white' : 'bg-success text-white'}`}>
                      {isEliminated ? 'Kiesett' : 'Versenyben'}
                    </span>
                    <span className="badge rounded-pill bg-light text-dark">{Number(points)} pont • {Number(timeSpent)} s</span>
                  </div>
                  <span>{isOpen ? '▴' : '▾'}</span>
                </div>
              </button>

              <div className={`team-details ${isOpen ? 'open' : ''}`}>
                <div className="card-body border-top py-3">
                  <div className="d-flex flex-wrap gap-2 align-items-end">
                    <div className="flex-grow-1" style={{ minWidth: '9rem' }}>
                      <label className="form-label mb-1">Elért szint</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="form-control form-control-sm scoring-number-input"
                        value={completedLevel}
                        onFocus={(event) => event.target.select()}
                        onClick={(event) => event.target.select()}
                        onChange={(event) => handleFieldChange(team.team_name, 'completed_level', Number(event.target.value))}
                      />
                    </div>
                    <div className="flex-grow-1" style={{ minWidth: '9rem' }}>
                      <label className="form-label mb-1">Eltöltött idő</label>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        inputMode="decimal"
                        className="form-control form-control-sm scoring-number-input"
                        value={timeSpent}
                        onFocus={(event) => event.target.select()}
                        onClick={(event) => event.target.select()}
                        onChange={(event) => handleFieldChange(team.team_name, 'time_spent_on_level', Number(event.target.value))}
                      />
                    </div>
                    <div className="flex-grow-1" style={{ minWidth: '10rem' }}>
                      <label className="form-label mb-1">Versenystátusz</label>
                      <select
                        className="form-select form-select-sm scoring-select-input"
                        value={raceState === null || raceState === undefined ? '' : raceState}
                        onChange={(event) => handleFieldChange(team.team_name, 'eliminated', Number(event.target.value))}
                      >
                        <option value="0">Versenyben</option>
                        <option value="1">Kiesett</option>
                      </select>
                    </div>
                  </div>
                  <div className="d-flex justify-content-end mt-3">
                    <button type="button" className="btn btn-primary" onClick={() => handleSave(team)} disabled={!changed}>
                      Mentés
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
