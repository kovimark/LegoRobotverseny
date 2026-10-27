import React, { useEffect, useState } from 'react'
import FloatingFeedback from './FloatingFeedback'
import CategorizedResultsStandings from './CategorizedResultsStandings'
import AgeGroupBadge from './AgeGroupBadge'
import { authFetch } from '../services/apiClient'
import { getCompetitionConfig } from '../config/adminScoringConfig'
import { DATA_REFRESH_EVENT } from '../config/dataRefresh'

const competitionConfig = getCompetitionConfig('hegymaszas')
const MAX_COMPLETED_LEVEL = 4

export default function HillClimbingScoring() {
  const [bestTeams, setBestTeams] = useState([])
  const [allAttempts, setAllAttempts] = useState([])
  const [allTeams, setAllTeams] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openTeamName, setOpenTeamName] = useState(null)
  const [pendingDrafts, setPendingDrafts] = useState({})
  const [savingTeamName, setSavingTeamName] = useState(null)
  const [actionMessage, setActionMessage] = useState(null)
  const [sortBy, setSortBy] = useState('name')
  const [searchTerm, setSearchTerm] = useState('')

  const loadTeams = async () => {
    setLoading(true)
    setError('')

    try {
      const [bestRes, allAttemptsRes, teamsRes, settingsRes] = await Promise.all([
        fetch('https://brickathlon.runasp.net/api/HillClimbing/bestattempts'),
        fetch('https://brickathlon.runasp.net/api/HillClimbing/allattempts'),
        fetch('https://brickathlon.runasp.net/api/Teams'),
        fetch('https://brickathlon.runasp.net/api/Settings/getAllSettings').catch(() => null)
      ])

      if (!bestRes.ok) throw new Error('Nem sikerült betölteni a csapatok hegymászási adatait.')
      const bestData = await bestRes.json()
      const allAttemptsData = allAttemptsRes.ok ? await allAttemptsRes.json() : []
      const teamsData = teamsRes.ok ? await teamsRes.json() : []
      let settingsData = null
      if (settingsRes && settingsRes.ok) {
        const s = await settingsRes.json()
        settingsData = Array.isArray(s) ? s[0] : s
      }

      setBestTeams(Array.isArray(bestData) ? bestData : [])
      setAllAttempts(Array.isArray(allAttemptsData) ? allAttemptsData : [])
      setAllTeams(Array.isArray(teamsData) ? teamsData : [])
      if (settingsData) setSettings(settingsData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTeams()
    window.addEventListener(DATA_REFRESH_EVENT, loadTeams)
    return () => window.removeEventListener(DATA_REFRESH_EVENT, loadTeams)
  }, [])

  useEffect(() => {
    if (!actionMessage) return undefined
    const timeoutId = window.setTimeout(() => setActionMessage(null), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [actionMessage])

  const maxTries = Number(settings?.maxTryHillclimbing ?? settings?.maxTryHillClimbing) || 2

  const getTeamAttempts = (teamName) => {
    if (!teamName) return []
    return allAttempts.filter(
      (a) => (a.team_name || a.teamName || '').toLowerCase() === teamName.toLowerCase()
    )
  }

  const getTeamClosedCount = (teamName) => {
    const attempts = getTeamAttempts(teamName)
    return attempts.filter((a) => Number(a.eliminated) === 1).length
  }

  const toggleTeam = (teamName) => {
    setOpenTeamName((prev) => {
      const next = prev === teamName ? null : teamName
      if (next && !pendingDrafts[next]) {
        const attempts = getTeamAttempts(next)
        const inProgress = [...attempts].reverse().find((a) => Number(a.eliminated) === 0)
        const best = bestTeams.find((t) => t.team_name === next)
        setPendingDrafts((drafts) => ({
          ...drafts,
          [next]: {
            completed_level: inProgress ? Number(inProgress.completed_level || 0) : Number(best?.completed_level || 0),
            time_spent_on_level: inProgress ? Number(inProgress.time_spent_on_level || 0) : Number(best?.time_spent_on_level || 0)
          }
        }))
      }
      return next
    })
  }

  const handleFieldChange = (teamName, field, value) => {
    setPendingDrafts((prev) => ({
      ...prev,
      [teamName]: {
        ...(prev[teamName] || {}),
        [field]: value
      }
    }))
  }

  const getSortedTeams = (items) => {
    const sorted = [...items]
    sorted.sort((a, b) => {
      const aName = (a.team_name || '').toLowerCase()
      const bName = (b.team_name || '').toLowerCase()
      const aLevel = Number(a.completed_level ?? 0)
      const bLevel = Number(b.completed_level ?? 0)
      const aTime = Number(a.time_spent_on_level ?? 0)
      const bTime = Number(b.time_spent_on_level ?? 0)

      if (sortBy === 'points') {
        return bLevel - aLevel || aTime - bTime || aName.localeCompare(bName)
      }
      return aName.localeCompare(bName)
    })
    return sorted
  }

  const categoryByTeamName = new Map(
    allTeams.map((team) => [team.teamName || team.team_name, Number(team.category) === 1 ? 1 : 0])
  )

  const standings = [...bestTeams]
    .sort(
      (left, right) =>
        Number(right.completed_level || 0) - Number(left.completed_level || 0) ||
        Number(left.time_spent_on_level || 0) - Number(right.time_spent_on_level || 0) ||
        String(left.team_name).localeCompare(String(right.team_name))
    )
    .map((team) => {
      const closed = getTeamClosedCount(team.team_name)
      return {
        ...team,
        category: categoryByTeamName.get(team.team_name) ?? 0,
        closedCount: closed,
        isCompleted: closed >= maxTries
      }
    })

  const filteredTeams = getSortedTeams(bestTeams).filter((team) =>
    String(team.team_name || '').toLocaleLowerCase('hu-HU').includes(searchTerm.trim().toLocaleLowerCase('hu-HU'))
  )

  // Mentés részeredményként (nem zárja le a próbát)
  const handleSaveProgress = async (teamName) => {
    const draft = pendingDrafts[teamName] || {}
    const level = draft.completed_level === '' ? 0 : Number(draft.completed_level ?? 0)
    const timeSpent = draft.time_spent_on_level === '' ? 0 : Number(draft.time_spent_on_level ?? 0)

    if (!Number.isInteger(level) || level < 0 || level > MAX_COMPLETED_LEVEL) {
      setActionMessage({ type: 'danger', text: 'Az elért szint 0 és 4 közötti egész szám lehet.' })
      return
    }
    if (!Number.isFinite(timeSpent) || timeSpent < 0) {
      setActionMessage({ type: 'danger', text: 'Az eltöltött idő nem lehet negatív.' })
      return
    }

    setSavingTeamName(teamName)
    try {
      const response = await authFetch(`https://brickathlon.runasp.net/api/HillClimbing/${encodeURIComponent(teamName)}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completedLevel: level,
          timeSpentOnLevel: Number(timeSpent.toFixed(3))
        })
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(errText || 'A hegymászás mentése sikertelen volt.')
      }

      setActionMessage({
        type: 'success',
        text: `A(z) ${teamName} részeredménye elmentve (${level}. szint, ${timeSpent} s).`
      })
      await loadTeams()
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.message })
    } finally {
      setSavingTeamName(null)
    }
  }

  // Próba lezárása (eliminated: 1)
  const handleFinishAttempt = async (teamName) => {
    const draft = pendingDrafts[teamName] || {}
    const level = draft.completed_level === '' ? 0 : Number(draft.completed_level ?? 0)
    const timeSpent = draft.time_spent_on_level === '' ? 0 : Number(draft.time_spent_on_level ?? 0)
    const closedCount = getTeamClosedCount(teamName)
    const attemptNum = Math.min(closedCount + 1, maxTries)

    if (!Number.isInteger(level) || level < 0 || level > MAX_COMPLETED_LEVEL) {
      setActionMessage({ type: 'danger', text: 'Az elért szint 0 és 4 közötti egész szám lehet.' })
      return
    }
    if (!Number.isFinite(timeSpent) || timeSpent < 0) {
      setActionMessage({ type: 'danger', text: 'Az eltöltött idő nem lehet negatív.' })
      return
    }

    setSavingTeamName(teamName)
    try {
      const response = await authFetch(`https://brickathlon.runasp.net/api/HillClimbing/${encodeURIComponent(teamName)}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completedLevel: level,
          timeSpentOnLevel: Number(timeSpent.toFixed(3)),
          eliminated: 1
        })
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(errText || 'A próba lezárása sikertelen volt.')
      }

      setActionMessage({
        type: 'success',
        text: `A(z) ${teamName} csapat ${attemptNum}. próbája sikeresen lezárva (${level}. szint, ${timeSpent} s)!`
      })
      await loadTeams()
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.message })
    } finally {
      setSavingTeamName(null)
    }
  }

  return (
    <div>
      <div
        className="p-3 rounded-3 mb-3"
        style={{
          border: '2px solid var(--black)',
          background: 'rgba(253, 231, 76, 0.25)',
          color: 'var(--black)'
        }}
      >
        Kiválasztott versenyszám: <strong>{competitionConfig.label}</strong> (Csapatonként max. {maxTries} próbálkozás)
      </div>
      <FloatingFeedback message={actionMessage} onClose={() => setActionMessage(null)} />

      {loading && <div className="alert alert-secondary">Csapatok betöltése...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      {!loading && !error && bestTeams.length === 0 && (
        <div className="alert alert-secondary">Ebben a versenyszámban még nincs csapat.</div>
      )}

      {!loading && !error && bestTeams.length > 0 && (
        <>
          <CategorizedResultsStandings
            title="Hegymászás eredménytáblája"
            rows={standings}
            getKey={(team) => team.team_name}
            columns={[
              { key: 'team', label: 'Csapat', render: (team) => team.team_name },
              { key: 'level', label: 'Legjobb szint', align: 'end', render: (team) => Number(team.completed_level || 0) },
              { key: 'time', label: 'Legjobb idő', align: 'end', render: (team) => `${Number(team.time_spent_on_level || 0)} s` },
              {
                key: 'tries',
                label: 'Próbák',
                align: 'center',
                render: (team) => (
                  <span
                    className="badge"
                    style={{
                      background: team.isCompleted ? 'var(--green)' : 'var(--yellow)',
                      color: 'var(--black)',
                      border: '1px solid var(--black)',
                      fontWeight: 700
                    }}
                  >
                    {team.closedCount} / {maxTries}
                  </span>
                )
              },
              {
                key: 'status',
                label: 'Állapot',
                render: (team) =>
                  team.isCompleted ? (
                    <span
                      className="badge"
                      style={{
                        background: 'var(--green)',
                        color: 'var(--black)',
                        border: '1px solid var(--black)',
                        fontWeight: 700
                      }}
                    >
                      Befejezve
                    </span>
                  ) : (
                    <span
                      className="badge"
                      style={{
                        background: 'var(--orange)',
                        color: 'var(--black)',
                        border: '1px solid var(--black)',
                        fontWeight: 700
                      }}
                    >
                      {team.closedCount + 1}. próba folyamatban
                    </span>
                  )
              }
            ]}
          />
          <div className="d-flex justify-content-end mb-3">
            <div className="btn-group" role="group" aria-label="Rendezés">
              <button
                type="button"
                className={`btn btn-sm ${sortBy === 'name' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setSortBy('name')}
              >
                Név szerint
              </button>
              <button
                type="button"
                className={`btn btn-sm ${sortBy === 'points' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setSortBy('points')}
              >
                Eredmény szerint
              </button>
            </div>
          </div>
        </>
      )}

      {!loading && !error && bestTeams.length > 0 && (
        <div className="mb-3">
          <label className="form-label" htmlFor="hill-team-search">
            Csapat keresése
          </label>
          <div className="input-group">
            <span className="input-group-text">
              <i className="bi bi-search" />
            </span>
            <input
              id="hill-team-search"
              type="search"
              className="form-control"
              placeholder="Kezdj el gépelni…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>
      )}

      <div className="d-grid gap-3">
        {filteredTeams.map((team) => {
          const teamName = team.team_name
          const isOpen = openTeamName === teamName
          const teamAttempts = getTeamAttempts(teamName)
          const closedCount = getTeamClosedCount(teamName)
          const isMaxReached = closedCount >= maxTries
          const currentAttemptNum = Math.min(closedCount + 1, maxTries)
          const isBusy = savingTeamName === teamName

          const draft = pendingDrafts[teamName] || {
            completed_level: Number(team.completed_level || 0),
            time_spent_on_level: Number(team.time_spent_on_level || 0)
          }

          return (
            <div key={teamName} className="card shadow-sm team-card">
              <button
                type="button"
                className="btn btn-outline-secondary w-100 text-start rounded-0 border-0 py-3 px-3 team-toggle"
                onClick={() => toggleTeam(teamName)}
                aria-expanded={isOpen}
              >
                <div className="d-flex justify-content-between align-items-center gap-3">
                  <span className="fw-semibold">
                    <AgeGroupBadge category={categoryByTeamName.get(teamName)} className="me-2" />
                    {teamName || 'Ismeretlen csapat'}
                  </span>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span
                      className="badge rounded-pill"
                      style={{
                        background: isMaxReached ? 'var(--green)' : 'var(--orange)',
                        color: 'var(--black)',
                        border: '1px solid var(--black)',
                        fontWeight: 700
                      }}
                    >
                      {isMaxReached ? `Befejezve (${closedCount}/${maxTries})` : `${currentAttemptNum}. próba (${closedCount}/${maxTries} kész)`}
                    </span>
                    <span
                      className="badge rounded-pill"
                      style={{
                        background: 'var(--white)',
                        color: 'var(--black)',
                        border: '1px solid var(--black)',
                        fontWeight: 700
                      }}
                    >
                      Legjobb: {Number(team.completed_level || 0)}. szint • {Number(team.time_spent_on_level || 0)} s
                    </span>
                  </div>
                  <span>{isOpen ? '▴' : '▾'}</span>
                </div>
              </button>

              <div className={`team-details ${isOpen ? 'open' : ''}`}>
                <div className="card-body border-top py-3">
                  {/* Próbálkozási státusz értesítő */}
                  <div className={`alert ${isMaxReached ? 'alert-secondary' : 'alert-primary'} py-2 mb-3 small`}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{isMaxReached ? 'Minden próba lezárva' : `${currentAttemptNum}. próbálkozás / ${maxTries}`}:</strong>{' '}
                        {isMaxReached
                          ? `A csapat teljesítette mind a ${maxTries} próbát.`
                          : `Amíg a robot mászik, menthetsz részeredményt. Ha leesett vagy végigment mind a négy szinten, zárd le a próbát.`}
                      </div>
                      <span className="badge text-bg-dark">
                        {closedCount} / {maxTries} lezárt próba
                      </span>
                    </div>
                  </div>

                  <div className="d-flex flex-wrap gap-3 align-items-end">
                    <div className="flex-grow-1" style={{ minWidth: '9rem' }}>
                      <label className="form-label mb-1 fw-bold">Elért szint (0-4)</label>
                      <input
                        type="number"
                        min="0"
                        max={MAX_COMPLETED_LEVEL}
                        step="1"
                        className="form-control form-control-sm scoring-number-input"
                        value={draft.completed_level ?? ''}
                        disabled={isBusy}
                        placeholder="0"
                        onFocus={(event) => event.target.select()}
                        onClick={(event) => event.target.select()}
                        onChange={(event) => {
                          const raw = event.target.value
                          if (raw === '') {
                            handleFieldChange(teamName, 'completed_level', '')
                            return
                          }
                          const cleaned = raw.replace(/^0+(?=\d)/, '')
                          const num = Number.parseInt(cleaned, 10)
                          handleFieldChange(
                            teamName,
                            'completed_level',
                            Number.isNaN(num) ? '' : Math.min(MAX_COMPLETED_LEVEL, Math.max(0, num))
                          )
                        }}
                        onBlur={() => {
                          if (draft.completed_level === '' || draft.completed_level === null || draft.completed_level === undefined) {
                            handleFieldChange(teamName, 'completed_level', 0)
                          }
                        }}
                      />
                      <div className="form-text small">0: nem indult el, 4: tető</div>
                    </div>

                    <div className="flex-grow-1" style={{ minWidth: '9rem' }}>
                      <label className="form-label mb-1 fw-bold">Eltöltött idő (mp)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        inputMode="decimal"
                        className="form-control form-control-sm scoring-number-input"
                        value={draft.time_spent_on_level ?? ''}
                        disabled={isBusy}
                        placeholder="0"
                        onFocus={(event) => event.target.select()}
                        onClick={(event) => event.target.select()}
                        onChange={(event) => {
                          let raw = event.target.value
                          if (raw === '') {
                            handleFieldChange(teamName, 'time_spent_on_level', '')
                            return
                          }
                          if (/^0\d/.test(raw)) {
                            raw = raw.replace(/^0+/, '') || '0'
                          }
                          handleFieldChange(teamName, 'time_spent_on_level', raw)
                        }}
                        onBlur={() => {
                          if (draft.time_spent_on_level === '' || draft.time_spent_on_level === null || draft.time_spent_on_level === undefined) {
                            handleFieldChange(teamName, 'time_spent_on_level', 0)
                          } else {
                            const parsed = Number(draft.time_spent_on_level)
                            if (Number.isFinite(parsed)) {
                              handleFieldChange(teamName, 'time_spent_on_level', Number(parsed.toFixed(3)))
                            }
                          }
                        }}
                      />
                      <div className="form-text small">A szint elérésének ideje</div>
                    </div>
                  </div>

                  {/* Mentés gombok */}
                  <div className="d-flex flex-wrap justify-content-end gap-2 mt-3">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => handleSaveProgress(teamName)}
                      disabled={isBusy}
                      title="Szint és idő mentése a próba lezárása nélkül (amíg a robot még a hegyen halad)"
                    >
                      <i className="bi bi-save me-1" />
                      {isBusy ? 'Mentés...' : 'Részeredmény mentése (mászik a robot)'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm fw-bold px-3"
                      style={{
                        background: 'var(--green)',
                        color: 'var(--black)',
                        border: '2px solid var(--black)',
                        boxShadow: '0.2rem 0.2rem 0 var(--black)',
                        borderRadius: '0.45rem'
                      }}
                      onClick={() => handleFinishAttempt(teamName)}
                      disabled={isBusy}
                      title="A próba véget ért (kiesett a robot vagy elérte a csúcsot)"
                    >
                      <i className="bi bi-check2-circle me-1" />
                      {isBusy ? 'Lezárás...' : 'Próba lezárása (Befejezve)'}
                    </button>
                  </div>

                  {/* Csapat próbálkozásainak előzményei */}
                  {teamAttempts.length > 0 && (
                    <div className="mt-3 pt-3 border-top">
                      <div className="small fw-bold text-muted mb-2">
                        <i className="bi bi-clock-history me-1" />
                        Eddigi rögzített próbálkozások ({teamAttempts.length} bejegyzés):
                      </div>
                      <div className="table-responsive">
                        <table className="table table-sm table-bordered bg-white mb-0 small">
                          <thead className="table-light">
                            <tr>
                              <th>#</th>
                              <th>Szint</th>
                              <th>Idő</th>
                              <th>Státusz</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teamAttempts.map((att, idx) => {
                              const isClosed = Number(att.eliminated) === 1
                              return (
                                <tr key={idx} style={{ background: isClosed ? 'var(--white)' : 'rgba(253, 231, 76, 0.25)' }}>
                                  <td className="fw-bold">{idx + 1}. bejegyzés</td>
                                  <td>{att.completed_level}. szint</td>
                                  <td>{att.time_spent_on_level} s</td>
                                  <td>
                                    {isClosed ? (
                                      <span
                                        className="badge"
                                        style={{
                                          background: 'var(--green)',
                                          color: 'var(--black)',
                                          border: '1px solid var(--black)',
                                          fontWeight: 700
                                        }}
                                      >
                                        Befejezve (Lezárva)
                                      </span>
                                    ) : (
                                      <span
                                        className="badge"
                                        style={{
                                          background: 'var(--orange)',
                                          color: 'var(--black)',
                                          border: '1px solid var(--black)',
                                          fontWeight: 700
                                        }}
                                      >
                                        Részeredmény (Folyamatban)
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {!loading && bestTeams.length > 0 && filteredTeams.length === 0 && (
          <div className="alert alert-secondary mb-0">Nincs a keresésnek megfelelő csapat.</div>
        )}
      </div>
    </div>
  )
}
