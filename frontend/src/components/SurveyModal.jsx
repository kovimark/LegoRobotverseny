import React, { useState, useEffect } from 'react';
import './SurveyModal.css';
import { submitSurveyAndAward, hasUserSubmittedSurvey } from '../services/tombolaApi';
import TombolaTicket from './TombolaTicket';

// Minimális kötelező kitöltési idő: 120 másodperc (2 perc)
const MIN_FILL_TIME_SECONDS = 120;

const QUESTIONS = [
  {
    id: 'q1',
    title: '1. Kérdés (Lorem ipsum)',
    text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua?'
  },
  {
    id: 'q2',
    title: '2. Kérdés (Lorem ipsum)',
    text: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat?'
  },
  {
    id: 'q3',
    title: '3. Kérdés (Lorem ipsum)',
    text: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur?'
  },
  {
    id: 'q4',
    title: '4. Kérdés (Lorem ipsum)',
    text: 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum?'
  }
];

export default function SurveyModal({ isOpen, onClose, user, team, onTicketAwarded }) {
  const [secondsRemaining, setSecondsRemaining] = useState(MIN_FILL_TIME_SECONDS);
  const [ratings, setRatings] = useState({ q1: 0, q2: 0, q3: 0, q4: 0 });
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [awardedTicket, setAwardedTicket] = useState(null);

  const userEmail = user?.email || team?.teamMember1Email || '';
  const alreadySubmitted = userEmail ? hasUserSubmittedSurvey(userEmail) : false;

  useEffect(() => {
    if (!isOpen || alreadySubmitted) return;

    setSecondsRemaining(MIN_FILL_TIME_SECONDS);
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, alreadySubmitted]);

  if (!isOpen) return null;

  const handleRatingChange = (qId, value) => {
    setRatings((prev) => ({ ...prev, [qId]: value }));
  };

  const isFormComplete = Object.values(ratings).every((val) => val > 0);
  const canSubmit = !alreadySubmitted && isFormComplete && secondsRemaining === 0 && !submitting;

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setSubmitting(true);
      setError('');
      const ticket = await submitSurveyAndAward({
        email: userEmail,
        name: user?.displayName || team?.teamMember1Name || 'Versenyző',
        teamName: team?.teamName || '',
        ratings,
        feedback: feedbackText
      });

      setAwardedTicket(ticket);
      if (onTicketAwarded) onTicketAwarded(ticket);
    } catch (err) {
      setError(err.message || 'Hiba történt a kérdőív beküldésekor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal fade show d-block survey-modal-overlay" tabIndex="-1" role="dialog" aria-modal="true">
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content shadow-lg border-0 rounded-4">
          <div className="modal-header bg-light border-bottom py-3">
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-primary p-2 fs-6">
                <i className="bi bi-ui-checks me-1" />
                Visszajelző Kérdőív
              </span>
              <span className="small text-muted fw-bold">1 Garantált Tombolaszelvényért</span>
            </div>
            <button type="button" className="btn-close" aria-label="Bezárás" onClick={onClose} />
          </div>

          <div className="modal-body p-4">
            {awardedTicket ? (
              <div className="text-center py-4">
                <div className="mb-3">
                  <i className="bi bi-award text-success display-3" />
                </div>
                <h3 className="h4 fw-bold mb-2">Köszönjük az értékes visszajelzésedet!</h3>
                <p className="text-muted mb-4">
                  A válaszaid sikeresen rögzítésre kerültek. Cserébe jóváírtuk a számodra kiállított tombolaszelvényt:
                </p>
                <div className="d-flex justify-content-center mb-4">
                  <div style={{ maxWidth: '420px', width: '100%' }}>
                    <TombolaTicket ticket={awardedTicket} />
                  </div>
                </div>
                <button type="button" className="btn btn-primary px-4 py-2 fw-bold" onClick={onClose}>
                  Megértettem, irány a tomboláim
                </button>
              </div>
            ) : alreadySubmitted ? (
              <div className="alert alert-info d-flex align-items-center gap-2 my-3">
                <i className="bi bi-info-circle-fill fs-4" />
                <div>
                  <strong>Már beküldted a kérdőívet!</strong>
                  <div className="small">Ezzel az email címmel ({userEmail}) korábban már megkaptad a kérdőívért járó tombolaszelvényedet. Köszönjük a segítségedet!</div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {/* Időkorlát figyelmeztető doboz */}
                <div className={`alert ${secondsRemaining > 0 ? 'alert-warning' : 'alert-success'} d-flex align-items-center justify-content-between p-3 rounded-3 mb-4`}>
                  <div className="d-flex align-items-center gap-2">
                    <i className={`bi ${secondsRemaining > 0 ? 'bi-stopwatch-fill text-warning-emphasis' : 'bi-check-circle-fill text-success'} fs-4`} />
                    <div className="small">
                      {secondsRemaining > 0 ? (
                        <>
                          <strong>Kérjük, szánj időt a kérdések átgondolására!</strong>
                          <div>Minimális kitöltési idő: 2,5 perc. A beküldés aktiválódik hamarosan.</div>
                        </>
                      ) : (
                        <>
                          <strong>Köszönjük a figyelmes kitöltést!</strong>
                          <div>A minimális időkorlát lejárt, a kérdőív beküldhető a válaszok megadása után.</div>
                        </>
                      )}
                    </div>
                  </div>
                  {secondsRemaining > 0 && (
                    <span className="badge bg-warning text-dark fs-6 px-3 py-2 border">
                      {formatTime(secondsRemaining)}
                    </span>
                  )}
                </div>

                {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

                {/* Kérdések listája */}
                <div className="d-flex flex-column gap-3 mb-4">
                  {QUESTIONS.map((q) => (
                    <div className="p-3 bg-light rounded-3 border" key={q.id}>
                      <div className="fw-bold mb-1 text-dark">{q.title}</div>
                      <p className="small text-muted mb-2">{q.text}</p>
                      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 pt-1 border-top">
                        <span className="small text-muted">1 = Egyáltalán nem</span>
                        <div className="d-flex gap-2">
                          {[1, 2, 3, 4, 5].map((score) => (
                            <button
                              type="button"
                              key={score}
                              className={`btn btn-sm ${ratings[q.id] === score ? 'btn-primary' : 'btn-outline-secondary'} rating-score-btn`}
                              onClick={() => handleRatingChange(q.id, score)}
                            >
                              {score}
                            </button>
                          ))}
                        </div>
                        <span className="small text-muted">5 = Teljes mértékben</span>
                      </div>
                    </div>
                  ))}

                  {/* Szöveges kifejtős kérdés */}
                  <div className="p-3 bg-light rounded-3 border">
                    <label htmlFor="surveyFeedback" className="fw-bold mb-1 text-dark">
                      6. Észrevétel, ötlet a következő versenyhez (opcionális)
                    </label>
                    <textarea
                      id="surveyFeedback"
                      className="form-control mt-1"
                      rows="3"
                      placeholder="Írd meg nekünk, mi tetszett a legjobban, vagy mit fejlesztenél jövőre..."
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                    />
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center border-top pt-3">
                  <div className="small text-muted">
                    {!isFormComplete
                      ? 'Kérjük, értékeld mind az 5 kérdést a beküldéshez.'
                      : secondsRemaining > 0
                        ? `Hátralévő várakozási idő: ${formatTime(secondsRemaining)}`
                        : 'Minden mező kitöltve, beküldésre kész!'}
                  </div>
                  <button
                    type="submit"
                    className="btn btn-success px-4 py-2 fw-bold"
                    disabled={!canSubmit}
                  >
                    {submitting ? 'Beküldés...' : 'Kérdőív beküldése és Tombola átvétele'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
