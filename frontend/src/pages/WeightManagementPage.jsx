import React, { useEffect, useMemo, useState } from 'react'
import FloatingFeedback from '../components/FloatingFeedback'
import AgeGroupBadge from '../components/AgeGroupBadge'
import ConfirmModal from '../components/ConfirmModal'
import { getAllWeights, postWeight, deleteWeight } from '../services/weightApi'

const API_BASE_URL = 'https://brickathlon.runasp.net'
const ALLOWED_COMPETITIONS = ['Hegymászás', 'Szumó']

export default function WeightManagementPage() {
  const [teams, setTeams] = useState([])
  const [weights, setWeights] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openTeamName, setOpenTeamName] = useState(null)
  const [actionMessage, setActionMessage] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [measuredFilter, setMeasuredFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name-asc')

  // Form state per team or active team
  const [selectedCompetition, setSelectedCompetition] = useState('Hegymászás')
  const [weightValue, setWeightValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [weightToDelete, setWeightToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [teamsRes, weightsData] = await Promise.all([
        fetch(`${API_BASE_URL}/api/Teams`),
        getAllWeights().catch((err) => {
          console.warn('Nem sikerült betölteni a súlyokat:', err)
          return []
        })
      ])

      if (!teamsRes.ok) {
        throw new Error('Nem sikerült betölteni a csapatokat.')
      }

      const teamsData = await teamsRes.json()
      setTeams(Array.isArray(teamsData) ? teamsData : [])
      setWeights(Array.isArray(weightsData) ? weightsData : [])
      setError('')
    } catch (err) {
      setError(err.message || 'Hiba történt az adatok betöltésekor.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (!actionMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setActionMessage(null)
    }, 4500)

    return () => window.clearTimeout(timeoutId)
  }, [actionMessage])

  // Group weights by teamName
  const weightsByTeam = useMemo(() => {
    const map = new Map()
    for (const w of weights) {
      const key = (w.teamName || '').trim().toLowerCase()
      if (!key) continue
      if (!map.has(key)) {
        map.set(key, [])
      }
      map.get(key).push(w)
    }
    return map
  }, [weights])

  const toggleTeam = (teamName) => {
    if (openTeamName === teamName) {
      setOpenTeamName(null)
      setWeightValue('')
    } else {
      setOpenTeamName(teamName)
      setWeightValue('')
      setSelectedCompetition('Hegymászás')
    }
  }

  const resetFilters = () => {
    setSearchTerm('')
    setCategoryFilter('all')
    setMeasuredFilter('all')
    setSortBy('name-asc')
  }

  const filteredTeams = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return teams
      .filter((team) => {
        const teamName = team.teamName || ''
        const schoolName = team.schoolName || ''
        const teamKey = teamName.trim().toLowerCase()
        const teamWeights = weightsByTeam.get(teamKey) || []

        if (normalizedSearch) {
          const matchSearch =
            teamName.toLowerCase().includes(normalizedSearch) ||
            schoolName.toLowerCase().includes(normalizedSearch)
          if (!matchSearch) {
            return false
          }
        }

        if (categoryFilter !== 'all') {
          if (String(team.category) !== String(categoryFilter)) {
            return false
          }
        }

        if (measuredFilter === 'none') {
          if (teamWeights.length > 0) return false
        } else if (measuredFilter === 'any') {
          if (teamWeights.length === 0) return false
        } else if (measuredFilter === 'Hegymászás') {
          const hasHegy = teamWeights.some(
            (w) => (w.competitionType || '').toLowerCase() === 'hegymászás'
          )
          if (!hasHegy) return false
        } else if (measuredFilter === 'Szumó') {
          const hasSzumo = teamWeights.some(
            (w) => (w.competitionType || '').toLowerCase() === 'szumó'
          )
          if (!hasSzumo) return false
        } else if (measuredFilter === 'both') {
          const hasHegy = teamWeights.some(
            (w) => (w.competitionType || '').toLowerCase() === 'hegymászás'
          )
          const hasSzumo = teamWeights.some(
            (w) => (w.competitionType || '').toLowerCase() === 'szumó'
          )
          if (!hasHegy || !hasSzumo) return false
        }

        return true
      })
      .sort((a, b) => {
        const nameA = a.teamName || ''
        const nameB = b.teamName || ''

        if (sortBy === 'name-asc') {
          return nameA.localeCompare(nameB, 'hu', { sensitivity: 'base' })
        }
        if (sortBy === 'name-desc') {
          return nameB.localeCompare(nameA, 'hu', { sensitivity: 'base' })
        }
        if (sortBy === 'school') {
          const schoolCompare = (a.schoolName || '').localeCompare(b.schoolName || '', 'hu', { sensitivity: 'base' })
          return schoolCompare !== 0 ? schoolCompare : nameA.localeCompare(nameB, 'hu', { sensitivity: 'base' })
        }
        return 0
      })
  }, [teams, weightsByTeam, searchTerm, categoryFilter, measuredFilter, sortBy])

  const handleAddWeight = async (e, teamName) => {
    e.preventDefault()
    if (!weightValue || isNaN(Number(weightValue)) || Number(weightValue) <= 0) {
      setActionMessage({
        type: 'danger',
        text: 'Kérlek adj meg egy érvényes pozitív súlyértéket grammban.'
      })
      return
    }

    try {
      setSubmitting(true)
      await postWeight({
        teamName,
        competitionName: selectedCompetition,
        weight: Number(weightValue)
      })

      setActionMessage({
        type: 'success',
        text: `${teamName} - ${selectedCompetition} súlya (${weightValue} g) sikeresen rögzítve.`
      })
      setWeightValue('')

      // Refresh weights
      const updatedWeights = await getAllWeights()
      setWeights(updatedWeights)
    } catch (err) {
      setActionMessage({
        type: 'danger',
        text: err.message || 'Nem sikerült rögzíteni a súlyt.'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteWeight = async () => {
    if (!weightToDelete) return

    try {
      setDeleting(true)
      await deleteWeight(weightToDelete.id)

      setActionMessage({
        type: 'success',
        text: 'A mérés sikeresen törölve.'
      })
      setWeightToDelete(null)

      // Refresh weights
      const updatedWeights = await getAllWeights()
      setWeights(updatedWeights)
    } catch (err) {
      setActionMessage({
        type: 'danger',
        text: err.message || 'Nem sikerült törölni a súlyt.'
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <main className="container py-4">
      <FloatingFeedback message={actionMessage} onDismiss={() => setActionMessage(null)} />

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="h3 mb-1">Mérlegelés</h2>
          <div className="text-muted">
            Csapatok robotjainak versenyszámonkénti súlymérése és rögzítése
          </div>
        </div>
        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={fetchData}
          disabled={loading}
        >
          <i className="bi bi-arrow-repeat me-1" />
          {loading ? 'Frissítés...' : 'Adatok frissítése'}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Keresés és szűrés kártya - az AdminPage mintájára */}
      <div className="card shadow-sm team-card no-hover-card mb-4">
        <div className="card-body p-3 p-md-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div>
              <h3 className="h5 mb-1">
                <i className="bi bi-search me-2" />
                Keresés és szűrés
              </h3>
              <div className="small text-muted">
                {filteredTeams.length} találat az összesen {teams.length} csapatból
              </div>
            </div>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={resetFilters}
            >
              <i className="bi bi-arrow-counterclockwise me-2" />
              Szűrők törlése
            </button>
          </div>

          <div className="row g-3">
            <div className="col-12 col-md-5 col-xl-4">
              <label htmlFor="team-search" className="form-label fw-semibold">
                Keresés csapat vagy iskola szerint
              </label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search" />
                </span>
                <input
                  id="team-search"
                  type="search"
                  className="form-control"
                  placeholder="Csapat neve vagy iskola..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="col-6 col-md-3 col-xl-2">
              <label htmlFor="team-category-filter" className="form-label fw-semibold">
                Korosztály
              </label>
              <select
                id="team-category-filter"
                className="form-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">Mindegyik</option>
                <option value="0">Általános iskola</option>
                <option value="1">Középiskola</option>
              </select>
            </div>

            <div className="col-6 col-md-4 col-xl-3">
              <label htmlFor="team-measured-filter" className="form-label fw-semibold">
                Mérési állapot
              </label>
              <select
                id="team-measured-filter"
                className="form-select"
                value={measuredFilter}
                onChange={(e) => setMeasuredFilter(e.target.value)}
              >
                <option value="all">Minden csapat</option>
                <option value="any">Van rögzített mérése</option>
                <option value="Hegymászás">Hegymászás lemérve</option>
                <option value="Szumó">Szumó lemérve</option>
                <option value="both">Mindkettő lemérve</option>
                <option value="none">Még nincs rögzített mérés</option>
              </select>
            </div>

            <div className="col-12 col-md-6 col-xl-3">
              <label htmlFor="team-sort" className="form-label fw-semibold">
                Rendezés
              </label>
              <select
                id="team-sort"
                className="form-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="name-asc">Csapatnév A–Z</option>
                <option value="name-desc">Csapatnév Z–A</option>
                <option value="school">Iskola szerint</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Betöltés...</span>
          </div>
          <div className="text-muted mt-2">Csapatok és súlyok betöltése...</div>
        </div>
      )}

      {!loading && filteredTeams.length === 0 && (
        <div className="alert alert-info text-center py-4">
          Nem található a szűrésnek megfelelő csapat.
        </div>
      )}

      {/* Csapatok listája harmonika-kártyákkal */}
      <div className="d-flex flex-column gap-3">
        {filteredTeams.map((team) => {
          const teamName = team.teamName || `Csapat #${team.id}`
          const teamKey = (team.teamName || '').trim().toLowerCase()
          const teamWeights = weightsByTeam.get(teamKey) || []
          const isOpen = openTeamName === teamName

          const hegymaszasWeights = teamWeights.filter(
            (w) => (w.competitionType || '').toLowerCase() === 'hegymászás'
          )
          const szumoWeights = teamWeights.filter(
            (w) => (w.competitionType || '').toLowerCase() === 'szumó'
          )

          return (
            <div key={team.id || teamName} className="card shadow-sm team-card overflow-hidden">
              <div className="team-card-header d-flex align-items-center gap-2 p-2">
                <button
                  className="btn btn-outline-secondary flex-grow-1 text-start border-0 py-2 px-2 team-toggle"
                  type="button"
                  onClick={() => toggleTeam(teamName)}
                  aria-expanded={isOpen}
                >
                  <span className="d-flex justify-content-between align-items-center gap-3">
                    <span>
                      <span className="d-block fw-bold fs-5">
                        <AgeGroupBadge category={team.category} className="me-2" />
                        {teamName}
                        {Boolean(team.isDisqualified) && (
                          <span className="badge text-bg-danger ms-2">Kizárva</span>
                        )}
                        {Boolean(team.group) && (
                          <span className="badge text-bg-light border text-dark ms-2">
                            {team.group} csoport
                          </span>
                        )}
                      </span>
                      <span className="small opacity-75">
                        {team.schoolName || 'Nincs megadott iskola'}
                      </span>
                      <div className="mt-2 d-flex flex-wrap gap-2">
                        {hegymaszasWeights.length > 0 ? (
                          hegymaszasWeights.map((hw) => (
                            <span
                              key={`hw-${hw.id}`}
                              className="badge border"
                              style={{
                                backgroundColor: 'var(--yellow)',
                                color: 'var(--black)',
                                borderColor: 'var(--black)'
                              }}
                            >
                              Hegymászás: {hw.weight} g
                            </span>
                          ))
                        ) : (
                          <span className="badge text-bg-light border text-muted">
                            Hegymászás: nincs mérve
                          </span>
                        )}

                        {szumoWeights.length > 0 ? (
                          szumoWeights.map((sw) => (
                            <span
                              key={`sw-${sw.id}`}
                              className="badge"
                              style={{
                                backgroundColor: 'var(--orange)',
                                color: 'var(--white)'
                              }}
                            >
                              Szumó: {sw.weight} g
                            </span>
                          ))
                        ) : (
                          <span className="badge text-bg-light border text-muted">
                            Szumó: nincs mérve
                          </span>
                        )}
                      </div>
                    </span>
                    <span className="fs-5" aria-hidden="true">
                      {isOpen ? '▴' : '▾'}
                    </span>
                  </span>
                </button>
              </div>

              <div className={`team-details ${isOpen ? 'open' : ''}`}>
                <div className="card-body border-top bg-light p-3 p-md-4">
                  {/* Rögzített mérések listája */}
                  <h4 className="h6 fw-bold mb-3">
                    <i className="bi bi-speedometer2 me-2" />
                    Rögzített súlyok ({teamWeights.length})
                  </h4>

                  {teamWeights.length === 0 ? (
                    <div className="alert alert-light border small text-muted mb-4">
                      Ennél a csapatnál még nincs rögzítve súlymérés.
                    </div>
                  ) : (
                    <div className="table-responsive mb-4">
                      <table className="table table-bordered table-sm align-middle bg-white">
                        <thead className="table-light">
                          <tr>
                            <th>Versenyszám</th>
                            <th>Mért súly (g)</th>
                            <th style={{ width: '100px' }} className="text-center">
                              Művelet
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {teamWeights.map((w) => (
                            <tr key={w.id}>
                              <td className="fw-semibold">
                                <span
                                  className="badge me-2"
                                  style={{
                                    backgroundColor:
                                      (w.competitionType || '').toLowerCase() === 'szumó'
                                        ? 'var(--orange)'
                                        : 'var(--yellow)',
                                    color:
                                      (w.competitionType || '').toLowerCase() === 'szumó'
                                        ? 'var(--white)'
                                        : 'var(--black)'
                                  }}
                                >
                                  {w.competitionType}
                                </span>
                              </td>
                              <td className="fs-6">
                                <strong>{w.weight}</strong> g
                              </td>
                              <td className="text-center">
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => setWeightToDelete(w)}
                                  title="Súly törlése"
                                >
                                  <i className="bi bi-trash" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Új mérés rögzítése űrlap */}
                  <div className="card border">
                    <div className="card-header bg-white py-2">
                      <span className="fw-semibold small">
                        <i className="bi bi-plus-circle me-1" />
                        Új súly rögzítése - {teamName}
                      </span>
                    </div>
                    <div className="card-body p-3">
                      <form onSubmit={(e) => handleAddWeight(e, teamName)}>
                        <div className="row g-3 align-items-end">
                          <div className="col-12 col-sm-6 col-md-5">
                            <label className="form-label small fw-semibold">Versenyszám</label>
                            <select
                              className="form-select form-select-sm"
                              value={selectedCompetition}
                              onChange={(e) => setSelectedCompetition(e.target.value)}
                            >
                              {ALLOWED_COMPETITIONS.map((comp) => (
                                <option key={comp} value={comp}>
                                  {comp}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="col-12 col-sm-6 col-md-4">
                            <label className="form-label small fw-semibold">Súly (grammban)</label>
                            <div className="input-group input-group-sm">
                              <input
                                type="number"
                                className="form-control"
                                placeholder="pl. 750"
                                min="1"
                                step="1"
                                value={weightValue}
                                onChange={(e) => setWeightValue(e.target.value)}
                                required
                              />
                              <span className="input-group-text">g</span>
                            </div>
                          </div>

                          <div className="col-12 col-md-3">
                            <button
                              type="submit"
                              className="btn btn-success btn-sm w-100"
                              style={{
                                backgroundColor: 'var(--green)',
                                borderColor: 'var(--green)',
                                color: 'var(--white)'
                              }}
                              disabled={submitting}
                            >
                              <i className="bi bi-check2-circle me-1" />
                              {submitting ? 'Mentés...' : 'Súly rögzítése'}
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Törlés megerősítő modális */}
      <ConfirmModal
        isOpen={Boolean(weightToDelete)}
        title="Mérés törlésének megerősítése"
        message={
          weightToDelete
            ? `Biztosan törölni szeretnéd a(z) ${weightToDelete.teamName} csapat ${weightToDelete.competitionType} versenyszámához rögzített ${weightToDelete.weight} g mért súlyát?`
            : ''
        }
        confirmText={deleting ? 'Törlés folyamatban...' : 'Igen, törlöm'}
        cancelText="Mégse"
        confirmVariant="danger"
        disabled={deleting}
        onConfirm={handleDeleteWeight}
        onCancel={() => setWeightToDelete(null)}
      />
    </main>
  )
}
