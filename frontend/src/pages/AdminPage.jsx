import React, { useEffect, useState } from 'react'
import FloatingFeedback from '../components/FloatingFeedback'

const editableTeamFields = [
  'teamName',
  'teamMember1Email',
  'teamMember2Email',
  'teamMember1Name',
  'teamMember2Name',
  'teamMember1Class',
  'teamMember2Class',
  'teamCoach1',
  'teamCoach1Email',
  'schoolName'
]

const getCategory = (member1Class, member2Class) => (
  Number(member1Class) >= 9 || Number(member2Class) >= 9 ? 1 : 0
)

export default function AdminPage() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openTeamId, setOpenTeamId] = useState(null)
  const [actionMessage, setActionMessage] = useState(null)
  const [teamToDelete, setTeamToDelete] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [teamToEdit, setTeamToEdit] = useState(null)
  const [editErrors, setEditErrors] = useState({})
  const [editLoading, setEditLoading] = useState(false)
  const [saving, setSaving] = useState(false)

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
      team.category,
      team.schoolName,
      team.id,
      team.teamMember1Class,
      team.teamMember2Class
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

  const startInlineEdit = async (team) => {
    setEditLoading(true)
    setEditErrors({})
    setTeamToEdit({ ...team })
    setOpenTeamId(team.id)

    try {
      const response = await fetch(`https://legocompetition.runasp.net/api/Teams/${team.id}`, {
        headers: { accept: '*/*' }
      })

      if (!response.ok) {
        throw new Error('Nem sikerült betölteni a csapat adatait.')
      }

      const data = await response.json()
      setTeamToEdit({
        ...data,
        category: getCategory(data.teamMember1Class, data.teamMember2Class)
      })
    } catch (err) {
      setTeamToEdit(null)
      setActionMessage({ type: 'danger', text: err.message })
    } finally {
      setEditLoading(false)
    }
  }

  const handleEditChange = (event) => {
    const { name, value } = event.target
    const parsedValue = name.includes('Class') && value !== ''
      ? Math.min(13, Number(value))
      : value

    setTeamToEdit((previousTeam) => {
      const updatedTeam = { ...previousTeam, [name]: parsedValue }
      updatedTeam.category = getCategory(updatedTeam.teamMember1Class, updatedTeam.teamMember2Class)
      return updatedTeam
    })
    setEditErrors((previousErrors) => ({ ...previousErrors, [name]: '' }))
  }

  const handleSave = async (event) => {
    event.preventDefault()

    if (!teamToEdit) {
      return
    }

    const validationErrors = {}
    editableTeamFields.forEach((fieldName) => {
      const value = teamToEdit[fieldName]
      if (value === '' || value === null || value === undefined) {
        validationErrors[fieldName] = 'A mező kitöltése kötelező.'
      }
    })

    ;['teamMember1Class', 'teamMember2Class'].forEach((fieldName) => {
      const value = Number(teamToEdit[fieldName])
      if (!Number.isInteger(value) || value < 1 || value > 13) {
        validationErrors[fieldName] = 'Az osztály 1 és 13 közötti egész szám lehet.'
      }
    })

    if (Object.keys(validationErrors).length > 0) {
      setEditErrors(validationErrors)
      return
    }

    const payload = editableTeamFields.reduce((result, fieldName) => {
      result[fieldName] = typeof teamToEdit[fieldName] === 'string'
        ? teamToEdit[fieldName].trim()
        : teamToEdit[fieldName]
      return result
    }, {
      id: teamToEdit.id,
      category: getCategory(teamToEdit.teamMember1Class, teamToEdit.teamMember2Class)
    })

    payload.teamMember1Class = Number(teamToEdit.teamMember1Class)
    payload.teamMember2Class = Number(teamToEdit.teamMember2Class)

    try {
      setSaving(true)
      const response = await fetch(`https://legocompetition.runasp.net/api/Teams/${teamToEdit.id}`, {
        method: 'PUT',
        headers: {
          accept: '*/*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'A csapat adatainak mentése nem sikerült.')
      }

      setTeams((previousTeams) => previousTeams.map((team) => (
        team.id === payload.id ? { ...team, ...payload } : team
      )))
      setTeamToEdit(null)
      setActionMessage({ type: 'success', text: 'A csapat adatai sikeresen frissültek.' })
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container py-4">
      <h2 className="mb-4">Csapatok</h2>

      {loading && <div className="alert alert-info">Csapatok betöltése...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      <FloatingFeedback message={actionMessage} onClose={() => setActionMessage(null)} />

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
            <div key={team.id} className="card shadow-sm team-card overflow-hidden">
              <div className="team-card-header d-flex align-items-center gap-2 p-2">
                <button
                  className="btn btn-outline-secondary flex-grow-1 text-start border-0 py-2 px-2 team-toggle"
                  type="button"
                  onClick={() => toggleTeam(team.id)}
                  aria-expanded={isOpen}
                >
                  <span className="d-flex justify-content-between align-items-center gap-3">
                    <span>
                      <span className="d-block fw-bold fs-5">{team.teamName || `Csapat #${team.id}`}</span>
                      <span className="small opacity-75">{team.schoolName || 'Nincs megadott iskola'}</span>
                    </span>
                    <span className="fs-5" aria-hidden="true">{isOpen ? '▴' : '▾'}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm flex-shrink-0"
                  onClick={() => startInlineEdit(team)}
                >
                  Szerkesztés
                </button>
              </div>

              <div className={`team-details ${isOpen ? 'open' : ''}`}>
                <div className="card-body border-top">
                  {teamToEdit?.id === team.id ? (
                    <form onSubmit={handleSave}>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h3 className="h5 mb-0">Csapat adatainak szerkesztése</h3>
                        <span className="badge text-bg-dark">#{team.id}</span>
                      </div>
                      {editLoading ? (
                        <div className="alert alert-info mb-0">Csapat adatainak betöltése...</div>
                      ) : (
                        <div className="row g-3">
                          {[
                            {
                              title: 'Csapatadatok',
                              fields: [['teamName', 'Csapatnév', 'text'], ['schoolName', 'Iskola neve', 'text']]
                            },
                            {
                              title: '1. versenyző',
                              fields: [['teamMember1Name', 'Név', 'text'], ['teamMember1Email', 'E-mail-cím', 'email'], ['teamMember1Class', 'Osztály', 'number']]
                            },
                            {
                              title: '2. versenyző',
                              fields: [['teamMember2Name', 'Név', 'text'], ['teamMember2Email', 'E-mail-cím', 'email'], ['teamMember2Class', 'Osztály', 'number']]
                            },
                            {
                              title: 'Felkészítő tanár',
                              fields: [['teamCoach1', 'Név', 'text'], ['teamCoach1Email', 'E-mail-cím', 'email']]
                            }
                          ].map((group) => (
                            <div className="col-md-6 col-xl-3" key={group.title}>
                              <section className="team-info-box h-100">
                                <h3 className="team-info-title">{group.title}</h3>
                                <div className="d-flex flex-column gap-3">
                                  {group.fields.map(([name, label, type]) => (
                                    <div key={name}>
                                      <label className="form-label small fw-semibold mb-1" htmlFor={`edit-${team.id}-${name}`}>{label}</label>
                                      <input
                                        className={`form-control ${editErrors[name] ? 'is-invalid' : ''}`}
                                        id={`edit-${team.id}-${name}`}
                                        name={name}
                                        type={type}
                                        min={type === 'number' ? 1 : undefined}
                                        max={type === 'number' ? 13 : undefined}
                                        step={type === 'number' ? 1 : undefined}
                                        value={teamToEdit[name] ?? ''}
                                        onChange={handleEditChange}
                                      />
                                      {editErrors[name] && <div className="invalid-feedback">{editErrors[name]}</div>}
                                    </div>
                                  ))}
                                </div>
                              </section>
                            </div>
                          ))}
                          <div className="col-12">
                            <section className="team-info-box team-info-category">
                              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                                <div>
                                  <h3 className="team-info-title mb-1">Automatikus besorolás</h3>
                                  <div className="team-info-value">
                                    {teamToEdit.category === 1 ? 'Középiskolás' : 'Általános iskolás'}
                                  </div>
                                </div>
                                <span className="badge text-bg-dark fs-6">
                                  {teamToEdit.category === 1 ? '9–13. osztály' : '1–8. osztály'}
                                </span>
                              </div>
                            </section>
                          </div>
                        </div>
                      )}
                      <div className="d-flex justify-content-end gap-2 mt-4">
                        <button type="button" className="btn btn-outline-secondary" onClick={() => setTeamToEdit(null)} disabled={saving}>Mégse</button>
                        <button type="submit" className="btn btn-primary" disabled={saving || editLoading}>
                          {saving ? 'Mentés...' : 'Módosítások mentése'}
                        </button>
                      </div>
                    </form>
                  ) : (
                  <>
                  <div className="row g-3">
                    <div className="col-md-6 col-xl-3">
                      <section className="team-info-box h-100">
                        <h3 className="team-info-title">1. versenyző</h3>
                        <div className="team-info-value">{team.teamMember1Name || '-'}</div>
                        <div className="team-info-meta">{team.teamMember1Email || '-'}</div>
                        <span className="badge text-bg-light mt-2">{team.teamMember1Class ? `${team.teamMember1Class}. osztály` : '-'}</span>
                      </section>
                    </div>
                    <div className="col-md-6 col-xl-3">
                      <section className="team-info-box h-100">
                        <h3 className="team-info-title">2. versenyző</h3>
                        <div className="team-info-value">{team.teamMember2Name || '-'}</div>
                        <div className="team-info-meta">{team.teamMember2Email || '-'}</div>
                        <span className="badge text-bg-light mt-2">{team.teamMember2Class ? `${team.teamMember2Class}. osztály` : '-'}</span>
                      </section>
                    </div>
                    <div className="col-md-6 col-xl-3">
                      <section className="team-info-box h-100">
                        <h3 className="team-info-title">Felkészítő tanár</h3>
                        <div className="team-info-value">{team.teamCoach1 || '-'}</div>
                        <div className="team-info-meta">{team.teamCoach1Email || '-'}</div>
                      </section>
                    </div>
                    <div className="col-md-6 col-xl-3">
                      <section className="team-info-box team-info-category h-100">
                        <h3 className="team-info-title">Besorolás</h3>
                        <div className="team-info-value">
                          {team.category === 0 ? 'Általános iskola' : team.category === 1 ? 'Középiskola' : '-'}
                        </div>
                        <div className="team-info-meta">{team.category === 0 ? '1–8. osztály' : team.category === 1 ? '9–13. osztály' : ''}</div>
                        <span className="badge text-bg-dark mt-2">Csapatazonosító: {team.id}</span>
                      </section>
                    </div>
                  </div>
                  <div className="d-flex justify-content-end mt-3">
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => setTeamToDelete(team)}
                    >
                      Törlés
                    </button>
                  </div>
                  </>
                  )}
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
