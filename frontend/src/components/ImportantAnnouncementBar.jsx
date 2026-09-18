import React, { useState } from 'react';
import './ImportantAnnouncementBar.css';

// 2026. október 5. 00:00:00-tól már nem jelenik meg
const EXPIRATION_DATE = new Date('2026-10-05T00:00:00');

export default function ImportantAnnouncementBar() {
  const [visible, setVisible] = useState(true);

  // Október 5-től már nem jelenik meg
  if (new Date() >= EXPIRATION_DATE) {
    return null;
  }

  if (!visible) {
    return null;
  }

  return (
    <aside className="important-announcement-bar" aria-label="Fontos közlemény">
      <div className="container important-announcement-container">
        <div className="important-announcement-icon" aria-hidden="true">
          <i className="bi bi-exclamation-triangle-fill" />
        </div>
        <div className="important-announcement-body">
          <strong className="important-announcement-title">
            FONTOS: Új időpontban a Brickathlon!
          </strong>
          <span>
            <strong>Tisztelt Látogatók! Kedves Versenyzők!</strong> Az eredetileg megadott (2026. 11. 07.) dátum megváltozott <strong className="important-announcement-highlight">2026. 11. 21-re</strong>. Erre azért volt szükség, hogy egy még színvonalasabb versenyt tudjunk nektek szervezni, illetve az őszi szünet után így több időtök marad a felkészülésre. Elnézést kérünk az esetleges kellemetlenségekért, és köszönjük a megértéseteket!
          </span>
        </div>
        <button
          type="button"
          className="important-announcement-close"
          onClick={() => setVisible(false)}
          aria-label="Közlemény bezárása"
          title="Bezárás"
        >
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
