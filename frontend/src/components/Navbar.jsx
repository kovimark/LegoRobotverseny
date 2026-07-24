import { Link } from 'react-router-dom'
import './Navbar.css'
import React, { useState } from 'react'
import ProfileNotificationStatus from './ProfileNotificationStatus'

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
                            <p><i className="bi bi-google me-2" aria-hidden="true" />Google fiókkal bejelentkezve.</p>
                            <ProfileNotificationStatus user={user} />
                            {userRole === 'admin' || Number(userPrivilege) === 1 ? (
                                <div className="d-grid gap-2">
                                    <Link className="btn btn-outline-primary w-100 profile-menu-link" to="/admin" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-people-fill" aria-hidden="true" /><span>Csapatok</span>
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100 profile-menu-link" to="/admin/pontozas" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-trophy-fill" aria-hidden="true" /><span>Pontozás kezelése</span>
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100 profile-menu-link" to="/admin/jogosultsagok" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-person-lock" aria-hidden="true" /><span>E-mailek és jogosultságok kezelése</span>
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100 profile-menu-link" to="/admin/uzenetek" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-newspaper" aria-hidden="true" /><span>Üzenetek kezelése</span>
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100 profile-menu-link" to="/admin/ertesitesek" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-send-fill" aria-hidden="true" /><span>Értesítések küldése</span>
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100 profile-menu-link" to="/admin/beallitasok" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-gear-fill" aria-hidden="true" /><span>Versenybeállítások</span>
                                    </Link>
                                </div>
                            ) : userRole === 'judge' ? (
                                <div className="d-grid gap-2"><Link className="btn btn-outline-primary w-100 profile-menu-link" to="/admin/pontozas" onClick={() => setIsProfileOpen(false)}><i className="bi bi-trophy-fill" aria-hidden="true" /><span>Saját versenyszám pontozása</span></Link><Link className="btn btn-outline-primary w-100 profile-menu-link" to="/admin/beallitasok" onClick={() => setIsProfileOpen(false)}><i className="bi bi-diagram-3-fill" aria-hidden="true" /><span>Csapatcsoportok</span></Link></div>
                            ) : (
                                <div className="d-grid gap-2">
                                    <Link className="btn btn-primary w-100 profile-menu-link" to="/sajat-csapataim" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-people-fill" aria-hidden="true" /><span>Saját csapatom</span>
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100 profile-menu-link" to="/allasok" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-bar-chart-fill" aria-hidden="true" /><span>Állások</span>
                                    </Link>
                                </div>
                            )}
                            <hr />
                        </div>
                        {authError && <div className="alert alert-danger mt-3">{authError}</div>}
                        <button className="btn btn-primary w-100 mt-3 profile-menu-link" type="button" onClick={handleSignOut}>
                            <i className="bi bi-box-arrow-right" aria-hidden="true" /><span>Kijelentkezés</span>
                        </button>
                    </>
                )}
            </aside>
        </>
    )
}
