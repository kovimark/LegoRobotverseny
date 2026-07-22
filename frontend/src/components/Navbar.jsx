import { Link } from 'react-router-dom'
import './Navbar.css'
import React, { useState } from 'react'

export default function Navbar({ user, userRole, userPrivilege, authLoading, authError, onGoogleSignIn, onSignOut }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isProfileOpen, setIsProfileOpen] = useState(false)

    const closeMenu = () => {
        setIsMenuOpen(false)
    }

    const handleProfileToggle = () => {
        setIsProfileOpen(prev => !prev)
        setIsMenuOpen(false)
    }

    const handleLoginClick = async () => {
        setIsProfileOpen(false)
        await onGoogleSignIn()
    }

    const handleSignOut = async () => {
        await onSignOut()
        setIsProfileOpen(false)
    }

    return (
        <>
            <nav className="navbar navbar-expand-lg navbar-light bg-light custom-navbar">
                <div className="container-fluid">
                    <Link className="navbar-brand" to="/" onClick={closeMenu}>
                        Robotverseny
                    </Link>
                    <button
                        className={`navbar-toggler ${isMenuOpen ? 'active' : ''}`}
                        type="button"
                        onClick={() => setIsMenuOpen(prev => !prev)}
                        aria-controls="navbarNavAltMarkup"
                        aria-expanded={isMenuOpen}
                        aria-label="Toggle navigation"
                    >
                        <span className="navbar-toggler-line"></span>
                        <span className="navbar-toggler-line"></span>
                        <span className="navbar-toggler-line"></span>
                    </button>
                    <div className={`navbar-menu ${isMenuOpen ? 'open' : ''}`} id="navbarNavAltMarkup">
                        <div className="navbar-nav">
                            <Link className="nav-link" to="/szabalyzat" onClick={closeMenu}>
                                Szabályzat
                            </Link>
                        </div>
                        <div className="navbar-nav">
                            <Link className="nav-link" to="/videok" onClick={closeMenu}>
                                Videók
                            </Link>
                        </div>
                        <div className="navbar-nav">
                            <Link className="nav-link" to="/hirek" onClick={closeMenu}>
                                Hírek
                            </Link>
                        </div>
                        <div className="navbar-nav">
                            <Link className="nav-link" to="/versenyjelentkezes" onClick={closeMenu}>
                                Versenyjelentkezés
                            </Link>
                        </div>
                        <div className="navbar-nav navbar-auth">
                            {user ? (
                                <button className="profile-button" type="button" onClick={handleProfileToggle} aria-expanded={isProfileOpen}>
                                    <img className="profile-avatar" src={user.photoURL || user.picture || user.avatarUrl} alt={user.displayName || 'Google profil'} />
                                    <span className="profile-email">{user.email}</span>
                                </button>
                            ) : (
                                <button className="nav-login-button" type="button" onClick={handleLoginClick} disabled={authLoading}>
                                    {authLoading ? 'Betöltés...' : 'Google bejelentkezés'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            <div className={`profile-backdrop ${isProfileOpen ? 'open' : ''}`} onClick={() => setIsProfileOpen(false)}></div>
            <aside className={`profile-drawer ${isProfileOpen ? 'open' : ''}`} aria-hidden={!isProfileOpen}>
                {user && (
                    <>
                        <div className="profile-drawer-header">
                            <img className="profile-drawer-avatar" src={user.photoURL || user.picture || user.avatarUrl} alt={user.displayName || 'Google profil'} />
                            <div>
                                <h2>{user.displayName || 'Bejelentkezett felhasználó'}</h2>
                                <p>{user.email}</p>
                            </div>
                        </div>
                        <div className="profile-drawer-content">
                            <p>Google fiókkal bejelentkezve.</p>
                            {userRole === 'admin' || Number(userPrivilege) === 1 ? (
                                <div className="d-grid gap-2">
                                    <Link className="btn btn-outline-primary w-100" to="/admin" onClick={() => setIsProfileOpen(false)}>
                                        Csapatok
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100" to="/admin/pontozas" onClick={() => setIsProfileOpen(false)}>
                                        Pontozás kezelése
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100" to="/admin/jogosultsagok" onClick={() => setIsProfileOpen(false)}>
                                        E-mailek és jogosultságok kezelése
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100" to="/admin/uzenetek" onClick={() => setIsProfileOpen(false)}>
                                        Üzenetek kezelése
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100" to="/admin/beallitasok" onClick={() => setIsProfileOpen(false)}>
                                        Versenybeállítások
                                    </Link>
                                </div>
                            ) : userRole === 'judge' ? (
                                <Link className="btn btn-outline-primary w-100" to="/admin/pontozas" onClick={() => setIsProfileOpen(false)}>
                                    Saját versenyszám pontozása
                                </Link>
                            ) : (
                                <div className="d-grid gap-2">
                                    <Link className="btn btn-primary w-100" to="/sajat-csapataim" onClick={() => setIsProfileOpen(false)}>
                                        Saját csapatom
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100" to="/allasok" onClick={() => setIsProfileOpen(false)}>
                                        Állások
                                    </Link>
                                </div>
                            )}
                            <hr />
                        </div>
                        {authError && <div className="alert alert-danger mt-3">{authError}</div>}
                        <button className="btn btn-primary w-100 mt-3" type="button" onClick={handleSignOut}>
                            Kijelentkezés
                        </button>
                    </>
                )}
            </aside>
        </>
    )
}
