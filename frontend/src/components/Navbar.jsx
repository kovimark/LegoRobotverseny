import React, { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    return (
        <nav className="navbar navbar-expand-lg navbar-light bg-light custom-navbar">
            <div className="container-fluid">
                <Link className="navbar-brand" to="/" onClick={() => setIsMenuOpen(false)}>
                    Lego Robotverseny
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
                        <Link className="nav-link" to="/versenyjelentkezes" onClick={() => setIsMenuOpen(false)}>
                            Versenyjelentkezés
                        </Link>
                    </div>
                    <div className="navbar-nav">
                        <Link className="nav-link" to="/admin" onClick={() => setIsMenuOpen(false)}>
                            Admoin felület
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    )
}
