import React from 'react'
import { Link } from 'react-router-dom'

export default function LoginPage({ user, authLoading, authError, onGoogleSignIn, onSignOut }) {
  return (
    <main className="login-page">
      <section className="login-panel">
        <span className="home-kicker"><i className="bi bi-google me-1" aria-hidden="true" /> Google fiók</span>
        <h1 className="home-title"><i className="bi bi-person-circle me-2" aria-hidden="true" />Bejelentkezés</h1>
        <p className="home-copy">
          Jelentkezz be Google-fiókkal!
        </p>

        {authError && <div className="alert alert-danger">{authError}</div>}

        {user ? (
          <div className="login-user-box">
            <img className="profile-drawer-avatar" src={user.photoURL} alt={user.displayName || 'Google profil'} />
            <div>
              <h2>{user.displayName || 'Bejelentkezett felhasználó'}</h2>
              <p><i className="bi bi-envelope-fill me-2" aria-hidden="true" />{user.email}</p>
            </div>
            <Link className="btn btn-outline-primary w-100 mb-2" to="/uzenetek">
              <i className="bi bi-bell-fill me-2" aria-hidden="true" />Értesítések és üzenetek megtekintése
            </Link>
            <button className="btn btn-primary w-100" type="button" onClick={onSignOut}>
              <i className="bi bi-box-arrow-right me-2" aria-hidden="true" />Kijelentkezés
            </button>
          </div>
        ) : (
          <button className="btn btn-primary px-4 py-2" type="button" onClick={onGoogleSignIn} disabled={authLoading}>
            <i className="bi bi-google me-2" aria-hidden="true" />{authLoading ? 'Betöltés...' : 'Bejelentkezés Google-fiókkal'}
          </button>
        )}
      </section>
    </main>
  )
}
