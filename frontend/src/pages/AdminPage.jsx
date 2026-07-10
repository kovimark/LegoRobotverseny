import React, { useEffect, useState } from 'react'

export default function AdminPage() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openTeamId, setOpenTeamId] = useState(null)
  const [actionMessage, setActionMessage] = useState(null)
  const [teamToDelete, setTeamToDelete] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchTeams = async () => {
    try {
      setLoading(true)
      const response = await fetch('https://legocompetition.runasp.net/api/Teams')
      if (!response.ok) {
        throw new Error('Nem sikerült betölteni a csapatokat.')
      }

      const data = await response.json()
      setTeams(Array.isArray(data) ? data : [])
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeams()
  }, [])

  useEffect(() => {
    if (!actionMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setActionMessage(null)
    }, 5000)

    return () => window.clearTimeout(timeoutId)
  }, [actionMessage])

  const toggleTeam = (teamId) => {
    setOpenTeamId((prevId) => (prevId === teamId ? null : teamId))
  }

  const filteredTeams = teams.filter((team) => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    if (!normalizedSearch) {
      return true
    }

    const searchableValues = [
      team.teamName,
      team.teamMember1Name,
      team.teamMember1Email,
      team.teamMember2Name,
      team.teamMember2Email,
      team.teamCoach1,
      team.teamCoach1Email,
      team.teamCoach2,
      team.teamCoach2Email,
      team.schoolName,
      team.id,
      team.teamMember1Age,
      team.teamMember2Age
    ].filter(Boolean)

    return searchableValues.some((value) => String(value).toLowerCase().includes(normalizedSearch))
  })

  const handleDelete = async () => {
    if (!teamToDelete) {
      return
    }

    try {
      const response = await fetch(`https://legocompetition.runasp.net/api/Teams/${teamToDelete.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('A törlés nem sikerült.')
      }

      setActionMessage({ type: 'success', text: 'A jelentkezés törölve.' })
      setTeamToDelete(null)
      await fetchTeams()
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.message })
      setTeamToDelete(null)
    }
  }

  return (
    <div className="container py-4">
      <h2 className="mb-4">Csapatok</h2>

      {loading && <div className="alert alert-info">Csapatok betöltése...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      {actionMessage && (
        <div className={`small ${actionMessage.type === 'success' ? 'text-success' : 'text-danger'}`} role="status">
          {actionMessage.text}
        </div>
      )}

      {!loading && !error && teams.length === 0 && (
        <div className="alert alert-secondary">Nincsenek csapatok.</div>
      )}

      <div className="row g-3 align-items-start">
        <div className="col-lg-4">
          <label htmlFor="team-search" className="form-label fw-semibold">Keresés</label>
          <input
            id="team-search"
            type="text"
            className="form-control"
            placeholder="Keresés név, email, iskola vagy egyéb adat alapján"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="col-lg-12 d-flex flex-column gap-3">
          {filteredTeams.map((team) => {
          const isOpen = openTeamId === team.id

          return (
            <div key={team.id} className="card shadow-sm team-card">
              <button
                className="btn btn-outline-secondary w-100 text-start rounded-0 border-0 py-3 px-3 team-toggle"
                type="button"
                onClick={() => toggleTeam(team.id)}
                aria-expanded={isOpen}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fw-semibold">{team.teamName || `Csapat #${team.id}`}</span>
                  <span>{isOpen ? '▴' : '▾'}</span>
                </div>
              </button>

              <div className={`team-details ${isOpen ? 'open' : ''}`}>
                <div className="card-body border-top">
                  <ul className="list-unstyled mb-0">
                    <li><strong>Csapatnév:</strong> {team.teamName || '-'}</li>
                    <li><strong>1. versenyző neve:</strong> {team.teamMember1Name || '-'}</li>
                    <li><strong>1. versenyző e-mail:</strong> {team.teamMember1Email || '-'}</li>
                    <li><strong>1. versenyző életkora:</strong> {team.teamMember1Age ?? '-'}</li>
                    <li><strong>2. versenyző neve:</strong> {team.teamMember2Name || '-'}</li>
                    <li><strong>2. versenyző e-mail:</strong> {team.teamMember2Email || '-'}</li>
                    <li><strong>2. versenyző életkora:</strong> {team.teamMember2Age ?? '-'}</li>
                    <li><strong>1. coach neve:</strong> {team.teamCoach1 || '-'}</li>
                    <li><strong>1. coach e-mail:</strong> {team.teamCoach1Email || '-'}</li>
                    <li><strong>2. coach neve:</strong> {team.teamCoach2 || '-'}</li>
                    <li><strong>2. coach e-mail:</strong> {team.teamCoach2Email || '-'}</li>
                    <li><strong>Iskola:</strong> {team.schoolName || '-'}</li>
                  </ul>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm mt-3"
                    onClick={() => setTeamToDelete(team)}
                  >
                    Törlés
                  </button>
                </div>
              </div>
            </div>
          )
          })}
        </div>
      </div>

      {teamToDelete && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)', zIndex: 1050 }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-sm m-0" role="document">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden bg-white text-dark">
              <div className="modal-header border-0 px-4 py-3 bg-white">
                <h5 className="modal-title fw-bold text-dark">Jelentkezés törlése</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setTeamToDelete(null)}></button>
              </div>
              <div className="modal-body px-4 py-4">
                <p className="mb-2 text-dark">Biztosan törölni szeretnéd a következő jelentkezést?</p>
                <p className="fw-semibold mb-0 text-dark">{teamToDelete.teamName || `Csapat #${teamToDelete.id}`}</p>
              </div>
              <div className="modal-footer border-0 px-4 pb-4 pt-0">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setTeamToDelete(null)}>Mégse</button>
                <button type="button" className="btn btn-danger" onClick={handleDelete}>Törlés</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
