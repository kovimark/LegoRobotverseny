import React from 'react'
import { Link } from 'react-router-dom'

const competitions = [
  { icon: 'bi-record-circle', title: 'Szumó', text: 'Stratégia, stabil felépítés és gyors alkalmazkodás közvetlen robotpárharcokban.' },
  { icon: 'bi-sign-turn-right', title: 'Vonalkövetés', text: 'Pontos érzékelés és megbízható programozás egy időre teljesítendő pályán.' },
  { icon: 'bi-graph-up-arrow', title: 'Hegymászás', text: 'Tapadás, erőátvitel és szerkezeti tervezés egyre nehezebb emelkedőkön.' },
  { icon: 'bi-bullseye', title: 'Kosárra dobás', text: 'Mechanikai pontosság és következetes végrehajtás különböző távolságokról.' }
]

const values = [
  { icon: 'bi-lightbulb-fill', title: 'Kreativitás', text: 'Nincs egyetlen helyes megoldás: a csapatok saját ötleteikkel és konstrukcióikkal teljesítik a kihívásokat.' },
  { icon: 'bi-people-fill', title: 'Csapatmunka', text: 'A tervezés, az építés, a programozás és a helyszíni döntések közös munkát igényelnek.' },
  { icon: 'bi-shield-check', title: 'Sportszerűség', text: 'Egységes szabályokkal, követhető pontozással és tiszteleten alapuló versenyzéssel dolgozunk.' },
  { icon: 'bi-code-slash', title: 'Gyakorlati tudás', text: 'A résztvevők valós problémákon keresztül fejlesztik műszaki és programozási gondolkodásukat.' }
]

export default function AboutPage() {
  return (
    <main className="about-page">
      <section className="about-hero">
        <div className="container py-5">
          <div className="about-hero-content">
            <span className="home-kicker">Rólunk</span>
            <h1>Robotok, ötletek és közös élmények</h1>
            <p>A Brickathlon egy diákoknak szóló műszaki megmérettetés, ahol az építés, a programozás és a csapatmunka találkozik. Olyan eseményt szeretnénk teremteni, amely egyszerre kihívás, tanulási lehetőség és emlékezetes közösségi élmény.</p>
            <div className="d-flex flex-wrap gap-2 mt-4">
              <Link className="btn btn-primary px-4" to="/versenyjelentkezes">Jelentkezés</Link>
              <Link className="btn btn-theme-secondary px-4" to="/szabalyzat">Szabályzat megtekintése</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-5">
        <div className="about-section-heading">
          <span>Miért csináljuk?</span>
          <h2>Tapasztalatok egybegyúrása</h2>
          <p>A verseny célja, hogy teret adjon a kísérletezésnek. A felkészülés során megszerzett tudás, a közösen megoldott problémák és a többi csapattal megosztott élmények ugyanolyan fontosak, mint a végső helyezés.</p>
        </div>
        <div className="row g-4 mt-1">
          {values.map((value) => <div className="col-md-6 col-xl-3" key={value.title}><article className="about-value-card h-100"><i className={`bi ${value.icon}`} /><h3>{value.title}</h3><p>{value.text}</p></article></div>)}
        </div>
      </section>

      <section className="container pb-5">
        <div className="about-experience-card">
          <div className="about-experience-icon" aria-hidden="true"><i className="bi bi-award-fill" /></div>
          <div>
            <span className="home-kicker">Versenyzői tapasztalatból</span>
            <h2>Mi is álltunk már a rajtvonalnál</h2>
            <p>Mi magunk is több robotversenyen vettünk részt, és győzelmeket is szereztünk. Versenyzőként megtapasztaltuk a felkészülés izgalmát, a helyszíni kihívásokat, valamint azt is, hogy mitől lesz egy verseny igazán jól szervezett és emlékezetes.</p>
            <p className="mb-0">Ezekre a tapasztalatokra építve szeretnénk olyan eseményt létrehozni, amely megtartja a korábbi versenyek pozitív és jól működő elemeit. Célunk az átlátható lebonyolítás, az igazságos pontozás, a követhető menetrend és egy olyan támogató légkör, ahol minden csapat örömmel mutathatja meg a munkáját.</p>
          </div>
        </div>
      </section>

      <section className="about-competitions-section">
        <div className="container py-5">
          <div className="about-section-heading">
            <span>A kihívások</span>
            <h2>Négy különböző versenyszám</h2>
            <p>Minden feladat más erősséget tesz próbára, így a résztvevők többféle tervezési és programozási megközelítést mutathatnak be.</p>
          </div>
          <div className="about-competition-grid mt-4">
            {competitions.map((competition, index) => <article className="about-competition-card" key={competition.title}><span>{index + 1}</span><i className={`bi ${competition.icon}`} /><div><h3>{competition.title}</h3><p>{competition.text}</p></div></article>)}
          </div>
        </div>
      </section>

      <section className="container py-5">
        <div className="about-process-card">
          <div><span className="home-kicker">Átlátható lebonyolítás</span><h2>Minden fontos információ egy helyen</h2><p>A weboldalon követhető a menetrend, a csapat besorolása, a verseny aktuális szakasza, a pontok és az összesített állás. Így a résztvevők a nap folyamán mindig tudhatják, mi következik.</p></div>
          <div className="about-process-points">
            <span><i className="bi bi-calendar-check" /> Aktuális menetrend</span>
            <span><i className="bi bi-bell" /> Hírek és értesítések</span>
            <span><i className="bi bi-trophy" /> Eredmények és helyezések</span>
            <span><i className="bi bi-person-badge" /> Saját csapatfelület</span>
          </div>
        </div>
      </section>
    </main>
  )
}
