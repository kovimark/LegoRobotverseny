import React, { useEffect, useMemo, useState } from 'react'
import { getCompetitionConfig } from '../config/adminScoringConfig'

const competitionConfig = getCompetitionConfig('kosarra-dobas')
const HOOPS = [1, 2, 3, 4, 5]
const MAX_THROWS = 5

const createEmptyDraft = () => ({
  hoop1: 0,
  hoop2: 0,
  hoop3: 0,
  hoop4: 0,
  hoop5: 0,
  time: ''
})

const getTeamName = (team) => (
  typeof team === 'string' ? team : team?.team_name || team?.teamName || ''
)

const calculateTotalThrows = (draft) => HOOPS.reduce(
  (sum, hoop) => sum + Number(draft[`hoop${hoop}`] || 0),
  0
)

const normalizeResult = (result, index) => ({
  id: result.id ?? result.team_name ?? `basketball-result-${index}`,
  team_name: result.team_name || result.teamName || '',
  hoop1: Number(result.hoop1 ?? 0),
  hoop2: Number(result.hoop2 ?? 0),
  hoop3: Number(result.hoop3 ?? 0),
  hoop4: Number(result.hoop4 ?? 0),
  hoop5: Number(result.hoop5 ?? 0),
  points: Number(result.points ?? 0),
  time: result.time == null ? null : Number(result.time)
})

