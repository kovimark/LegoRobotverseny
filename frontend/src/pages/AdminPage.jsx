import React, { useEffect, useMemo, useState } from 'react'
import FloatingFeedback from '../components/FloatingFeedback'
import AgeGroupBadge from '../components/AgeGroupBadge'

const editableTeamFields = [
  'teamName',
  'schoolName',
  'category',
  'group',
  'teamMember1Name',
  'teamMember1Email',
  'teamMember1Class',
  'teamMember2Name',
  'teamMember2Email',
  'teamMember2Class',
  'teamCoach1',
  'teamCoach1Email'
]

const API_BASE_URL = 'https://legocompetition.runasp.net'

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
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [groupFilter, setGroupFilter] = useState('all')
  const [schoolFilter, setSchoolFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name-asc')
  const [disqualifying, setDisqualifying] = useState(null)

  const fetchTeams = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/Teams`)
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

  const groupOptions = useMemo(() => Array.from(new Set(
    teams.map((team) => String(team.group || '').trim().toUpperCase()).filter(Boolean)
  )).sort((left, right) => left.localeCompare(right, 'hu')), [teams])

  const schoolOptions = useMemo(() => Array.from(new Set(
    teams.map((team) => String(team.schoolName || '').trim()).filter(Boolean)
  )).sort((left, right) => left.localeCompare(right, 'hu')), [teams])

  const filteredTeams = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('hu-HU')
    const matches = teams.filter((team) => {
      const searchableValues = [
        team.teamName,
        team.schoolName,
        team.group,
        team.id,
        team.teamMember1Name,
        team.teamMember1Email,
        team.teamMember2Name,
        team.teamMember2Email,
        team.teamCoach1,
        team.teamCoach1Email
      ].filter((value) => value !== null && value !== undefined && value !== '')
      const matchesSearch = !normalizedSearch || searchableValues.some(
        (value) => String(value).toLocaleLowerCase('hu-HU').includes(normalizedSearch)
      )
      const matchesCategory = categoryFilter === 'all' || Number(team.category) === Number(categoryFilter)
      const teamGroup = String(team.group || '').trim().toUpperCase()
      const matchesGroup = groupFilter === 'all'
        || (groupFilter === 'none' ? !teamGroup : teamGroup === groupFilter)
      const matchesSchool = schoolFilter === 'all' || team.schoolName === schoolFilter
      return matchesSearch && matchesCategory && matchesGroup && matchesSchool
    })

    return matches.sort((left, right) => {
      if (sortBy === 'name-desc') return String(right.teamName || '').localeCompare(String(left.teamName || ''), 'hu')
      if (sortBy === 'school') return String(left.schoolName || '').localeCompare(String(right.schoolName || ''), 'hu') || String(left.teamName || '').localeCompare(String(right.teamName || ''), 'hu')
      if (sortBy === 'group') return String(left.group || 'ZZ').localeCompare(String(right.group || 'ZZ'), 'hu') || String(left.teamName || '').localeCompare(String(right.teamName || ''), 'hu')
      if (sortBy === 'newest') return Number(right.id || 0) - Number(left.id || 0)
      if (sortBy === 'oldest') return Number(left.id || 0) - Number(right.id || 0)
      return String(left.teamName || '').localeCompare(String(right.teamName || ''), 'hu')
    })
  }, [teams, searchTerm, categoryFilter, groupFilter, schoolFilter, sortBy])

  const resetFilters = () => {
    setSearchTerm('')
    setCategoryFilter('all')
    setGroupFilter('all')
    setSchoolFilter('all')
    setSortBy('name-asc')
  }

  const handleDelete = async () => {
    if (!teamToDelete) {
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/Teams/${teamToDelete.id}`, {
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

  const handleDisqualify = async (team) => {
    if (!team) {
      return
    }

    try {
      setDisqualifying(team.id)
      const response = await fetch(`${API_BASE_URL}/api/Teams/disqualify/${team.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('A kizárás nem sikerült.')
      }

      setActionMessage({ type: 'success', text: 'A csapat sikeresen kizárva.' })
      await fetchTeams()
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.message })
    } finally {
      setDisqualifying(null)
    }
  }

  const startInlineEdit = async (team) => {
    setEditLoading(true)
    setEditErrors({})
    setTeamToEdit({ ...team })
    setOpenTeamId(team.id)

    try {
      const response = await fetch(`${API_BASE_URL}/api/Teams/${team.id}`, {
        headers: { accept: '*/*' }
      })

      if (!response.ok) {
        throw new Error('Nem sikerült betölteni a csapat adatait.')
      }

      const data = await response.json()
      setTeamToEdit(data)
    } catch (err) {
      setTeamToEdit(null)
      setActionMessage({ type: 'danger', text: err.message })
    } finally {
      setEditLoading(false)
    }
  }

  const handleEditChange = (event) => {
    const { name, value } = event.target
    setTeamToEdit((previousTeam) => {
      const updatedTeam = { ...previousTeam, [name]: value }
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
    ;['teamName', 'schoolName'].forEach((fieldName) => {
      const value = teamToEdit[fieldName]
      if (value === '' || value === null || value === undefined) {
        validationErrors[fieldName] = 'A mező kitöltése kötelező.'
      }
    })

    if (Object.keys(validationErrors).length > 0) {
      setEditErrors(validationErrors)
      return
    }

    const payload = {
      teamName: typeof teamToEdit.teamName === 'string' ? teamToEdit.teamName.trim() : teamToEdit.teamName,
      schoolName: typeof teamToEdit.schoolName === 'string' ? teamToEdit.schoolName.trim() : teamToEdit.schoolName,
      category: Number(teamToEdit.category),
      group: teamToEdit.group || '-',
      teamMember1Name: teamToEdit.teamMember1Name || null,
      teamMember1Email: teamToEdit.teamMember1Email || null,
      teamMember1Class: teamToEdit.teamMember1Class ? Number(teamToEdit.teamMember1Class) : null,
      teamMember2Name: teamToEdit.teamMember2Name || null,
      teamMember2Email: teamToEdit.teamMember2Email || null,
      teamMember2Class: teamToEdit.teamMember2Class ? Number(teamToEdit.teamMember2Class) : null,
      teamCoach1: teamToEdit.teamCoach1 || null,
      teamCoach1Email: teamToEdit.teamCoach1Email || null
    }

    try {
      setSaving(true)
      const response = await fetch(`${API_BASE_URL}/api/Teams/${teamToEdit.id}`, {
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
        team.id === teamToEdit.id ? { ...team, ...payload } : team
      )))
      setTeamToEdit(null)

      setActionMessage({ type: 'success', text: 'A csapat adatai sikeresen frissültek.' })

      await fetchTeams()
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

      <div className="card shadow-sm team-card no-hover-card mb-4">
        <div className="card-body p-3 p-md-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div>
              <h3 className="h5 mb-1"><i className="bi bi-search me-2" />Keresés és szűrés</h3>
              <div className="small text-muted">{filteredTeams.length} találat az összesen {teams.length} csapatból</div>
            </div>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={resetFilters}>
              <i className="bi bi-arrow-counterclockwise me-2" />Szűrők törlése
            </button>
          </div>
          <div className="row g-3">
            <div className="col-12 col-xl-4">
              <label htmlFor="team-search" className="form-label fw-semibold">Szabad szavas keresés</label>
              <div className="input-group">
                <span className="input-group-text"><i className="bi bi-search" /></span>
                <input
                  id="team-search"
                  type="search"
                  className="form-control"
                  placeholder="Csapat, iskola, személy e-mail vagy azonosító"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>
            <div className="col-6 col-md-3 col-xl-2">
              <label htmlFor="team-category-filter" className="form-label fw-semibold">Korosztály</label>
              <select id="team-category-filter" className="form-select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="all">Mindegyik</option>
                <option value="0">Általános iskola</option>
                <option value="1">Középiskola</option>
              </select>
            </div>
            <div className="col-6 col-md-3 col-xl-2">
              <label htmlFor="team-group-filter" className="form-label fw-semibold">Csoport</label>
              <select id="team-group-filter" className="form-select" value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
                <option value="all">Mindegyik</option>
                <option value="none">Nincs csoport</option>
                {groupOptions.map((group) => <option value={group} key={group}>{group} csoport</option>)}
              </select>
            </div>
            <div className="col-12">
              <label htmlFor="team-school-filter" className="form-label fw-semibold">Iskola</label>
              <select id="team-school-filter" className="form-select" value={schoolFilter} onChange={(event) => setSchoolFilter(event.target.value)}>
                <option value="all">Minden iskola</option>
                {schoolOptions.map((school) => <option value={school} key={school}>{school}</option>)}
              </select>
            </div>
            <div className="col-12 col-md-6 col-xl-2">
              <label htmlFor="team-sort" className="form-label fw-semibold">Rendezés</label>
              <select id="team-sort" className="form-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="name-asc">Csapatnév A–Z</option>
                <option value="name-desc">Csapatnév Z–A</option>
                <option value="school">Iskola szerint</option>
                <option value="group">Csoport szerint</option>
                <option value="newest">Legújabb elöl</option>
                <option value="oldest">Legrégebbi elöl</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 align-items-start">
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
                      <span className="d-block fw-bold fs-5">
                        <AgeGroupBadge category={team.category} className="me-2" />
                        {team.teamName || `Csapat #${team.id}`}
                        {team.isDisqualified && <span className="badge text-bg-danger ms-2">Kizárva</span>}
                      </span>
                      <span className="small opacity-75">{team.schoolName || 'Nincs megadott iskola'}</span>
                      {team.group && <span className="badge text-bg-light border text-dark ms-2">{String(team.group).toUpperCase()} csoport</span>}
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
                <button
                  type="button"
                  className="btn btn-sm flex-shrink-0"
                  style={{
                    backgroundColor: team.isDisqualified ? 'var(--gray)' : 'var(--red)',
                    borderColor: team.isDisqualified ? 'var(--gray)' : 'var(--red)',
                    color: 'var(--white)'
                  }}
                  onClick={() => handleDisqualify(team)}
                  disabled={disqualifying === team.id || team.isDisqualified}
                >
                  {disqualifying === team.id ? 'Kizárás...' : team.isDisqualified ? 'Kizárva' : 'Kizárás'}
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
                          <div className="col-md-6 col-xl-3">
                            <section className="team-info-box h-100">
                              <h3 className="team-info-title">Csapatadatok</h3>
                              <div className="d-flex flex-column gap-3">
                                <div>
                                  <label className="form-label small fw-semibold mb-1" htmlFor={`edit-${team.id}-teamName`}>Csapatnév</label>
                                  <input
                                    className={`form-control ${editErrors.teamName ? 'is-invalid' : ''}`}
                                    id={`edit-${team.id}-teamName`}
                                    name="teamName"
                                    type="text"
                                    value={teamToEdit.teamName ?? ''}
                                    onChange={handleEditChange}
                                  />
                                  {editErrors.teamName && <div className="invalid-feedback">{editErrors.teamName}</div>}
                                </div>
                                <div>
                                  <label className="form-label small fw-semibold mb-1" htmlFor={`edit-${team.id}-schoolName`}>Iskola neve</label>
                                  <input
                                    className={`form-control ${editErrors.schoolName ? 'is-invalid' : ''}`}
                                    id={`edit-${team.id}-schoolName`}
                                    name="schoolName"
                                    type="text"
                                    value={teamToEdit.schoolName ?? ''}
                                    onChange={handleEditChange}
                                  />
                                  {editErrors.schoolName && <div className="invalid-feedback">{editErrors.schoolName}</div>}
                                </div>
                              </div>
                            </section>
                          </div>
                          <div className="col-md-6 col-xl-3">
                            <section className="team-info-box h-100">
                              <h3 className="team-info-title">Szűrési adatok</h3>
                              <div className="d-flex flex-column gap-3">
                                <div>
                                  <label className="form-label small fw-semibold mb-1" htmlFor={`edit-${team.id}-category`}>Korosztály</label>
                                  <select
                                    className={`form-select ${editErrors.category ? 'is-invalid' : ''}`}
                                    id={`edit-${team.id}-category`}
                                    name="category"
                                    value={teamToEdit.category ?? 0}
                                    onChange={handleEditChange}
                                  >
                                    <option value="0">Általános iskola</option>
                                    <option value="1">Középiskola</option>
                                  </select>
                                  {editErrors.category && <div className="invalid-feedback">{editErrors.category}</div>}
                                </div>
                                <div>
                                  <label className="form-label small fw-semibold mb-1" htmlFor={`edit-${team.id}-group`}>Csoport</label>
                                  <input
                                    className={`form-control ${editErrors.group ? 'is-invalid' : ''}`}
                                    id={`edit-${team.id}-group`}
                                    name="group"
                                    type="text"
                                    value={teamToEdit.group ?? ''}
                                    onChange={handleEditChange}
                                  />
                                  {editErrors.group && <div className="invalid-feedback">{editErrors.group}</div>}
                                </div>
                              </div>
                            </section>
                          </div>
                          <div className="col-12 col-lg-6">
                            <section className="team-info-box h-100">
                              <h3 className="team-info-title mb-3">1. versenyző</h3>
                              <div className="d-flex flex-column gap-3">
                                <div>
                                  <label className="form-label small fw-semibold mb-1" htmlFor={`edit-${team.id}-member1-name`}>Név</label>
                                  <input
                                    className="form-control"
                                    id={`edit-${team.id}-member1-name`}
                                    name="teamMember1Name"
                                    type="text"
                                    placeholder="Versenyző neve"
                                    value={teamToEdit.teamMember1Name ?? ''}
                                    onChange={handleEditChange}
                                  />
                                </div>
                                <div>
                                  <label className="form-label small fw-semibold mb-1" htmlFor={`edit-${team.id}-member1-email`}>E-mail</label>
                                  <input
                                    className="form-control"
                                    id={`edit-${team.id}-member1-email`}
                                    name="teamMember1Email"
                                    type="email"
                                    placeholder="email@example.com"
                                    value={teamToEdit.teamMember1Email ?? ''}
                                    onChange={handleEditChange}
                                  />
                                </div>
                                <div>
                                  <label className="form-label small fw-semibold mb-1" htmlFor={`edit-${team.id}-member1-class`}>Osztály</label>
                                  <input
                                    className="form-control"
                                    id={`edit-${team.id}-member1-class`}
                                    name="teamMember1Class"
                                    type="number"
                                    min="1"
                                    max="13"
                                    placeholder="Osztály"
                                    value={teamToEdit.teamMember1Class ?? ''}
                                    onChange={handleEditChange}
                                  />
                                </div>
                              </div>
                            </section>
                          </div>
                          <div className="col-12 col-lg-6">
                            <section className="team-info-box h-100">
                              <h3 className="team-info-title mb-3">2. versenyző</h3>
                              <div className="d-flex flex-column gap-3">
                                <div>
                                  <label className="form-label small fw-semibold mb-1" htmlFor={`edit-${team.id}-member2-name`}>Név</label>
                                  <input
                                    className="form-control"
                                    id={`edit-${team.id}-member2-name`}
                                    name="teamMember2Name"
                                    type="text"
                                    placeholder="Versenyző neve"
                                    value={teamToEdit.teamMember2Name ?? ''}
                                    onChange={handleEditChange}
                                  />
                                </div>
                                <div>
                                  <label className="form-label small fw-semibold mb-1" htmlFor={`edit-${team.id}-member2-email`}>E-mail</label>
                                  <input
                                    className="form-control"
                                    id={`edit-${team.id}-member2-email`}
                                    name="teamMember2Email"
                                    type="email"
                                    placeholder="email@example.com"
                                    value={teamToEdit.teamMember2Email ?? ''}
                                    onChange={handleEditChange}
                                  />
                                </div>
                                <div>
                                  <label className="form-label small fw-semibold mb-1" htmlFor={`edit-${team.id}-member2-class`}>Osztály</label>
                                  <input
                                    className="form-control"
                                    id={`edit-${team.id}-member2-class`}
                                    name="teamMember2Class"
                                    type="number"
                                    min="1"
                                    max="13"
                                    placeholder="Osztály"
                                    value={teamToEdit.teamMember2Class ?? ''}
                                    onChange={handleEditChange}
                                  />
                                </div>
                              </div>
                            </section>
                          </div>
                          <div className="col-12 col-lg-6">
                            <section className="team-info-box h-100">
                              <h3 className="team-info-title mb-3">Felkészítő tanár</h3>
                              <div className="d-flex flex-column gap-3">
                                <div>
                                  <label className="form-label small fw-semibold mb-1" htmlFor={`edit-${team.id}-coach-name`}>Név</label>
                                  <input
                                    className="form-control"
                                    id={`edit-${team.id}-coach-name`}
                                    name="teamCoach1"
                                    type="text"
                                    placeholder="Tanár neve"
                                    value={teamToEdit.teamCoach1 ?? ''}
                                    onChange={handleEditChange}
                                  />
                                </div>
                                <div>
                                  <label className="form-label small fw-semibold mb-1" htmlFor={`edit-${team.id}-coach-email`}>E-mail</label>
                                  <input
                                    className="form-control"
                                    id={`edit-${team.id}-coach-email`}
                                    name="teamCoach1Email"
                                    type="email"
                                    placeholder="email@example.com"
                                    value={teamToEdit.teamCoach1Email ?? ''}
                                    onChange={handleEditChange}
                                  />
                                </div>
                              </div>
                            </section>
                          </div>
                        </div>
                      )}
                      <div className="d-flex justify-content-end gap-2 mt-4">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => {
                            setTeamToEdit(null)
                          }}
                          disabled={saving}
                        >
                          Mégse
                        </button>
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
                        <h3 className="team-info-title">Csapatadatok</h3>
                        <div className="team-info-value">{team.teamName || '-'}</div>
                        <div className="team-info-meta">{team.schoolName || '-'}</div>
                      </section>
                    </div>
                    <div className="col-md-6 col-xl-3">
                      <section className="team-info-box h-100">
                        <h3 className="team-info-title">Szűrési adatok</h3>
                        <div className="team-info-value">
                          {team.category === 0 ? 'Általános iskola' : team.category === 1 ? 'Középiskola' : '-'}
                        </div>
                        <div className="team-info-meta">{team.category === 0 ? '1–8. osztály' : team.category === 1 ? '9–13. osztály' : ''}</div>
                        {team.group && <span className="badge text-bg-dark mt-2">{team.group} csoport</span>}
                      </section>
                    </div>
                    <div className="col-md-6 col-xl-3">
                      <section className="team-info-box h-100">
                        <h3 className="team-info-title">1. versenyző</h3>
                        <div className="team-info-meta">
                          {team.teamMember1Name ? (
                            <>
                              <div className="fw-semibold">{team.teamMember1Name}</div>
                              <div className="text-muted">{team.teamMember1Email || '-'}</div>
                              <div className="text-muted">{team.teamMember1Class ? `${team.teamMember1Class}. osztály` : '-'}</div>
                            </>
                          ) : (
                            <div className="text-muted">-</div>
                          )}
                        </div>
                      </section>
                    </div>
                    <div className="col-md-6 col-xl-3">
                      <section className="team-info-box h-100">
                        <h3 className="team-info-title">2. versenyző</h3>
                        <div className="team-info-meta">
                          {team.teamMember2Name ? (
                            <>
                              <div className="fw-semibold">{team.teamMember2Name}</div>
                              <div className="text-muted">{team.teamMember2Email || '-'}</div>
                              <div className="text-muted">{team.teamMember2Class ? `${team.teamMember2Class}. osztály` : '-'}</div>
                            </>
                          ) : (
                            <div className="text-muted">-</div>
                          )}
                        </div>
                      </section>
                    </div>
                    <div className="col-md-6 col-xl-3">
                      <section className="team-info-box h-100">
                        <h3 className="team-info-title">Felkészítő tanár</h3>
                        <div className="team-info-meta">
                          {team.teamCoach1 ? (
                            <>
                              <div className="fw-semibold">{team.teamCoach1}</div>
                              <div className="text-muted">{team.teamCoach1Email || '-'}</div>
                            </>
                          ) : (
                            <div className="text-muted">-</div>
                          )}
                        </div>
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
          {teams.length > 0 && filteredTeams.length === 0 && (
            <div className="alert alert-secondary mb-0">
              <i className="bi bi-search me-2" />Nincs a megadott keresésnek és szűrőknek megfelelő csapat.
            </div>
          )}
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
