import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchTicketsFromBackend,
  getWinners,
  drawTombolaWinner,
  resetWinners,
  MAX_WINS_PER_RECIPIENT,
  TOMBOLA_STORAGE_EVENT
} from '../services/tombolaApi'
import TombolaTicket from '../components/TombolaTicket'
import TombolaWheel from '../components/TombolaWheel'

// =====================================================================================
// BEÁLLÍTÁS: Itt tudod megadni, hány korábbi kihúzott szelvény jelenjen meg lent kicsiben:
export const PREVIOUS_WINNERS_COUNT = 5; // Írd át ezt a számot tetszés szerint (pl. 2, 4, 6, stb.)
// =====================================================================================

export default function AdminTombolaDrawPage() {
  const [tickets, setTickets] = useState([])
  const [winners, setWinners] = useState([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [latestWinner, setLatestWinner] = useState(null)
  const [drawError, setDrawError] = useState('')
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false)

  const fullscreenWheelRef = useRef(null)
  const mainWheelRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const isHoveredRef = useRef(false)

  const refreshData = async () => {
    const t = await fetchTicketsFromBackend()
    const w = getWinners()
    setTickets(Array.isArray(t) ? t : [])
    setWinners(Array.isArray(w) ? w : [])
  }

  useEffect(() => {
    refreshData()
    window.addEventListener(TOMBOLA_STORAGE_EVENT, refreshData)
    window.addEventListener('storage', refreshData)
    return () => {
      window.removeEventListener(TOMBOLA_STORAGE_EVENT, refreshData)
      window.removeEventListener('storage', refreshData)
    }
  }, [])

  // Recipients with win counts
  const winCountByRecipient = useMemo(() => {
    const counts = {}
    winners.forEach((w) => {
      const key = (w.email || w.name || w.teamName || w.code).toLowerCase()
      counts[key] = (counts[key] || 0) + 1
    })
    return counts
  }, [winners])

  // Eligible tickets pool (isPulledOut === 0 AND < 2 wins)
  const eligibleTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (t.isPulledOut === 1 || t.isWinner) return false
      const key = (t.email || t.name || t.teamName || t.code).toLowerCase()
      const count = winCountByRecipient[key] || 0
      return count < MAX_WINS_PER_RECIPIENT
    })
  }, [tickets, winCountByRecipient])

  // Korábbi nyertesek listája a teljes képernyős nézethez
  const previousWinners = useMemo(() => {
    if (!winners || winners.length === 0) return []
    const list = latestWinner
      ? winners.filter((w) => w.code !== latestWinner.code)
      : winners
    const count = Number(PREVIOUS_WINNERS_COUNT) > 0 ? Number(PREVIOUS_WINNERS_COUNT) : 2
    return list.slice(-count).reverse()
  }, [winners, latestWinner])

  // Automatikus vízszintes görgetés (folyamatos, finom csúsztatás látható görgetősáv nélkül)
  useEffect(() => {
    if (!isFullscreenOpen) return
    const container = scrollContainerRef.current
    if (!container) return

    let animId
    let lastTime = performance.now()
    const speed = 40 // pixel/másodperc - kényelmesen olvasható folyamatos tempó

    const animate = (time) => {
      const dt = (time - lastTime) / 1000
      lastTime = time

      if (!isHoveredRef.current && container) {
        if (container.scrollWidth > container.clientWidth) {
          container.scrollLeft += speed * dt

          // Amikor eléri a duplikált lista felét, láthatatlanul visszaugrik a kezdőpozícióra
          const halfWidth = container.scrollWidth / 2
          if (container.scrollLeft >= halfWidth) {
            container.scrollLeft -= halfWidth
          }
        }
      }

      animId = requestAnimationFrame(animate)
    }

    animId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animId)
  }, [previousWinners, isFullscreenOpen])

  const handleStartDraw = async () => {
    setDrawError('')
    if (eligibleTickets.length === 0) {
      setDrawError('Nincs sorsolható érvényes tombolajegy (vagy mindenki elérte a maximális 2 nyereményt).')
      return
    }

    try {
      setIsDrawing(true)
      setLatestWinner(null)

      // 1. Sorsolás végrehajtása a backend API-n keresztül
      const winnerResult = await drawTombolaWinner()

      // 2. Szerencsekerék megpörgetése a sorsolt kódra
      const activeWheel = isFullscreenOpen ? fullscreenWheelRef.current : (mainWheelRef.current || fullscreenWheelRef.current)
      if (activeWheel && activeWheel.spinToWinner) {
        await activeWheel.spinToWinner(winnerResult.code)
      }

      setLatestWinner(winnerResult)
      await refreshData()
    } catch (err) {
      setDrawError(err.message || 'Hiba történt a sorsolás során.')
    } finally {
      setIsDrawing(false)
    }
  }

  const executeResetDraws = () => {
    resetWinners()
    setLatestWinner(null)
    setDrawError('')
    setShowResetConfirmModal(false)
  }

  const filteredTickets = useMemo(() => {
    return (tickets || []).filter((t) => {
      if (!searchFilter.trim()) return true
      const q = searchFilter.toLowerCase()
      return (
        t.code?.toLowerCase().includes(q) ||
        t.recipientName?.toLowerCase().includes(q) ||
        t.name?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q) ||
        t.userEmail?.toLowerCase().includes(q)
      )
    })
  }, [tickets, searchFilter])

  return (
    <main className="container py-4 my-2">
      {/* Fejléc és gyors statisztika */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">
            <i className="bi bi-ticket-perforated-fill text-danger me-2" />
            Tombola sorsolás és kezelés
          </h1>
          <p className="text-muted mb-0">
            Hivatalos tombola sorsolási felület az adminisztrátorok számára.
          </p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          
          <Link to="/segito" className="btn btn-primary fw-bold">
            <i className="bi bi-ticket-perforated me-1" />
            Tombolajegyek kiadása
          </Link>
          <span className="badge text-bg-primary fs-6 px-3 py-2">
            <i className="bi bi-ticket-detailed me-1" />
            {tickets.length} kiadott jegy
          </span>
          <span className="badge text-bg-success fs-6 px-3 py-2">
            <i className="bi bi-trophy-fill me-1" />
            {winners.length} kihúzott nyertes
          </span>
          <span className="badge text-bg-info fs-6 px-3 py-2">
            <i className="bi bi-check2-circle me-1" />
            {eligibleTickets.length} esélyes jegy
          </span>
        </div>
      </div>

      {/* Sorsolási szabály figyelemfelhívás */}
      <div className="alert alert-light border border-secondary-subtle d-flex align-items-center gap-3 mb-4">
        <i className="bi bi-shield-check text-success fs-3" />
        <div className="small">
          <strong>Rendszerszintű sorsolási szabály:</strong> Egy személy maximum{' '}
          <strong>{MAX_WINS_PER_RECIPIENT} alkalommal</strong> nyerhet. A rendszer automatikusan kizárja a további húzásokból azokat a jegyeket, amelyek tulajdonosa már 2 nyereményt átvett.
        </div>
      </div>

      {/* Sorsoló panel: Szerencsekerék (Letisztult kártya dizájn) */}
      <div className="card shadow-sm border-0 mb-4 overflow-hidden">
        <div className="card-header bg-dark text-white py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <h2 className="h5 mb-0 fw-bold d-flex align-items-center gap-2 text-white">              
              Szerencsekerék Sorsolás
            </h2>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-warning text-dark fw-bold"
              onClick={() => setIsFullscreenOpen(true)}
            >
              <i className="bi bi-arrows-fullscreen me-1" />
              Teljes képernyős sorsoló nézet
            </button>
            {winners.length > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger bg-white"
                onClick={() => setShowResetConfirmModal(true)}
                disabled={isDrawing}
              >
                <i className="bi bi-arrow-counterclockwise me-1" />
                Sorsolások visszaállítása
              </button>
            )}
          </div>
        </div>
        <div className="card-body p-4 text-center">
          {drawError && (
            <div className="alert alert-danger py-2 mb-3">
              <i className="bi bi-exclamation-triangle-fill me-1" />
              {drawError}
            </div>
          )}

          {/* Szerencsekerék */}
          <div className="d-flex flex-column align-items-center justify-content-center my-3">
            <TombolaWheel
              ref={mainWheelRef}
              candidateTickets={eligibleTickets}
              size={320}
            />
          </div>

          <div className="mt-3 d-flex flex-wrap justify-content-center gap-2">
            <button
              type="button"
              className="btn btn-warning btn-lg px-5 py-3 fw-bold fs-5 text-dark shadow-sm"
              onClick={handleStartDraw}
              disabled={isDrawing || eligibleTickets.length === 0}
            >
              <i className={`bi ${isDrawing ? 'bi-arrow-repeat spin-icon' : 'bi-dice-5-fill'} me-2`} />
              {isDrawing ? 'Szerencsekerék pörög...' : 'Sorsolás indítása'}
            </button>
            <button
              type="button"
              className="btn btn-outline-dark btn-lg px-4 py-3 fw-bold"
              onClick={() => setIsFullscreenOpen(true)}
            >
              <i className="bi bi-arrows-fullscreen me-2" />
              Teljes képernyő
            </button>
          </div>

          {eligibleTickets.length === 0 && tickets.length > 0 && (
            <p className="text-muted small mt-2">
              Minden szelvény tulajdonosa elérte a 2 nyeremény felső korlátját.
            </p>
          )}
        </div>
      </div>

      {/* Legutóbbi kihúzott nyertes grafikus szelvénye (Név nélkül!) */}
      {latestWinner && (
        <section className="mb-4">
          <div className="mb-3">
            <h2 className="h5 fw-bold mb-0">
              <i className="bi bi-award-fill text-success me-2" />
              Kihúzott nyertes szelvény
            </h2>
          </div>
          <div className="row">
            <div className="col-12 col-md-8 col-lg-6">
              <TombolaTicket ticket={latestWinner} isWinner={true} />
            </div>
          </div>
        </section>
      )}

      {/* 1. TÁBLÁZAT: Eddigi nyertesek listája (Letisztult fehér fejléc, csapatnév nélkül) */}
      <section className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <div>
            <h2 className="h5 fw-bold mb-0 text-dark">
              <i className="bi bi-trophy-fill text-warning me-2" />
              Eddigi nyertesek ({winners.length})
            </h2>
          </div>
          <span className="small text-muted">Nyertesek nyilvántartása</span>
        </div>
        <div className="card-body p-0">
          {winners.length === 0 ? (
            <div className="p-4 text-center text-muted">
              <i className="bi bi-ticket-perforated fs-2 d-block mb-2" />
              Még nem történt tombolahúzás.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '60px' }}>#</th>
                    <th>Kód</th>
                    <th>Versenyző neve</th>
                    <th>Indok / Tevékenység</th>
                    <th>Nyert eddig</th>
                  </tr>
                </thead>
                <tbody>
                  {winners.map((w, idx) => {
                    const recipientKey = (w.email || w.name || w.teamName || w.code).toLowerCase()
                    const winCount = winCountByRecipient[recipientKey] || 1
                    return (
                      <tr key={`winner-${w.drawId || w.code || idx}`}>
                        <td className="fw-bold text-muted">{idx + 1}.</td>
                        <td>
                          <span className="badge text-bg-dark font-monospace fs-6">
                            {w.code}
                          </span>
                        </td>
                        <td className="fw-semibold">
                          <div>{w.recipientName || w.name || '–'}</div>
                          {(w.recipientEmail || w.email) && (
                            <div className="small text-muted">{w.recipientEmail || w.email}</div>
                          )}
                        </td>
                        <td>
                          <span className="badge text-bg-light border">
                            {w.activityLabel || w.reasonLabel || 'Tombola'}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              winCount >= MAX_WINS_PER_RECIPIENT ? 'text-bg-danger' : 'text-bg-warning text-dark'
                            }`}
                          >
                            {winCount} / {MAX_WINS_PER_RECIPIENT} nyeremény
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* 2. TÁBLÁZAT: Összes kiadott jegy adatbázis & kereső (Letisztult fehér fejléc, csapatnév nélkül) */}
      <section className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-white py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <h2 className="h5 fw-bold mb-0 text-dark">
              <i className="bi bi-collection-fill text-primary me-2" />
              Összes kiadott jegy ({tickets.length})
            </h2>
          </div>
          <div className="input-group" style={{ maxWidth: '320px' }}>
            <span className="input-group-text bg-light">
              <i className="bi bi-search" />
            </span>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Keresés kód, név, email alapján..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>
        </div>
        <div className="card-body p-0">
          {filteredTickets.length === 0 ? (
            <div className="p-4 text-center text-muted">
              Nem található a keresésnek megfelelő jegy.
            </div>
          ) : (
            <div className="table-responsive" style={{ maxHeight: '440px', overflowY: 'auto' }}>
              <table className="table table-sm table-striped table-hover align-middle mb-0">
                <thead className="table-light sticky-top">
                  <tr>
                    <th>Kód</th>
                    <th>Versenyző neve</th>
                    <th>E-mail</th>
                    <th>Szerzés módja</th>
                    <th>Státusz</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((t) => {
                    const recipientKey = (t.email || t.name || t.teamName || t.code).toLowerCase()
                    const winsSoFar = winCountByRecipient[recipientKey] || 0
                    const isWinner = t.isWinner || Number(t.isPulledOut) === 1
                    const isLimitReached = winsSoFar >= MAX_WINS_PER_RECIPIENT

                    return (
                      <tr key={t.id || t.code}>
                        <td>
                          <span className="badge text-bg-dark font-monospace fs-6">
                            {t.code}
                          </span>
                        </td>
                        <td className="fw-semibold">
                          <div>{t.recipientName || t.name || '–'}</div>
                        </td>
                        <td className="small text-muted">{t.email || t.userEmail || '–'}</td>
                        <td>
                          <span className="badge text-bg-light border">
                            {t.reasonLabel || t.activityLabel || 'Kiadott tombola'}
                          </span>
                        </td>
                        <td>
                          {isWinner ? (
                            <span className="badge bg-success text-white fw-bold">
                              <i className="bi bi-trophy-fill me-1" />
                              Nyert
                            </span>
                          ) : isLimitReached ? (
                            <span className="badge bg-secondary text-white" title="Elérte a maximális 2 nyereményt">
                              <i className="bi bi-dash-circle me-1" />
                              Nem sorsolható (2x nyert)
                            </span>
                          ) : (
                            <span className="badge bg-light text-muted border">
                              <i className="bi bi-hourglass-split me-1 text-primary" />
                              Esélyes
                            </span>
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
      </section>

      {/* Visszaállítás modal */}
      {showResetConfirmModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)', zIndex: 1060, backdropFilter: 'blur(2px)' }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered modal-sm m-0" style={{ maxWidth: '440px', width: '92%' }} role="document">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden bg-white text-dark">
              <div className="modal-header border-bottom px-4 py-3 bg-danger-subtle text-danger">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2 mb-0">
                  <i className="bi bi-exclamation-triangle-fill" />
                  Húzások újraindítása
                </h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowResetConfirmModal(false)}></button>
              </div>
              <div className="modal-body px-4 py-4">
                <p className="mb-2 text-dark">Biztosan törölni szeretnéd a kihúzott nyertesek listáját?</p>
                <div className="alert alert-warning py-2 mb-0 small text-dark border-warning">
                  <i className="bi bi-info-circle me-1 text-warning" />
                  A kiadott szelvények és kódok megmaradnak, de a sorsolási napló és az eddigi nyertesek törlésre kerülnek.
                </div>
              </div>
              <div className="modal-footer border-top px-4 py-3 bg-light d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-secondary px-3" onClick={() => setShowResetConfirmModal(false)}>Mégse</button>
                <button type="button" className="btn btn-danger px-4 fw-bold" onClick={executeResetDraws}>Újraindítás megerősítése</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TELJES KÉPERNYŐS SORSOLÁSI NÉZET: EREDMÉNYHIRDETÉS ÉS DIAVETÍTÉS STÍLUS SÖTÉT HÁTTÉRREL */}
      {isFullscreenOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column justify-content-between p-3 p-md-4"
          style={{
            zIndex: 9999,
            background:
              'radial-gradient(circle at 85% 15%, rgba(91, 192, 235, 0.18), transparent 32rem), ' +
              'radial-gradient(circle at 10% 90%, rgba(253, 231, 76, 0.12), transparent 30rem), ' +
              '#07111f',
            color: '#f8fbff',
            overflowY: 'auto'
          }}
          role="dialog"
          aria-modal="true"
        >
          {/* Felső sáv: Cím és gombok */}
          <div
            className="d-flex flex-wrap justify-content-between align-items-center gap-3 pb-3"
            style={{
              borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(3, 11, 22, 0.75)',
              borderRadius: '0.75rem',
              padding: '1rem 1.5rem'
            }}
          >
            <div className="d-flex align-items-center gap-3">
             
              <div>
                <h1 className="h4 mb-0 fw-bold text-white">Tombolasorsolás</h1>
              </div>
            </div>

            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="badge bg-primary fs-6 px-3 py-2">
                <i className="bi bi-ticket-perforated me-1" />
                {eligibleTickets.length} esélyes jegy
              </span>
              <span className="badge bg-success fs-6 px-3 py-2">
                <i className="bi bi-trophy-fill me-1" />
                {winners.length} kihúzva
              </span>
              <button
                type="button"
                className="btn btn-outline-light btn-sm px-3 py-2 fw-bold"
                onClick={() => setIsFullscreenOpen(false)}
              >
                <i className="bi bi-x-lg me-1" />
                Kilépés
              </button>
            </div>
          </div>

          {/* Középső sorsoló rész: SZERENCSEKERÉK és a kihúzott szelvény (NÉV NÉLKÜL) */}
          <div className="my-auto py-3">
            {drawError && (
              <div className="alert alert-danger py-2 mb-3 text-center">
                <i className="bi bi-exclamation-triangle-fill me-2" />
                {drawError}
              </div>
            )}

            <div className="row g-4 align-items-center justify-content-center">
              {/* Bal oszlop: A Szerencsekerék */}
              <div className="col-12 col-lg-6 d-flex flex-column align-items-center justify-content-center">
                <TombolaWheel
                  ref={fullscreenWheelRef}
                  candidateTickets={eligibleTickets}
                  size={420}
                />
              </div>

              {/* Jobb oszlop: Sorsolás gomb & Amelyiken megáll, azt a szelvényt jeleníti meg! (NÉV NÉLKÜL) */}
              <div className="col-12 col-lg-6 text-center text-lg-start d-flex flex-column align-items-center align-items-lg-start">
                <div className="mb-4">
                  <button
                    type="button"
                    className="btn btn-warning btn-lg px-5 py-3 fw-bolder fs-4 text-dark shadow-lg rounded-pill"
                    onClick={handleStartDraw}
                    disabled={isDrawing || eligibleTickets.length === 0}
                    style={{ minWidth: '280px' }}
                  >
                    <i className={`bi ${isDrawing ? 'bi-arrow-repeat spin-icon' : 'bi-dice-5-fill'} me-2`} />
                    {isDrawing ? 'Szerencsekerék pörög...' : 'Sorsolás'}
                  </button>
                </div>

                {/* Kihúzott szelvény megjelenítése (NÉV NÉLKÜL!) */}
                {latestWinner ? (
                  <div
                    className="p-3 w-100 shadow-lg"
                    style={{
                      maxWidth: '460px',
                      background: 'rgba(15, 23, 42, 0.85)',
                      border: '2px solid rgba(253, 231, 76, 0.6)',
                      borderRadius: '1rem',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="badge bg-success fs-6 px-3 py-1 fw-bold">
                        <i className="bi bi-trophy-fill me-1" />
                        Kihúzott nyertes szelvény
                      </span>
                      <span className="font-monospace fs-5 fw-bold text-warning">{latestWinner.code}</span>
                    </div>

                    <div className="my-2">
                      <TombolaTicket ticket={latestWinner} isWinner={true} />
                    </div>
                  </div>
                ) : (
                  <div
                    className="p-4 text-center w-100"
                    style={{
                      maxWidth: '460px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '2px dashed rgba(255, 255, 255, 0.2)',
                      borderRadius: '1rem',
                      color: '#94a3b8'
                    }}
                  >
                    <i className="bi bi-ticket-perforated fs-1 d-block mb-2 text-warning" />
                    <div className="fw-bold fs-5 text-white mb-1">
                      {isDrawing ? 'Pörög a szerencsekerék...' : 'Sorsolásra készen'}
                    </div>
                    <div className="small">
                      {isDrawing
                        ? 'A kerék megállása után azonnal megjelenik a nyertes szelvény.'
                        : 'Kattints a fenti Sorsolás gombra a kerék megpörgetéséhez!'}
                    </div>
                  </div>
                )}

                {eligibleTickets.length === 0 && tickets.length > 0 && (
                  <p className="small mt-3 fw-bold text-warning">
                    Minden szelvény tulajdonosa elérte a 2 nyeremény felső korlátját.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Alsó rész: Az előző két szelvény kicsiben (NÉV NÉLKÜL!) */}
          <div
            className="pt-3"
            style={{
              borderTop: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(3, 11, 22, 0.6)',
              borderRadius: '0.75rem',
              padding: '1rem 1.5rem'
            }}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="small fw-bold text-uppercase tracking-wider text-light">
                <i className="bi bi-clock-history me-1" />
                Előző kihúzott szelvények
              </div>
              <div className="small" style={{ color: '#94a3b8' }}>
                {previousWinners.length === 0
                  ? 'Még nincs korábbi kihúzott szelvény'
                  : `Legutóbbi ${previousWinners.length} szelvény`}
              </div>
            </div>

            {previousWinners.length === 0 ? (
              <div className="p-3 text-center small" style={{ color: '#64748b' }}>
                A következő húzások után itt jelennek meg az előző szelvények kis méretben.
              </div>
            ) : (
              <div
                ref={scrollContainerRef}
                className="d-flex gap-3 align-items-center py-2 px-1 no-scrollbar"
                onMouseEnter={() => { isHoveredRef.current = true }}
                onMouseLeave={() => { isHoveredRef.current = false }}
                onTouchStart={() => { isHoveredRef.current = true }}
                onTouchEnd={() => { isHoveredRef.current = false }}
                style={{
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  whiteSpace: 'nowrap',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                {(previousWinners.length > 2
                  ? [...previousWinners, ...previousWinners]
                  : previousWinners
                ).map((pw, idx) => (
                  <div
                    key={`prev-${pw.code}-${idx}`}
                    style={{
                      width: '280px',
                      minWidth: '280px',
                      flexShrink: 0
                    }}
                  >
                    <TombolaTicket ticket={pw} compact={true} isWinner={true} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
