import React, { useState, useEffect } from 'react'
import { awardTombolaTicket } from '../services/tombolaApi'

export default function HallOfFamePage({ userRole }) {
  const isAdmin = userRole === 'admin'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionFeedback, setActionFeedback] = useState(null)
  const [allTeams, setAllTeams] = useState([])
  const [records, setRecords] = useState({
    lineFollower: null,
    hillClimber: null,
    basketball: null,
    sumo: null
  })

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [lineRes, hillRes, basketRes, sumoRes, teamsRes] = await Promise.allSettled([
        fetch('https://brickathlon.runasp.net/api/LineFollowing'),
        fetch('https://brickathlon.runasp.net/api/HillClimbing/bestattempts'),
        fetch('https://brickathlon.runasp.net/api/Basketball'),
        fetch('https://brickathlon.runasp.net/api/Sumo/matches'),
        fetch('https://brickathlon.runasp.net/api/Teams')
      ])

      if (teamsRes.status === 'fulfilled' && teamsRes.value.ok) {
        try {
          const tData = await teamsRes.value.json()
          setAllTeams(Array.isArray(tData) ? tData : [])
        } catch (e) {
          console.warn('Teams parse error:', e)
        }
      }

      let bestLine = null
      if (lineRes.status === 'fulfilled' && lineRes.value.ok) {
        const data = await lineRes.value.json()
        const items = Array.isArray(data) ? data : []
        items.forEach((item) => {
          const t = parseFloat(item.time)
          if (!isNaN(t) && t > 0) {
            if (!bestLine || t < bestLine.time) {
              bestLine = {
                teamName: item.team_name || item.teamName,
                time: t,
                stage: item.stage || 1
              }
            }
          }
        })
      }

      let bestHill = null
      if (hillRes.status === 'fulfilled' && hillRes.value.ok) {
        const data = await hillRes.value.json()
        const items = Array.isArray(data) ? data : []
        items.forEach((item) => {
          const lvl = parseInt(item.completed_level, 10) || 0
          const time = parseFloat(item.time_spent_on_level) || 0
          const elim = parseInt(item.eliminated, 10) || 0
          if (!bestHill || lvl > bestHill.level || (lvl === bestHill.level && elim < bestHill.eliminated) || (lvl === bestHill.level && elim === bestHill.eliminated && time < bestHill.time)) {
            bestHill = {
              teamName: item.team_name || item.teamName,
              level: lvl,
              time: time,
              eliminated: elim
            }
          }
        })
      }

      let bestBasket = null
      if (basketRes.status === 'fulfilled' && basketRes.value.ok) {
        const data = await basketRes.value.json()
        const items = Array.isArray(data) ? data : []
        items.forEach((item) => {
          const pts = parseInt(item.points, 10) || 0
          const throws = parseInt(item.throws, 10) || 0
          const time = parseFloat(item.time) || 0
          if (!bestBasket || pts > bestBasket.points || (pts === bestBasket.points && throws < bestBasket.throws)) {
            bestBasket = {
              teamName: item.team_name || item.teamName,
              points: pts,
              throws: throws,
              time: time
            }
          }
        })
      }

      let bestSumo = null
      if (sumoRes.status === 'fulfilled' && sumoRes.value.ok) {
        const data = await sumoRes.value.json()
        const matches = Array.isArray(data) ? data : []
        const teamWins = {}
        matches.forEach((m) => {
          const t1 = m.team1Name || m.team1_name
          const t2 = m.team2Name || m.team2_name
          const p1 = parseInt(m.team1Point || m.team1_point, 10) || 0
          const p2 = parseInt(m.team2Point || m.team2_point, 10) || 0
          if (t1) {
            teamWins[t1] = (teamWins[t1] || 0) + p1
          }
          if (t2) {
            teamWins[t2] = (teamWins[t2] || 0) + p2
          }
        })

        let topTeam = null
        let maxPts = -1
        Object.entries(teamWins).forEach(([tName, pts]) => {
          if (pts > maxPts) {
            maxPts = pts
            topTeam = tName
          }
        })

        if (topTeam) {
          bestSumo = {
            teamName: topTeam,
            points: maxPts
          }
        }
      }

      setRecords({
        lineFollower: bestLine,
        hillClimber: bestHill,
        basketball: bestBasket,
        sumo: bestSumo
      })
    } catch (err) {
      setError('Nem sikerült betölteni a rekordokat: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleAwardRecordTombola = async (disciplineName, teamName) => {
    if (!teamName) return
    try {
      const foundTeam = allTeams.find((t) => (t.teamName || '').toLowerCase() === teamName.toLowerCase())
      const email = foundTeam?.teamMember1Email || (Array.isArray(foundTeam?.members) && foundTeam.members[0]?.email) || foundTeam?.coachEmail || ''

      const ticket = await awardTombolaTicket({
        activityType: 'record',
        teamName: teamName,
        recipientName: teamName,
        userEmail: email,
        note: `Rekorddöntés a(z) ${disciplineName} versenyszámban`
      })
      setActionFeedback({
        type: 'success',
        text: `Sikeresen kiosztva a(z) "${teamName}" csapatnak a rekorddöntési tombolajegy (${ticket.code})!`
      })
    } catch (err) {
      setActionFeedback({
        type: 'danger',
        text: err.message || 'Hiba történt a tombolajegy kiosztásakor.'
      })
    }
  }

  const handleAwardAllRecords = async () => {
    const awarded = []
    const recList = [
      { name: 'Vonalkövetés', data: records.lineFollower },
      { name: 'Hegymászás', data: records.hillClimber },
      { name: 'Kosárlabda', data: records.basketball },
      { name: 'Szumó', data: records.sumo }
    ]

    for (const { name, data } of recList) {
      if (data?.teamName) {
        try {
          const foundTeam = allTeams.find((t) => (t.teamName || '').toLowerCase() === data.teamName.toLowerCase())
          const email = foundTeam?.teamMember1Email || (Array.isArray(foundTeam?.members) && foundTeam.members[0]?.email) || foundTeam?.coachEmail || ''

          const ticket = await awardTombolaTicket({
            activityType: 'record',
            teamName: data.teamName,
            recipientName: data.teamName,
            userEmail: email,
            note: `Hivatalos rekorddöntés a(z) ${name} versenyszámban`
          })
          awarded.push(`${data.teamName} (${ticket.code})`)
        } catch {
          // ignore duplicate
        }
      }
    }

    if (awarded.length > 0) {
      setActionFeedback({
        type: 'success',
        text: `Minden rekordtartó automatikusan megkapta a tombolajegyét: ${awarded.join(', ')}`
      })
    } else {
      setActionFeedback({
        type: 'info',
        text: 'Minden rekordtartó rendelkezik már a rekorddöntési tombolajeggyel.'
      })
    }
  }

  return (
    <main className="container py-4">
      {/* Fejléc */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <span className="badge text-bg-warning text-dark px-3 py-1 fs-6 mb-2">
            <i className="bi bi-award-fill me-1" />
            Hivatalos Csúcsteljesítmények
          </span>
          <h1 className="h2 fw-bold mb-1">Hall of Fame • Brickathlon Rekordok</h1>
          <p className="text-muted mb-0">
            A verseny legkiemelkedőbb eredményei, pályacsúcsai és a bajnokok dicsőségcsarnoka.
          </p>
        </div>
        <div className="d-flex gap-2">
          {isAdmin && (
            <button
              type="button"
              className="btn btn-warning fw-bold text-dark shadow-sm"
              onClick={handleAwardAllRecords}
              disabled={loading}
            >
              <i className="bi bi-ticket-perforated-fill me-1" />
              Tombolák kiosztása minden rekordért
            </button>
          )}
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={loadData}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise me-1" />
            Frissítés
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className={`alert alert-${actionFeedback.type} alert-dismissible fade show mb-4`} role="alert">
          <i className="bi bi-info-circle-fill me-2" />
          {actionFeedback.text}
          <button
            type="button"
            className="btn-close"
            onClick={() => setActionFeedback(null)}
            aria-label="Bezárás"
          />
        </div>
      )}

      {error && (
        <div className="alert alert-danger mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="alert alert-info py-4 text-center">
          <i className="bi bi-arrow-repeat spin-icon me-2" />
          Rekordok és eredmények elemzése...
        </div>
      ) : (
        <div className="row g-4 mb-4">
          {/* 1. Vonalkövetés Rekord */}
          <div className="col-12 col-md-6 col-lg-3">
            <div className="card h-100 shadow-sm border-0 bg-light rounded-4 overflow-hidden position-relative">
              <div
                className="position-absolute top-0 end-0 p-3 opacity-25"
                style={{ fontSize: '4rem', color: '#0d6efd' }}
              >
                <i className="bi bi-bezier2" />
              </div>
              <div className="card-body p-4 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="badge text-bg-primary">Vonalkövetés</span>
                    <span className="small text-muted">Leggyorsabb kör</span>
                  </div>
                  <h3 className="h5 fw-bold mb-3 text-dark">
                    {records.lineFollower?.teamName || 'Még nincs rekord'}
                  </h3>
                  <div className="display-6 fw-bold text-primary mb-1">
                    {records.lineFollower ? `${records.lineFollower.time.toFixed(3)}s` : '–'}
                  </div>
                  <div className="small text-muted">
                    {records.lineFollower ? `${records.lineFollower.stage}. versenyszakasz` : 'Nincs adat'}
                  </div>
                </div>
                {isAdmin && records.lineFollower && (
                  <div className="mt-4 pt-3 border-top">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary w-100"
                      onClick={() => handleAwardRecordTombola('Vonalkövetés', records.lineFollower.teamName)}
                    >
                      <i className="bi bi-ticket-perforated me-1" />
                      Tombola adása rekordért
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Hegymászás Rekord */}
          <div className="col-12 col-md-6 col-lg-3">
            <div className="card h-100 shadow-sm border-0 bg-light rounded-4 overflow-hidden position-relative">
              <div
                className="position-absolute top-0 end-0 p-3 opacity-25"
                style={{ fontSize: '4rem', color: '#198754' }}
              >
                <i className="bi bi-triangle-half" />
              </div>
              <div className="card-body p-4 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="badge text-bg-success">Hegymászás</span>
                    <span className="small text-muted">Legmagasabb szint</span>
                  </div>
                  <h3 className="h5 fw-bold mb-3 text-dark">
                    {records.hillClimber?.teamName || 'Még nincs rekord'}
                  </h3>
                  <div className="display-6 fw-bold text-success mb-1">
                    {records.hillClimber ? `${records.hillClimber.level}. szint` : '–'}
                  </div>
                  <div className="small text-muted">
                    {records.hillClimber
                      ? `Szintidő: ${records.hillClimber.time}s ${records.hillClimber.eliminated ? '(Kiesett)' : '(Teljesítve)'}`
                      : 'Nincs adat'}
                  </div>
                </div>
                {isAdmin && records.hillClimber && (
                  <div className="mt-4 pt-3 border-top">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success w-100"
                      onClick={() => handleAwardRecordTombola('Hegymászás', records.hillClimber.teamName)}
                    >
                      <i className="bi bi-ticket-perforated me-1" />
                      Tombola adása rekordért
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Kosárlabda Rekord */}
          <div className="col-12 col-md-6 col-lg-3">
            <div className="card h-100 shadow-sm border-0 bg-light rounded-4 overflow-hidden position-relative">
              <div
                className="position-absolute top-0 end-0 p-3 opacity-25"
                style={{ fontSize: '4rem', color: '#fd7e14' }}
              >
                <i className="bi bi-dribbble" />
              </div>
              <div className="card-body p-4 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="badge text-bg-warning text-dark">Kosárlabda</span>
                    <span className="small text-muted">Legtöbb pont</span>
                  </div>
                  <h3 className="h5 fw-bold mb-3 text-dark">
                    {records.basketball?.teamName || 'Még nincs rekord'}
                  </h3>
                  <div className="display-6 fw-bold text-warning mb-1" style={{ color: '#d97706' }}>
                    {records.basketball ? `${records.basketball.points} pont` : '–'}
                  </div>
                  <div className="small text-muted">
                    {records.basketball
                      ? `${records.basketball.throws} dobásból (${records.basketball.time}s)`
                      : 'Nincs adat'}
                  </div>
                </div>
                {isAdmin && records.basketball && (
                  <div className="mt-4 pt-3 border-top">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-warning text-dark w-100"
                      onClick={() => handleAwardRecordTombola('Kosárlabda', records.basketball.teamName)}
                    >
                      <i className="bi bi-ticket-perforated me-1" />
                      Tombola adása rekordért
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. Szumó Rekord */}
          <div className="col-12 col-md-6 col-lg-3">
            <div className="card h-100 shadow-sm border-0 bg-light rounded-4 overflow-hidden position-relative">
              <div
                className="position-absolute top-0 end-0 p-3 opacity-25"
                style={{ fontSize: '4rem', color: '#dc3545' }}
              >
                <i className="bi bi-shield-shaded" />
              </div>
              <div className="card-body p-4 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="badge text-bg-danger">Szumó</span>
                    <span className="small text-muted">Legtöbb meccspont</span>
                  </div>
                  <h3 className="h5 fw-bold mb-3 text-dark">
                    {records.sumo?.teamName || 'Még nincs rekord'}
                  </h3>
                  <div className="display-6 fw-bold text-danger mb-1">
                    {records.sumo ? `${records.sumo.points} pont` : '–'}
                  </div>
                  <div className="small text-muted">
                    {records.sumo ? 'A dohjó uralkodó csapata' : 'Nincs adat'}
                  </div>
                </div>
                {isAdmin && records.sumo && (
                  <div className="mt-4 pt-3 border-top">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger w-100"
                      onClick={() => handleAwardRecordTombola('Szumó', records.sumo.teamName)}
                    >
                      <i className="bi bi-ticket-perforated me-1" />
                      Tombola adása rekordért
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Részletes tájékoztató */}
      <div className="card shadow-sm border-0 p-4 bg-white">
        <h3 className="h5 fw-bold mb-2">
          <i className="bi bi-info-circle text-primary me-2" />
          Hogyan működik a Hall of Fame és a rekorddöntési bónusz?
        </h3>
        <p className="text-muted mb-2">
          A rendszer minden rögzített kísérletet és mérkőzést valós időben elemez. A versenyszámok aktuális pályacsúcsát felállító csapatok nemcsak a dicsőségcsarnokba kerülnek be, hanem automatikusan jogosulttá válnak egy exkluzív tombolajegyre is.
        </p>
        <p className="text-muted mb-0">
          A nap végén vagy a versenyszámok lezárásakor az adminisztrátorok egyetlen kattintással véglegesíthetik a rekordokat és oszthatják ki az elismeréseket.
        </p>
      </div>
    </main>
  )
}
