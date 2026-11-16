import { Link } from 'react-router-dom'
import './Navbar.css'
import React, { useState } from 'react'
import ProfileNotificationStatus from './ProfileNotificationStatus'
import UserMessagesModal from './UserMessagesModal'

export default function Navbar({ user, userRole, userPrivilege, userTeamId, authLoading, authError, onGoogleSignIn, onSignOut }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [isMessagesModalOpen, setIsMessagesModalOpen] = useState(false)
    const [isDocsOpen, setIsDocsOpen] = useState(false)
    const isAdmin = userRole === 'admin' || Number(userPrivilege) === 1
    const isHelper = userRole === 'helper' || Number(userPrivilege) === 6

    const closeMenu = () => {
        setIsMenuOpen(false)
        setIsDocsOpen(false)
    }

    React.useEffect(() => {
        if (!isDocsOpen) return
        const handleClickOutside = (e) => {
            if (!e.target.closest('.docs-dropdown-container')) {
                setIsDocsOpen(false)
            }
        }
        document.addEventListener('click', handleClickOutside)
        return () => document.removeEventListener('click', handleClickOutside)
    }, [isDocsOpen])

    const handleDownloadBoth = (e) => {
        if (e) e.preventDefault()
        const doc1 = {
            url: `${process.env.PUBLIC_URL}/rulebook/alairando_adatkezelesi_tajekoztato_es_nyilatkozat.pdf`,
            filename: 'alairando_adatkezelesi_tajekoztato_es_nyilatkozat.pdf'
        }
        const doc2 = {
            url: `${process.env.PUBLIC_URL}/rulebook/ADATKEZELÉSI TÁJÉKOZTATÓ ÉS NYILATKOZAT.pdf`,
            filename: 'ADATKEZELÉSI TÁJÉKOZTATÓ ÉS NYILATKOZAT.pdf'
        }

        const link1 = document.createElement('a')
        link1.href = doc1.url
        link1.download = doc1.filename
        link1.target = '_blank'
        link1.rel = 'noopener noreferrer'
        document.body.appendChild(link1)
        link1.click()
        document.body.removeChild(link1)

        setTimeout(() => {
            const link2 = document.createElement('a')
            link2.href = doc2.url
            link2.download = doc2.filename
            link2.target = '_blank'
            link2.rel = 'noopener noreferrer'
            document.body.appendChild(link2)
            link2.click()
            document.body.removeChild(link2)
        }, 350)

        closeMenu()
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
                        <img className="navbar-brand-logo" src="/Images/Logokicsi.png" alt="" aria-hidden="true" />
                        <img className="navbar-brand-name" src="/Images/Nev.png" alt="Brickathlon" />
                        <img className="navbar-brand-mobile-logo" src="/Images/telefonLogo.png" alt="Brickathlon" />
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
                            <Link className="nav-link" to="/rolunk" onClick={closeMenu}>
                                Rólunk
                            </Link>
                        </div>
                        <div className="navbar-nav">
                            <Link className="nav-link" to="/menetrend" onClick={closeMenu}>
                                Menetrend
                            </Link>
                        </div>
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
                        <div className="navbar-nav position-relative docs-dropdown-container">
                            <div className="d-flex align-items-center">
                                <button
                                    type="button"
                                    className="nav-link btn btn-link text-decoration-none border-0 text-start d-inline-flex align-items-center"
                                    onClick={handleDownloadBoth}
                                    title="Mindkét nyilatkozat letöltése (Aláírandó nyilatkozat és Adatkezelési tájékoztató)"
                                >
                                    <i className="bi bi-file-earmark-arrow-down-fill me-1" aria-hidden="true" />
                                    Nyilatkozatok letöltése
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-link text-dark p-1 text-decoration-none docs-dropdown-arrow"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setIsDocsOpen(prev => !prev)
                                    }}
                                    aria-label="Választék megnyitása"
                                    aria-expanded={isDocsOpen}
                                    title="Külön letöltési lehetőségek"
                                >
                                    <i className={`bi ${isDocsOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
                                </button>
                            </div>

                            {isDocsOpen && (
                                <div className="docs-dropdown-menu">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-light w-100 text-start fw-bold mb-1 d-flex align-items-center gap-2"
                                        onClick={handleDownloadBoth}
                                    >
                                        <i className="bi bi-download text-primary" />
                                        <span>Mindkét dokumentum letöltése</span>
                                    </button>
                                    <hr className="my-1" />
                                    <a
                                        href={`${process.env.PUBLIC_URL}/rulebook/alairando_adatkezelesi_tajekoztato_es_nyilatkozat.pdf`}
                                        download="alairando_adatkezelesi_tajekoztato_es_nyilatkozat.pdf"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-sm btn-light w-100 text-start mb-1 d-flex align-items-center gap-2"
                                        onClick={() => {
                                            setIsDocsOpen(false)
                                            closeMenu()
                                        }}
                                    >
                                        <i className="bi bi-file-earmark-check-fill text-success" />
                                        <span>alairando_adatkezelesi_tajekoztato_es_nyilatkozat.pdf</span>
                                    </a>
                                    <a
                                        href={`${process.env.PUBLIC_URL}/rulebook/ADATKEZELÉSI TÁJÉKOZTATÓ ÉS NYILATKOZAT.pdf`}
                                        download="ADATKEZELÉSI TÁJÉKOZTATÓ ÉS NYILATKOZAT.pdf"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-sm btn-light w-100 text-start d-flex align-items-center gap-2"
                                        onClick={() => {
                                            setIsDocsOpen(false)
                                            closeMenu()
                                        }}
                                    >
                                        <i className="bi bi-file-earmark-text-fill text-secondary" />
                                        <span>ADATKEZELÉSI TÁJÉKOZTATÓ ÉS NYILATKOZAT.pdf</span>
                                    </a>
                                </div>
                            )}
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
                                <p className="mb-1"><i className="bi bi-envelope-fill me-2" aria-hidden="true" />{user.email}</p>
                                {isAdmin ? (
                                    <span className="badge text-bg-danger"><i className="bi bi-shield-lock-fill me-1" aria-hidden="true" />Adminisztrátor</span>
                                ) : userRole === 'judge' ? (
                                    <span className="badge text-bg-warning text-dark"><i className="bi bi-person-badge-fill me-1" aria-hidden="true" />Bíró</span>
                                ) : isHelper ? (
                                    <span className="badge text-bg-info text-dark"><i className="bi bi-person-heart me-1" aria-hidden="true" />Segítő</span>
                                ) : (
                                    <span className="badge text-bg-primary"><i className="bi bi-person-fill me-1" aria-hidden="true" />Versenyző</span>
                                )}
                            </div>
                        </div>
                        <div className="profile-drawer-content">
                            <p><i className="bi bi-google me-2" aria-hidden="true" />Google fiókkal bejelentkezve.</p>
                            <ProfileNotificationStatus user={user} />

                            <button
                                type="button"
                                className="btn btn-outline-primary w-100 profile-menu-link text-start"
                                onClick={() => {
                                    setIsMessagesModalOpen(true)
                                    setIsProfileOpen(false)
                                }}
                            >
                                <i className="bi bi-bell-fill text-primary" aria-hidden="true" />
                                <span>Értesítések és üzenetek</span>
                            </button>

                            {isAdmin ? (
                                <div className="d-grid gap-2">
                                    <Link className="btn btn-outline-primary w-100 profile-menu-link" to="/admin" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-people-fill" aria-hidden="true" /><span>Csapatok</span>
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100 profile-menu-link" to="/admin/merlegeles" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-speedometer2" aria-hidden="true" /><span>Mérlegelés</span>
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100 profile-menu-link" to="/admin/pontozas" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-trophy-fill" aria-hidden="true" /><span>Pontozás kezelése</span>
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100 profile-menu-link" to="/admin/pontozas-jatek" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-controller" aria-hidden="true" /><span>Játékos pontozás</span>
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100 profile-menu-link" to="/admin/biro-jelentkezesek" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-person-lines-fill" aria-hidden="true" /><span>Bírói jelentkezések</span>
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100 profile-menu-link" to="/admin/jogosultsagok" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-person-lock" aria-hidden="true" /><span>E-mailek és jogosultságok kezelése</span>
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100 profile-menu-link" to="/admin/uzenetek" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-newspaper" aria-hidden="true" /><span>Hírek kezelése</span>
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100 profile-menu-link" to="/admin/videok" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-camera-video-fill" aria-hidden="true" /><span>Videók kezelése</span>
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100 profile-menu-link" to="/admin/ertesitesek" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-send-fill" aria-hidden="true" /><span>Értesítések küldése</span>
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100 profile-menu-link" to="/admin/emailek" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-envelope-fill" aria-hidden="true" /><span>E-mailek küldése</span>
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100 profile-menu-link" to="/admin/beallitasok" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-gear-fill" aria-hidden="true" /><span>Versenybeállítások</span>
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100 profile-menu-link" to="/show" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-display" aria-hidden="true" /><span>Kivetítő</span>
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100 profile-menu-link" to="/admin/eredmenyhirdetes" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-award-fill" aria-hidden="true" /><span>Eredményhirdetés</span>
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100 profile-menu-link" to="/admin/tombola" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-dice-5-fill" aria-hidden="true" /><span>Tombolasorsolás</span>
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100 profile-menu-link" to="/segito" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-ticket-perforated-fill" aria-hidden="true" /><span>Tombolajegyek kiadása</span>
                                    </Link>
                                </div>
                            ) : userRole === 'judge' ? (
                                <div className="d-grid gap-2">
                                    <Link className="btn btn-outline-primary w-100 profile-menu-link" to="/admin/merlegeles" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-speedometer2" aria-hidden="true" /><span>Mérlegelés</span>
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100 profile-menu-link" to="/admin/pontozas" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-trophy-fill" aria-hidden="true" /><span>Saját versenyszám pontozása</span>
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100 profile-menu-link" to="/admin/pontozas-jatek" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-controller" aria-hidden="true" /><span>Játékos pontozás</span>
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100 profile-menu-link" to="/admin/beallitasok" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-diagram-3-fill" aria-hidden="true" /><span>Csapatcsoportok</span>
                                    </Link>
                                </div>
                            ) : isHelper ? (
                                <div className="d-grid gap-2">
                                    <Link className="btn btn-primary w-100 profile-menu-link" to="/segito" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-ticket-perforated-fill" aria-hidden="true" /><span>Tombolajegyek kiadása</span>
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100 profile-menu-link" to="/allasok" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-bar-chart-fill" aria-hidden="true" /><span>Állások</span>
                                    </Link>
                                </div>
                            ) : (
                                <div className="d-grid gap-2">
                                    <Link className="btn btn-primary w-100 profile-menu-link" to="/sajat-csapataim" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-people-fill" aria-hidden="true" /><span>Saját csapataim</span>
                                    </Link>
                                    <Link className="btn btn-outline-primary w-100 profile-menu-link" to="/allasok" onClick={() => setIsProfileOpen(false)}>
                                        <i className="bi bi-bar-chart-fill" aria-hidden="true" /><span>Állások</span>
                                    </Link>
                                </div>
                            )}
                            <hr />
                        </div>
                        {authError && <div className="alert alert-danger mt-3">{authError}</div>}
                        <button className="btn btn-primary w-100 profile-menu-link profile-signout-button" type="button" onClick={handleSignOut}>
                            <i className="bi bi-box-arrow-right" aria-hidden="true" /><span>Kijelentkezés</span>
                        </button>
                    </>
                )}
            </aside>

            <UserMessagesModal
                open={isMessagesModalOpen}
                onClose={() => setIsMessagesModalOpen(false)}
                user={user}
                userTeamId={userTeamId}
            />
        </>
    )
}
