import React, { useEffect, useState } from 'react'
import { getCompetitionConfig } from '../config/adminScoringConfig'

const competitionConfig = getCompetitionConfig('kosarra-dobas')
const BOARD_SCORES = [1, 2, 3, 4, 5]

const createEmptyBoardDraft = () => BOARD_SCORES.reduce((accumulator, boardScore) => {
  accumulator[`board${boardScore}`] = ''
  return accumulator
}, {})

const calculateBoardPoints = (draft) => BOARD_SCORES.reduce((sum, boardScore) => {
  const hits = Number(draft?.[`board${boardScore}`] ?? 0)
  return sum + (Number.isNaN(hits) ? 0 : hits * boardScore)
}, 0)

const calculateTotalThrows = (draft) => BOARD_SCORES.reduce((sum, boardScore) => {
  const hits = Number(draft?.[`board${boardScore}`] ?? 0)
  return sum + (Number.isNaN(hits) ? 0 : hits)
}, 0)

const hasAnyBoardValue = (draft) => BOARD_SCORES.some((boardScore) => {
  const value = draft?.[`board${boardScore}`]
  return value !== '' && Number(value) > 0
})

const logBasketballPayload = (label, payload) => {
  if (typeof console !== 'undefined' && typeof console.log === 'function') {
    console.log(`[BasketThrowScoring] ${label}`, payload)
  }
}

const normalizeBoardCounts = (team) => BOARD_SCORES.reduce((accumulator, boardScore) => {
  accumulator[`board${boardScore}`] = Number(team?.[`hoop${boardScore}`] ?? 0)
  return accumulator
}, {})

const normalizeTeam = (team, index) => ({
  ...team,
  team_name: team.team_name || team.teamName || `Csapat ${index + 1}`,
  points_scored: Number(team.points_scored ?? 0)
})

