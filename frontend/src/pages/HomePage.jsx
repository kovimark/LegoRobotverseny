import React from 'react'
import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-panel">
          <span className="home-kicker">Őszi robotverseny</span>
          <h1 className="home-title">Robotverseny</h1>
          <p className="home-copy">
            Jelentkezzetek max 2 fős csapattal, hozzátok az ötleteket, és mutassátok meg, mire képes a robototok a pályán.
          </p>
          <p className="home-description">
            A célunk egy egyszerű, átlátható és izgalmas verseny létrehozása, ahol a résztvevők megmutathatják kreativitásukat és programozási tudásukat. A csapatok különböző kihívásokkal találkoznak, a legjobb megoldások pedig értékes díjakat nyerhetnek.
          </p>
          <div className="home-actions">
            <Link className="btn btn-primary px-4 py-2" to="/versenyjelentkezes">
              Jelentkezés
            </Link>
            <Link className="btn btn-theme-secondary px-4 py-2" to="/szabalyzat">
              Szabályzat
            </Link>
          </div>
        </div>
      </section>

      <section className="home-carousel-section">
        <div className="home-section-heading">          
          <h2 >Hírek és információk</h2>
        </div>

        <div id="homeInfoCarousel" className="carousel slide home-carousel" data-bs-ride="carousel">
          <div className="carousel-indicators">
            <button type="button" data-bs-target="#homeInfoCarousel" data-bs-slide-to="0" className="active" aria-current="true" aria-label="Első dia"></button>
            <button type="button" data-bs-target="#homeInfoCarousel" data-bs-slide-to="1" aria-label="Második dia"></button>
            <button type="button" data-bs-target="#homeInfoCarousel" data-bs-slide-to="2" aria-label="Harmadik dia"></button>
          </div>

          <div className="carousel-inner">
            <div className="carousel-item active">
              <article className="home-carousel-card">
                <span className="home-card-tag">Hír</span>
                <h3>Indul az őszi versenyszezon</h3>
                <p>Ide kerülhetnek majd az adatbázisból érkező hírek, dátumok és fontos frissítések.</p>
              </article>
            </div>

            <div className="carousel-item">
              <article className="home-carousel-card">
                <span className="home-card-tag">Szabályzat</span>
                <h3>Versenyszabályok egy helyen</h3>
                <p>A szabályzat rövid kiemelései vagy a teljes szabályzatra mutató tartalmak jelenhetnek meg itt.</p>
              </article>
            </div>

            <div className="carousel-item">
              <article className="home-carousel-card">
                <span className="home-card-tag">Program</span>
                <h3>Minden fontos tudnivaló</h3>
                <p>Később jöhetnek ide nevezési határidők, videók, eredmények vagy bármilyen kiemelt blokk.</p>
              </article>
            </div>
          </div>

          <button className="carousel-control-prev" type="button" data-bs-target="#homeInfoCarousel" data-bs-slide="prev">
            <span className="carousel-control-prev-icon" aria-hidden="true"></span>
            <span className="visually-hidden">Előző</span>
          </button>
          <button className="carousel-control-next" type="button" data-bs-target="#homeInfoCarousel" data-bs-slide="next">
            <span className="carousel-control-next-icon" aria-hidden="true"></span>
            <span className="visually-hidden">Következő</span>
          </button>
        </div>
      </section>
    </main>
  )
}
