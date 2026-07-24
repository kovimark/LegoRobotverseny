import React from 'react'

export default function AgeGroupBadge({ category, className = '' }) {
  const isSecondary = Number(category) === 1
  const label = isSecondary ? 'Középiskolás' : 'Általános iskolás'
  return <span className={`badge age-group-badge ${isSecondary ? 'text-bg-primary' : 'text-bg-success'} ${className}`} title={label} aria-label={label}>{isSecondary ? 'K' : 'Á'}</span>
}
