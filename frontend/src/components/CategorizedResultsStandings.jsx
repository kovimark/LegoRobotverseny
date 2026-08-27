import React, { useState } from 'react'
import AgeGroupBadge from './AgeGroupBadge'

export default function CategorizedResultsStandings({ title, rows, columns, getKey, emptyText, tableWrapperClassName = '' }) {
  const [showCategories, setShowCategories] = useState(false)
  const sections = showCategories
    ? [
        { key: 'primary', title: `${title} – Általános iskolás`, rows: rows.filter((row) => Number(row.category) === 0) },
        { key: 'secondary', title: `${title} – Középiskolás`, rows: rows.filter((row) => Number(row.category) === 1) }
      ]
    : [{ key: 'all', title, rows }]

  const calculatedMinWidth = `${Math.max(50, 14 + columns.length * 6.5)}rem`

  return (
    <section className="card shadow-sm team-card no-hover-card mb-4">
      <div className="card-body p-3 p-md-4" style={{ minWidth: 0 }}>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
          <div>
            <h5 className="mb-0">Aktuális sorrend</h5>
            <div className="small text-muted mt-1">{title}</div>
          </div>
          <div className="form-check form-switch">
            <input
              id={`${title.replace(/\W+/g, '-').toLowerCase()}-category-toggle`}
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={showCategories}
              onChange={(event) => setShowCategories(event.target.checked)}
            />
            <label className="form-check-label" htmlFor={`${title.replace(/\W+/g, '-').toLowerCase()}-category-toggle`}>
              Korosztálybontásos eredmények megtekintése
            </label>
          </div>
        </div>

        <div className="d-grid gap-4" style={{ minWidth: 0 }}>
          {sections.map((section) => (
            <section key={section.key} style={{ minWidth: 0 }}>
              {showCategories && (
                <h6 className="mb-2 fw-bold text-primary">
                  {section.key === 'primary' ? 'Általános iskolás kategória' : 'Középiskolás kategória'}
                </h6>
              )}

              {section.rows.length > 0 ? (
                <>
                  <div className="scoring-table-hint text-muted small mb-1">
                    <i className="bi bi-arrows me-1" />
                    A teljes táblázathoz és az összes oszlophoz görgess oldalra.
                  </div>
                  <div
                    className={`table-responsive scoring-table-scroll ${tableWrapperClassName}`.trim()}
                    tabIndex="0"
                    style={{
                      display: 'block',
                      width: '100%',
                      maxWidth: '100%',
                      minWidth: 0,
                      overflowX: 'auto',
                      WebkitOverflowScrolling: 'touch'
                    }}
                  >
                    <table
                      className="table table-sm table-hover align-middle mb-0 scoring-results-table"
                      style={{
                        minWidth: calculatedMinWidth,
                        width: '100%',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <thead className="table-light">
                        <tr>
                          <th className="text-center" style={{ width: '3.5rem' }}>#</th>
                          {columns.map((column) => (
                            <th className={column.align === 'end' ? 'text-end' : ''} key={column.key}>
                              {column.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.rows.map((row, index) => (
                          <tr key={getKey(row, index)} className={row.isQualifier ? 'table-success' : ''}>
                            <td className="text-center fw-bold text-muted">{index + 1}</td>
                            {columns.map((column) => (
                              <td className={column.align === 'end' ? 'text-end' : ''} key={column.key}>
                                {column.key === 'team' && <AgeGroupBadge category={row.category} className="me-2" />}
                                {column.render ? column.render(row, index) : row[column.key]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="alert alert-secondary mb-0">
                  {showCategories ? 'Ebben a korosztályban még nincs eredmény.' : (emptyText || 'Még nincs rögzített eredmény.')}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </section>
  )
}
