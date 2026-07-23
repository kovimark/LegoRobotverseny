import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CompetitionStatusPanel from '../components/CompetitionStatusPanel'
import FloatingFeedback from '../components/FloatingFeedback'
import { getCurrentPushSubscription, subscribeTeamsToPush } from '../services/notificationApi'

export default function MyTeamsPage({ user }) {
  const [teams, setTeams] = useState([])
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
        const response = await fetch(
          `https://legocompetition.runasp.net/api/Teams/teambyemail/${encodeURIComponent(user.email)}`,
          { headers: { accept: '*/*' }, signal: controller.signal }
        )

        if (!response.ok) {
          throw new Error('Nem sikerült betölteni a csapataidat.')
        }

        const data = await response.json()
        const emailTeams = Array.isArray(data) ? data : []
        const teamsWithDetails = await Promise.all(emailTeams.map(async (team) => {
          try {
            const detailsResponse = await fetch(
              `https://legocompetition.runasp.net/api/Teams/alldata/${encodeURIComponent(team.id)}`,
              { headers: { accept: '*/*' }, signal: controller.signal }
            )
            if (!detailsResponse.ok) return { ...team, details: null }
            return { ...team, details: await detailsResponse.json() }
          } catch (detailsError) {
            if (detailsError.name === 'AbortError') throw detailsError
            return { ...team, details: null }
          }
        }))
        setTeams(teamsWithDetails)
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
      await subscribeTeamsToPush(teams.map((team) => team.id))
      window.localStorage.removeItem('robotverseny_push_disabled')
      setPushEnabled(true)
      setPushFeedback({ type: 'success', text: 'Az értesítések sikeresen bekapcsolva ezen az eszközön.' })
    } catch (pushError) {
      setPushFeedback({ type: 'danger', text: pushError.message })
    } finally {
      setPushLoading(false)
    }
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
        {teams.map((team) => (
          <article className="card shadow-sm team-card overflow-hidden" key={team.id}>
            <header className="team-card-header p-3 d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div>
                <h3 className="h4 mb-1">{team.teamName || `Csapat #${team.id}`}</h3>
                <div className="text-muted">{team.schoolName || 'Nincs megadott iskola'}</div>
              </div>
              <span className="badge text-bg-dark fs-6">#{team.id}</span>
            </header>

            <div className="card-body border-top">
              <section className="team-info-box team-info-category mb-3">
                <div className="row g-3 align-items-center">
                  <div className="col-md-4">
                    <h4 className="team-info-title mb-1">Összes pont</h4>
                    <div className="display-6 fw-bold">{team.details?.allPoint ?? team.point ?? 0}</div>
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
                <div className="col-md-6 col-xl-3">
                  <section className="team-info-box h-100">
                    <h4 className="team-info-title">1. versenyző</h4>
                    <div className="team-info-value">{team.teamMember1Name || '–'}</div>
                    <div className="team-info-meta">{team.teamMember1Email || '–'}</div>
                    <span className="badge text-bg-light mt-2">{team.teamMember1Class ? `${team.teamMember1Class}. osztály` : '–'}</span>
                  </section>
                </div>
                <div className="col-md-6 col-xl-3">
                  <section className="team-info-box h-100">
                    <h4 className="team-info-title">2. versenyző</h4>
                    <div className="team-info-value">{team.teamMember2Name || '–'}</div>
                    <div className="team-info-meta">{team.teamMember2Email || '–'}</div>
                    <span className="badge text-bg-light mt-2">{team.teamMember2Class ? `${team.teamMember2Class}. osztály` : '–'}</span>
                  </section>
                </div>
                <div className="col-md-6 col-xl-3">
                  <section className="team-info-box h-100">
                    <h4 className="team-info-title">Felkészítő tanár</h4>
                    <div className="team-info-value">{team.teamCoach1 || '–'}</div>
                    <div className="team-info-meta">{team.teamCoach1Email || '–'}</div>
                  </section>
                </div>
                <div className="col-md-6 col-xl-3">
                  <section className="team-info-box team-info-category h-100">
                    <h4 className="team-info-title">Kategória</h4>
                    <div className="team-info-value">{team.category === 1 ? 'Középiskolás' : 'Általános iskolás'}</div>
                    <div className="team-info-meta">{team.category === 1 ? '9–13. osztály' : '1–8. osztály'}</div>
                  </section>
                </div>
              </div>

              <div className="d-flex flex-wrap justify-content-end gap-2 mt-3">
                <Link className="btn btn-outline-primary" to="/allasok">Összesített állás</Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
