import React, { useEffect, useState } from 'react'
import { getCompetitionConfig } from '../config/adminScoringConfig'

const competitionConfig = getCompetitionConfig('szumo')

export default function SumoScoring() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openTeamName, setOpenTeamName] = useState(null)
  const [pendingUpdates, setPendingUpdates] = useState({})
  const [actionMessage, setActionMessage] = useState(null)
  const [sortBy, setSortBy] = useState('name')

  useEffect(() => {
    const loadTeams = async () => {
      setLoading(true)
      setError('')
      setOpenTeamName(null)

      try {
        const response = await fetch(`https://legocompetition.runasp.net/api/${competitionConfig.apiPath}`)
        if (!response.ok) throw new Error('Nem sikerült betölteni a csapatokat.')
        const data = await response.json()
        setTeams(Array.isArray(data) ? data : [])
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

  const handleFieldChange = (teamName, field, value) => {
    setPendingUpdates((prev) => ({
      ...prev,
      [teamName]: {
        ...(prev[teamName] || {}),
        [field]: value
      }
    }))
  }

  const hasPendingChange = (team) => {
    const teamName = team.team_name
    if (!teamName) return false

    const currentValue = Number(team.points_scored ?? 0)
    const pendingValue = Number(pendingUpdates[teamName]?.points_scored ?? team.points_scored ?? 0)

    return pendingValue !== currentValue
  }

  const handleSave = async (team) => {
    const update = pendingUpdates[team.team_name] || {}
    const teamName = team.team_name
    if (!teamName || !hasPendingChange(team)) return

    try {
      const points = update.points_scored ?? team.points_scored ?? 0
      await fetch(`https://legocompetition.runasp.net/api/${competitionConfig.apiPath}/${encodeURIComponent(teamName)}/${points}`, {
        method: 'PATCH'
      })

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
            <button type="button" className={`btn btn-sm ${sortBy === 'points' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setSortBy('points')}>
              Pont szerint
            </button>
          </div>
        </div>
      )}

      <div className="d-flex flex-column gap-3">
        {getSortedTeams(teams).map((team) => {
          const isOpen = openTeamName === team.team_name
          const draft = pendingUpdates[team.team_name] || {}
          const points = draft.points_scored ?? team.points_scored ?? 0
          const changed = hasPendingChange(team)

          return (
            <div key={team.team_name} className="card shadow-sm team-card">
              <button type="button" className="btn btn-outline-secondary w-100 text-start rounded-0 border-0 py-3 px-3 team-toggle" onClick={() => toggleTeam(team.team_name)} aria-expanded={isOpen}>
                <div className="d-flex justify-content-between align-items-center gap-3">
                  <span className="fw-semibold">{team.team_name || 'Ismeretlen csapat'}</span>
                  <span className="badge rounded-pill bg-light text-dark">{Number(points)} pont</span>
                  <span>{isOpen ? '▴' : '▾'}</span>
                </div>
              </button>

              <div className={`team-details ${isOpen ? 'open' : ''}`}>
                <div className="card-body border-top">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Pontszám</label>
                      <input
                        type="number"
                        className="form-control form-control-sm scoring-number-input"
                        value={points}
                        onFocus={(event) => event.target.select()}
                        onClick={(event) => event.target.select()}
                        onChange={(event) => handleFieldChange(team.team_name, 'points_scored', Number(event.target.value))}
                      />
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
