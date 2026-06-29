import React, { useState } from 'react'

export default function CompetitionRegistration() {
  const [formData, setFormData] = useState({
    id: 0,
    teamName: '',
    emailAddress: '',
    teamMember1Name: '',
    teamMember2Name: '',
    teamMember1Age: '',
    teamMember2Age: '',
    teamCoach1: '',
    teamCoach2: '',
    schoolName: ''
  })
  const [errors, setErrors] = useState({})
  const [submitMessage, setSubmitMessage] = useState(null)

  const requiredFields = {
    schoolName: 'Az iskola nevének kitöltése kötelező.',
    teamName: 'A csapatnév kitöltése kötelező.',
    emailAddress: 'Az emailcím kitöltése kötelező.',
    teamMember1Name: 'Az 1. tag nevének kitöltése kötelező.',
    teamMember1Age: 'Az 1. tag életkorának kitöltése kötelező.',
    teamMember2Name: 'A 2. tag nevének kitöltése kötelező.',
    teamMember2Age: 'A 2. tag életkorának kitöltése kötelező.',
    teamCoach1: 'Az 1. felkészítő tanár nevének kitöltése kötelező.',
  }

  const requiredMark = (
    <span className="position-absolute top-50 end-0 translate-middle-y me-3 text-danger fw-bold pe-none">
      *
    </span>
  )

  const handleChange = (e) => {
    const { name, value } = e.target
    const parsedValue = name.includes('Age') && value !== '' ? Number(value) : value

    setFormData(prev => ({
      ...prev,
      [name]: parsedValue
    }))
    setSubmitMessage(null)

    if (value !== '') {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitMessage(null)

    const validationErrors = Object.entries(requiredFields).reduce((acc, [fieldName, message]) => {
      const value = formData[fieldName]
      const isEmpty = typeof value === 'string' ? value.trim() === '' : value === ''

      if (isEmpty) {
        acc[fieldName] = message
      }

      return acc
    }, {})

    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      setSubmitMessage({
        type: 'danger',
        text: 'A csillaggal megjelölt mezők kitöltése kötelező'
      })
      return
    }

    try {
      const response = await fetch('http://legocompetition.runasp.net/api/Teams', {
        method: 'POST',
        headers: {
          accept: '*/*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'A szerver nem fut vagy nem tudom')
      }

      setFormData({
        id: 0,
        teamName: '',
        emailAddress: '',
        teamMember1Name: '',
        teamMember2Name: '',
        teamMember1Age: '',
        teamMember2Age: '',
        teamCoach1: '',
        teamCoach2: '',
        schoolName: ''
      })
      setErrors({})
      setSubmitMessage({
        type: 'success',
        text: 'Sikeres regisztráció!'
      })
    } catch (error) {
      console.error('Hiba:', error)
      setSubmitMessage({
        type: 'danger',
        text: `Hiba történt a jelentkezés során: ${error.message}`
      })
    }
  }

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <h2 className="mb-4">Verseny Jelentkezés</h2>
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="teamName" className="form-label">Csapatnév</label>
              <div className="position-relative">
                <input
                  type="text"
                  className={`form-control pe-4 ${errors.teamName ? 'border-danger' : ''}`}
                  id="teamName"
                  name="teamName"
                  value={formData.teamName}
                  onChange={handleChange}
                />
                {requiredMark}
              </div>
              {errors.teamName && <div className="text-danger small mt-1">{errors.teamName}</div>}
            </div>

            <div className="mb-3">
              <label htmlFor="schoolName" className="form-label">Iskola neve</label>
              <div className="position-relative">
                <input
                  type="text"
                  className={`form-control pe-4 ${errors.schoolName ? 'border-danger' : ''}`}
                  id="schoolName"
                  name="schoolName"
                  value={formData.schoolName}
                  onChange={handleChange}
                />
                {requiredMark}
              </div>
              {errors.schoolName && <div className="text-danger small mt-1">{errors.schoolName}</div>}
            </div>

            <div className="mb-3">
              <label htmlFor="emailAddress" className="form-label">Email</label>
              <div className="position-relative">
                <input
                  type="email"
                  className={`form-control pe-4 ${errors.emailAddress ? 'border-danger' : ''}`}
                  id="emailAddress"
                  name="emailAddress"
                  value={formData.emailAddress}
                  onChange={handleChange}
                />
                {requiredMark}
              </div>
              {errors.emailAddress && <div className="text-danger small mt-1">{errors.emailAddress}</div>}
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label htmlFor="teamMember1Name" className="form-label">1. Tag Neve</label>
                <div className="position-relative">
                  <input
                    type="text"
                    className={`form-control pe-4 ${errors.teamMember1Name ? 'border-danger' : ''}`}
                    id="teamMember1Name"
                    name="teamMember1Name"
                    value={formData.teamMember1Name}
                    onChange={handleChange}
                  />
                  {requiredMark}
                </div>
                {errors.teamMember1Name && <div className="text-danger small mt-1">{errors.teamMember1Name}</div>}
              </div>
              <div className="col-md-6 mb-3">
                <label htmlFor="teamMember1Age" className="form-label">1. Tag Életkora</label>
                <div className="position-relative">
                  <input
                    type="number"
                    className={`form-control pe-4 ${errors.teamMember1Age ? 'border-danger' : ''}`}
                    id="teamMember1Age"
                    name="teamMember1Age"
                    value={formData.teamMember1Age}
                    onChange={handleChange}
                  />
                  {requiredMark}
                </div>
                {errors.teamMember1Age && <div className="text-danger small mt-1">{errors.teamMember1Age}</div>}
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label htmlFor="teamMember2Name" className="form-label">2. Tag Neve</label>
                <div className="position-relative">
                  <input
                    type="text"
                    className={`form-control pe-4 ${errors.teamMember2Name ? 'border-danger' : ''}`}
                    id="teamMember2Name"
                    name="teamMember2Name"
                    value={formData.teamMember2Name}
                    onChange={handleChange}
                  />
                  {requiredMark}
                </div>
                {errors.teamMember2Name && <div className="text-danger small mt-1">{errors.teamMember2Name}</div>}
              </div>
              <div className="col-md-6 mb-3">
                <label htmlFor="teamMember2Age" className="form-label">2. Tag Életkora</label>
                <div className="position-relative">
                  <input
                    type="number"
                    className={`form-control pe-4 ${errors.teamMember2Age ? 'border-danger' : ''}`}
                    id="teamMember2Age"
                    name="teamMember2Age"
                    value={formData.teamMember2Age}
                    onChange={handleChange}
                  />
                  {requiredMark}
                </div>
                {errors.teamMember2Age && <div className="text-danger small mt-1">{errors.teamMember2Age}</div>}
              </div>

            </div>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label htmlFor="teamCoach1" className="form-label">1. Felkészítő Tanár Neve</label>
                <div className="position-relative">
                  <input
                    type="text"
                    className={`form-control pe-4 ${errors.teamCoach1 ? 'border-danger' : ''}`}
                    id="teamCoach1"
                    name="teamCoach1"
                    value={formData.teamCoach1}
                    onChange={handleChange}
                  />
                  {requiredMark}
                </div>
                {errors.teamCoach1 && <div className="text-danger small mt-1">{errors.teamCoach1}</div>}
              </div>
              <div className="col-md-6 mb-3">
                <label htmlFor="teamCoach2" className="form-label">2. Felkészítő Tanár Neve (Opcionális)</label>
                <input
                  type="text"
                  className="form-control"
                  id="teamCoach2"
                  name="teamCoach2"
                  value={formData.teamCoach2}
                  onChange={handleChange}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-100">Jelentkezés</button>
            {submitMessage && (
              <div className={`alert alert-${submitMessage.type} mt-3 mb-0`} role="alert">
                {submitMessage.text}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
