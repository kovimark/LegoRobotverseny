import React, { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

export default function TeamDetailsPage() {
  const { teamName } = useParams()
  const decodedTeamName = decodeURIComponent(teamName || '')
  const [teamData, setTeamData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const resolveTeamIdentifier = useCallback(async () => {
    const trimmedName = decodedTeamName.trim()
    if (!trimmedName) return null

    const teamListResponse = await fetch('https://legocompetition.runasp.net/api/Teams')
    if (!teamListResponse.ok) {
      return trimmedName
    }

    const teams = await teamListResponse.json()
    const matchedTeam = Array.isArray(teams)
      ? teams.find((item) => item.teamName?.toLowerCase() === trimmedName.toLowerCase())
      : null

    return matchedTeam?.id ?? trimmedName
  }, [decodedTeamName])

  useEffect(() => {
    const loadTeamData = async () => {
      try {
        setLoading(true)
        setError('')

        const teamIdentifier = await resolveTeamIdentifier()
        const response = await fetch(`https://legocompetition.runasp.net/api/Teams/alldata/${encodeURIComponent(teamIdentifier ?? decodedTeamName)}`)

        if (!response.ok) {
          throw new Error('A csapat adatainak betöltése sikertelen volt.')
        }

        const data = await response.json()
        setTeamData(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (decodedTeamName) {
      loadTeamData()
    }
  }, [decodedTeamName, resolveTeamIdentifier])

  return (
    <div className="container py-4 py-md-5">
      <div className="row justify-content-center">
        <div className="col-12 col-xl-11">
          <div className="card shadow-sm team-card team-detail-shell">
            <div className="card-body p-3 p-md-4 p-xl-5">
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
                <div>
                  <div className="home-kicker">Csapat profil</div>
                  <h2 className="mb-2 team-detail-title">{decodedTeamName || 'Csapat adatai'}</h2>
                  <p className="text-muted mb-0">Részletes információk és pontstatisztikák a kiválasztott csapatról.</p>
                </div>
                <Link to="/admin/pontozas/osszesitett" className="btn btn-outline-primary">
                  ← Vissza a pontokhoz
                </Link>
              </div>

              {loading && <div className="alert alert-secondary">Betöltés...</div>}
              {error && <div className="alert alert-danger">{error}</div>}

              {!loading && !error && (
                <div className="row g-4">
                  <div className="col-12 col-lg-6">
                    <div className="team-detail-section">
                      <h4 className="mb-3">Pontok és helyezések</h4>
                      {teamData ? (
                        <div className="row g-3">
                          <div className="col-12 col-sm-6">
                            <div className="border rounded p-3 detail-stat">
                              <div className="detail-label">Vonalkövetés</div>
                              <div className="fw-bold detail-value">{teamData.lineFollowPoint ?? 0} pont</div>
                              <div className="text-muted">{teamData.lineFollowPosition ?? '-'} . hely</div>
                            </div>
                          </div>
                          <div className="col-12 col-sm-6">
                            <div className="border rounded p-3 detail-stat">
                              <div className="detail-label">Hegymászás</div>
                              <div className="fw-bold detail-value">{teamData.hillClimbPoint ?? 0} pont</div>
                              <div className="text-muted">{teamData.hillClimbPosition ?? '-'} . hely</div>
                            </div>
                          </div>
                          <div className="col-12 col-sm-6">
                            <div className="border rounded p-3 detail-stat">
                              <div className="detail-label">Szumó</div>
                              <div className="fw-bold detail-value">{teamData.sumoPoint ?? 0} pont</div>
                              <div className="text-muted">{teamData.sumoPosition ?? '-'} . hely</div>
                            </div>
                          </div>
                          <div className="col-12 col-sm-6">
                            <div className="border rounded p-3 detail-stat">
                              <div className="detail-label">Kosárlabda</div>
                              <div className="fw-bold detail-value">{teamData.basketballPoint ?? 0} pont</div>
                              <div className="text-muted">{teamData.basketballPosition ?? '-'} . hely</div>
                            </div>
                          </div>
                          <div className="col-12">
                            <div className="border rounded p-3 bg-light detail-stat detail-stat--highlight">
                              <div className="detail-label">Összes pont</div>
                              <div className="fw-bold fs-4 detail-value">{teamData.allPoint ?? 0}</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="alert alert-secondary mb-0">Nincs rendelkezésre álló pontadat.</div>
                      )}
                    </div>
                  </div>

                  <div className="col-12 col-lg-6">
                    <div className="team-detail-section">
                      <h4 className="mb-3">Csapat adatai</h4>
                      {teamData?.team ? (
                        <div className="row g-3">
                          <div className="col-12">
                            <div className="border rounded p-3 detail-stat">
                              <div className="detail-label">Csapat neve</div>
                              <div className="fw-bold detail-value">{teamData.team.teamName}</div>
                            </div>
                          </div>
                          <div className="col-12">
                            <div className="border rounded p-3 detail-stat">
                              <div className="detail-label">Iskola</div>
                              <div className="fw-semibold detail-value">{teamData.team.schoolName || '–'}</div>
                            </div>
                          </div>
                          <div className="col-12 col-sm-6">
                            <div className="border rounded p-3 detail-stat">
                              <div className="detail-label">Kategória</div>
                              <div className="fw-semibold detail-value">
                                {teamData.team.category === 0 ? '0 - általános iskola' : teamData.team.category === 1 ? '1 - középiskola' : '–'}
                              </div>
                            </div>
                          </div>
                          <div className="col-12 col-sm-6">
                            <div className="border rounded p-3 detail-stat">
                              <div className="detail-label">1. versenyző</div>
                              <div className="fw-semibold detail-value">{teamData.team.teamMember1Name || '–'}</div>
                              <div className="small text-muted detail-break">{teamData.team.teamMember1Email || '–'}</div>
                              <div className="small text-muted">{teamData.team.teamMember1Age ? `${teamData.team.teamMember1Age} év` : '–'}</div>
                            </div>
                          </div>
                          <div className="col-12 col-sm-6">
                            <div className="border rounded p-3 detail-stat">
                              <div className="detail-label">2. versenyző</div>
                              <div className="fw-semibold detail-value">{teamData.team.teamMember2Name || '–'}</div>
                              <div className="small text-muted detail-break">{teamData.team.teamMember2Email || '–'}</div>
                              <div className="small text-muted">{teamData.team.teamMember2Age ? `${teamData.team.teamMember2Age} év` : '–'}</div>
                            </div>
                          </div>
                          <div className="col-12 col-sm-6">
                            <div className="border rounded p-3 detail-stat">
                              <div className="detail-label">Edző 1</div>
                              <div className="fw-semibold detail-value">{teamData.team.teamCoach1 || '–'}</div>
                              <div className="small text-muted detail-break">{teamData.team.teamCoach1Email || '–'}</div>
                            </div>
                          </div>
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
    </div>
  )
}
