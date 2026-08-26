import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CompetitionStatusPanel from '../components/CompetitionStatusPanel'
import FloatingFeedback from '../components/FloatingFeedback'
import { getCurrentPushSubscription, subscribeTeamsToPush } from '../services/notificationApi'
import AgeGroupBadge from '../components/AgeGroupBadge'

export default function MyTeamsPage({ user }) {
  const [teams, setTeams] = useState([])
  const [sumoMatches, setSumoMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [pushFeedback, setPushFeedback] = useState(null)

  useEffect(() => {
    if (!user?.email) {
      setLoading(false)
      return
    }

    const controller = new AbortController()

    const loadTeams = async () => {
      try {
        setLoading(true)
        setError('')

        const [teamsResponse, matchesResponse] = await Promise.allSettled([
          fetch(
            `https://legocompetition.runasp.net/api/Teams/teambyemail/${encodeURIComponent(user.email)}`,
            { headers: { accept: '*/*' }, signal: controller.signal }
          ),
          fetch(
            'https://legocompetition.runasp.net/api/Sumo/matches',
            { headers: { accept: '*/*' }, signal: controller.signal }
          )
        ])

        if (teamsResponse.status === 'fulfilled' && teamsResponse.value.ok) {
          const teamsData = await teamsResponse.value.json()
          const teamsArray = Array.isArray(teamsData) ? teamsData : [teamsData]
          const validTeams = teamsArray.filter((team) => team && typeof team === 'object')
          setTeams(validTeams)
        } else {
          throw new Error('Nem sikerült betölteni a csapataidat.')
        }

        if (matchesResponse.status === 'fulfilled' && matchesResponse.value.ok) {
          const matchesData = await matchesResponse.value.json()
          setSumoMatches(Array.isArray(matchesData) ? matchesData : [])
        }
      } catch (requestError) {
        if (requestError.name !== 'AbortError') setError(requestError.message)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadTeams()
    return () => controller.abort()
  }, [user?.email])

  useEffect(() => {
    getCurrentPushSubscription()
      .then((subscription) => setPushEnabled(Boolean(subscription)))
      .catch(() => setPushEnabled(false))
  }, [])

  const enableNotifications = async () => {
    if (teams.length === 0) {
      setPushFeedback({ type: 'danger', text: 'Az értesítéshez előbb be kell tölteni a csapatodat.' })
      return
    }
    try {
      setPushLoading(true)
      const teamIds = [...new Set(teams
        .map((team) => team?.id)
        .filter((id) => id !== null && id !== undefined))]
      await subscribeTeamsToPush(teamIds)
      window.localStorage.removeItem('robotverseny_push_disabled')
      setPushEnabled(true)
      setPushFeedback({ type: 'success', text: 'Az értesítések sikeresen bekapcsolva ezen az eszközön.' })
    } catch (pushError) {
      setPushFeedback({ type: 'danger', text: pushError.message })
    } finally {
      setPushLoading(false)
    }
  }

  // Extract competitors from Teams table structure
  const getCompetitors = (team) => {
    const competitors = []

    if (team.teamMember1Name || team.teamMember1Email) {
      competitors.push({
        name: team.teamMember1Name || '–',
        email: team.teamMember1Email || '–',
        class: team.teamMember1Class || '–',
        id: 'member1'
      })
    }

    if (team.teamMember2Name || team.teamMember2Email) {
      competitors.push({
        name: team.teamMember2Name || '–',
        email: team.teamMember2Email || '–',
        class: team.teamMember2Class || '–',
        id: 'member2'
      })
    }

    return competitors
  }

  // Extract coach from Teams table structure
  const getCoach = (team) => {
    if (team.teamCoach1 || team.teamCoach1Email) {
      return {
        name: team.teamCoach1 || '–',
        email: team.teamCoach1Email || '–',
        id: 'coach'
      }
    }
    return null
  }

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h2 className="mb-1">Saját csapatom</h2>
        <p className="text-muted mb-0">A(z) {user?.email} e-mail-címhez tartozó csapatadatok és eredmények.</p>
      </div>
      <FloatingFeedback message={pushFeedback} onClose={() => setPushFeedback(null)} />

      <CompetitionStatusPanel />

      {!loading && teams.length > 0 && (
        <section className="card shadow-sm team-card no-hover-card mb-4">
          <div className="card-body d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <h3 className="h5 mb-1">Csapatértesítések</h3>
              <p className="text-muted mb-0">
                {pushEnabled ? 'Az értesítések engedélyezve vannak ezen az eszközön.' : 'Kapj értesítést a csapatodnak küldött fontos információkról.'}
              </p>
            </div>
            <button type="button" className={`btn ${pushEnabled ? 'btn-success' : 'btn-primary'}`} disabled={pushLoading || pushEnabled} onClick={enableNotifications}>
              {pushLoading ? 'Bekapcsolás…' : pushEnabled ? 'Értesítések bekapcsolva' : 'Értesítések bekapcsolása'}
            </button>
          </div>
        </section>
      )}

      {loading && <div className="alert alert-info">Csapatok betöltése...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      {!loading && !error && teams.length === 0 && (
        <div className="alert alert-secondary">Ehhez az e-mail-címhez még nem tartozik csapat.</div>
      )}

      <div className="d-flex flex-column gap-4">
        {teams.map((team) => {
          const competitors = getCompetitors(team)
          const coach = getCoach(team)
          const hasTeamData = competitors.length > 0 || coach

          return (
            <article className="card shadow-sm team-card overflow-hidden" key={team.id}>
              <header className="team-card-header p-3 d-flex flex-wrap justify-content-between align-items-center gap-3">
                <div>
                  <h3 className="h4 mb-1"><AgeGroupBadge category={team.category} className="me-2" />{team.teamName || `Csapat #${team.id}`}</h3>
                  <div className="text-muted">{team.schoolName || 'Nincs megadott iskola'}</div>
                </div>
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <span className={`badge fs-6 ${team.group || team.details?.team?.group ? 'text-bg-primary' : 'text-bg-secondary'}`}>
                    <i className="bi bi-people-fill me-2" />
                    {team.group || team.details?.team?.group
                      ? `${String(team.group || team.details?.team?.group).toUpperCase()} csoport`
                      : 'Még nincs csoportba osztva'}
                  </span>
                  <span className="badge text-bg-dark fs-6">#{team.id}</span>
                </div>
              </header>

              <div className="card-body border-top">
                <section className="team-info-box team-info-category mb-3">
                  <div className="row g-3 align-items-center">
                    <div className="col-md-4">
                      <h4 className="team-info-title mb-1">Összes pont</h4>
                      <div className="display-6 fw-bold">{team.details?.allPoint ?? team.point?.allPoint ?? 0}</div>
                    </div>
                    <div className="col-md-8">
                      <div className="row g-2">
                        {[
                          ['Vonalkövetés', team.details?.lineFollowPoint, team.details?.lineFollowPosition],
                          ['Hegymászás', team.details?.hillClimbPoint, team.details?.hillClimbPosition],
                          ['Szumó', team.details?.sumoPoint, team.details?.sumoPosition],
                          ['Kosárra dobás', team.details?.basketballPoint, team.details?.basketballPosition]
                        ].map(([label, point, position]) => (
                          <div className="col-sm-6 col-xl-3" key={label}>
                            <div className="bg-white border rounded p-2 h-100">
                              <div className="small text-muted">{label}</div>
                              <div className="fw-bold">{point ?? 0} pont</div>
                              <div className="small">{position ? `${position}. hely` : 'Nincs helyezés'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                <div className="row g-3">
                  {competitors.length > 0 && (
                    <>
                      <div className="col-12">
                        <h4 className="team-info-title mb-3">Versenyzők</h4>
                      </div>
                      {competitors.map((competitor, index) => (
                        <div className="col-md-6 col-xl-3" key={competitor.id}>
                          <section className="team-info-box h-100">
                            <h5 className="team-info-title">{index + 1}. versenyző</h5>
                            <div className="team-info-value">{competitor.name}</div>
                            <div className="team-info-meta">{competitor.email}</div>
                            <span className="badge text-bg-light mt-2">
                              {competitor.class !== '–' ? `${competitor.class}. osztály` : '–'}
                            </span>
                          </section>
                        </div>
                      ))}
                    </>
                  )}

                  {coach && (
                    <>
                      <div className="col-12 mt-2">
                        <h4 className="team-info-title mb-3">Felkészítő tanárok</h4>
                      </div>
                      <div className="col-md-6 col-xl-3">
                        <section className="team-info-box h-100">
                          <h5 className="team-info-title">Felkészítő tanár</h5>
                          <div className="team-info-value">{coach.name}</div>
                          <div className="team-info-meta">{coach.email}</div>
                        </section>
                      </div>
                    </>
                  )}

                  {!hasTeamData && (
                    <div className="col-12">
                      <div className="alert alert-secondary">Nincs elérhető versenyző adat.</div>
                    </div>
                  )}
                </div>

                {/* Szumó mérkőzések sorszáma és állása a csapatnak */}
                {(() => {
                  const currentTeamName = team.teamName || ''
                  const teamMatches = sumoMatches.filter((m) => {
                    const t1 = m.team1Name || m.team1_name || ''
                    const t2 = m.team2Name || m.team2_name || ''
                    return t1.toLowerCase() === currentTeamName.toLowerCase() || t2.toLowerCase() === currentTeamName.toLowerCase()
                  }).sort((a, b) => (Number(a.table) || 0) - (Number(b.table) || 0))

                  if (teamMatches.length === 0) return null

                  return (
                    <div className="mt-4 pt-3 border-top">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <h4 className="team-info-title mb-0">
                          <i className="bi bi-record-circle text-danger me-2" />
                          Szumó mérkőzések ({teamMatches.length})
                        </h4>
                        <span className="small text-muted">Sorszámozott menetrend</span>
                      </div>
                      <div className="row g-2">
                        {teamMatches.map((m, mIdx) => {
                          const isTeam1 = (m.team1Name || m.team1_name || '').toLowerCase() === currentTeamName.toLowerCase()
                          const opponentName = isTeam1 ? (m.team2Name || m.team2_name) : (m.team1Name || m.team1_name)
                          const myResult = isTeam1 ? (m.team1Result || m.team1result || '') : (m.team2Result || m.team2result || '')
                          const oppResult = isTeam1 ? (m.team2Result || m.team2result || '') : (m.team1Result || m.team1result || '')
                          const isFinished = Boolean(myResult)

                          return (
                            <div className="col-12 col-md-6 col-lg-4" key={`my-match-${m.id || mIdx}`}>
                              <div className={`p-3 rounded border ${isFinished ? 'bg-light' : 'bg-warning-subtle border-warning'}`}>
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <span className="badge text-bg-dark">
                                    #{m.table || mIdx + 1}. mérkőzés
                                  </span>
                                  <span className="small text-muted">
                                    {isFinished ? 'Lejátszva' : 'Következik'}
                                  </span>
                                </div>
                                <div className="fw-bold text-truncate mt-1">
                                  vs. {opponentName}
                                </div>
                                {isFinished && (
                                  <div className="small mt-2 d-flex align-items-center gap-2">
                                    <span>Eredmény:</span>
                                    <span className="badge bg-secondary-subtle text-dark border">
                                      {myResult} - {oppResult}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                <div className="d-flex flex-wrap justify-content-end gap-2 mt-3">
                  <Link className="btn btn-outline-primary" to="/allasok">Összesített állás</Link>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}