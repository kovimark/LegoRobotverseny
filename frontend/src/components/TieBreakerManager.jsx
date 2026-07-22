import React, { useCallback, useEffect, useMemo, useState } from 'react'

const API_URL = 'https://legocompetition.runasp.net/api/TieBreaker'

const parseTeams = (value) => String(value || '').split(',').map((team) => team.trim()).filter(Boolean)

export default function TieBreakerManager({ competitionId, competitionLabel = 'Versenyszám', mode = 'ranking', reloadKey = 0 }) {
  const [tieBreakers, setTieBreakers] = useState([])
  const [weights, setWeights] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [message, setMessage] = useState(null)
  const [manualRankings, setManualRankings] = useState({})

  const loadTieBreakers = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(API_URL, { headers: { accept: '*/*' } })
      if (!response.ok) throw new Error('Nem sikerült betölteni a döntetleneket.')
      const data = await response.json()
      setTieBreakers((Array.isArray(data) ? data : []).filter((item) => (
        Number(item.competitionId) === Number(competitionId)
      )).sort((a, b) => b.id - a.id))
      setManualRankings((current) => (Array.isArray(data) ? data : []).reduce((result, item) => {
        if (Number(item.competitionId) === Number(competitionId)) {
          result[item.id] = current[item.id] || parseTeams(item.teams)
        }
        return result
      }, {}))
    } catch (error) {
      setMessage({ type: 'danger', text: error.message })
    } finally {
      setLoading(false)
    }
  }, [competitionId])

  useEffect(() => {
    loadTieBreakers()
    const handleTieBreakerRefresh = () => loadTieBreakers()
    window.addEventListener('tieBreakersChanged', handleTieBreakerRefresh)
    return () => window.removeEventListener('tieBreakersChanged', handleTieBreakerRefresh)
  }, [loadTieBreakers, reloadKey])

  const moveTeam = (tieBreakerId, index, direction) => {
    setManualRankings((current) => {
      const ranking = [...(current[tieBreakerId] || [])]
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= ranking.length) return current
      ;[ranking[index], ranking[targetIndex]] = [ranking[targetIndex], ranking[index]]
      return { ...current, [tieBreakerId]: ranking }
    })
  }

  const setTeamWeight = (tieBreakerId, teamName, value) => {
    setWeights((current) => ({
      ...current,
      [tieBreakerId]: { ...current[tieBreakerId], [teamName]: value }
    }))
    setMessage(null)
  }

  const getRankedTeams = (tieBreaker) => parseTeams(tieBreaker.teams)
    .map((teamName) => ({ teamName, weight: Number(weights[tieBreaker.id]?.[teamName]) }))
    .sort((a, b) => a.weight - b.weight)

  const resolveTieBreaker = async (tieBreaker) => {
    const teams = parseTeams(tieBreaker.teams)
    if (mode !== 'weight') {
      const rankedTeamNames = manualRankings[tieBreaker.id] || teams
      await submitResolution(tieBreaker.id, rankedTeamNames)
      return
    }
    const enteredWeights = teams.map((teamName) => weights[tieBreaker.id]?.[teamName])
    const numericWeights = enteredWeights.map(Number)

    if (enteredWeights.some((value) => value === '' || value === undefined) || numericWeights.some((value) => !Number.isFinite(value) || value < 0)) {
      setMessage({ type: 'danger', text: 'Minden csapathoz adj meg egy 0 vagy annál nagyobb súlyt.' })
      return
    }

    if (new Set(numericWeights).size !== numericWeights.length) {
      setMessage({ type: 'danger', text: 'A súlyoknak különbözőnek kell lenniük, hogy egyértelmű legyen a sorrend.' })
      return
    }

    const rankedTeamNames = getRankedTeams(tieBreaker).map((item) => item.teamName)

    await submitResolution(tieBreaker.id, rankedTeamNames)
  }

  const submitResolution = async (tieBreakerId, rankedTeamNames) => {
    try {
      setSavingId(tieBreakerId)
      const response = await fetch(`${API_URL}/resolve`, {
        method: 'POST',
        headers: { accept: '*/*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ tieBreakerId, rankedTeamNames })
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'A sorrend mentése nem sikerült.')
      }
      setMessage({ type: 'success', text: mode === 'weight' ? 'A növekvő súlysorrend mentése sikerült.' : 'A végleges sorrend mentése sikerült.' })
      await loadTieBreakers()
    } catch (error) {
      setMessage({ type: 'danger', text: error.message })
    } finally {
      setSavingId(null)
    }
  }

  const pendingTieBreakers = useMemo(() => (
    tieBreakers.filter((item) => Number(item.isResolved) === 0)
  ), [tieBreakers])
  const resolvedTieBreakers = useMemo(() => (
    tieBreakers.filter((item) => Number(item.isResolved) === 1)
  ), [tieBreakers])

  return (
    <section className="card shadow-sm team-card no-hover-card mb-4">
      <div className="card-body p-3 p-md-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
          <div>
            <h3 className="h4 mb-1">{competitionLabel} – döntetlenek</h3>
            <p className="text-muted mb-0">
              {mode === 'weight'
                ? 'Írd be a csapatok súlyát. A kisebb súly automatikusan előrébb kerül.'
                : 'Állítsd be a végleges sorrendet: az első helyre kerüljön a döntetlen győztese.'}
            </p>
          </div>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={loadTieBreakers} disabled={loading}>Frissítés</button>
        </div>

        {message && <div className={`alert alert-${message.type}`} role="status">{message.text}</div>}
        {loading && <div className="alert alert-info">Döntetlenek betöltése...</div>}
        {!loading && pendingTieBreakers.length === 0 && <div className="alert alert-success">Nincs eldöntésre váró döntetlen ennél a versenyszámnál.</div>}

        <div className="d-flex flex-column gap-3">
          {pendingTieBreakers.map((tieBreaker) => {
            const teams = parseTeams(tieBreaker.teams)
            const hasAllWeights = teams.every((teamName) => weights[tieBreaker.id]?.[teamName] !== '' && weights[tieBreaker.id]?.[teamName] !== undefined)
            const rankedTeams = hasAllWeights ? getRankedTeams(tieBreaker) : []
            const manualRanking = manualRankings[tieBreaker.id] || teams

            return (
              <div className="team-info-box" key={tieBreaker.id}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h4 className="h5 mb-0">Döntetlen #{tieBreaker.id}</h4>
                  <span className="badge text-bg-warning">{teams.length} csapat</span>
                </div>
                {mode === 'weight' ? <div className="row g-3">
                  {teams.map((teamName) => (
                    <div className="col-md-6 col-xl-4" key={teamName}>
                      <label className="form-label fw-semibold" htmlFor={`weight-${tieBreaker.id}-${teamName}`}>{teamName} súlya</label>
                      <div className="input-group">
                        <input
                          id={`weight-${tieBreaker.id}-${teamName}`}
                          type="number"
                          className="form-control"
                          min="0"
                          step="0.01"
                          value={weights[tieBreaker.id]?.[teamName] ?? ''}
                          onChange={(event) => setTeamWeight(tieBreaker.id, teamName, event.target.value)}
                          placeholder="0,00"
                        />
                        <span className="input-group-text">kg</span>
                      </div>
                    </div>
                  ))}
                </div> : (
                  <ol className="list-group list-group-numbered">
                    {manualRanking.map((teamName, index) => (
                      <li className="list-group-item d-flex justify-content-between align-items-center gap-2" key={teamName}>
                        <span className="ms-2 fw-semibold flex-grow-1">{teamName}</span>
                        <div className="btn-group btn-group-sm">
                          <button type="button" className="btn btn-outline-secondary" disabled={index === 0} onClick={() => moveTeam(tieBreaker.id, index, -1)}>↑</button>
                          <button type="button" className="btn btn-outline-secondary" disabled={index === manualRanking.length - 1} onClick={() => moveTeam(tieBreaker.id, index, 1)}>↓</button>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}

                {mode === 'weight' && rankedTeams.length > 0 && (
                  <div className="mt-4">
                    <h5 className="h6">Automatikus növekvő sorrend</h5>
                    <ol className="list-group list-group-numbered">
                      {rankedTeams.map((item) => (
                        <li className="list-group-item d-flex justify-content-between align-items-center" key={item.teamName}>
                          <span className="ms-2 fw-semibold">{item.teamName}</span>
                          <span className="badge text-bg-dark">{item.weight} kg</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                <div className="d-flex justify-content-end mt-3">
                  <button type="button" className="btn btn-primary" onClick={() => resolveTieBreaker(tieBreaker)} disabled={savingId === tieBreaker.id}>
                    {savingId === tieBreaker.id ? 'Mentés...' : mode === 'weight' ? 'Növekvő sorrend mentése' : 'Végleges sorrend mentése'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {!loading && resolvedTieBreakers.length > 0 && (
          <div className="mt-5">
            <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
              <h4 className="h5 mb-0">Eldöntött döntetlenek</h4>
              <span className="badge text-bg-success">{resolvedTieBreakers.length} lezárva</span>
            </div>
            <div className="row g-3">
              {resolvedTieBreakers.map((tieBreaker) => (
                <div className="col-md-6" key={tieBreaker.id}>
                  <div className="team-info-box h-100">
                    <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
                      <h5 className="h6 mb-0">Döntetlen #{tieBreaker.id}</h5>
                      <span className="badge text-bg-success">Eldöntve</span>
                    </div>
                    <ol className="list-group list-group-numbered mb-0">
                      {parseTeams(tieBreaker.teams).map((teamName) => (
                        <li className="list-group-item" key={teamName}>
                          <span className="ms-2">{teamName}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
