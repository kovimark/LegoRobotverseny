import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CompetitionStatusPanel from '../components/CompetitionStatusPanel'
import FloatingFeedback from '../components/FloatingFeedback'
import { getCurrentPushSubscription, subscribeTeamsToPush } from '../services/notificationApi'
import AgeGroupBadge from '../components/AgeGroupBadge'
import {
  getAllTickets,
  fetchTicketsFromBackend,
  getTicketsByCompetitor,
  TOMBOLA_STORAGE_EVENT
} from '../services/tombolaApi'
import TombolaTicket from '../components/TombolaTicket'

export default function MyTeamsPage({ user }) {
  const [teams, setTeams] = useState([])
  const [selectedTeamId, setSelectedTeamId] = useState('all')
  const [sumoMatches, setSumoMatches] = useState([])
  const [lineResults] = useState([])
  const [hillResults] = useState([])
  const [basketResults] = useState([])
  const [tombolaTickets, setTombolaTickets] = useState([])
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
            `https://brickathlon.runasp.net/api/Teams/teambyemail/${encodeURIComponent(user.email)}`,
            { headers: { accept: '*/*' }, signal: controller.signal }
          ),
          fetch(
            'https://brickathlon.runasp.net/api/Sumo/matches',
            { headers: { accept: '*/*' }, signal: controller.signal }
          )
        ])

        if (teamsResponse.status === 'fulfilled' && teamsResponse.value.ok) {
          try {
            const teamsData = await teamsResponse.value.json()
            const teamsArray = Array.isArray(teamsData) ? teamsData : [teamsData]
            const validTeams = teamsArray.filter((team) => team && typeof team === 'object')
            setTeams(validTeams)
          } catch {
            setTeams([])
          }
        } else {
          setTeams([])
        }

        if (matchesResponse.status === 'fulfilled' && matchesResponse.value.ok) {
          try {
            const matchesData = await matchesResponse.value.json()
            setSumoMatches(Array.isArray(matchesData) ? matchesData : [])
          } catch {
            setSumoMatches([])
          }
        }
      } catch (requestError) {
        if (requestError.name !== 'AbortError') {
          console.warn('Csapatok betöltése figyelmeztetés:', requestError.message)
          setTeams([])
        }
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
    try {
      setPushLoading(true)
      const teamIds = [...new Set(teams
        .map((team) => team?.id)
        .filter((id) => id !== null && id !== undefined))]
      await subscribeTeamsToPush(teamIds, user?.email)
      window.localStorage.removeItem('robotverseny_push_disabled')
      setPushEnabled(true)
      setPushFeedback({ type: 'success', text: 'Az értesítések sikeresen bekapcsolva ezen az eszközön.' })
    } catch (pushError) {
      setPushFeedback({ type: 'danger', text: pushError.message || 'Nem sikerült bekapcsolni az értesítéseket.' })
    } finally {
      setPushLoading(false)
    }
  }

  // Extract competitors from Teams table structure

  useEffect(() => {
    const refreshTickets = async () => {
      try {
        const myEmails = [user?.email?.toLowerCase()].filter(Boolean)
        const myTeamNames = (teams || []).map((t) => (t.teamName || '').toLowerCase()).filter(Boolean)

        // Csapattagok email címeinek begyűjtése
        ;(teams || []).forEach((t) => {
          if (Array.isArray(t.members)) {
            t.members.forEach((m) => {
              if (m && m.email) myEmails.push(m.email.toLowerCase())
            })
          }
          if (t.teamMember1Email) myEmails.push(t.teamMember1Email.toLowerCase())
          if (t.teamMember2Email) myEmails.push(t.teamMember2Email.toLowerCase())
          if (t.coachEmail) myEmails.push(t.coachEmail.toLowerCase())
        })

        // 1. Próbáljuk meg közvetlenül a versenyzőre lekérni a backendről
        let compTickets = []
        if (user?.email) {
          try {
            compTickets = await getTicketsByCompetitor(user.email)
          } catch (e) {
            console.warn('Could not fetch competitor tickets:', e)
          }
        }

        // 2. Szinkronizáljuk a globális backend listával is
        let all = []
        try {
          all = await fetchTicketsFromBackend()
        } catch {
          all = getAllTickets()
        }

        const combined = Array.isArray(compTickets) ? [...compTickets] : []
        const existingCodes = new Set(combined.map((c) => c.code))

        if (Array.isArray(all)) {
          all.forEach((t) => {
            if (t && t.code && !existingCodes.has(t.code)) {
              const ticketEmail = (t.email || t.recipientEmail || t.userEmail || '').toLowerCase()
              const ticketTeam = (t.teamName || '').toLowerCase()
              if (ticketEmail && myEmails.includes(ticketEmail)) {
                existingCodes.add(t.code)
                combined.push(t)
              } else if (ticketTeam && myTeamNames.includes(ticketTeam)) {
                existingCodes.add(t.code)
                combined.push(t)
              }
            }
          })
        }

        setTombolaTickets(combined)
      } catch (err) {
        console.error('Error refreshing tombola tickets:', err)
        setTombolaTickets([])
      }
    }

    refreshTickets()
    window.addEventListener(TOMBOLA_STORAGE_EVENT, refreshTickets)
    window.addEventListener('storage', refreshTickets)
    return () => {
      window.removeEventListener(TOMBOLA_STORAGE_EVENT, refreshTickets)
      window.removeEventListener('storage', refreshTickets)
    }
  }, [user?.email, teams])

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

  // Calculate lowest unscored match in the entire hall
  const unscoredHallMatches = sumoMatches
    .filter((m) => {
      const r1 = m.team1Result || m.team1result
      const r2 = m.team2Result || m.team2result
      return !r1 && !r2
    })
    .sort((a, b) => (Number(a.table) || 0) - (Number(b.table) || 0))

  const currentHallActiveMatch = unscoredHallMatches.length > 0 ? unscoredHallMatches[0] : null

  const userTeamNames = useMemo(() => {
    return new Set(teams.map((t) => (t.teamName || '').trim().toLowerCase()))
  }, [teams])

  const userNextMatch = useMemo(() => {
    return unscoredHallMatches.find((m) => {
      const t1 = (m.team1Name || m.team1_name || '').trim().toLowerCase()
      const t2 = (m.team2Name || m.team2_name || '').trim().toLowerCase()
      return userTeamNames.has(t1) || userTeamNames.has(t2)
    }) || null
  }, [unscoredHallMatches, userTeamNames])

  const userNextMatchAheadCount = useMemo(() => {
    if (!userNextMatch) return -1
    return unscoredHallMatches.findIndex((m) => Number(m.table) === Number(userNextMatch.table))
  }, [unscoredHallMatches, userNextMatch])
  
  const displayedTeams = selectedTeamId === 'all'
    ? teams
    : teams.filter((t) => String(t.id) === selectedTeamId)

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h2 className="mb-1"><i className="bi bi-people-fill me-2" aria-hidden="true" />{teams.length > 1 ? 'Saját csapataim' : 'Saját csapatom'}</h2>
        <p className="text-muted mb-0"><i className="bi bi-envelope-fill me-1" aria-hidden="true" /> A(z) {user?.email} e-mail-címhez tartozó csapatadatok és eredmények.</p>
      </div>
      <FloatingFeedback message={pushFeedback} onClose={() => setPushFeedback(null)} />

      <CompetitionStatusPanel />

      {!loading && teams.length > 1 && (
        <section className="card shadow-sm border-0 bg-white p-3 rounded-3 mb-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
            <div>
              <h3 className="h6 fw-bold mb-1 d-flex align-items-center gap-2">
                <span className="badge bg-primary fs-6">{teams.length} regisztrált csapat</span>
                <span>Csapatválasztó és szűrő:</span>
              </h3>
              <p className="text-muted small mb-0">
                Válts az egyes csapatok között a gyors áttekintéshez, vagy nézd meg az összeset egyszerre.
              </p>
            </div>
            {selectedTeamId !== 'all' && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setSelectedTeamId('all')}
              >
                <i className="bi bi-grid-fill me-1" />
                Összes mutatása
              </button>
            )}
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className={`btn btn-sm ${selectedTeamId === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setSelectedTeamId('all')}
            >
              <i className="bi bi-grid-fill me-1" />
              Összes csapat ({teams.length})
            </button>
            {teams.map((team) => (
              <button
                type="button"
                key={team.id}
                className={`btn btn-sm ${selectedTeamId === String(team.id) ? 'btn-primary' : 'btn-outline-dark'}`}
                onClick={() => setSelectedTeamId(String(team.id))}
              >
                <AgeGroupBadge category={team.category} className="me-1" />
                <span className="fw-semibold">{team.teamName || `Csapat #${team.id}`}</span>
                <span className="ms-1 opacity-75 small">#{team.id}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {!loading && teams.length > 0 && (
        <section className="card shadow-sm team-card no-hover-card mb-4">
          <div className="card-body d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <h3 className="h5 mb-1"><i className="bi bi-bell-fill me-2" aria-hidden="true" />Csapatértesítések</h3>
              <p className="text-muted mb-0">
                {pushEnabled ? 'Az értesítések engedélyezve vannak ezen az eszközön mindegyik csapatodhoz.' : 'Kapj értesítést a csapataidnak küldött fontos információkról.'}
              </p>
            </div>
            <button type="button" className={`btn ${pushEnabled ? 'btn-success' : 'btn-primary'}`} disabled={pushLoading || pushEnabled} onClick={enableNotifications}>
              <i className={`bi ${pushEnabled ? 'bi-check-circle-fill' : 'bi-bell-fill'} me-2`} aria-hidden="true" />
              {pushLoading ? 'Bekapcsolás…' : pushEnabled ? 'Értesítések bekapcsolva' : 'Értesítések bekapcsolása'}
            </button>
          </div>
        </section>
      )}

      {loading && <div className="alert alert-info"><i className="bi bi-arrow-repeat me-2" />Csapatok betöltése...</div>}
      {!loading && !error && teams.length === 0 && (
        <div className="card border-0 bg-light p-4 rounded-3 text-center shadow-sm mb-4">
          <div className="mb-2">
            <i className="bi bi-people text-primary fs-2" />
          </div>
          <h5 className="fw-bold mb-1">Ehhez az e-mail-címhez még nem tartozik csapat</h5>
          <p className="text-muted small mb-3">
            Ha szeretnél részt venni a Brickathlon robotversenyen, add le csapatod jelentkezését a versenyjelentkezési oldalon!
          </p>
          <div>
            <Link className="btn btn-primary btn-sm px-3" to="/versenyjelentkezes">
              <i className="bi bi-pencil-square me-2" />
              Versenyjelentkezés
            </Link>
          </div>
        </div>
      )}

      {/* Szumó mérkőzések és következő meccsek kijelzése a teremben */}
      {sumoMatches.length > 0 && (
        <section className="card shadow-sm border-0 mb-4 bg-white overflow-hidden">
          <div className="card-header bg-dark text-white py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-shield-shaded text-danger fs-5" />
              <h3 className="h5 mb-0 fw-bold">Szumó mérkőzések a teremben</h3>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="badge text-bg-secondary">
                Összesen {sumoMatches.length} mérkőzés
              </span>
              <span className={`badge ${unscoredHallMatches.length > 0 ? 'text-bg-warning text-dark' : 'text-bg-success'}`}>
                {unscoredHallMatches.length > 0 ? `${unscoredHallMatches.length} még pontozatlan` : 'Mind lepontozva'}
              </span>
              <Link to="/allasok" className="btn btn-sm btn-outline-light">
                <i className="bi bi-diagram-3 me-1" />
                Teljes menetrend
              </Link>
            </div>
          </div>
          <div className="card-body p-3 p-md-4">
            {/* Saját csapat következő meccsének kiemelt státusza a teremben */}
            {userNextMatch ? (
              <div className={`p-3 rounded-3 mb-3 border ${userNextMatchAheadCount === 0 ? 'bg-danger-subtle border-danger' : 'bg-warning-subtle border-warning'}`}>
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1">
                  <span className={`badge fw-bold px-2.5 py-1.5 ${userNextMatchAheadCount === 0 ? 'text-bg-danger' : 'text-bg-warning text-dark'}`}>
                    <i className={`bi ${userNextMatchAheadCount === 0 ? 'bi-exclamation-octagon-fill' : 'bi-bell-fill'} me-1`} />
                    {userNextMatchAheadCount === 0 ? 'MOST TI JÖTTÖK A PÁSTON!' : 'A TE CSAPATOD KÖVETKEZŐ MECCSE A TEREMBEN'}
                  </span>
                  <span className="badge text-bg-dark fs-6">
                    #{userNextMatch.table}. mérkőzés
                  </span>
                </div>
                <div className="fs-5 fw-bold text-dark mt-1">
                  #{userNextMatch.table}. mérkőzés: {userNextMatch.team1Name || userNextMatch.team1_name} vs. {userNextMatch.team2Name || userNextMatch.team2_name}
                </div>
                <div className="small mt-1 text-muted">
                  {userNextMatchAheadCount === 0 ? (
                    <span className="text-danger fw-semibold">
                      Ez a mérkőzés az aktuálisan soron lévő a páston! Kérjük, haladéktalanul menjetek a szumó pályához!
                    </span>
                  ) : (
                    <span>
                      Jelenleg a #{currentHallActiveMatch?.table}. mérkőzés van soron. Még <strong>{userNextMatchAheadCount}</strong> le nem pontozott mérkőzés van előttetek a teremben.
                    </span>
                  )}
                </div>
              </div>
            ) : teams.length > 0 && (
              <div className="p-3 rounded-3 mb-3 bg-light border text-muted small">
                <i className="bi bi-info-circle me-1" />
                A csapataidnak jelenleg nincs kitűzött, pontozásra váró szumó mérkőzése.
              </div>
            )}

            {/* Soron lévő legelső mérkőzés a páston (ha nem a miénk) */}
            {currentHallActiveMatch && (!userNextMatch || Number(userNextMatch.table) !== Number(currentHallActiveMatch.table)) && (
              <div className="p-3 rounded-3 bg-light border mb-3">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1">
                  <span className="badge text-bg-primary px-2.5 py-1.5 fw-bold">
                    <i className="bi bi-broadcast me-1" />
                    Jelenleg soron lévő (legelső még pontozatlan) mérkőzés a teremben:
                  </span>
                  <span className="fw-bold text-muted small">
                    #{currentHallActiveMatch.table}. mérkőzés
                  </span>
                </div>
                <div className="fw-bold text-dark fs-6 mt-1">
                  #{currentHallActiveMatch.table}. mérkőzés: {currentHallActiveMatch.team1Name || currentHallActiveMatch.team1_name} vs. {currentHallActiveMatch.team2Name || currentHallActiveMatch.team2_name}
                </div>
              </div>
            )}

            {/* Még nem pontozott mérkőzések felsorolása sorszámmal */}
            {unscoredHallMatches.length > 0 ? (
              <div>
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                  <span className="fw-bold small text-secondary">
                    <i className="bi bi-list-ol me-1" />
                    Még le nem pontozott mérkőzések a teremben ({unscoredHallMatches.length} db):
                  </span>
                  <span className="text-muted small">
                    A kiemelt kerettel és felirattal jelzett mérkőzés a te csapatodé
                  </span>
                </div>
                <div className="d-flex flex-wrap gap-2" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                  {unscoredHallMatches.map((m) => {
                    const t1 = m.team1Name || m.team1_name || ''
                    const t2 = m.team2Name || m.team2_name || ''
                    const isMine = userTeamNames.has(t1.trim().toLowerCase()) || userTeamNames.has(t2.trim().toLowerCase())
                    const isCurrent = currentHallActiveMatch && Number(m.table) === Number(currentHallActiveMatch.table)

                    return (
                      <div
                        key={`unscored-match-${m.id || m.table}`}
                        className={`p-2 px-3 rounded-3 border d-flex align-items-center gap-2 small ${
                          isMine
                            ? 'bg-warning-subtle border-warning fw-bold text-dark shadow-sm'
                            : isCurrent
                            ? 'bg-primary-subtle border-primary text-dark'
                            : 'bg-light text-dark'
                        }`}
                      >
                        <span className={`badge ${isMine ? 'text-bg-warning text-dark' : isCurrent ? 'text-bg-primary' : 'text-bg-dark'}`}>
                          #{m.table}. meccs
                        </span>
                        <span>
                          {t1} vs. {t2}
                        </span>
                        {isMine && (
                          <span className="badge text-bg-dark text-warning">
                            A TIÉTEK!
                          </span>
                        )}
                        {isCurrent && !isMine && (
                          <span className="badge text-bg-primary-subtle text-primary border border-primary">
                            Soron lévő
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="alert alert-success mb-0 d-flex align-items-center gap-2">
                <i className="bi bi-check-circle-fill fs-5" />
                <span>Minden kiírt szumó mérkőzés lezárult és pontozásra került a teremben!</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Tombola felület a versenyzőknek */}
      <section className="card shadow-sm border-0 mb-4 bg-white overflow-hidden">
        <div className="card-header bg-dark text-white py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-ticket-perforated-fill text-warning fs-5" />
            <h3 className="h5 mb-0 fw-bold">Tombolaszelvényeim ({tombolaTickets.length})</h3>
          </div>
          <span className="badge text-bg-primary fs-6 px-3 py-2"><i className="bi bi-ticket-detailed me-1" />{tombolaTickets.length} db szelvény</span>
        </div>
        <div className="card-body p-3 p-md-4">
          {tombolaTickets.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="bi bi-ticket-perforated fs-1 d-block mb-2 opacity-50" />
              <p className="mb-2 fw-semibold">Még nincs rögzített tombolaszelvényed.</p>
              <p className="small mb-3 text-secondary" style={{ maxWidth: '480px', margin: '0 auto' }}>
                Tombolát kaphatsz a helyszíni regisztrációért, e-mail feliratkozásért, az értékelő kérdőív kitöltéséért, állomások kipróbálásáért vagy rekorddöntésért!
              </p>
              
            </div>
          ) : (
            <div>
              <p className="small text-muted mb-3">
                Az alábbi szelvényekkel veszel részt a nap végi hivatalos tombolahúzáson. Egy résztvevő legfeljebb 2 alkalommal nyerhet.
              </p>
              <div className="row g-3">
                {tombolaTickets.map((t) => (
                  <div className="col-12 col-md-6 col-lg-4" key={t.id || t.code}>
                    <TombolaTicket ticket={t} isWinner={Boolean(t.isWinner) || Number(t.isPulledOut) === 1} prizeName={t.wonPrize || t.prizeName} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="d-flex flex-column gap-4">
        {displayedTeams.map((team) => {
          const competitors = getCompetitors(team)
          const coach = getCoach(team)
          const hasTeamData = competitors.length > 0 || coach

          return (
            <article className="card shadow-sm team-card overflow-hidden" key={team.id}>
              <header className="team-card-header p-3 d-flex flex-wrap justify-content-between align-items-center gap-3">
                <div>
                  <h3 className="h4 mb-1"><AgeGroupBadge category={team.category} className="me-2" />{team.teamName || `Csapat #${team.id}`}</h3>
                  <div className="text-muted"><i className="bi bi-building me-1" aria-hidden="true" />{team.schoolName || 'Nincs megadott iskola'}</div>
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
                      <h4 className="team-info-title mb-1"><i className="bi bi-trophy-fill me-1" aria-hidden="true" /> Összes pont</h4>
                      <div className="display-6 fw-bold">{team.details?.allPoint ?? team.point?.allPoint ?? 0}</div>
                    </div>
                    <div className="col-md-8">
                      <div className="row g-2">
                        {[
                          ['Vonalkövetés', team.details?.lineFollowPoint, team.details?.lineFollowPosition, 'bi-bezier2'],
                          ['Hegymászás', team.details?.hillClimbPoint, team.details?.hillClimbPosition, 'bi-triangle-half'],
                          ['Szumó', team.details?.sumoPoint, team.details?.sumoPosition, 'bi-shield-shaded'],
                          ['Kosárra dobás', team.details?.basketballPoint, team.details?.basketballPosition, 'bi-dribbble']
                        ].map(([label, point, position, icon]) => (
                          <div className="col-sm-6 col-xl-3" key={label}>
                            <div className="bg-white border rounded p-2 h-100">
                              <div className="small text-muted"><i className={`bi ${icon} me-1`} aria-hidden="true" />{label}</div>
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
                        <h4 className="team-info-title mb-3"><i className="bi bi-person-fill me-1" aria-hidden="true" /> Versenyzők</h4>
                      </div>
                      {competitors.map((competitor, index) => (
                        <div className="col-md-6 col-xl-3" key={competitor.id}>
                          <section className="team-info-box h-100">
                            <h5 className="team-info-title"><i className="bi bi-person me-1" aria-hidden="true" />{index + 1}. versenyző</h5>
                            <div className="team-info-value">{competitor.name}</div>
                            <div className="team-info-meta"><i className="bi bi-envelope me-1" aria-hidden="true" />{competitor.email}</div>
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
                        <h4 className="team-info-title mb-3"><i className="bi bi-mortarboard-fill me-1" aria-hidden="true" /> Felkészítő tanárok</h4>
                      </div>
                      <div className="col-md-6 col-xl-3">
                        <section className="team-info-box h-100">
                          <h5 className="team-info-title"><i className="bi bi-mortarboard me-1" aria-hidden="true" />Felkészítő tanár</h5>
                          <div className="team-info-value">{coach.name}</div>
                          <div className="team-info-meta"><i className="bi bi-envelope me-1" aria-hidden="true" />{coach.email}</div>
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

                {/* Szumó mérkőzések és próbálkozások */}
                {(() => {
                  const currentTeamName = team.teamName || ''
                  const teamMatches = sumoMatches.filter((m) => {
                    const t1 = m.team1Name || m.team1_name || ''
                    const t2 = m.team2Name || m.team2_name || ''
                    return t1.toLowerCase() === currentTeamName.toLowerCase() || t2.toLowerCase() === currentTeamName.toLowerCase()
                  }).sort((a, b) => (Number(a.table) || 0) - (Number(b.table) || 0))

                  const myUnscoredMatches = teamMatches.filter((m) => {
                    const isT1 = (m.team1Name || m.team1_name || '').toLowerCase() === currentTeamName.toLowerCase()
                    const res = isT1 ? (m.team1Result || m.team1result) : (m.team2Result || m.team2result)
                    return !res
                  })

                  const nextMatch = myUnscoredMatches.length > 0 ? myUnscoredMatches[0] : null
                  const nextOpponent = nextMatch
                    ? (nextMatch.team1Name || '').toLowerCase() === currentTeamName.toLowerCase()
                      ? (nextMatch.team2Name || nextMatch.team2_name)
                      : (nextMatch.team1Name || nextMatch.team1_name)
                    : null

                  // All discipline attempts
                  const myLineAttempts = lineResults.filter((r) => (r.team_name || r.teamName || '').toLowerCase() === currentTeamName.toLowerCase())
                  const myHillAttempts = hillResults.filter((r) => (r.team_name || r.teamName || '').toLowerCase() === currentTeamName.toLowerCase())
                  const myBasketAttempts = basketResults.filter((r) => (r.team_name || r.teamName || '').toLowerCase() === currentTeamName.toLowerCase())

                  return (
                    <div className="mt-4 pt-3 border-top">
                      {/* Következő meccs kiemelése */}
                      <div className="mb-4">
                        {nextMatch ? (() => {
                          const matchesAhead = unscoredHallMatches.findIndex((m) => Number(m.table) === Number(nextMatch.table))
                          const isNow = matchesAhead === 0
                          return (
                            <div className={`p-3 rounded-3 border d-flex flex-wrap justify-content-between align-items-center gap-2 ${isNow ? 'bg-danger-subtle border-danger' : 'bg-warning-subtle border-warning'}`}>
                              <div>
                                <span className={`badge fw-bold mb-1 ${isNow ? 'text-bg-danger' : 'text-bg-warning text-dark'}`}>
                                  <i className={`bi ${isNow ? 'bi-exclamation-circle-fill' : 'bi-clock-history'} me-1`} />
                                  {isNow ? 'MOST TI JÖTTÖK A PÁSTON!' : 'Következő mérkőzésed a teremben:'}
                                </span>
                                <div className="h5 fw-bold mb-1 text-dark">
                                  #{nextMatch.table}. mérkőzés vs. {nextOpponent}
                                </div>
                                <div className="small text-muted">
                                  {isNow ? (
                                    <span className="text-danger fw-semibold">
                                      A ti meccsetek a terem legelső pontozatlan mérkőzése. Kérjük, fáradjatok a szumó pályához!
                                    </span>
                                  ) : (
                                    <span>
                                      Jelenleg a #{currentHallActiveMatch?.table}. mérkőzés van soron. Még <strong>{matchesAhead}</strong> pontozatlan mérkőzés van a tiétek előtt a teremben.
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="badge text-bg-dark fs-6">
                                #{nextMatch.table}. meccs
                              </span>
                            </div>
                          )
                        })() : teamMatches.length > 0 ? (
                          <div className="p-2 px-3 rounded bg-success-subtle border border-success text-success small fw-semibold">
                            <i className="bi bi-check-circle-fill me-1" />
                            Minden kiírt szumó mérkőzésed lezárult.
                          </div>
                        ) : null}
                      </div>

                      {/* Minden versenyszám próbálkozásai részletes táblázat */}
                      <div className="card shadow-sm border-0 mb-4 bg-light">
                        <div className="card-header bg-white py-2">
                          <h4 className="h6 fw-bold mb-0 text-dark">
                            <i className="bi bi-list-check text-primary me-2" />
                            Minden versenyszám rögzített próbálkozása
                          </h4>
                        </div>
                        <div className="card-body p-3">
                          <div className="row g-3">
                            {/* Vonalkövetés futamai */}
                            <div className="col-12 col-lg-6">
                              <div className="bg-white p-3 rounded border h-100">
                                <h5 className="h6 fw-bold text-primary mb-2">
                                  <i className="bi bi-bezier2 me-1" />
                                  Vonalkövetés futamai ({myLineAttempts.length})
                                </h5>
                                {myLineAttempts.length === 0 ? (
                                  <div className="small text-muted fst-italic">Még nincs rögzített futam.</div>
                                ) : (
                                  <table className="table table-sm table-borderless small mb-0">
                                    <thead className="table-light">
                                      <tr>
                                        <th>#</th>
                                        <th>Szakasz</th>
                                        <th>Időeredmény</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {myLineAttempts.map((run, rIdx) => (
                                        <tr key={rIdx}>
                                          <td>{rIdx + 1}. futam</td>
                                          <td>{run.stage ? `${run.stage}. szakasz` : '1. szakasz'}</td>
                                          <td className="fw-bold">{parseFloat(run.time).toFixed(3)}s</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </div>

                            {/* Hegymászás kísérletei */}
                            <div className="col-12 col-lg-6">
                              <div className="bg-white p-3 rounded border h-100">
                                <h5 className="h6 fw-bold text-success mb-2">
                                  <i className="bi bi-triangle-half me-1" />
                                  Hegymászás eredménye
                                </h5>
                                {myHillAttempts.length === 0 ? (
                                  <div className="small text-muted fst-italic">Még nincs rögzített kísérlet.</div>
                                ) : (
                                  myHillAttempts.map((hill, hIdx) => (
                                    <div key={hIdx} className="small">
                                      <div className="d-flex justify-content-between mb-1">
                                        <span>Elért szint:</span>
                                        <span className="fw-bold fs-6 text-success">{hill.completed_level}. szint</span>
                                      </div>
                                      <div className="d-flex justify-content-between mb-1">
                                        <span>Szintidő:</span>
                                        <span>{hill.time_spent_on_level} mp</span>
                                      </div>
                                      <div className="d-flex justify-content-between">
                                        <span>Státusz:</span>
                                        <span className={`badge ${hill.eliminated ? 'text-bg-secondary' : 'text-bg-success'}`}>
                                          {hill.eliminated ? 'Kiesett a szinten' : 'Sikeresen teljesítve'}
                                        </span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Kosárlabda dobásai */}
                            <div className="col-12 col-lg-6">
                              <div className="bg-white p-3 rounded border h-100">
                                <h5 className="h6 fw-bold text-warning mb-2" style={{ color: '#d97706' }}>
                                  <i className="bi bi-dribbble me-1" />
                                  Kosárlabda dobások
                                </h5>
                                {myBasketAttempts.length === 0 ? (
                                  <div className="small text-muted fst-italic">Még nincs rögzített dobás.</div>
                                ) : (
                                  myBasketAttempts.map((b, bIdx) => (
                                    <div key={bIdx} className="small">
                                      <div className="d-flex justify-content-between mb-1">
                                        <span>Összes pont:</span>
                                        <span className="fw-bold fs-6 text-primary">{b.points ?? 0} pont</span>
                                      </div>
                                      <div className="d-flex justify-content-between mb-1">
                                        <span>Dobások száma / Idő:</span>
                                        <span>{b.throws ?? '–'} dobás ({b.time ?? '–'} mp)</span>
                                      </div>
                                      <div className="mt-2 pt-2 border-top">
                                        <div className="text-muted mb-1">Találatok kosaranként:</div>
                                        <div className="d-flex gap-2 flex-wrap">
                                          <span className="badge text-bg-light border">1. kosár: {b.hoop1 ?? 0}</span>
                                          <span className="badge text-bg-light border">2. kosár: {b.hoop2 ?? 0}</span>
                                          <span className="badge text-bg-light border">3. kosár: {b.hoop3 ?? 0}</span>
                                          <span className="badge text-bg-light border">4. kosár: {b.hoop4 ?? 0}</span>
                                          <span className="badge text-bg-light border">5. kosár: {b.hoop5 ?? 0}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Szumó meccsek összefoglaló */}
                            <div className="col-12 col-lg-6">
                              <div className="bg-white p-3 rounded border h-100">
                                <h5 className="h6 fw-bold text-danger mb-2">
                                  <i className="bi bi-shield-shaded me-1" />
                                  Szumó mérkőzések ({teamMatches.length})
                                </h5>
                                {teamMatches.length === 0 ? (
                                  <div className="small text-muted fst-italic">Még nincsenek szumó mérkőzések.</div>
                                ) : (
                                  <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                                    <table className="table table-sm table-borderless small mb-0">
                                      <thead className="table-light">
                                        <tr>
                                          <th>Meccs</th>
                                          <th>Ellenfél</th>
                                          <th>Eredmény</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {teamMatches.map((m, mIdx) => {
                                          const isT1 = (m.team1Name || m.team1_name || '').toLowerCase() === currentTeamName.toLowerCase()
                                          const opp = isT1 ? (m.team2Name || m.team2_name) : (m.team1Name || m.team1_name)
                                          const myRes = isT1 ? (m.team1Result || m.team1result || '') : (m.team2Result || m.team2result || '')
                                          const oppRes = isT1 ? (m.team2Result || m.team2result || '') : (m.team1Result || m.team1result || '')
                                          return (
                                            <tr key={mIdx}>
                                              <td>#{m.table}</td>
                                              <td className="text-truncate" style={{ maxWidth: '120px' }}>{opp}</td>
                                              <td>
                                                {myRes ? (
                                                  <span className="badge text-bg-light border">{myRes} - {oppRes}</span>
                                                ) : (
                                                  <span className="badge text-bg-warning text-dark">Folyamatban</span>
                                                )}
                                              </td>
                                            </tr>
                                          )
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}
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
                          const isCurrentActive = currentHallActiveMatch && Number(currentHallActiveMatch.table) === Number(m.table)

                          return (
                            <div className="col-12 col-md-6 col-lg-4" key={`my-match-${m.id || mIdx}`}>
                              <div className={`p-3 rounded border ${isFinished ? 'bg-light' : isCurrentActive ? 'bg-danger-subtle border-danger' : 'bg-warning-subtle border-warning'}`}>
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <span className={`badge ${isCurrentActive ? 'text-bg-danger' : 'text-bg-dark'}`}>
                                    #{m.table || mIdx + 1}. mérkőzés
                                  </span>
                                  <span className={`small ${isCurrentActive ? 'text-danger fw-bold' : isFinished ? 'text-muted' : 'text-dark fw-semibold'}`}>
                                    {isFinished ? 'Lejátszva' : isCurrentActive ? 'Most a páston!' : 'Következik'}
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
