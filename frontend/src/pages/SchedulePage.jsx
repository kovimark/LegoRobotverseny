import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllSettings } from '../services/sumoScheduleConfigApi'

const scheduleItems = [
  {
    id: 'test_and_reg',
    time: '7:00 - 8:50',
    title: 'Helyszíni tesztelés és regisztráció',
    description: 'A csapatok érkezése, regisztráció és tesztelés a pályákon.',
    icon: 'bi-clipboard-check-fill'
  },
  {
    id: 'opening',
    time: '8:50 - 9:00',
    title: 'Megnyitó',
    description: 'Hivatalos megnyitó és a legfontosabb technikai tudnivalók.',
    icon: 'bi-megaphone-fill'
  },
  {
    id: 'group_stage',
    time: '9:00 - 14:00',
    title: 'Csoportkör',
    description: 'Csoportmérkőzések és kísérletek lebonyolítása a versenyszámokban.',
    icon: 'bi-grid-3x3-gap-fill'
  },
  {
    id: 'tie_breaker',
    time: '14:00 - 14:30',
    title: 'Holtversenyek eldöntése',
    description: 'A továbbjutó helyeken kialakult holtversenyek eldöntése.',
    icon: 'bi-shuffle'
  },
  {
    id: 'knockout_stage',
    time: '14:30 - 16:00',
    title: 'Egyenes kieséses szakasz',
    description: 'A továbbjutott csapatok döntő küzdelmei a helyezésekért.',
    icon: 'bi-trophy-fill'
  },
  {
    id: 'ceremony_and_tombola',
    time: '16:00 - 16:30',
    title: 'Eredményhirdetés és Tombola',
    description: 'Ünnepélyes díjátadó, eredményhirdetés és tombola sorsolás.',
    icon: 'bi-award-fill'
  }
]

export default function SchedulePage() {
  const [currentPhase, setCurrentPhase] = useState('')

  useEffect(() => {
    let mounted = true
    const loadPhase = async () => {
      try {
        const settings = await getAllSettings()
        if (mounted && settings && settings.competitionPhase) {
          setCurrentPhase(settings.competitionPhase)
        }
      } catch {
        // Opció, ha még nincs beállítva szakasz
      }
    }
    loadPhase()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <main className="container py-4 my-2">
      <div className="text-center mb-4">
        <span className="home-kicker">Program</span>
        <h1 className="display-6 fw-bold mb-2">A verseny várható menetrendje</h1>
        <p className="text-muted mb-0">
          A Brickathlon Lego robotverseny hivatalos időbeosztása és szakaszai.
        </p>
      </div>

      <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden mb-3">
        <div className="table-responsive">
          <table className="table table-bordered table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th scope="col" className="py-3 px-3 px-md-4 text-center text-md-start" style={{ width: '190px' }}>
                  <i className="bi bi-clock me-2 text-primary" />
                  Idősáv
                </th>
                <th scope="col" className="py-3 px-3 px-md-4">
                  <i className="bi bi-flag me-2 text-primary" />
                  Esemény
                </th>
                <th scope="col" className="py-3 px-3 px-md-4 d-none d-md-table-cell">
                  <i className="bi bi-info-circle me-2 text-primary" />
                  Részletek
                </th>
              </tr>
            </thead>
            <tbody>
              {scheduleItems.map((item) => {
                const isLive = currentPhase && item.title.toLowerCase().includes(currentPhase.toLowerCase())
                return (
                  <tr key={item.id} className={isLive ? 'table-primary' : ''}>
                    <td className="py-3 px-3 px-md-4 fw-bold text-nowrap text-dark text-center text-md-start">
                      <span className="badge bg-light text-dark border px-2 py-2 fs-6 fw-bold">
                        {item.time}
                      </span>
                    </td>
                    <td className="py-3 px-3 px-md-4">
                      <div className="d-flex align-items-center gap-2">
                        <i className={`bi ${item.icon} text-primary fs-5 d-none d-sm-inline`} />
                        <div>
                          <div className="fw-bold text-dark">{item.title}</div>
                          <div className="small text-muted d-md-none mt-1">{item.description}</div>
                        </div>
                        {isLive && (
                          <span className="badge bg-success ms-2">Most zajlik</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 px-md-4 text-muted small d-none d-md-table-cell">
                      {item.description}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="alert alert-secondary border-0 bg-light text-muted small text-center rounded-3 mb-4">
        (A várható menetrend a helyszíni események függvényében minimálisan módosulhat.)
      </div>

      <div className="card border-0 bg-light p-3 rounded-4 mx-auto text-center" style={{ maxWidth: '640px' }}>
        <div className="d-flex flex-wrap justify-content-center gap-2">
          <Link className="btn btn-outline-primary btn-sm px-3" to="/szabalyzat">
            <i className="bi bi-file-earmark-text me-1" />
            Szabályzat
          </Link>
          <Link className="btn btn-outline-primary btn-sm px-3" to="/videok">
            <i className="bi bi-camera-video me-1" />
            Videók
          </Link>
          <Link className="btn btn-primary btn-sm px-3" to="/versenyjelentkezes">
            <i className="bi bi-pencil-square me-1" />
            Versenyjelentkezés
          </Link>
        </div>
      </div>
    </main>
  )
}
