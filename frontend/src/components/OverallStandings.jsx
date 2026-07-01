import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const sortableColumns = [
  { key: 'teamName', label: 'Csapat' },
  { key: 'lineFollowPoint', label: 'Vonalkövetés' },
  { key: 'hillClimbPoint', label: 'Hegymászás' },
  { key: 'sumoPoint', label: 'Szumó' },
  { key: 'basketballPoint', label: 'Kosár' },
  { key: 'allPoint', label: 'Összesen' }
]

export default function OverallStandings() {
  const navigate = useNavigate()
  const [standings, setStandings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: 'allPoint', direction: 'desc' })

  useEffect(() => {
    const loadStandings = async () => {
      try {
        setLoading(true)
        setError('')
        const response = await fetch('https://legocompetition.runasp.net/api/Points')
        if (!response.ok) throw new Error('Nem sikerült betölteni az összesített ponttáblázatot.')
        const data = await response.json()
        setStandings(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadStandings()
  }, [])

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  const sortedStandings = [...standings].sort((a, b) => {
    const direction = sortConfig.direction === 'asc' ? 1 : -1
    const aValue = a[sortConfig.key]
    const bValue = b[sortConfig.key]

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return (aValue - bValue) * direction
    }

    const aText = String(aValue ?? '').toLowerCase()
    const bText = String(bValue ?? '').toLowerCase()
    return aText.localeCompare(bText) * direction
  })

  return (
    <div>
      <div className="alert alert-info">Összesített ponttáblázat</div>
      {loading && <div className="alert alert-secondary">Betöltés...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      {!loading && !error && standings.length === 0 && <div className="alert alert-secondary">Nincs elérhető összesített eredmény.</div>}
      {!loading && !error && standings.length > 0 && (
        <div className="card shadow-sm team-card no-hover-card">
          <div className="card-body p-3 p-md-4">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div>
                <h4 className="mb-1">Összesített eredmények</h4>
                <p className="text-muted mb-0 small">Kattints egy csapat nevére a részletes adatok megnyitásához.</p>
              </div>
            </div>
            <div className="table-responsive standings-table-wrapper">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    {sortableColumns.map((column) => {
                      const isActive = sortConfig.key === column.key
                      const directionArrow = isActive ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'
                      return (
                        <th key={column.key}>
                          <button
                            type="button"
                            className={`btn btn-link p-0 fw-bold text-start ${isActive ? 'text-primary' : 'text-dark'}`}
                            onClick={() => handleSort(column.key)}
                            style={{ textDecoration: 'none' }}
                          >
                            {column.label} <span aria-hidden="true">{directionArrow}</span>
                          </button>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sortedStandings.map((team) => (
                    <tr
                      key={team.teamName}
                      onClick={() => navigate(`/csapat/${encodeURIComponent(team.teamName)}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="fw-semibold">{team.teamName}</td>
                      <td>{team.lineFollowPoint} <small className="text-muted">({team.lineFollowPosition}. hely)</small></td>
                      <td>{team.hillClimbPoint} <small className="text-muted">({team.hillClimbPosition}. hely)</small></td>
                      <td>{team.sumoPoint} <small className="text-muted">({team.sumoPosition}. hely)</small></td>
                      <td>{team.basketballPoint} <small className="text-muted">({team.basketballPosition}. hely)</small></td>
                      <td className="fw-bold">{team.allPoint}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
