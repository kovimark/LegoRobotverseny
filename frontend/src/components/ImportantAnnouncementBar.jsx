import React, { useState, useEffect } from 'react';
import './ImportantAnnouncementBar.css';
import { isAnnouncementActive } from '../utils/maintenance';

const STORAGE_KEY = 'brickathlon_maintenance_dismissed_20261026';

export default function ImportantAnnouncementBar() {
  const [visible, setVisible] = useState(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) !== 'true';
    } catch {
      return true;
    }
  });
  const [active, setActive] = useState(isAnnouncementActive());

  useEffect(() => {
    setActive(isAnnouncementActive());
    const interval = setInterval(() => {
      setActive(isAnnouncementActive());
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleClose = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
  };

  if (!active || !visible) {
    return null;
  }

  return (
    <aside className="important-announcement-bar" aria-label="Karbantartási közlemény">
      <div className="container important-announcement-container">
        <div className="important-announcement-icon" aria-hidden="true">
          <i className="bi bi-exclamation-triangle-fill" />
        </div>
        <div className="important-announcement-body">
          <strong className="important-announcement-title">
            Figyelem! Rendszerkarbantartás:
          </strong>
          <span>
            A verseny nevezés és egyéb funkciók <strong>10.26-án 10:00 és 16:00 között karbantartás miatt nem fognak működni</strong>. Megértéseteket köszönjük!
          </span>
        </div>
        <button
          type="button"
          className="important-announcement-close"
          onClick={handleClose}
          aria-label="Közlemény bezárása"
          title="Bezárás"
        >
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
