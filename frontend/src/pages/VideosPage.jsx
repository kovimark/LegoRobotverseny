import React from 'react'
import { Link } from 'react-router-dom'

export default function VideosPage() {
  return (
    <main className="container py-5 my-2">
      <div className="card border-0 bg-light p-4 p-md-5 rounded-4 mx-auto shadow-sm" style={{ maxWidth: '640px' }}>
        <div className="text-center mb-3">
          <i className="bi bi-camera-video text-primary" style={{ fontSize: '2.4rem' }} />
          <br />
          <h2 className="h4 fw-bold mt-2 mb-2">Videók</h2>
          <p className="text-dark fw-medium mb-1">
            A szabályok videói hamarosan itt lesznek elérhetőek.
          </p>
          <p className="text-muted small mb-0">
            A versenyszámok részletes videós bemutatói jelenleg készülőben vannak.
          </p>
        </div>

        <div className="card border-0 bg-white p-3 rounded-3 shadow-sm my-3">
          <div className="d-flex align-items-start gap-2 mb-2 text-primary">
            <i className="bi bi-bell-fill fs-5 mt-1" />
            <div>
              <h6 className="fw-bold mb-1 text-dark">Hogyan értesülhetsz a megjelenésről?</h6>
              <p className="small text-muted mb-2">
                Amint a videók elérhetővé válnak, a <strong>regisztrált csapatoknak e-mailben értesítést küldünk</strong>, valamint <strong>közvetlen push értesítést küldünk a telefonra és a böngészőbe</strong> azoknak, akik engedélyezték azt.
              </p>
            </div>
          </div>

          <div className="bg-light p-3 rounded-3 border-start border-3 border-primary small">
            <div className="fw-semibold text-dark mb-1">
              <i className="bi bi-phone me-1 text-primary" />
              Értesítések bekapcsolása telefonon / böngészőben:
            </div>
            <ol className="mb-0 ps-3 text-muted">
              <li>Jelentkezz be Google fiókoddal a jobb felső sarokban!</li>
              <li>A megjelenő sávban vagy a <strong>Profil</strong> menüben kattints az értesítések engedélyezésére / bekapcsolására.</li>
            </ol>
          </div>
        </div>

        <div className="d-flex flex-wrap justify-content-center gap-2 mt-2">
          <Link className="btn btn-outline-primary btn-sm px-3 py-2" to="/szabalyzat">
            <i className="bi bi-file-earmark-text me-2" />
            Szabályzat megtekintése
          </Link>
          <Link className="btn btn-primary btn-sm px-3 py-2" to="/versenyjelentkezes">
            <i className="bi bi-pencil-square me-2" />
            Versenyjelentkezés
          </Link>
        </div>
      </div>
    </main>
  )
}
