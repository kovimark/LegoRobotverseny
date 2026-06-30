import React from 'react'
import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <main className="home-hero">
      <section className="home-panel">
        <h3 className="home-title">Lego Robotverseny</h3>
        <p className="home-copy">
          Jelentkezzetek max 2fős csapattal, hozzátok az ötleteket, és mutassátok meg, mire képes a robototok a pályán.
        </p>
        <p>
          A célunk az volt hogy egy egyszerű, átlátható és izgalmas versenyt hozzunk létre, ahol a résztvevők megmutathatják kreativitásukat és programozás beli tudásukat. A verseny során a csapatoknak különböző kihívásokkal kell szembenézniük, amelyek során a robotjaiknak különböző feladatokat kell végrehajtaniuk. A legjobb csapatok értékes díjakat nyerhetnek, és lehetőségük nyílik bemutatni a projektjeiket a közönség előtt.
        </p>
        <div className="home-actions">
          <Link className="btn btn-primary px-4 py-2" to="/versenyjelentkezes">
            Jelentkezés
          </Link>
          <Link className="btn btn-theme-secondary px-4 py-2" to="/admin">
            Szabályzat
          </Link>
        </div>
      </section>
    </main>
  )
}
