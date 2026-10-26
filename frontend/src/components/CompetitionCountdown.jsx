import React, { useEffect, useState } from 'react';
import './CompetitionCountdown.css';

// Verseny időpontja: 2026. november 21. reggel 07:00:00
const TARGET_TIME = new Date('2026-11-21T07:00:00').getTime();

export default function CompetitionCountdown() {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft());

  function calculateTimeLeft() {
    const diff = TARGET_TIME - Date.now();
    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return { days, hours, minutes, seconds, isPast: false };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="competition-countdown-hero" aria-label="Verseny visszaszámláló">
      <div className="countdown-hero-container">
        <div className="countdown-hero-header">
          <span className="countdown-hero-badge">
            <i className="bi bi-clock-history me-1" />
            Hivatalos Visszaszámlálás
          </span>
          <h2 className="countdown-hero-title">
            {timeLeft.isPast ? 'A Brickathlon elkezdődött!' : 'A verseny kezdetéig hátralévő idő'}
          </h2>
          <p className="countdown-hero-subtitle">
            {timeLeft.isPast
              ? '2026. november 21. 7:00'
              : '2026. november 21. • Reggel 7:00 óra'}
          </p>
        </div>

        {!timeLeft.isPast ? (
          <div className="countdown-hero-timer">
            <div className="countdown-card">
              <span className="countdown-val">{String(timeLeft.days).padStart(2, '0')}</span>
              <span className="countdown-unit">Nap</span>
            </div>
            <span className="countdown-colon">:</span>
            <div className="countdown-card">
              <span className="countdown-val">{String(timeLeft.hours).padStart(2, '0')}</span>
              <span className="countdown-unit">Óra</span>
            </div>
            <span className="countdown-colon">:</span>
            <div className="countdown-card">
              <span className="countdown-val">{String(timeLeft.minutes).padStart(2, '0')}</span>
              <span className="countdown-unit">Perc</span>
            </div>
            <span className="countdown-colon">:</span>
            <div className="countdown-card highlight-sec">
              <span className="countdown-val">{String(timeLeft.seconds).padStart(2, '0')}</span>
              <span className="countdown-unit">Másodperc</span>
            </div>
          </div>
        ) : (
          <div className="text-center mt-3">
            <span className="badge bg-success px-4 py-2 fs-5">
              <i className="bi bi-flag-fill me-2" /> A verseny jelenleg zajlik!
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
