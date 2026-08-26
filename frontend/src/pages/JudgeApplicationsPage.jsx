import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getApplications, confirmApplication, deleteApplication } from '../services/applicationApi'
import FloatingFeedback from '../components/FloatingFeedback'
import ConfirmModal from '../components/ConfirmModal'
import { DATA_REFRESH_EVENT } from '../config/dataRefresh'

const DEFAULT_ROLES = ['Vonalkövetés', 'Hegymászás', 'Szumó', 'Kosárra dobás']

export default function JudgeApplicationsPage() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [feedbackMessage, setFeedbackMessage] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [confirmTarget, setConfirmTarget] = useState(null)
  const [selectedRoleForConfirm, setSelectedRoleForConfirm] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchApplications = async () => {
    try {
      setLoading(true)
      const data = await getApplications()
      setApplications(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Hiba a jelentkezések betöltésekor:', error)
      setFeedbackMessage({
        type: 'danger',
        text: `Nem sikerült betölteni a bírói jelentkezéseket: ${error.message}`
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()

    const handleRefresh = () => {
      fetchApplications()
    }

    window.addEventListener(DATA_REFRESH_EVENT, handleRefresh)
    return () => {
      window.removeEventListener(DATA_REFRESH_EVENT, handleRefresh)
    }
  }, [])

  const normalizedSearch = searchTerm.trim().toLowerCase()

  const filteredApplications = applications.filter((app) => {
    const matchesSearch = !normalizedSearch || [
      app.name,
      app.email,
      app.class,
      app.selectedRoles
    ].some((val) => String(val ?? '').toLowerCase().includes(normalizedSearch))

    const isAcceptedValue = Number(app.isAccepted) === 1
    const matchesStatus = statusFilter === 'all'
      ? true
      : statusFilter === 'accepted'
        ? isAcceptedValue
        : !isAcceptedValue

    return matchesSearch && matchesStatus
  })

  const totalCount = applications.length
  const acceptedCount = applications.filter((app) => Number(app.isAccepted) === 1).length
  const pendingCount = totalCount - acceptedCount

  const parseRoles = (selectedRoles) => {
    if (!selectedRoles) return []
    return String(selectedRoles)
      .split(';')
      .map((r) => r.trim())
      .filter(Boolean)
  }

  const openConfirmModal = (app) => {
    const preferredRoles = parseRoles(app.selectedRoles)
    const initialRole = preferredRoles[0] || DEFAULT_ROLES[0]
    setConfirmTarget(app)
    setSelectedRoleForConfirm(initialRole)
  }

  const executeConfirm = async () => {
    if (!confirmTarget || !selectedRoleForConfirm) return

    setIsConfirming(true)
    try {
      await confirmApplication(confirmTarget.email, selectedRoleForConfirm)

      setFeedbackMessage({
        type: 'success',
        text: `${confirmTarget.name || confirmTarget.email} jelentkezése sikeresen jóváhagyva "${selectedRoleForConfirm}" szerepkörrel!`
      })
      setConfirmTarget(null)
      await fetchApplications()
    } catch (error) {
      console.error('Hiba a jóváhagyás során:', error)
      setFeedbackMessage({
        type: 'danger',
        text: `Hiba történt a jóváhagyás során: ${error.message}`
      })
    } finally {
      setIsConfirming(false)
    }
  }

  const executeDelete = async () => {
    if (!deleteTarget) return

    setIsDeleting(true)
    try {
      await deleteApplication(deleteTarget.email)

      setFeedbackMessage({
        type: 'success',
        text: `${deleteTarget.name || deleteTarget.email} bírói jelentkezése sikeresen törölve.`
      })
      setDeleteTarget(null)
      await fetchApplications()
    } catch (error) {
      console.error('Hiba a törlés során:', error)
      setFeedbackMessage({
        type: 'danger',
        text: `Hiba történt a törlés során: ${error.message}`
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="container py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h2 mb-1">Bírói Jelentkezések</h1>
          <p className="text-muted mb-0">
            A versenybírói űrlapon keresztül beküldött jelentkezések kezelése és jóváhagyása.
          </p>
        </div>

        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={fetchApplications}
            disabled={loading}
          >
            <i className={`bi bi-arrow-clockwise me-1 ${loading ? 'spin' : ''}`} />
            {loading ? 'Frissítés...' : 'Frissítés'}
          </button>

          <Link to="/admin/jogosultsagok" className="btn btn-primary">
            <i className="bi bi-person-lock me-1" />
            Jogosultságok kezelése
          </Link>
        </div>
      </div>

      {/* Statisztikai kártyák */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-4">
          <div className="card shadow-sm border-0 bg-light">
            <div className="card-body p-3 text-center">
              <div className="text-muted small">Összes jelentkező</div>
              <div className="fs-3 fw-bold text-dark">{totalCount}</div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-4">
          <div className="card shadow-sm border-0 bg-light">
            <div className="card-body p-3 text-center">
              <div className="text-muted small">Elfogadva</div>
              <div className="fs-3 fw-bold text-success">{acceptedCount}</div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-4">
          <div className="card shadow-sm border-0 bg-light">
            <div className="card-body p-3 text-center">
              <div className="text-muted small">Elbírálásra vár</div>
              <div className="fs-3 fw-bold text-warning">{pendingCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Szűrők és kereső */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-3">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-md-7">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Keresés név, email, osztály vagy versenyszám alapján..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => setSearchTerm('')}
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                )}
              </div>
            </div>

            <div className="col-12 col-md-5">
              <div className="d-flex align-items-center gap-2">
                <label className="form-label mb-0 text-nowrap small fw-bold">Szűrés:</label>
                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Minden jelentkező ({totalCount})</option>
                  <option value="pending">Elbírálásra vár ({pendingCount})</option>
                  <option value="accepted">Elfogadva ({acceptedCount})</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Jelentkezők listája */}
      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {loading && applications.length === 0 ? (
            <div className="p-5 text-center text-muted">
              <div className="spinner-border text-primary mb-2" role="status" />
              <div>Jelentkezések betöltése...</div>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="p-5 text-center text-muted">
              <i className="bi bi-person-x fs-1 d-block mb-2 text-secondary" />
              <h5>Nem található bírói jelentkezés</h5>
              <p className="mb-0 small">
                {searchTerm || statusFilter !== 'all'
                  ? 'A megadott szűrési feltételeknek nem felelt meg egyetlen rekord sem.'
                  : 'Még nem érkezett bírói jelentkezés az űrlapon keresztül.'}
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th scope="col" style={{ width: '40px' }} className="text-center">#</th>
                    <th scope="col">Név</th>
                    <th scope="col">Email</th>
                    <th scope="col" className="text-center">Osztály</th>
                    <th scope="col">Választott versenyszámok</th>
                    <th scope="col" className="text-center">Státusz</th>
                    <th scope="col" className="text-end">Műveletek</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app, index) => {
                    const roles = parseRoles(app.selectedRoles)
                    const isAccepted = Number(app.isAccepted) === 1

                    return (
                      <tr key={app.id || `${app.email}-${index}`}>
                        <td className="text-center text-muted small">{index + 1}</td>
                        <td className="fw-semibold">
                          {app.name || <span className="text-muted font-monospace">Nincs név</span>}
                        </td>
                        <td>
                          <span>{app.email}</span>
                        </td>
                        <td className="text-center">
                          <span className="badge bg-secondary-subtle text-secondary-emphasis px-2 py-1">
                            {app.class || '-'}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex flex-wrap gap-1">
                            {roles.length > 0 ? (
                              roles.map((role, rIdx) => (
                                <span key={rIdx} className="badge bg-primary-subtle text-primary border border-primary-subtle">
                                  {role}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted small">-</span>
                            )}
                          </div>
                        </td>
                        <td className="text-center">
                          {isAccepted ? (
                            <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                              <i className="bi bi-check-circle me-1" />
                              Elfogadva
                            </span>
                          ) : (
                            <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1">
                              <i className="bi bi-clock me-1" />
                              Függőben
                            </span>
                          )}
                        </td>
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-1">
                            {!isAccepted && (
                              <button
                                type="button"
                                className="btn btn-sm btn-success text-nowrap"
                                onClick={() => openConfirmModal(app)}
                                title="Jelentkezés jóváhagyása és szerepkör kiosztása"
                              >
                                <i className="bi bi-check2-circle me-1" />
                                Jóváhagyás
                              </button>
                            )}

                            <Link
                              to={`/admin/jogosultsagok?email=${encodeURIComponent(app.email || '')}`}
                              className="btn btn-sm btn-outline-primary text-nowrap"
                              title="Jogosultság részletes beállítása"
                            >
                              <i className="bi bi-shield-plus me-1" />
                              Jogosultság
                            </Link>

                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => setDeleteTarget(app)}
                              title="Bírói jelentkezés törlése"
                            >
                              <i className="bi bi-trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Jóváhagyási modális ablak */}
      {confirmTarget && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-check2-circle text-success me-2" />
                  Bírói jelentkezés jóváhagyása
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  disabled={isConfirming}
                  onClick={() => setConfirmTarget(null)}
                />
              </div>
              <div className="modal-body">
                <p className="mb-2">
                  Biztosan jóváhagyod <strong>{confirmTarget.name || confirmTarget.email}</strong> bírói jelentkezését?
                </p>

                <div className="p-3 bg-light rounded mb-3 small">
                  <div><strong>Email cím:</strong> {confirmTarget.email}</div>
                  <div><strong>Osztály:</strong> {confirmTarget.class || '-'}</div>
                  <div className="mt-1">
                    <strong>Jelölt versenyszámok:</strong>{' '}
                    {parseRoles(confirmTarget.selectedRoles).join(', ') || '-'}
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold">Válassz hozzárendelt bírói szerepkört:</label>
                  <div className="d-grid gap-2">
                    {Array.from(new Set([...parseRoles(confirmTarget.selectedRoles), ...DEFAULT_ROLES])).map((role) => {
                      const isPreferred = parseRoles(confirmTarget.selectedRoles).includes(role)
                      const isSelected = selectedRoleForConfirm === role

                      return (
                        <button
                          key={role}
                          type="button"
                          className={`btn text-start d-flex justify-content-between align-items-center ${
                            isSelected ? 'btn-primary' : 'btn-outline-secondary'
                          }`}
                          onClick={() => setSelectedRoleForConfirm(role)}
                        >
                          <span>
                            <i className={`bi ${isSelected ? 'bi-check-circle-fill' : 'bi-circle'} me-2`} />
                            {role}
                          </span>
                          {isPreferred && (
                            <span className={`badge ${isSelected ? 'bg-light text-primary' : 'bg-primary'}`}>
                              Jelölt preferencia
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={isConfirming}
                  onClick={() => setConfirmTarget(null)}
                >
                  Mégse
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  disabled={isConfirming || !selectedRoleForConfirm}
                  onClick={executeConfirm}
                >
                  {isConfirming ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status" />
                      Jóváhagyás folyamatban...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg me-1" />
                      Jóváhagyás megerősítése
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Törlési megerősítő modális ablak */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Bírói jelentkezés törlése"
        confirmLabel="Törlés"
        confirmVariant="danger"
        busy={isDeleting}
        onConfirm={executeDelete}
        onClose={() => setDeleteTarget(null)}
      >
        <p className="mb-0">
          Biztosan törölni szeretnéd <strong>{deleteTarget?.name || deleteTarget?.email}</strong> (<code>{deleteTarget?.email}</code>) bírói jelentkezését?
        </p>
      </ConfirmModal>

      <FloatingFeedback message={feedbackMessage} onClose={() => setFeedbackMessage(null)} />
    </div>
  )
}