export default function BasketThrowScoring() {
  const [teamNames, setTeamNames] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTeamName, setSelectedTeamName] = useState('')
  const [draft, setDraft] = useState(createEmptyDraft)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [resultToDelete, setResultToDelete] = useState(null)
  const [openTeamName, setOpenTeamName] = useState(null)
  const [sortBy, setSortBy] = useState('name')

  const refreshResults = async () => {
    const response = await fetch(`https://legocompetition.runasp.net/api/${competitionConfig.apiPath}`)
    if (!response.ok) {
      throw new Error('Nem sikerült betölteni a kosárra dobás eredményeit.')
    }

    const data = await response.json()
    setResults(Array.isArray(data)
      ? data.map(normalizeResult).filter((result) => result.team_name)
      : [])
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError('')

      try {
        const [resultsResponse, teamNamesResponse] = await Promise.all([
          fetch(`https://legocompetition.runasp.net/api/${competitionConfig.apiPath}`),
          fetch('https://legocompetition.runasp.net/api/Teams/teamnames')
        ])

        if (!resultsResponse.ok) {
          throw new Error('Nem sikerült betölteni a kosárra dobás eredményeit.')
        }

        if (!teamNamesResponse.ok) {
          throw new Error('Nem sikerült betölteni a csapatokat.')
        }

        const resultsData = await resultsResponse.json()
        const teamNamesData = await teamNamesResponse.json()
        const normalizedResults = Array.isArray(resultsData)
          ? resultsData.map(normalizeResult).filter((result) => result.team_name)
          : []
        const normalizedTeamNames = Array.isArray(teamNamesData)
          ? teamNamesData.map(getTeamName).filter(Boolean)
          : []

        setResults(normalizedResults)
        setTeamNames(Array.from(new Set(normalizedTeamNames)))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    if (!actionMessage) return undefined

    const timeoutId = window.setTimeout(() => setActionMessage(null), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [actionMessage])

  const scoredTeamNames = useMemo(
    () => new Set(results.map((result) => result.team_name)),
    [results]
  )

  const availableTeamNames = useMemo(
    () => teamNames.filter((teamName) => !scoredTeamNames.has(teamName)),
    [teamNames, scoredTeamNames]
  )

  const searchResults = searchTerm.trim() && !selectedTeamName
    ? availableTeamNames
        .filter((teamName) => teamName.toLowerCase().includes(searchTerm.trim().toLowerCase()))
        .slice(0, 8)
    : []

  const sortedResults = useMemo(() => [...results].sort((left, right) => {
    if (sortBy === 'points') {
      return right.points - left.points || left.team_name.localeCompare(right.team_name)
    }

    return left.team_name.localeCompare(right.team_name)
  }), [results, sortBy])

  const totalThrows = calculateTotalThrows(draft)

  const handleHoopChange = (hoop, value) => {
    const normalizedValue = value === '' ? 0 : Math.max(0, Number.parseInt(value, 10) || 0)
    const nextDraft = { ...draft, [`hoop${hoop}`]: normalizedValue }

    if (calculateTotalThrows(nextDraft) > MAX_THROWS) {
      setActionMessage({ type: 'danger', text: 'Összesen legfeljebb 5 dobás adható meg.' })
      return
    }

    setDraft(nextDraft)
  }

  const handleSave = async () => {
    const time = Number(draft.time)

    if (!selectedTeamName) {
      setActionMessage({ type: 'danger', text: 'Válassz ki egy csapatot.' })
      return
    }

    if (scoredTeamNames.has(selectedTeamName)) {
      setActionMessage({ type: 'danger', text: 'Ehhez a csapathoz már tartozik eredmény.' })
      return
    }

    if (totalThrows <= 0 || totalThrows > MAX_THROWS) {
      setActionMessage({ type: 'danger', text: 'Adj meg legalább 1, legfeljebb 5 dobást.' })
      return
    }

    if (!Number.isFinite(time) || time <= 0) {
      setActionMessage({ type: 'danger', text: 'Adj meg egy érvényes időt másodpercben.' })
      return
    }

    const payload = {
      teamName: selectedTeamName,
      hoop1: Number(draft.hoop1),
      hoop2: Number(draft.hoop2),
      hoop3: Number(draft.hoop3),
      hoop4: Number(draft.hoop4),
      hoop5: Number(draft.hoop5),
      time
    }

    setSaving(true)

    try {
      const response = await fetch(`https://legocompetition.runasp.net/api/${competitionConfig.apiPath}`, {
        method: 'POST',
        headers: {
          accept: '*/*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Az eredmény mentése sikertelen volt.')
      }

      await refreshResults()
      setSearchTerm('')
      setSelectedTeamName('')
      setDraft(createEmptyDraft())
      setActionMessage({ type: 'success', text: 'Az eredmény mentése sikeres volt.' })
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!resultToDelete) return

    const pathParameters = [
      resultToDelete.team_name,
      resultToDelete.hoop1,
      resultToDelete.hoop2,
      resultToDelete.hoop3,
      resultToDelete.hoop4,
      resultToDelete.hoop5
    ].map((value) => encodeURIComponent(value))

    setDeleting(true)

    try {
      const response = await fetch(
        `https://legocompetition.runasp.net/api/${competitionConfig.apiPath}/${pathParameters.join('/')}`,
        {
          method: 'DELETE',
          headers: {
            accept: '*/*'
          }
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Az eredmény törlése sikertelen volt.')
      }

      await refreshResults()
      setResultToDelete(null)
      setOpenTeamName(null)
      setActionMessage({ type: 'success', text: 'Az eredmény törölve lett.' })
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.message })
    } finally {
      setDeleting(false)
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

      {loading && <div className="alert alert-secondary">Adatok betöltése...</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && (
        <>
          <div className="card shadow-sm team-card no-hover-card mb-3">
            <div className="card-body p-3 p-md-4">
              <div className="home-kicker">Eredményfelvitel</div>
              <h4 className="mb-1">Kosárra dobás eredményének rögzítése</h4>
              <p className="text-muted">Válassz csapatot, add meg az öt kosár találatait és az időt.</p>

              <div className="row g-3 align-items-end">
                <div className="col-12 col-lg-5 position-relative">
                  <label className="form-label" htmlFor="basket-team-search">Csapat keresése</label>
                  <input
                    id="basket-team-search"
                    type="text"
                    className="form-control"
                    value={searchTerm}
                    placeholder="Kezdj el gépelni..."
                    autoComplete="off"
                    onChange={(event) => {
                      setSearchTerm(event.target.value)
                      setSelectedTeamName('')
                    }}
                  />
                  {searchResults.length > 0 && (
                    <div className="list-group position-absolute start-0 end-0 mt-2 shadow-lg bg-white border border-dark rounded overflow-hidden" style={{ zIndex: 20 }}>
                      {searchResults.map((teamName) => (
                        <button
                          key={teamName}
                          type="button"
                          className="list-group-item list-group-item-action"
                          onClick={() => {
                            setSelectedTeamName(teamName)
                            setSearchTerm(teamName)
                          }}
                        >
                          {teamName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="col-12 col-lg-3">
                  <label className="form-label" htmlFor="basket-result-time">Idő (s)</label>
                  <input
                    id="basket-result-time"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    className="form-control"
                    value={draft.time}
                    onChange={(event) => setDraft((prev) => ({ ...prev, time: event.target.value }))}
                  />
                </div>

                <div className="col-12 col-lg-4">
                  <div className="text-muted small mb-1">Dobások száma</div>
                  <div className="fw-semibold">{totalThrows} / {MAX_THROWS}</div>
                </div>
              </div>

              <div className="row g-3 mt-1">
                {HOOPS.map((hoop) => (
                  <div className="col-6 col-md" key={`basket-hoop-${hoop}`}>
                    <label className="form-label" htmlFor={`basket-hoop-${hoop}`}>{hoop}. kosár</label>
                    <input
                      id={`basket-hoop-${hoop}`}
                      type="number"
                      min="0"
                      max={MAX_THROWS}
                      step="1"
                      className="form-control"
                      value={draft[`hoop${hoop}`]}
                      onFocus={(event) => event.target.select()}
                      onClick={(event) => event.target.select()}
                      onChange={(event) => handleHoopChange(hoop, event.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="d-flex justify-content-end mt-3">
                <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Mentés...' : 'Mentés'}
                </button>
              </div>
            </div>
          </div>

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

          <div className="d-grid gap-3">
            {sortedResults.map((result) => {
              const isOpen = openTeamName === result.team_name

              return (
                <div key={result.id} className="card shadow-sm team-card">
                  <button
                    type="button"
                    className="btn btn-outline-secondary w-100 text-start rounded-0 border-0 py-3 px-3 team-toggle"
                    onClick={() => setOpenTeamName((prev) => (prev === result.team_name ? null : result.team_name))}
                    aria-expanded={isOpen}
                  >
                    <div className="d-flex justify-content-between align-items-center gap-3">
                      <span className="fw-semibold">{result.team_name}</span>
                      <div className="d-flex align-items-center gap-2">
                        <span className="badge rounded-pill bg-light text-dark">{result.points} pont</span>
                        <span>{isOpen ? '^' : 'v'}</span>
                      </div>
                    </div>
                  </button>

                  <div className={`team-details ${isOpen ? 'open' : ''}`}>
                    <div className="card-body border-top">
                      <div className="d-flex flex-wrap gap-2">
                        {HOOPS.map((hoop) => (
                          <span key={`${result.id}-hoop-${hoop}`} className="badge bg-light text-dark border">
                            {hoop}. kosár: {result[`hoop${hoop}`]}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3">
                        <span className="text-muted small">Idő: </span>
                        <span className="fw-semibold">{result.time == null ? '-' : `${result.time} s`}</span>
                      </div>
                      <div className="d-flex justify-content-end mt-3">
                        <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setResultToDelete(result)}>
                          Törlés
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {sortedResults.length === 0 && (
              <div className="alert alert-secondary">Még nincs rögzített eredmény.</div>
            )}
          </div>
        </>
      )}

      {resultToDelete && (
        <>
          <div className="modal d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold text-dark">Kosárra dobás eredményének törlése</h5>
                  <button type="button" className="btn-close" aria-label="Bezárás" onClick={() => setResultToDelete(null)} disabled={deleting}></button>
                </div>
                <div className="modal-body">
                  <p className="mb-2 text-dark">Biztosan törlöd ezt az eredményt?</p>
                  <p className="fw-semibold mb-1 text-dark">{resultToDelete.team_name}</p>
                  <p className="small mb-0 text-dark">
                    Találatok: {HOOPS.map((hoop) => resultToDelete[`hoop${hoop}`]).join(', ')}
                  </p>
                  <p className="small mb-0 text-dark">Idő: {resultToDelete.time == null ? '-' : `${resultToDelete.time} s`}</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setResultToDelete(null)} disabled={deleting}>Mégse</button>
                  <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'Törlés...' : 'Törlés'}
                  </button>
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
