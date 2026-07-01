import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

export default function TeamDetailsPage() {
  const { teamName } = useParams()
  const decodedTeamName = decodeURIComponent(teamName || '')
  const [summary, setSummary] = useState(null)
  const [teamInfo, setTeamInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadTeamData = async () => {
      try {
        setLoading(true)
        setError('')

        const [summaryResponse, teamsResponse] = await Promise.all([
          fetch(`https://legocompetition.runasp.net/api/Points/${encodeURIComponent(decodedTeamName)}`),
          fetch('https://legocompetition.runasp.net/api/Teams')
        ])

        if (!summaryResponse.ok) {
          throw new Error('A csapat pontjainak betöltése sikertelen volt.')
        }

        const summaryData = await summaryResponse.json()
        const teamsData = await teamsResponse.json()

        setSummary(summaryData)
        setTeamInfo(
          Array.isArray(teamsData)
            ? teamsData.find((item) => item.teamName?.toLowerCase() === decodedTeamName.toLowerCase()) || null
            : null
        )
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
                  ← Vissza az adminhoz
                </Link>
              </div>

              {loading && <div className="alert alert-secondary">Betöltés...</div>}
              {error && <div className="alert alert-danger">{error}</div>}

              {!loading && !error && (
                <div className="row g-4">
                  <div className="col-12 col-lg-6">
                    <div className="team-detail-section">
                      <h4 className="mb-3">Pontok és helyezések</h4>
                      {summary ? (
                        <div className="row g-3">
                          <div className="col-12 col-sm-6">
                            <div className="border rounded p-3 detail-stat">
                              <div className="detail-label">Vonalkövetés</div>
                              <div className="fw-bold detail-value">{summary.lineFollowPoint ?? 0} pont</div>
                              <div className="text-muted">{summary.lineFollowPosition ?? '-'}. hely</div>
                            </div>
                          </div>
                          <div className="col-12 col-sm-6">
                            <div className="border rounded p-3 detail-stat">
                              <div className="detail-label">Hegymászás</div>
                              <div className="fw-bold detail-value">{summary.hillClimbPoint ?? 0} pont</div>
                              <div className="text-muted">{summary.hillClimbPosition ?? '-'}. hely</div>
                            </div>
                          </div>
                          <div className="col-12 col-sm-6">
                            <div className="border rounded p-3 detail-stat">
                              <div className="detail-label">Szumó</div>
                              <div className="fw-bold detail-value">{summary.sumoPoint ?? 0} pont</div>
                              <div className="text-muted">{summary.sumoPosition ?? '-'}. hely</div>
                            </div>
                          </div>
                          <div className="col-12 col-sm-6">
                            <div className="border rounded p-3 detail-stat">
                              <div className="detail-label">Kosárlabda</div>
                              <div className="fw-bold detail-value">{summary.basketballPoint ?? 0} pont</div>
                              <div className="text-muted">{summary.basketballPosition ?? '-'}. hely</div>
                            </div>
                          </div>
                          <div className="col-12">
                            <div className="border rounded p-3 bg-light detail-stat detail-stat--highlight">
                              <div className="detail-label">Összes pont</div>
                              <div className="fw-bold fs-4 detail-value">{summary.allPoint ?? 0}</div>
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
                      {teamInfo ? (
                        <div className="row g-3">
                          <div className="col-12">
                            <div className="border rounded p-3 detail-stat">
                              <div className="detail-label">Csapat neve</div>
                              <div className="fw-bold detail-value">{teamInfo.teamName}</div>
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
                              <div className="detail-label">1. versenyző</div>
                              <div className="fw-semibold detail-value">{teamInfo.teamMember1Name || '–'}</div>
                              <div className="small text-muted detail-break">{teamInfo.teamMember1Email || '–'}</div>
                              <div className="small text-muted">{teamInfo.teamMember1Age ? `${teamInfo.teamMember1Age} év` : '–'}</div>
                            </div>
                          </div>
                          <div className="col-12 col-sm-6">
                            <div className="border rounded p-3 detail-stat">
                              <div className="detail-label">2. versenyző</div>
                              <div className="fw-semibold detail-value">{teamInfo.teamMember2Name || '–'}</div>
                              <div className="small text-muted detail-break">{teamInfo.teamMember2Email || '–'}</div>
                              <div className="small text-muted">{teamInfo.teamMember2Age ? `${teamInfo.teamMember2Age} év` : '–'}</div>
                            </div>
                          </div>
                          <div className="col-12 col-sm-6">
                            <div className="border rounded p-3 detail-stat">
                              <div className="detail-label">Edző 1</div>
                              <div className="fw-semibold detail-value">{teamInfo.teamCoach1 || '–'}</div>
                              <div className="small text-muted detail-break">{teamInfo.teamCoach1Email || '–'}</div>
                            </div>
                          </div>
                          <div className="col-12 col-sm-6">
                            <div className="border rounded p-3 detail-stat">
                              <div className="detail-label">Edző 2</div>
                              <div className="fw-semibold detail-value">{teamInfo.teamCoach2 || '–'}</div>
                              <div className="small text-muted detail-break">{teamInfo.teamCoach2Email || '–'}</div>
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