export default function BasketThrowScoring() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openTeamName, setOpenTeamName] = useState(null)
  const [pendingUpdates, setPendingUpdates] = useState({})
  const [savedBoardCounts, setSavedBoardCounts] = useState({})
  const [actionMessage, setActionMessage] = useState(null)
  const [sortBy, setSortBy] = useState('name')

  useEffect(() => {
    const loadTeams = async () => {
      setLoading(true)
      setError('')
      setOpenTeamName(null)
      setSavedBoardCounts({})

      try {
        const response = await fetch(`https://legocompetition.runasp.net/api/${competitionConfig.apiPath}`)
        if (!response.ok) {
          throw new Error('Nem sikerült betölteni a csapatokat.')
        }

        const data = await response.json()
        const normalizedTeams = Array.isArray(data) ? data.map(normalizeTeam) : []
        const normalizedSavedCounts = normalizedTeams.reduce((accumulator, team) => {
          accumulator[team.team_name] = normalizeBoardCounts(team)
          return accumulator
        }, {})

        setTeams(normalizedTeams)
        setSavedBoardCounts(normalizedSavedCounts)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadTeams()
  }, [])

  useEffect(() => {
    if (!actionMessage) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => setActionMessage(null), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [actionMessage])

  const toggleTeam = (teamName) => {
    setOpenTeamName((prev) => (prev === teamName ? null : teamName))
  }

  const handleFieldChange = (teamName, boardScore, value) => {
    setPendingUpdates((prev) => {
      const nextDraft = {
        ...(prev[teamName] || createEmptyBoardDraft()),
        [`board${boardScore}`]: value
      }

      if (calculateTotalThrows(nextDraft) > 5) {
        setActionMessage({ type: 'danger', text: 'Kosárra dobásnál összesen legfeljebb 5 dobás adható meg.' })
        return prev
      }

      return {
        ...prev,
        [teamName]: nextDraft
      }
    })
  }

  const hasPendingChange = (team) => {
    const teamName = team.team_name
    if (!teamName) return false

    const draft = pendingUpdates[teamName]
    if (!draft) return false

    const saved = savedBoardCounts[teamName] || createEmptyBoardDraft()
    return BOARD_SCORES.some((boardScore) => Number(draft[`board${boardScore}`] ?? 0) !== Number(saved[`board${boardScore}`] ?? 0))
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

  const handleSave = async (team) => {
    const teamName = team.team_name
    const draft = pendingUpdates[teamName] || null
    const totalThrows = calculateTotalThrows(draft)

    if (!teamName || !draft || !hasAnyBoardValue(draft)) {
      return
    }

    if (totalThrows > 5) {
      setActionMessage({ type: 'danger', text: 'Kosárra dobásnál összesen legfeljebb 5 dobás adható meg.' })
      return
    }

    try {
      const hoopCounts = BOARD_SCORES.map((boardScore) => Number(draft[`board${boardScore}`] ?? 0))
      const points = calculateBoardPoints(draft)
      const scorePerHoop = hoopCounts.join(',')

      const payload = hoopCounts
      logBasketballPayload('PATCH payload', { teamName, scorePerHoop, payload, points })

      const response = await fetch(`https://legocompetition.runasp.net/api/${competitionConfig.apiPath}/${encodeURIComponent(teamName)}/${encodeURIComponent(scorePerHoop)}`, {
        method: 'PATCH'
        ,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorText = await response.text()
        logBasketballPayload('PATCH failed response', { status: response.status, body: errorText, teamName, scorePerHoop, payload })
        throw new Error(errorText || 'A frissítés nem sikerült.')
      }

      setActionMessage({ type: 'success', text: 'A frissítés sikeres volt.' })
      setSavedBoardCounts((prev) => ({
        ...prev,
        [teamName]: {
          ...draft
        }
      }))
      setPendingUpdates((prev) => {
        const next = { ...prev }
        delete next[teamName]
        return next
      })
      setTeams((prev) => prev.map((item) => (item.team_name === teamName ? { ...item, points_scored: points } : item)))
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.message })
    }
  }

  return (
    <div>
      <div className="alert alert-info">
        Kiválasztott versenyszám: <strong>{competitionConfig.label}</strong>
      </div>

      {actionMessage && (
        <div className={`alert ${actionMessage.type === 'success' ? 'alert-success' : 'alert-danger'} mb-3`} role="status">
          {actionMessage.text}
        </div>
      )}

      {loading && <div className="alert alert-secondary">Csapatok betöltése...</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && teams.length === 0 && (
        <div className="alert alert-secondary">Ebben a versenyszámban még nincs csapat.</div>
      )}

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
          const savedDraft = savedBoardCounts[team.team_name] || {}
            const boardValues = BOARD_SCORES.map((boardScore) => draft[`board${boardScore}`] ?? savedDraft[`board${boardScore}`] ?? '')
          const points = calculateBoardPoints(draft) || team.points_scored || calculateBoardPoints(savedDraft)
            const totalThrows = calculateTotalThrows(draft) || calculateTotalThrows(savedDraft)
          const changed = hasPendingChange(team)

          return (
            <div key={team.team_name} className="card shadow-sm team-card">
              <button
                type="button"
                className="btn btn-outline-secondary w-100 text-start rounded-0 border-0 py-3 px-3 team-toggle"
                onClick={() => toggleTeam(team.team_name)}
                aria-expanded={isOpen}
              >
                <div className="d-flex justify-content-between align-items-center gap-3">
                  <span className="fw-semibold">{team.team_name || 'Ismeretlen csapat'}</span>
                  <span className="badge rounded-pill bg-light text-dark">{Number(points)} pont</span>
                  <span>{isOpen ? '▴' : '▾'}</span>
                </div>
              </button>

              <div className={`team-details ${isOpen ? 'open' : ''}`}>
                <div className="card-body border-top">
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                    <div className="fw-semibold">Összes pont: {Number(points) || 0}</div>
                    <div className="text-muted small">Dobások száma: {totalThrows} / 5</div>
                  </div>

                  <div className="row g-3">
                    {BOARD_SCORES.map((boardScore) => (
                      <div className="col-12 col-md-6 col-xl-4" key={`${team.team_name}-board-${boardScore}`}>
                        <label className="form-label">{boardScore}. palánk</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="form-control form-control-sm scoring-number-input"
                          value={boardValues[boardScore - 1]}
                          onFocus={(event) => event.target.select()}
                          onClick={(event) => event.target.select()}
                          onChange={(event) => handleFieldChange(team.team_name, boardScore, event.target.value === '' ? '' : Number(event.target.value))}
                        />
                      </div>
                    ))}
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
