import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import FloatingFeedback from '../components/FloatingFeedback'
import ConfirmModal from '../components/ConfirmModal'

const API_BASE_URL = 'https://legocompetition.runasp.net'

const readApiError = async (response, fallbackMessage) => {
  const errorText = await response.text()

  try {
    const errorData = JSON.parse(errorText)
    return Object.values(errorData.errors || {}).flat().join(' ') || errorData.title || errorText || fallbackMessage
  } catch {
    return errorText || fallbackMessage
  }
}

const normalizeMembers = (team) => {
  if (!team) {
    return []
  }

  const membersFromApi = Array.isArray(team.members)
    ? team.members.map((member, index) => ({
      id: `${team.id || team.teamName || 'team'}-member-${index}`,
      name: member?.name || '',
      email: member?.email || '',
      className: member?.className ?? null,
      isCoach: Boolean(member?.isCoach)
    }))
    : []

  if (membersFromApi.length > 0) {
    const competitors = membersFromApi
      .filter((member) => !member.isCoach)
      .map((member, index) => ({ ...member, roleLabel: `${index + 1}. versenyző` }))
    const coaches = membersFromApi
      .filter((member) => member.isCoach)
      .map((member, index) => ({ ...member, roleLabel: `Felkészítő ${index + 1}` }))
    return [...competitors, ...coaches]
  }

  const fallbackMembers = [
    { name: team.teamMember1Name, email: team.teamMember1Email, className: team.teamMember1Class, isCoach: false, roleLabel: '1. versenyző' },
    { name: team.teamMember2Name, email: team.teamMember2Email, className: team.teamMember2Class, isCoach: false, roleLabel: '2. versenyző' },
    { name: team.teamCoach1, email: team.teamCoach1Email, className: null, isCoach: true, roleLabel: 'Felkészítő 1' }
  ]

  return fallbackMembers
    .filter((member) => member.name || member.email || member.className)
    .map((member, index) => ({ ...member, id: `${team.id || team.teamName || 'team'}-fallback-${index}` }))
}

