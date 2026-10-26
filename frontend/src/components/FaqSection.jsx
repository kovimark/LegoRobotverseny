import React from 'react';
import './FaqSection.css';

const FAQ_ITEMS = [
  {
    id: 'faq-1',
    question: 'Mikor kezdődik a helyszíni regisztráció és a tesztelés?',
    answer: 'A helyszíni regisztráció és a pályatesztelés reggel 7:00-kor indul és 8:50-ig tart. Kérjük a csapatokat, hogy legkésőbb 8:30-ig érkezzenek meg, hogy maradjon elegendő idő a robotok kalibrálására és a tesztelésre a megnyitó előtt.'
  },
  {
    id: 'faq-2',
    question: 'Mit kötelező magunkkal hozni a versenyre?',
    answer: 'A megépített LEGO robotot és annak pót-alkatrészeit, laptopot a programozáshoz és töltőt, elosztót, valamint a szülők által aláírt Adatkezelési tájékoztató és nyilatkozat nyomtatványt, amely a hivatalos stream és fotózás miatt elengedhetetlen a belépéshez.'
  },
  {
    id: 'faq-3',
    question: 'Hogyan működik a pontozás a négy versenyszámban?',
    answer: 'A verseny négy számból áll: Szumó, Vonalkövetés, Hegymászás és Kosárra dobás. Mind a négy számban szerzett eredményekből pontokat gyűjtötök. A részletes pontozási szabályok a Szabályzat menüpontban érhetők el.'
  },
  {
    id: 'faq-4',
    question: 'Hogyan szerezhet a csapatunk tombolaszelvényt és mikor lesz a húzás?',
    answer: 'Tombolát többféleképpen gyűjthettek: a helyszíni regisztráció igazolásakor, a segítőknél különböző bemutató állomások kipróbálásakor, a weboldalon elérhető visszajelző kérdőív kitöltésével, illetve rekorddöntéssel. A tombolasorsolás 16:00-kor, az ünnepélyes eredményhirdetéskor zajlik.'
  },
  {
    id: 'faq-5',
    question: 'Hol követhetem a csapatom élő eredményeit és következő szumó mérkőzését?',
    answer: 'Bejelentkezés után a jobb felső profil menüben vagy a Saját csapataim menüpontban bármikor megnézhetitek az összes próbálkozásotokat, az aktuális pontszámokat, valamint a következő szumó meccsetek sorszámát és a még pontozatlan mérkőzéseket.'
  },
  {
    id: 'faq-6',
    question: 'Mi a teendő, ha holtverseny alakul ki a továbbjutó helyeken?',
    answer: 'Amennyiben a csoportkör végén pontegyenlőség alakul ki a továbbjutást érintő pozíciókban, a menetrend szerinti 14:00 - 14:30 idősávban hivatalos szétlövés dönt a kieséses szakaszba jutásról.'
  }
];

export default function FaqSection() {
  return (
    <section className="faq-section container my-5 pt-3 pb-4">
      <div className="home-section-heading text-center mb-4">
        <span className="home-kicker">Gyakran Ismételt Kérdések</span>
        <h2>Minden, amit a versenyről tudni érdemes</h2>
        <p className="text-muted mx-auto" style={{ maxWidth: '680px' }}>
          Összegyűjtöttük a legfontosabb tudnivalókat a regisztrációról, a versenyszámokról, a helyszíni menetrendről és a tomboláról.
        </p>
      </div>

      <div className="accordion faq-accordion mx-auto" id="brickathlonFaq" style={{ maxWidth: '840px' }}>
        {FAQ_ITEMS.map((item, index) => (
          <div className="accordion-item faq-item shadow-sm mb-3 border-0 rounded-4 overflow-hidden" key={item.id}>
            <h3 className="accordion-header" id={`heading-${item.id}`}>
              <button
                className={`accordion-button faq-button ${index !== 0 ? 'collapsed' : ''} fw-bold`}
                type="button"
                data-bs-toggle="collapse"
                data-bs-target={`#collapse-${item.id}`}
                aria-expanded={index === 0 ? 'true' : 'false'}
                aria-controls={`collapse-${item.id}`}
              >
                <span className="faq-index me-3">{index + 1}.</span>
                <span className="faq-question-text">{item.question}</span>
              </button>
            </h3>
            <div
              id={`collapse-${item.id}`}
              className={`accordion-collapse collapse ${index === 0 ? 'show' : ''}`}
              aria-labelledby={`heading-${item.id}`}
              data-bs-parent="#brickathlonFaq"
            >
              <div className="accordion-body faq-answer-body text-secondary">
                {item.answer}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
