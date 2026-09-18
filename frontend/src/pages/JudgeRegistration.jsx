import React, { useState, useEffect } from 'react'
import FloatingFeedback from '../components/FloatingFeedback'
import PuzzleCaptcha from '../components/PuzzleCaptcha'
import { submitApplication } from '../services/applicationApi'

const JUDGE_DOCS_URL = 'https://drive.google.com/drive/folders/1guUTFn7zKm5EDnPqOO1EXa6Sks6YyVR_'

const GRADE_OPTIONS = ['9', '10', '11', '12', '13']
const CLASS_LETTER_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'K']

const COMPETITION_OPTIONS = [
  { id: 'vonalkovetes', label: 'Vonalkövetés' },
  { id: 'hegymaszas', label: 'Hegymászás' },
  { id: 'szumo', label: 'Szumó' },
  { id: 'kosarra-dobas', label: 'Kosárra dobás' },
  { id: 'segito', label: 'Segítő' }
]

export default function JudgeRegistration() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    grade: '',
    classLetter: '',
    competitions: [],
    rulesAccepted: false,
    privacyAccepted: false
  })
  const [errors, setErrors] = useState({})
  const [submitMessage, setSubmitMessage] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false)
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isPosterModalOpen) {
        setIsPosterModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPosterModalOpen])

  const requiredFields = {
    name: 'A név kitöltése kötelező.',
    email: 'Az email cím kitöltése kötelező.',
    grade: 'Az évfolyam kiválasztása kötelező.',
    classLetter: 'A betűjel kiválasztása kötelező.',
    rulesAccepted: 'A szabályzat és a bírói kivonat elfogadása kötelező.',
    privacyAccepted: 'Az adatkezelési tájékoztató és a képmás-/videófelvétel-készítéshez való hozzájárulás elfogadása kötelező.'
  }

  const selectedClassFormatted = formData.grade && formData.classLetter
    ? `${formData.grade} / ${formData.classLetter}`
    : ''

  const requiredMark = (
    <span className="position-absolute top-50 end-0 translate-middle-y me-3 text-danger fw-bold pe-none">
      *
    </span>
  )

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const nextValue = type === 'checkbox' ? checked : value

    setFormData((prev) => ({
      ...prev,
      [name]: nextValue
    }))
    setSubmitMessage(null)

    if (value !== '' && (type !== 'checkbox' || checked)) {
      setErrors((prev) => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleCompetitionToggle = (competitionId) => {
    setFormData((prev) => {
      const currentList = Array.isArray(prev.competitions) ? prev.competitions : []
      const exists = currentList.includes(competitionId)
      const nextCompetitions = exists
        ? currentList.filter((id) => id !== competitionId)
        : [...currentList, competitionId]
      return {
        ...prev,
        competitions: nextCompetitions
      }
    })
    setSubmitMessage(null)
    setErrors((prev) => ({
      ...prev,
      competitions: ''
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitMessage(null)

    const validationErrors = Object.entries(requiredFields).reduce((acc, [fieldName, message]) => {
      const value = formData[fieldName]
      const isEmpty = typeof value === 'string'
        ? value.trim() === ''
        : typeof value === 'boolean'
          ? !value
          : value === ''

      if (isEmpty) {
        acc[fieldName] = message
      }

      return acc
    }, {})

    if (!Array.isArray(formData.competitions) || formData.competitions.length < 2) {
      validationErrors.competitions = 'Legalább 2 opciót (versenyszámot vagy a Segítő opciót) kötelező kiválasztani.'
    }

    const emailValue = typeof formData.email === 'string' ? formData.email.trim() : ''
    if (emailValue) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailPattern.test(emailValue)) {
        validationErrors.email = 'Kérjük, adj meg egy érvényes email címét.'
      }
    }

    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      setSubmitMessage({
        type: 'danger',
        text: 'A csillaggal megjelölt mezők kitöltése kötelező'
      })
      return
    }

    if (!isCaptchaVerified) {
      setSubmitMessage({
        type: 'danger',
        text: 'Kérjük, oldd meg a fenti puzzle biztonsági ellenőrzést a jelentkezés beküldéséhez!'
      })
      return
    }

    setIsSubmitting(true)

    const selectedRoles = formData.competitions
      .map((id) => COMPETITION_OPTIONS.find((c) => c.id === id)?.label || id)
      .join('; ')

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      class: `${formData.grade}/${formData.classLetter}`,
      selectedRoles: selectedRoles,
      isAccepted: 0
    }

    try {
      await submitApplication(payload)

      setFormData({
        name: '',
        email: '',
        grade: '',
        classLetter: '',
        competitions: [],
        rulesAccepted: false,
        privacyAccepted: false
      })
      setErrors({})
      setSubmitMessage({
        type: 'success',
        text: 'Sikeres regisztráció! A jelentkezésedet rögzítettük.'
      })
    } catch (error) {
      console.error('Hiba:', error)
      setSubmitMessage({
        type: 'danger',
        text: `Hiba történt a jelentkezés során: ${error.message}`
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mt-5 mb-5">
      {/* Plakát Lightbox Modal */}
      {isPosterModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
            zIndex: 2060,
            overflowY: 'auto'
          }}
          onClick={() => setIsPosterModalOpen(false)}
        >
          <button
            type="button"
            className="btn-close btn-close-white"
            aria-label="Bezárás"
            onClick={() => setIsPosterModalOpen(false)}
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              zIndex: 2070,
              fontSize: '1.5rem',
              cursor: 'pointer',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))'
            }}
          />
          <div
            className="modal-dialog modal-dialog-centered d-flex justify-content-center align-items-center"
            style={{ maxWidth: '95vw', margin: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src="/Images/versenybiroi_plakat.png"
              alt="Brickathlon versenybírói és segítői plakát"
              className="rounded-3 shadow-lg d-block"
              style={{
                maxHeight: '90vh',
                maxWidth: '92vw',
                objectFit: 'contain',
                cursor: 'default'
              }}
            />
          </div>
        </div>
      )}

      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
            <h2 className="mb-0">Bírói és Segítői Jelentkezés</h2>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-2"
              onClick={() => setIsPosterModalOpen(true)}
            >
              <i className="bi bi-file-earmark-image" />
              <span>Plakát megnyitása</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Név mező */}
            <div className="mb-3">
              <label htmlFor="name" className="form-label">Teljes név</label>
              <div className="position-relative">
                <input
                  type="text"
                  className={`form-control pe-4 ${errors.name ? 'border-danger' : ''}`}
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  placeholder="Minta Péter"
                />
                {requiredMark}
              </div>
              {errors.name && <div className="text-danger small mt-1">{errors.name}</div>}
            </div>

            {/* Email mező */}
            <div className="mb-3">
              <label htmlFor="email" className="form-label">Email cím</label>
              <div className="position-relative">
                <input
                  type="email"
                  className={`form-control pe-4 ${errors.email ? 'border-danger' : ''}`}
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  placeholder="minta.peter@gmail.com"
                />
                {requiredMark}
              </div>
              {errors.email && <div className="text-danger small mt-1">{errors.email}</div>}
            </div>

            {/* Osztály kiválasztása (9-13 és A-E, K -> 13 / A) */}
            <div className="mb-3">
              <label className="form-label">
                Osztály <span className="text-danger fw-bold">*</span>
              </label>
              <div className="row g-2">
                <div className="col-md-6">
                  <select
                    className={`form-select ${errors.grade ? 'border-danger' : ''}`}
                    id="grade"
                    name="grade"
                    value={formData.grade}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  >
                    <option value="">Évfolyam</option>
                    {GRADE_OPTIONS.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}. évfolyam
                      </option>
                    ))}
                  </select>
                  {errors.grade && <div className="text-danger small mt-1">{errors.grade}</div>}
                </div>

                <div className="col-md-6">
                  <select
                    className={`form-select ${errors.classLetter ? 'border-danger' : ''}`}
                    id="classLetter"
                    name="classLetter"
                    value={formData.classLetter}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  >
                    <option value="">Osztály betűjel</option>
                    {CLASS_LETTER_OPTIONS.map((letter) => (
                      <option key={letter} value={letter}>
                        {letter}
                      </option>
                    ))}
                  </select>
                  {errors.classLetter && <div className="text-danger small mt-1">{errors.classLetter}</div>}
                </div>
              </div>

              {selectedClassFormatted ? (
                <div className="text-muted small mt-1">
                  Kiválasztott osztály: <strong>{selectedClassFormatted}</strong>
                </div>
              ) : (
                <div className="text-muted small mt-1">
                  Formátum: pl. <strong>13 / A</strong>
                </div>
              )}
            </div>

            {/* Versenyszámok / Szerepkör kiválasztása */}
            <div className="mb-3">
              <label className="form-label d-block mb-1">
                Versenyszámok és szerepkör <span className="text-danger fw-bold">*</span>
                <span className="text-muted fw-normal ms-2 small">(legalább 2 opció kiválasztása kötelező)</span>
              </label>

              <div className="alert alert-info py-2 px-3 mb-2 d-flex align-items-center gap-2 small">
                <i className="bi bi-info-circle-fill flex-shrink-0 fs-5 text-primary" />
                <div>
                  Kérjük, válaszd ki azokat a versenyszámokat vagy szerepköröket (pl. <strong>Segítő</strong>), amelyek a leginkább érdekelnek! A végső beosztásodról emailben küldünk tájékoztatást.
                </div>
              </div>

              <div className={`p-3 bg-light border rounded ${errors.competitions ? 'border-danger' : ''}`}>
                <div className="row g-2">
                  {COMPETITION_OPTIONS.map((comp) => {
                    const isChecked = formData.competitions.includes(comp.id)
                    const isHelper = comp.id === 'segito'
                    return (
                      <div className={isHelper ? 'col-12' : 'col-12 col-sm-6'} key={comp.id}>
                        <div
                          className={`form-check p-2 border rounded bg-white d-flex align-items-center ${isChecked ? 'border-primary shadow-sm' : ''}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => !isSubmitting && handleCompetitionToggle(comp.id)}
                        >
                          <input
                            className="form-check-input ms-1"
                            type="checkbox"
                            id={`comp-${comp.id}`}
                            checked={isChecked}
                            onChange={() => handleCompetitionToggle(comp.id)}
                            disabled={isSubmitting}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <label
                            className="form-check-label ms-2 fw-semibold w-100"
                            htmlFor={`comp-${comp.id}`}
                            style={{ cursor: 'pointer' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isHelper ? 'Segítő (rendezvényi asszisztens)' : comp.label}
                          </label>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              {errors.competitions && (
                <div className="text-danger small mt-1">{errors.competitions}</div>
              )}
              <div className="text-muted small mt-1">
                Kiválasztva: <strong>{formData.competitions.length} / {COMPETITION_OPTIONS.length}</strong> (minimum 2 szükséges)
              </div>
            </div>

            {/* Dokumentumok letöltése és bírói felelősség */}
            <div className="mb-3 p-3 bg-light border rounded">
              <label className="form-label fw-bold mb-2">Bírói dokumentumok és szabályzat</label>
              <p className="text-muted small mb-3">
                Kérjük, a jelentkezés előtt tekintsd át a szabályzatot és az adatkezelési tájékoztatót!
              </p>
              <div className="d-flex flex-column flex-md-row flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm flex-fill d-inline-flex align-items-center justify-content-center"
                  onClick={() => setIsPosterModalOpen(true)}
                >
                  <i className="bi bi-file-earmark-image me-2" />
                  Plakát megnyitása
                </button>
                <a
                  href={JUDGE_DOCS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-secondary btn-sm flex-fill d-inline-flex align-items-center justify-content-center"
                >
                  <i className="bi bi-box-arrow-up-right me-2" />
                  Bírói dokumentumok (Google Drive)
                </a>
                <a
                  href={`${process.env.PUBLIC_URL}/rulebook/ADATKEZELÉSI TÁJÉKOZTATÓ ÉS NYILATKOZAT.pdf`}
                  download="ADATKEZELÉSI TÁJÉKOZTATÓ ÉS NYILATKOZAT.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-secondary btn-sm flex-fill d-inline-flex align-items-center justify-content-center"
                >
                  <i className="bi bi-file-earmark-pdf-fill me-2" />
                  Adatkezelési nyilatkozat letöltése (PDF)
                </a>
              </div>

              {/* Kötelező oktatónap és próbaverseny figyelmeztetés */}
              <div className="alert alert-warning border-warning d-flex align-items-start gap-2 mb-3 p-3">
                <i className="bi bi-calendar-event-fill flex-shrink-0 fs-5 mt-1 text-warning-emphasis" />
                <div className="small">
                  <strong>Fontos információ:</strong> A jelentkezések elbírálása után <strong>emailben értesítünk a pontos beosztásodról és feladataidról</strong>. Körülbelül <strong>egy héttel a verseny előtt</strong> egy felkészítő <strong>oktatónapot és próbaversenyt</strong> tartunk, amelyen a <strong>részvétel kötelező</strong> minden jelentkező számára (ennek részleteiről szintén emailt küldünk).
                </div>
              </div>

              {/* Fontos tudnivalók és felelősség */}
              <div className="card border-1 border-secondary mb-3 bg-white shadow-sm">
                <div className="card-body p-3">
                  <div className="d-flex align-items-center gap-2 mb-2 text-danger">
                    <i className="bi bi-shield-fill-exclamation fs-5" />
                    <h6 className="mb-0 fw-bold">Fontos tudnivalók és felelősségvállalás</h6>
                  </div>
                  <p className="small text-muted mb-2">
                    A Brickathlon versenybírói és segítői a verseny tisztaságáért, a szabályzat betartásáért és a rendezvény gördülékeny lebonyolításáért felelnek. Kérjük, csak akkor nyújtsd be a jelentkezést, ha az alábbi feltételeket maradéktalanul vállalod:
                  </p>
                  <ul className="small mb-0 ps-3 d-grid gap-1">
                    <li>
                      <strong>Beosztás és felkészítő alkalom:</strong> A jelentkezések feldolgozása után emailben kapod meg a pontos szerepkörödet és beosztásodat. A verseny előtti felkészítőn a részvétel kötelező.
                    </li>
                    <li>
                      <strong>Kötelező jelenlét és pontosság:</strong> A feladatok ellátása a versenynap teljes időtartama alatt felelősségteljes jelenlétet kíván.
                    </li>
                    <li>
                      <strong>Pártatlanság és sportszerűség:</strong> Minden résztvevő felé objektív, segítőkész és következetes hozzáállást várunk el.
                    </li>
                    <li>
                      <strong>Szabályismeret:</strong> A versenyszabályzat és a bírói segédlet alapos megismerése elengedhetetlen.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Elfogadó jelölőnégyzetek */}
              <div className="form-check mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="rulesAccepted"
                  name="rulesAccepted"
                  checked={formData.rulesAccepted}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <label className="form-check-label small" htmlFor="rulesAccepted">
                  Elolvastam a bírói kivonatot és a versenyszabályzatot, és elfogadom az azokban foglaltakat. <span className="text-danger fw-bold">*</span>
                </label>
                {errors.rulesAccepted && (
                  <div className="text-danger small mt-1">{errors.rulesAccepted}</div>
                )}
              </div>

              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="privacyAccepted"
                  name="privacyAccepted"
                  checked={formData.privacyAccepted}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <label className="form-check-label small" htmlFor="privacyAccepted">
                  Elfogadom az adatkezelési tájékoztatót, és hozzájárulok ahhoz, hogy a rendezvényen rólam fényképek és videófelvételek készüljenek, melyeket a szervezők a verseny bemutatására felhasználhatnak. <span className="text-danger fw-bold">*</span>
                </label>
                {errors.privacyAccepted && (
                  <div className="text-danger small mt-1">{errors.privacyAccepted}</div>
                )}
              </div>
            </div>

            {/* Puzzle Captcha botvédelem */}
            <div className="d-flex justify-content-center mb-3">
              <PuzzleCaptcha
                isVerified={isCaptchaVerified}
                onVerify={(verified) => setIsCaptchaVerified(verified)}
                onReset={() => setIsCaptchaVerified(false)}
              />
            </div>

            <FloatingFeedback message={submitMessage} onClose={() => setSubmitMessage(null)} />

            <button
              type="submit"
              className="btn btn-primary w-100 py-2 fs-5 fw-bold"
              disabled={isSubmitting || !isCaptchaVerified}
            >
              {isSubmitting ? 'Regisztráció...' : 'Regisztráció'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
