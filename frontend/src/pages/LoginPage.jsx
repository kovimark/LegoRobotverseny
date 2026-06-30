import React from 'react'

export default function LoginPage({ user, authLoading, authError, onGoogleSignIn, onSignOut }) {
  return (
    <main className="login-page">
      <section className="login-panel">
        <span className="home-kicker">Google fiók</span>
        <h1 className="home-title">Bejelentkezés</h1>
        <p className="home-copy">
          Jelentkezz be Google-fiókkal, hogy később innen kezeld a profilodat, nevezéseidet és az admin felülethez tartozó műveleteket.
        </p>

        {authError && <div className="alert alert-danger">{authError}</div>}

        {user ? (
          <div className="login-user-box">
            <img className="profile-drawer-avatar" src={user.photoURL} alt={user.displayName || 'Google profil'} />
            <div>
              <h2>{user.displayName || 'Bejelentkezett felhasználó'}</h2>
              <p>{user.email}</p>
            </div>
            <button className="btn btn-primary w-100" type="button" onClick={onSignOut}>
              Kijelentkezés
            </button>
          </div>
        ) : (
          <button className="btn btn-primary px-4 py-2" type="button" onClick={onGoogleSignIn} disabled={authLoading}>
            {authLoading ? 'Betöltés...' : 'Bejelentkezés Google-fiókkal'}
          </button>
        )}
      </section>
    </main>
  )
}
