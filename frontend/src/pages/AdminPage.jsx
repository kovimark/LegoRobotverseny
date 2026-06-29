import React, { useEffect, useState } from 'react'

export default function AdminPage() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openTeamId, setOpenTeamId] = useState(null)

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await fetch('http://legocompetition.runasp.net/api/Teams')
        if (!response.ok) {
          throw new Error('Nem sikerült betölteni a csapatokat.')
        }

        const data = await response.json()
        setTeams(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTeams()
  }, [])

  const toggleTeam = (teamId) => {
    setOpenTeamId((prevId) => (prevId === teamId ? null : teamId))
  }

  return (
    <div className="container py-4">
      <h2 className="mb-4">Admin felület</h2>

      {loading && <div className="alert alert-info">Csapatok betöltése...</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && teams.length === 0 && (
        <div className="alert alert-secondary">Nincsenek csapatok.</div>
      )}

      <div className="d-flex flex-column gap-3">
        {teams.map((team) => {
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
                    <li><strong>Email:</strong> {team.emailAddress || '-'}</li>
                    <li><strong>1. tag:</strong> {team.teamMember1Name || '-'}</li>
                    <li><strong>2. tag:</strong> {team.teamMember2Name || '-'}</li>
                    <li><strong>1. tag életkora:</strong> {team.teamMember1Age ?? '-'}</li>
                    <li><strong>2. tag életkora:</strong> {team.teamMember2Age ?? '-'}</li>
                    <li><strong>1. coach:</strong> {team.teamCoach1 || '-'}</li>
                    <li><strong>2. coach:</strong> {team.teamCoach2 || '-'}</li>
                    <li><strong>Iskola:</strong> {team.schoolName || '-'}</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
