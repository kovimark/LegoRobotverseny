import React from 'react'

export default function ResultsStandingsTable({ title = 'Aktuális eredménytábla', rows, columns, getKey, emptyText = 'Még nincs rögzített eredmény.' }) {
  return (
    <section className="card shadow-sm team-card no-hover-card mb-4">
      <div className="card-body p-3 p-md-4">
        <h4 className="h5 mb-3">{title}</h4>
        {rows.length > 0 ? <><div className="scoring-table-hint d-md-none"><i className="bi bi-arrows me-1" />A teljes táblázathoz húzd oldalra.</div><div className="table-responsive scoring-table-scroll" tabIndex="0"><table className="table table-sm align-middle mb-0 scoring-results-table" style={{ minWidth: `${Math.max(42, 12 + columns.length * 7)}rem` }}><thead><tr><th className="text-center">#</th>{columns.map((column) => <th className={column.align === 'end' ? 'text-end' : ''} key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={getKey(row, index)} className={row.isQualifier ? 'table-success' : ''}><td className="text-center fw-bold">{index + 1}</td>{columns.map((column) => <td className={column.align === 'end' ? 'text-end' : ''} key={column.key}>{column.render ? column.render(row, index) : row[column.key]}</td>)}</tr>)}</tbody></table></div></> : <div className="alert alert-secondary mb-0">{emptyText}</div>}
      </div>
    </section>
  )
}
