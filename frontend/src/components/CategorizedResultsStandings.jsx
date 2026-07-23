import React, { useState } from 'react'

export default function CategorizedResultsStandings({ title, rows, columns, getKey, emptyText }) {
  const [showCategories, setShowCategories] = useState(false)
  const sections = showCategories
    ? [
        { key: 'primary', title: `${title} – Általános iskolás`, rows: rows.filter((row) => Number(row.category) === 0) },
        { key: 'secondary', title: `${title} – Középiskolás`, rows: rows.filter((row) => Number(row.category) === 1) }
      ]
    : [{ key: 'all', title, rows }]

  return (
    <section className="card shadow-sm team-card no-hover-card mb-4">
      <div className="card-body p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
          <div><h5 className="mb-0">Aktuális sorrend</h5><div className="small text-muted mt-1">{title}</div></div>
          <div className="form-check form-switch"><input id={`${title.replace(/\W+/g, '-').toLowerCase()}-category-toggle`} className="form-check-input" type="checkbox" role="switch" checked={showCategories} onChange={(event) => setShowCategories(event.target.checked)} /><label className="form-check-label" htmlFor={`${title.replace(/\W+/g, '-').toLowerCase()}-category-toggle`}>Korosztálybontásos eredmények megtekintése</label></div>
        </div>
        <div className="d-grid gap-4">{sections.map((section) => <section key={section.key}>{showCategories && <h6 className="mb-2">{section.key === 'primary' ? 'Általános iskolás' : 'Középiskolás'}</h6>}{section.rows.length > 0 ? <div className="table-responsive"><table className="table table-sm align-middle mb-0"><thead><tr><th className="text-center">#</th>{columns.map((column) => <th className={column.align === 'end' ? 'text-end' : ''} key={column.key}>{column.label}</th>)}</tr></thead><tbody>{section.rows.map((row, index) => <tr key={getKey(row, index)} className={row.isQualifier ? 'table-success' : ''}><td className="text-center fw-bold">{index + 1}</td>{columns.map((column) => <td className={column.align === 'end' ? 'text-end' : ''} key={column.key}>{column.render ? column.render(row, index) : row[column.key]}</td>)}</tr>)}</tbody></table></div> : <div className="alert alert-secondary mb-0">{showCategories ? 'Ebben a korosztályban még nincs eredmény.' : (emptyText || 'Még nincs rögzített eredmény.')}</div>}</section>)}</div>
      </div>
    </section>
  )
}