export default function TeamDetailsPage({ userRole, userPrivilege }) {
  const { teamName } = useParams()
  const decodedTeamName = decodeURIComponent(teamName || '')
  const isAdmin = userRole === 'admin' || Number(userPrivilege) === 1
  const [teamInfo, setTeamInfo] = useState(null)
  const [pointsData, setPointsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pointSaving, setPointSaving] = useState(false)
  const [disqualifying, setDisqualifying] = useState(false)
  const [disqualifyModalOpen, setDisqualifyModalOpen] = useState(false)
  const [teamId, setTeamId] = useState(null)
  const [pointEdit, setPointEdit] = useState({ operation: 'add', amount: '', reason: '' })
  const [pointEditFeedback, setPointEditFeedback] = useState(null)
  const teamMembers = normalizeMembers(teamInfo)

  // Load team data and set teamId
  useEffect(() => {
    const loadTeamData = async () => {
      try {
        setLoading(true)
        setError('')
        const teamResponse = await fetch(`${API_BASE_URL}/api/Teams`, {
          headers: { accept: '*/*' }
        })

        if (!teamResponse.ok) {
          throw new Error('A csapat adatainak betöltése nem sikerült.')
        }

        const teams = await teamResponse.json()
        const normalizedTeamName = decodedTeamName.trim().toLocaleLowerCase('hu-HU')
        const team = Array.isArray(teams)
          ? teams.find((currentTeam) => String(currentTeam?.teamName || '').trim().toLocaleLowerCase('hu-HU') === normalizedTeamName)
          : null

        if (!team) {
          throw new Error(`A(z) "${decodedTeamName}" csapat nem található.`)
        }

        setTeamInfo(team)

        if (team?.id) {
          setTeamId(team.id)
        }

        const pointsResponse = await fetch(`${API_BASE_URL}/api/Points/${encodeURIComponent(decodedTeamName)}`, {
          headers: { accept: '*/*' }
        })

        if (!pointsResponse.ok) {
          throw new Error('A pontadatok betöltése nem sikerült.')
        }

        const points = await pointsResponse.json()
        setPointsData(points)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (decodedTeamName) {
      loadTeamData()
    }
  }, [decodedTeamName])

  const applyPointEdit = async () => {
    if (!isAdmin) {
      setPointEditFeedback({ type: 'danger', text: 'Ehhez a művelethez admin jogosultság szükséges.' })
      return
    }

    const amountNumber = Number(pointEdit.amount)
    const trimmedReason = pointEdit.reason.trim()

    if (!Number.isInteger(amountNumber) || amountNumber <= 0) {
      setPointEditFeedback({ type: 'danger', text: 'Adj meg 0-nál nagyobb egész pontot.' })
      return
    }

    if (!trimmedReason) {
      setPointEditFeedback({ type: 'danger', text: 'Add meg az okot is a pontmódosításhoz.' })
      return
    }

    const delta = pointEdit.operation === 'subtract' ? -amountNumber : amountNumber

    try {
      setPointSaving(true)
      const response = await fetch(`${API_BASE_URL}/api/Points/${encodeURIComponent(decodedTeamName)}/${delta}`, {
        method: 'PUT',
        headers: { accept: '*/*' }
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'A pontmódosítás nem sikerült.')
      }

      setPointsData((prev) => {
        if (!prev) return prev
        const currentAllPoint = Number(prev.allPoint ?? 0)
        return { ...prev, allPoint: currentAllPoint + delta }
      })

      setPointEditFeedback({
        type: 'success',
        text: `Összesített pont: ${amountNumber} pont ${pointEdit.operation === 'subtract' ? 'levonva' : 'hozzáadva'} (ok: ${trimmedReason}).`
      })
      setPointEdit((prev) => ({ ...prev, amount: '', reason: '' }))
    } catch (err) {
      setPointEditFeedback({ type: 'danger', text: err.message })
    } finally {
      setPointSaving(false)
    }
  }

  const handleDisqualify = async () => {
    if (!isAdmin) {
      setPointEditFeedback({ type: 'danger', text: 'Ehhez a művelethez admin jogosultság szükséges.' })
      return
    }

    if (!teamId) {
      setPointEditFeedback({ type: 'danger', text: 'A csapat ID-ja nincs meghatározva.' })
      return
    }

    try {
      setDisqualifying(true)
      const response = await fetch(`${API_BASE_URL}/api/Teams/disqualify/${teamId}`, {
        method: 'PATCH',
        headers: { accept: '*/*' }
      })

      if (!response.ok) {
        throw new Error(await readApiError(response, 'A kizárás nem sikerült.'))
      }

      setTeamInfo((prev) => {
        if (!prev) return prev
        return { ...prev, isDisqualified: true }
      })

      setPointEditFeedback({
        type: 'success',
        text: `A "${decodedTeamName}" csapat kizárva lett a versenyből.`
      })
    } catch (err) {
      setPointEditFeedback({ type: 'danger', text: err.message })
    } finally {
      setDisqualifyModalOpen(false)
      setDisqualifying(false)
    }
  }

  return (
    <div className="container py-4 py-md-5">
      <div className="row justify-content-center">
        <div className="col-12 col-xl-11">
          <div className="card shadow-sm team-card team-detail-shell">
            <div className="card-body p-3 p-md-4 p-xl-5">
              {/* Fejléc – itt került a Kizárás gomb a vissza gomb mellé */}
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
                <div>
                  <div className="home-kicker">Csapat profil</div>
                  <h2 className="mb-2 team-detail-title">{decodedTeamName || 'Csapat adatai'}</h2>
                  <p className="text-muted mb-0">Részletes információk és pontstatisztikák a kiválasztott csapatról.</p>
                </div>
                <div className="d-flex gap-2 team-detail-actions">
                  <Link to="/admin/pontozas/osszesitett" className="btn btn-outline-primary">
                    ← Vissza a pontokhoz
                  </Link>
                  {isAdmin && (
                    <button
                      type="button"
                      className={`btn ${teamInfo?.isDisqualified ? 'btn-secondary' : 'btn-danger'}`}
                      onClick={() => setDisqualifyModalOpen(true)}
                      disabled={teamInfo?.isDisqualified || disqualifying}
                    >
                      {teamInfo?.isDisqualified ? 'Kizárva' : 'Kizárás'}
                    </button>
                  )}
                </div>
              </div>

              {loading && <div className="alert alert-secondary">Betöltés...</div>}
              {error && <div className="alert alert-danger">{error}</div>}
              <FloatingFeedback message={pointEditFeedback} onClose={() => setPointEditFeedback(null)} />

              {!loading && !error && (
                <div className="row g-4">
                  <div className="col-12 col-lg-6">
                    <div className="team-detail-section">
                      <h4 className="mb-3">Pontok és helyezések</h4>
                      {pointsData ? (
                        <div className="row g-3">
                          <div className="col-12 col-sm-6">
                            <div className="border rounded p-3 detail-stat">
                              <div className="detail-label">Vonalkövetés</div>
                              <div className="fw-bold detail-value">{pointsData.lineFollowPoint ?? 0} pont</div>
                              <div className="text-muted">{pointsData.lineFollowPosition ?? '-'} . hely</div>
                            </div>
                          </div>
                          <div className="col-12 col-sm-6">
                            <div className="border rounded p-3 detail-stat">
                              <div className="detail-label">Hegymászás</div>
                              <div className="fw-bold detail-value">{pointsData.hillClimbPoint ?? 0} pont</div>
                              <div className="text-muted">{pointsData.hillClimbPosition ?? '-'} . hely</div>
                            </div>
                          </div>
                          <div className="col-12 col-sm-6">
                            <div className="border rounded p-3 detail-stat">
                              <div className="detail-label">Szumó</div>
                              <div className="fw-bold detail-value">{pointsData.sumoPoint ?? 0} pont</div>
                              <div className="text-muted">{pointsData.sumoPosition ?? '-'} . hely</div>
                            </div>
                          </div>
                          <div className="col-12 col-sm-6">
                            <div className="border rounded p-3 detail-stat">
                              <div className="detail-label">Kosárlabda</div>
                              <div className="fw-bold detail-value">{pointsData.basketballPoint ?? 0} pont</div>
                              <div className="text-muted">{pointsData.basketballPosition ?? '-'} . hely</div>
                            </div>
                          </div>
                          <div className="col-12">
                            <div className="border rounded p-3 bg-light detail-stat detail-stat--highlight">
                              <div className="detail-label">Összes pont</div>
                              <div className="fw-bold fs-4 detail-value">{pointsData.allPoint ?? 0}</div>
                            </div>
                          </div>
                          {isAdmin && (
                            <div className="col-12">
                              <div className="border rounded p-3 point-editor-card">
                                <h5 className="mb-3">Összesített pont módosítása</h5>
                                <div className="row g-3">
                                  <div className="col-12">
                                    <label htmlFor="operationSelect" className="form-label mb-1">Művelet</label>
                                    <div className="point-editor-select-wrap">
                                      <select
                                        id="operationSelect"
                                        className="form-select point-editor-select"
                                        value={pointEdit.operation}
                                        onChange={(e) => setPointEdit((prev) => ({ ...prev, operation: e.target.value }))}
                                      >
                                        <option value="add">Hozzáadás</option>
                                        <option value="subtract">Levonás</option>
                                      </select>
                                    </div>
                                  </div>
                                  <div className="col-12">
                                    <label htmlFor="amountInput" className="form-label mb-1">Pont</label>
                                    <input
                                      id="amountInput"
                                      type="number"
                                      min="1"
                                      step="1"
                                      inputMode="numeric"
                                      onKeyDown={(event) => {
                                        if (['-', '+', 'e', 'E', '.', ','].includes(event.key)) {
                                          event.preventDefault()
                                        }
                                      }}
                                      className="form-control point-editor-input"
                                      placeholder="Pl. 3"
                                      value={pointEdit.amount}
                                      onChange={(e) => {
                                        const sanitizedValue = e.target.value.replace(/[^0-9]/g, '')
                                        setPointEdit((prev) => ({ ...prev, amount: sanitizedValue }))
                                      }}
                                    />
                                  </div>
                                  <div className="col-12">
                                    <label htmlFor="reasonInput" className="form-label mb-1">Ok</label>
                                    <textarea
                                      id="reasonInput"
                                      rows="3"
                                      className="form-control"
                                      placeholder="Írd le röviden, miért történt a pontmódosítás."
                                      value={pointEdit.reason}
                                      onChange={(e) => setPointEdit((prev) => ({ ...prev, reason: e.target.value }))}
                                    />
                                  </div>
                                </div>
                                <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
                                  <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={applyPointEdit}
                                    disabled={pointSaving}
                                  >
                                    {pointSaving ? 'Mentés...' : 'Módosítás alkalmazása'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="alert alert-secondary mb-0">Nincs rendelkezésre álló pontadat.</div>
                      )}
                    </div>
                  </div>

                  <div className="col-12 col-lg-6">
                    <div className="team-detail-section">
                      <h4 className="mb-3">Csapat adatai</h4>
                      {teamInfo ? (
                        <div className="row g-3">
                          <div className="col-12">
                            <div className="border rounded p-3 detail-stat">
                              <div className="detail-label">Csapat neve</div>
                              <div className="fw-bold detail-value">{teamInfo.teamName || '–'}</div>
                            </div>
                          </div>
                          <div className="col-12">
                            <div className="border rounded p-3 detail-stat">
                              <div className="detail-label">Iskola</div>
                              <div className="fw-semibold detail-value">{teamInfo.schoolName || '–'}</div>
                            </div>
                          </div>
                          <div className="col-12 col-sm-6">
                            <div className="border rounded p-3 detail-stat">
                              <div className="detail-label">Kategória</div>
                              <div className="fw-semibold detail-value">
                                {teamInfo.category === 0 ? '0 - általános iskola' : teamInfo.category === 1 ? '1 - középiskola' : '–'}
                              </div>
                            </div>
                          </div>
                          {teamMembers.map((member) => (
                            <div className="col-12 col-sm-6" key={member.id}>
                              <div className="border rounded p-3 detail-stat">
                                <div className="detail-label">{member.roleLabel}</div>
                                <div className="fw-semibold detail-value">{member.name || '–'}</div>
                                <div className="small text-muted detail-break">{member.email || '–'}</div>
                                <div className="small text-muted">{member.className ? `${member.className}. osztály` : '–'}</div>
                              </div>
                            </div>
                          ))}
                          {teamMembers.length === 0 && (
                            <div className="col-12">
                              <div className="alert alert-secondary mb-0">Nincsenek csapattag adatok.</div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="alert alert-secondary mb-0">A csapat adatai nem találhatók.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={disqualifyModalOpen}
        title="Csapat kizárása"
        confirmLabel="Csapat kizárása"
        confirmVariant="danger"
        requiredText="KIZÁROM A CSAPATOT"
        requiredTextLabel={<>A folytatáshoz írd be pontosan: <strong>KIZÁROM A CSAPATOT</strong></>}
        requiredCheckboxLabel="Megerősítem, hogy a csapatot ki akarom zárni a versenyből."
        busy={disqualifying}
        onClose={() => setDisqualifyModalOpen(false)}
        onConfirm={handleDisqualify}
      >
        <p className="mb-2">
          Biztosan ki akarod zárni ezt a csapatot a versenyből?
        </p>
        <p className="fw-semibold mb-2">
          {teamInfo?.teamName || decodedTeamName || (teamId ? `Csapat #${teamId}` : 'Kiválasztott csapat')}
        </p>
        <p className="mb-0 text-muted">
          Csak a szöveg pontos beírása és a jelölőnégyzet kipipálása után lehet folytatni.
        </p>
      </ConfirmModal>
    </div>
  )
}