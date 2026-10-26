import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchTicketsFromBackend,
  awardTicket,
  deleteTombolaTicket,
  TOMBOLA_CHANGED_EVENT
} from '../services/tombolaApi';
import TombolaTicket from '../components/TombolaTicket';
import FloatingFeedback from '../components/FloatingFeedback';

export default function HelperTombolaPage({ user, userRole }) {
  const [teams, setTeams] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('competitors'); // 'competitors' | 'tickets'
  const [feedback, setFeedback] = useState(null);
  
  // Award Modal state
  const [actionModal, setActionModal] = useState(null); // { competitor }
  const [submitting, setSubmitting] = useState(false);

  // Delete Modal state
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Manual Direct Award Modal state
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualEmail, setManualEmail] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualTeam, setManualTeam] = useState('');
  const [manualReason, setManualReason] = useState('Kipróbált egy állomást');
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [teamsRes, ticketsData] = await Promise.all([
        fetch('https://brickathlon.runasp.net/api/Teams').then((r) => r.ok ? r.json() : []).catch(() => []),
        fetchTicketsFromBackend()
      ]);
      setTeams(Array.isArray(teamsRes) ? teamsRes : []);
      setTickets(Array.isArray(ticketsData) ? ticketsData : []);
    } catch (err) {
      setFeedback({ type: 'danger', text: `Hiba az adatok betöltésekor: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener(TOMBOLA_CHANGED_EVENT, loadData);
    return () => window.removeEventListener(TOMBOLA_CHANGED_EVENT, loadData);
  }, []);

  // Laposított versenyzői lista készítése az összes csapatból
  const competitorsList = useMemo(() => {
    const list = [];
    const seenEmails = new Set();

    teams.forEach((team) => {
      // 1. team.members tömb
      if (Array.isArray(team.members) && team.members.length > 0) {
        team.members.forEach((m, idx) => {
          if (m && m.email) {
            const cleanEmail = m.email.trim().toLowerCase();
            if (!seenEmails.has(cleanEmail)) {
              seenEmails.add(cleanEmail);
              list.push({
                id: `comp-${team.id}-${idx}`,
                name: m.name || `Versenyző #${idx + 1}`,
                email: m.email.trim(),
                className: m.className || '',
                teamName: team.teamName || '',
                teamId: team.id,
                schoolName: team.schoolName || '',
                category: team.category
              });
            }
          }
        });
      }

      // 2. Legacy mezők (teamMember1Email, teamMember2Email)
      if (team.teamMember1Email) {
        const cleanEmail = team.teamMember1Email.trim().toLowerCase();
        if (!seenEmails.has(cleanEmail)) {
          seenEmails.add(cleanEmail);
          list.push({
            id: `comp-m1-${team.id}`,
            name: team.teamMember1Name || '1. Csapattag',
            email: team.teamMember1Email.trim(),
            className: team.teamMember1Class || '',
            teamName: team.teamName || '',
            teamId: team.id,
            schoolName: team.schoolName || '',
            category: team.category
          });
        }
      }

      if (team.teamMember2Email) {
        const cleanEmail = team.teamMember2Email.trim().toLowerCase();
        if (!seenEmails.has(cleanEmail)) {
          seenEmails.add(cleanEmail);
          list.push({
            id: `comp-m2-${team.id}`,
            name: team.teamMember2Name || '2. Csapattag',
            email: team.teamMember2Email.trim(),
            className: team.teamMember2Class || '',
            teamName: team.teamName || '',
            teamId: team.id,
            schoolName: team.schoolName || '',
            category: team.category
          });
        }
      }

      // 3. Felkészítő / Kapcsolattartó
      if (team.coachEmail) {
        const cleanEmail = team.coachEmail.trim().toLowerCase();
        if (!seenEmails.has(cleanEmail)) {
          seenEmails.add(cleanEmail);
          list.push({
            id: `comp-coach-${team.id}`,
            name: team.coachName || 'Felkészítő tanár',
            email: team.coachEmail.trim(),
            className: 'Felkészítő',
            teamName: team.teamName || '',
            teamId: team.id,
            schoolName: team.schoolName || '',
            category: team.category
          });
        }
      }
    });

    return list.sort((a, b) => a.name.localeCompare(b.name, 'hu'));
  }, [teams]);

  // Keresési szűrés a versenyzőkre
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredCompetitors = useMemo(() => {
    if (!normalizedSearch) return competitorsList;
    return competitorsList.filter((c) => (
      c.name.toLowerCase().includes(normalizedSearch) ||
      c.email.toLowerCase().includes(normalizedSearch) ||
      c.teamName.toLowerCase().includes(normalizedSearch) ||
      c.schoolName.toLowerCase().includes(normalizedSearch)
    ));
  }, [competitorsList, normalizedSearch]);

  // Keresési szűrés a kiadott szelvényekre
  const filteredTickets = useMemo(() => {
    if (!normalizedSearch) return tickets;
    return tickets.filter((t) => (
      (t.code && t.code.toLowerCase().includes(normalizedSearch)) ||
      (t.name && t.name.toLowerCase().includes(normalizedSearch)) ||
      (t.email && t.email.toLowerCase().includes(normalizedSearch)) ||
      (t.teamName && t.teamName.toLowerCase().includes(normalizedSearch))
    ));
  }, [tickets, normalizedSearch]);

  const handleOpenAwardModal = (competitor) => {
    setActionModal({ competitor });
  };

  const handleConfirmAward = async () => {
    if (!actionModal) return;
    const { competitor } = actionModal;

    try {
      setSubmitting(true);
      const newTicket = await awardTicket({
        teamId: competitor.teamId,
        teamName: competitor.teamName,
        recipientName: competitor.name,
        userEmail: competitor.email,
        reasonType: 'activity',
        reasonLabel: 'Kiadott tombola',
        awardedBy: userRole === 'admin' ? 'Adminisztrátor' : 'Segítő'
      });

      setFeedback({
        type: 'success',
        text: `Sikeresen jóváírva ${competitor.name} (${competitor.teamName}) számára! Új tombolakód: ${newTicket.code}`
      });
      setActionModal(null);
      await loadData();
    } catch (err) {
      setFeedback({ type: 'danger', text: `Hiba a tombola kiosztásakor: ${err.message}` });
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualAward = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = manualEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setFeedback({ type: 'danger', text: 'Kérlek add meg a fogadó fél e-mail-címét.' });
      return;
    }
    try {
      setManualSubmitting(true);
      const newTicket = await awardTicket({
        userEmail: cleanEmail,
        recipientName: manualName.trim() || cleanEmail,
        teamName: manualTeam.trim() || '',
        reasonType: 'manual_issue',
        reasonLabel: manualReason.trim() || 'Kipróbált egy állomást',
        awardedBy: userRole === 'admin' ? 'Adminisztrátor' : 'Segítő'
      });
      setFeedback({
        type: 'success',
        text: `Sikeresen kiadva a tombolajegy: ${cleanEmail}! Szelvénykód: ${newTicket.code}`
      });
      setShowManualModal(false);
      setManualEmail('');
      setManualName('');
      setManualTeam('');
      setManualReason('Kipróbált egy állomást');
      await loadData();
    } catch (err) {
      setFeedback({ type: 'danger', text: `Hiba a tombola kiadásakor: ${err.message}` });
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!ticketToDelete) return;
    try {
      setDeleting(true);
      await deleteTombolaTicket(ticketToDelete.code);
      setFeedback({
        type: 'success',
        text: `A(z) ${ticketToDelete.code} sorszámú tombolajegy sikeresen visszavonva.`
      });
      setTicketToDelete(null);
      await loadData();
    } catch (err) {
      setFeedback({ type: 'danger', text: `Hiba a törlés során: ${err.message}` });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="container py-4 my-2">
      <FloatingFeedback message={feedback} onClose={() => setFeedback(null)} />

      {/* Fejléc */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <span
            className="badge px-3 py-1 fs-6 mb-2 fw-bold"
            style={{
              background: userRole === 'admin' ? 'var(--red)' : 'var(--yellow)',
              color: userRole === 'admin' ? 'var(--white)' : 'var(--black)',
              border: '2px solid var(--black)',
              boxShadow: '0.15rem 0.15rem 0 var(--black)'
            }}
          >
            <i className={`bi ${userRole === 'admin' ? 'bi-shield-lock-fill' : 'bi-person-badge-fill'} me-1`} />
            {userRole === 'admin' ? 'Adminisztrátori és Segítői Jegykiadás' : 'Segítői Munkaterület'}
          </span>
          <h1 className="h3 fw-bold mb-1">Tombola Kiadás és Kezelés</h1>
          <p className="text-muted small mb-0">
            Itt látható az összes regisztrált versenyző. Kereshetsz névre, csapatra vagy e-mailre, és azonnal jóváírhatsz tombolát a kipróbált állomásokért, vagy kiadhatsz jegyet tetszőleges e-mail-címre.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm fw-bold shadow-sm"
            onClick={() => setShowManualModal(true)}
          >
            <i className="bi bi-plus-circle me-1" />
            Közvetlen jegykiadás e-mailre
          </button>
          <Link to="/admin/tombola" className="btn btn-outline-primary btn-sm fw-bold">
            <i className="bi bi-trophy me-1" />
            Tombolahúzás felület
          </Link>
        </div>
      </div>

      {/* Gyors statisztika */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-md-4">
          <div className="p-3 bg-white" style={{ border: '2px solid var(--black)', borderRadius: '0.5rem', boxShadow: '0.35rem 0.35rem 0 var(--black)' }}>
            <div className="small fw-bold text-uppercase" style={{ color: '#4b5563' }}>Kiadott tombolák (Backend)</div>
            <div className="display-6 fw-bold mt-1" style={{ color: 'var(--orange)' }}>{tickets.length} db</div>
          </div>
        </div>
        <div className="col-sm-6 col-md-4">
          <div className="p-3 bg-white" style={{ border: '2px solid var(--black)', borderRadius: '0.5rem', boxShadow: '0.35rem 0.35rem 0 var(--black)' }}>
            <div className="small fw-bold text-uppercase" style={{ color: '#4b5563' }}>Regisztrált versenyzők</div>
            <div className="display-6 fw-bold mt-1" style={{ color: 'var(--black)' }}>{competitorsList.length} fő</div>
          </div>
        </div>
        <div className="col-sm-6 col-md-4">
          <div className="p-3 bg-white" style={{ border: '2px solid var(--black)', borderRadius: '0.5rem', boxShadow: '0.35rem 0.35rem 0 var(--black)' }}>
            <div className="small fw-bold text-uppercase" style={{ color: '#4b5563' }}>Kihúzott nyertesek</div>
            <div className="display-6 fw-bold mt-1" style={{ color: 'var(--green)' }}>
              {tickets.filter((t) => t.isWinner || t.isPulledOut === 1).length} db
            </div>
          </div>
        </div>
      </div>

      {/* Fülek: Versenyzők / Kiadott jegyek */}
      <div className="d-flex gap-2 border-bottom mb-3 pb-2">
        <button
          type="button"
          className={`btn ${activeTab === 'competitors' ? 'btn-primary' : 'btn-outline-secondary'} fw-bold btn-sm`}
          onClick={() => setActiveTab('competitors')}
        >
          <i className="bi bi-people-fill me-1" />
          Versenyzők és tombola kiadás ({filteredCompetitors.length})
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'tickets' ? 'btn-primary' : 'btn-outline-secondary'} fw-bold btn-sm`}
          onClick={() => setActiveTab('tickets')}
        >
          <i className="bi bi-ticket-perforated-fill me-1" />
          Összes kiadott jegy ({filteredTickets.length})
        </button>
      </div>

      {/* Kereső sáv */}
      <div className="p-3 bg-white mb-4" style={{ border: '2px solid var(--black)', borderRadius: '0.5rem', boxShadow: '0.35rem 0.35rem 0 var(--black)' }}>
        <div className="position-relative">
          <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
          <input
            type="text"
            className="form-control form-control-lg ps-5"
            placeholder={activeTab === 'competitors' ? 'Keresés versenyző neve, email, csapatnév vagy iskola alapján...' : 'Keresés tombolakód (pl. PK-35), név vagy email alapján...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 1. FÜL: Versenyzők listája és közvetlen tombolaadás */}
      {activeTab === 'competitors' && (
        <div className="p-4 bg-white mb-4" style={{ border: '2px solid var(--black)', borderRadius: '0.5rem', boxShadow: '0.45rem 0.45rem 0 var(--black)' }}>
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h2 className="h5 fw-bold mb-0">Versenyzők ({filteredCompetitors.length})</h2>
            {loading && <span className="small text-muted"><i className="bi bi-arrow-repeat spin me-1" />Betöltés...</span>}
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col">Versenyző neve és email</th>
                  <th scope="col">Csapat és iskola</th>
                  <th scope="col" className="text-center">Eddigi tombolák</th>
                  <th scope="col" className="text-end" style={{ minWidth: '240px' }}>Tombola jóváírása</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompetitors.map((comp) => {
                  const compTickets = tickets.filter((t) => t.email && t.email.toLowerCase() === comp.email.toLowerCase());
                  const winCount = compTickets.filter((t) => t.isWinner || t.isPulledOut === 1).length;

                  return (
                    <tr key={comp.id}>
                      <td>
                        <div className="fw-bold text-dark">{comp.name}</div>
                        <div className="small text-muted">
                          <i className="bi bi-envelope me-1" />
                          {comp.email}
                        </div>
                      </td>
                      <td>
                        <div className="fw-semibold text-primary">{comp.teamName}</div>
                        <div className="small text-muted">{comp.schoolName || 'Nincs iskola'}</div>
                      </td>
                      <td className="text-center">
                        <span className={`badge ${compTickets.length > 0 ? 'bg-primary' : 'bg-light text-muted border'} px-2 py-1 fs-6`}>
                          {compTickets.length} db
                        </span>
                        {winCount > 0 && (
                          <span className="badge bg-warning text-dark ms-1 small">
                            <i className="bi bi-trophy-fill me-1" />
                            {winCount} nyert
                          </span>
                        )}
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary fw-bold"
                          onClick={() => handleOpenAwardModal(comp)}
                        >
                          <i className="bi bi-ticket-perforated-fill me-1" />
                          Tombola adása
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. FÜL: Összes kiadott jegy */}
      {activeTab === 'tickets' && (
        <div className="p-4 bg-white mb-4" style={{ border: '2px solid var(--black)', borderRadius: '0.5rem', boxShadow: '0.45rem 0.45rem 0 var(--black)' }}>
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h2 className="h5 fw-bold mb-0">Kiadott szelvények a backend adatbázisban ({filteredTickets.length})</h2>
            {loading && <span className="small text-muted"><i className="bi bi-arrow-repeat spin me-1" />Frissítés...</span>}
          </div>

          {filteredTickets.length === 0 ? (
            <div className="alert alert-secondary mb-0">Nem található a keresésnek megfelelő tombolajegy.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th scope="col" style={{ width: '130px' }}>Kód</th>
                    <th scope="col">Versenyző</th>
                    <th scope="col">Csapat</th>
                    <th scope="col">Email cím</th>
                    <th scope="col" className="text-center">Állapot</th>
                    <th scope="col" className="text-end">Művelet</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((t) => {
                    const isWinner = t.isWinner || Number(t.isPulledOut) === 1;
                    return (
                      <tr key={t.code}>
                        <td>
                          <span className="badge bg-dark fs-6 font-monospace px-2 py-1">
                            {t.code}
                          </span>
                        </td>
                        <td className="fw-semibold">{t.recipientName || t.name || '–'}</td>
                        <td>{t.teamName || '–'}</td>
                        <td className="text-muted small">{t.email || t.userEmail || '–'}</td>
                        <td className="text-center">
                          {isWinner ? (
                            <span className="badge bg-warning text-dark px-2 py-1 fw-bold">
                              <i className="bi bi-trophy-fill me-1" />
                              Nyertes (Kihúzva)
                            </span>
                          ) : (
                            <span className="badge bg-light text-muted border px-2 py-1">
                              <i className="bi bi-hourglass-split me-1 text-primary" />
                              Játékban van
                            </span>
                          )}
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => setTicketToDelete(t)}
                            title="Tombola visszavonása / törlése"
                          >
                            <i className="bi bi-trash me-1" />
                            Törlés
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Nemrég kiadott szelvények kártyás előnézete */}
      <div className="p-4 bg-white mb-4" style={{ border: '2px solid var(--black)', borderRadius: '0.5rem', boxShadow: '0.45rem 0.45rem 0 var(--black)' }}>
        <h2 className="h5 fw-bold mb-3">Legutóbbi szelvények kártyás nézete</h2>
        {tickets.length === 0 ? (
          <div className="alert alert-secondary mb-0">Még nincs kiadott tombolaszelvény az adatbázisban.</div>
        ) : (
          <div className="row g-3">
            {tickets.slice(0, 6).map((ticket) => (
              <div className="col-12 col-md-6 col-lg-4" key={ticket.code || ticket.id}>
                <TombolaTicket ticket={ticket} compact />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Megerősítő / Tevékenység beíró Modal */}
      {actionModal && (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-4">
              <div className="modal-header bg-light border-bottom">
                <h3 className="modal-title fs-5 fw-bold">
                  <i className="bi bi-ticket-perforated-fill text-primary me-2" />
                  Tombola kiadása versenyzőnek
                </h3>
                <button type="button" className="btn-close" onClick={() => setActionModal(null)} />
              </div>
              <div className="modal-body p-4">
                <p className="mb-3 text-dark">
                  Biztosan kiadsz egy hivatalos tombolaszelvényt a következő versenyzőnek?
                </p>
                <div className="alert alert-light border p-3 rounded-3 mb-0">
                  <div className="fw-bold fs-6 text-dark">{actionModal.competitor.name}</div>
                  <div className="small text-muted">{actionModal.competitor.teamName} · {actionModal.competitor.schoolName}</div>
                  <div className="small text-secondary mt-1">
                    <i className="bi bi-envelope me-1" />
                    <strong>Email:</strong> {actionModal.competitor.email}
                  </div>
                </div>
              </div>
              <div className="modal-footer bg-light border-top">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setActionModal(null)} disabled={submitting}>
                  Mégse
                </button>
                <button type="button" className="btn btn-primary fw-bold px-3" onClick={handleConfirmAward} disabled={submitting}>
                  {submitting ? 'Rögzítés a szerveren...' : 'Tombola rögzítése a backendben'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Közvetlen jegykiadás Modal */}
      {showManualModal && (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-4">
              <form onSubmit={handleManualAward}>
                <div className="modal-header bg-primary text-white border-bottom">
                  <h3 className="modal-title fs-5 fw-bold mb-0">
                    <i className="bi bi-ticket-perforated-fill me-2" />
                    Közvetlen jegykiadás e-mailre
                  </h3>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowManualModal(false)} />
                </div>
                <div className="modal-body p-4">
                  <p className="text-muted small mb-3">
                    Bármilyen e-mail-címre kiállíthatsz egy új tombolajegyet. A rendszer azonnal rögzíti a backendben, és legenerálja a kódot.
                  </p>
                  <div className="mb-3">
                    <label className="form-label fw-semibold" htmlFor="manualAwardEmail">
                      Címzett e-mail-címe <span className="text-danger">*</span>
                    </label>
                    <input
                      id="manualAwardEmail"
                      type="email"
                      required
                      className="form-control"
                      placeholder="pelda@iskola.hu"
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                    />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold" htmlFor="manualAwardName">
                        Név (opcionális)
                      </label>
                      <input
                        id="manualAwardName"
                        type="text"
                        className="form-control"
                        placeholder="pl. Kis János"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold" htmlFor="manualAwardTeam">
                        Csapatnév (opcionális)
                      </label>
                      <input
                        id="manualAwardTeam"
                        type="text"
                        className="form-control"
                        placeholder="pl. RoboHarcosok"
                        value={manualTeam}
                        onChange={(e) => setManualTeam(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold" htmlFor="manualAwardReason">
                      Megszerzés oka / Tevékenység
                    </label>
                    <input
                      id="manualAwardReason"
                      type="text"
                      className="form-control"
                      placeholder="pl. Kipróbált egy állomást, Különdíj..."
                      value={manualReason}
                      onChange={(e) => setManualReason(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer bg-light border-top">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowManualModal(false)}
                    disabled={manualSubmitting}
                  >
                    Mégse
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary fw-bold px-3"
                    disabled={manualSubmitting || !manualEmail.trim()}
                  >
                    {manualSubmitting ? 'Rögzítés folyamatban...' : 'Tombolajegy kiadása'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Törlés megerősítő Modal */}
      {ticketToDelete && (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-4">
              <div className="modal-header bg-danger-subtle text-danger border-bottom">
                <h3 className="modal-title fs-5 fw-bold">
                  <i className="bi bi-exclamation-triangle-fill me-2" />
                  Tombola visszavonása
                </h3>
                <button type="button" className="btn-close" onClick={() => setTicketToDelete(null)} />
              </div>
              <div className="modal-body p-4">
                <p className="mb-2">
                  Biztosan törölni szeretnéd a következő tombolaszelvényt az adatbázisból?
                </p>
                <div className="alert alert-light border p-3 rounded-3 mb-3">
                  <div className="fw-bold fs-6 text-dark">Kód: {ticketToDelete.code}</div>
                  <div className="small text-muted">Versenyző: {ticketToDelete.recipientName || ticketToDelete.name}</div>
                  <div className="small text-muted">Email: {ticketToDelete.email || ticketToDelete.userEmail}</div>
                </div>
                <div className="alert alert-warning py-2 small mb-0">
                  <i className="bi bi-info-circle me-1" />
                  Ez a művelet véglegesen törli a szelvényt a backendről (`DELETE /api/Lottery/${ticketToDelete.code}`).
                </div>
              </div>
              <div className="modal-footer bg-light border-top">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setTicketToDelete(null)} disabled={deleting}>
                  Mégse
                </button>
                <button type="button" className="btn btn-danger fw-bold px-3" onClick={handleConfirmDelete} disabled={deleting}>
                  {deleting ? 'Törlés folyamatban...' : 'Törlés megerősítése'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
