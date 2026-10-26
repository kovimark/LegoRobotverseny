import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../components/SurveyModal.css';
import { submitSurveyAndAward, hasUserSubmittedSurvey } from '../services/tombolaApi';
import TombolaTicket from '../components/TombolaTicket';

// Minimális kötelező kitöltési idő: 120 másodperc (2 perc)
const MIN_FILL_TIME_SECONDS = 120;

const QUESTIONS = [
  {
    id: 'q1',
    title: 'Mennyire volt egyértelmű a szabálykönyv?'
  },
  {
    id: 'q2',
    title: 'Mennyire volt egyértelmű az időbeosztás?'
  },
  {
    id: 'q3',
    title: 'Mennyire vagy elégedett a szervezéssel?'
  },
  {
    id: 'q4',
    title: 'Mennyire vagy elégedett a négy versenyszámmal?'
  },
  {
    id: 'q5',
    title: 'Mennyire ajánlanád másnak a Brickathlont?'
  }
];

export default function PostCompetitionSurveyPage({ user }) {
  const [userEmail, setUserEmail] = useState(user?.email || '');
  const [userName, setUserName] = useState(user?.displayName || '');
  const [userTeam, setUserTeam] = useState('');
  const [secondsRemaining, setSecondsRemaining] = useState(MIN_FILL_TIME_SECONDS);
  const [ratings, setRatings] = useState({ q1: 0, q2: 0, q3: 0, q4: 0, q5: 0 });
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [awardedTicket, setAwardedTicket] = useState(null);

  useEffect(() => {
    if (user?.email) {
      setUserEmail(user.email);
    }
  }, [user]);

  const cleanEmail = userEmail.trim().toLowerCase();
  const alreadySubmitted = cleanEmail ? hasUserSubmittedSurvey(cleanEmail) : false;

  useEffect(() => {
    if (alreadySubmitted) return;

    setSecondsRemaining(MIN_FILL_TIME_SECONDS);
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [alreadySubmitted]);

  const handleRatingChange = (qId, value) => {
    setRatings((prev) => ({ ...prev, [qId]: value }));
  };

  const isFormComplete = Object.values(ratings).every((val) => val > 0) && cleanEmail.length > 0;
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
        email: cleanEmail,
        name: userName.trim() || cleanEmail,
        teamName: userTeam.trim() || undefined,
        ratings,
        feedback: feedbackText.trim() || undefined
      });

      setAwardedTicket(ticket);
    } catch (err) {
      setError(err.message || 'Hiba történt a kérdőív beküldésekor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="container py-4 my-3" style={{ maxWidth: '820px' }}>
      <div className="modal-content shadow-lg border-0 rounded-4 overflow-hidden bg-white text-dark">
        {/* Modál stílusú fejléc */}
        <div className="modal-header bg-light border-bottom py-3 px-4">
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-primary p-2 fs-6">
              <i className="bi bi-ui-checks me-1" />
              Visszajelző Kérdőív
            </span>
            <span className="small text-muted fw-bold">1 Garantált Tombolaszelvényért</span>
          </div>
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
              <div className="d-flex justify-content-center gap-2">
                <Link to="/" className="btn btn-primary px-4 py-2 fw-bold">
                  Vissza a főoldalra
                </Link>
                {user && (
                  <Link to="/sajat-csapataim" className="btn btn-outline-secondary px-4 py-2">
                    Tomboláim megtekintése
                  </Link>
                )}
              </div>
            </div>
          ) : alreadySubmitted ? (
            <div>
              <div className="alert alert-info d-flex align-items-center gap-2 my-3">
                <i className="bi bi-info-circle-fill fs-4" />
                <div>
                  <strong>Már beküldted a kérdőívet!</strong>
                  <div className="small">
                    Ezzel az e-mail-címmel ({cleanEmail}) korábban már megkaptad a kérdőívért járó tombolaszelvényedet. Köszönjük a segítségedet!
                  </div>
                </div>
              </div>
              <div className="text-center mt-3">
                <Link to="/" className="btn btn-primary px-4 py-2">
                  Vissza a főoldalra
                </Link>
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
                        <div>Minimális kitöltési idő: 2 perc. A beküldés aktiválódik hamarosan.</div>
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

              {/* Kitöltő e-mail-címe és adatai */}
              <div className="p-3 bg-light rounded-3 border mb-4">
                <div className="fw-bold mb-2 text-dark">
                  <i className="bi bi-person-fill text-primary me-1" />
                  Kitöltő adatai (a tombolajegyhez)
                </div>
                <div className="row g-2">
                  <div className="col-12 col-md-6">
                    <label className="form-label small text-muted mb-1" htmlFor="surveyEmail">
                      E-mail-cím <span className="text-danger">*</span>
                    </label>
                    <input
                      id="surveyEmail"
                      type="email"
                      required
                      className="form-control form-control-sm"
                      placeholder="pelda@iskola.hu"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      disabled={Boolean(user?.email)}
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label small text-muted mb-1" htmlFor="surveyName">
                      Név (opcionális)
                    </label>
                    <input
                      id="surveyName"
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="pl. Kis János"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small text-muted mb-1" htmlFor="surveyTeam">
                      Csapatnév (opcionális)
                    </label>
                    <input
                      id="surveyTeam"
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="pl. RoboHarcosok"
                      value={userTeam}
                      onChange={(e) => setUserTeam(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Kérdések listája */}
              <div className="d-flex flex-column gap-3 mb-4">
                {QUESTIONS.map((q, idx) => (
                  <div className="p-3 bg-light rounded-3 border" key={q.id}>
                    <div className="fw-bold mb-1 text-dark">{idx + 1}. {q.title}</div>
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 pt-2 mt-2 border-top">
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

              <div className="d-flex flex-wrap justify-content-between align-items-center border-top pt-3 gap-2">
                <div className="small text-muted">
                  {!isFormComplete
                    ? 'Kérjük, értékeld mind az 5 kérdést és add meg az e-mail-címedet a beküldéshez.'
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
    </main>
  );
}
