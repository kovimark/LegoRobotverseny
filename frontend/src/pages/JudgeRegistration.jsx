import React, { useState } from 'react'
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
  { id: 'kosarra-dobas', label: 'Kosárra dobás' }
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

    // Check at least 2 competitions selected
    if (!Array.isArray(formData.competitions) || formData.competitions.length < 2) {
      validationErrors.competitions = 'Legalább 2 versenyszámot kötelező kiválasztani.'
    }

    const emailValue = typeof formData.email === 'string' ? formData.email.trim() : ''
    if (emailValue) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailPattern.test(emailValue)) {
        validationErrors.email = 'Kérjük, adj meg egy érvényes email címet.'
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
        text: 'Sikeres regisztráció! A bírói jelentkezésedet rögzítettük.'
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
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <h2 className="mb-4">Bírói Jelentkezés</h2>

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

            {/* Versenyszámok kiválasztása (legalább 2) */}
            <div className="mb-3">
              <label className="form-label d-block">
                Versenyszámok <span className="text-danger fw-bold">*</span>
                <span className="text-muted fw-normal ms-2 small">(legalább 2 versenyszámot kötelező választani)</span>
              </label>
              <div className={`p-3 bg-light border rounded ${errors.competitions ? 'border-danger' : ''}`}>
                <div className="row g-2">
                  {COMPETITION_OPTIONS.map((comp) => {
                    const isChecked = formData.competitions.includes(comp.id)
                    return (
                      <div className="col-12 col-sm-6" key={comp.id}>
                        <div
                          className={`form-check p-2 border rounded bg-white ${isChecked ? 'border-primary shadow-sm' : ''}`}
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
                            className="form-check-label ms-2 fw-semibold"
                            htmlFor={`comp-${comp.id}`}
                            style={{ cursor: 'pointer' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {comp.label}
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
                <a
                  href={JUDGE_DOCS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-primary btn-sm flex-fill d-inline-flex align-items-center justify-content-center"
                >
                  <i className="bi bi-box-arrow-up-right me-2" />
                  Bírói dokumentumok (Google Drive)
                </a>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm flex-fill d-inline-flex align-items-center justify-content-center"
                  onClick={() => setSubmitMessage({ type: 'info', text: 'Az adatkezelési tájékoztató dokumentuma hamarosan letölthető.' })}
                >
                  <i className="bi bi-file-earmark-text me-2" />
                  Adatkezelési tájékoztató letöltése
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm flex-fill d-inline-flex align-items-center justify-content-center"
                  onClick={() => setSubmitMessage({ type: 'info', text: 'A képmás- és médiatárolási hozzájárulási nyilatkozat hamarosan letölthető.' })}
                >
                  <i className="bi bi-camera-video me-2" />
                  Képmás és médiatárolási nyilatkozat letöltése
                </button>
              </div>

              {/* Fontos tudnivalók és bírói felelősség a checkbox felett */}
              <div className="card border-1 border-secondary mb-3 bg-white shadow-sm">
                <div className="card-body p-3">
                  <div className="d-flex align-items-center gap-2 mb-2 text-danger">
                    <i className="bi bi-shield-fill-exclamation fs-5" />
                    <h6 className="mb-0 fw-bold">Fontos tudnivalók és bírói felelősség</h6>
                  </div>
                  <p className="small text-muted mb-2">
                    A Brickathlon versenybírói a verseny tisztaságáért, a szabályzat betartásáért és a hivatalos pontok hiteles rögzítéséért felelnek. Kérjük, csak akkor nyújtsd be a jelentkezést, ha az alábbi feltételeket maradéktalanul vállalod:
                  </p>
                  <ul className="small mb-0 ps-3 d-grid gap-1">
                    <li>
                      <strong>Kötelező jelenlét és pontosság:</strong> A bírói feladatok ellátása a versenynap teljes időtartama alatt kötelező és felelősségteljes jelenlétet kíván.
                    </li>
                    <li>
                      <strong>Szigorú pártatlanság:</strong> Minden bíró köteles abszolút objektíven és befolyásmentesen bíráskodni, függetlenül az érintett csapatoktól vagy iskoláktól.
                    </li>
                    <li>
                      <strong>Szabályismeret kötelező:</strong> A jelentkezés feltétele a hivatalos versenyszabályzat és a bírói kézikönyv előzetes, alapos áttanulmányozása.
                    </li>
                    <li>
                      <strong>Digitális pontozás és adminisztráció:</strong> A bírók önállóan és hibamentesen rögzítik a próbálkozásokat, időket és meccseredményeket a bírói felületen.
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
              className="btn btn-primary w-100"
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
