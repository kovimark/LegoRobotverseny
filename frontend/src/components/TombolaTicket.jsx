import React from 'react';
import './TombolaTicket.css';

export default function TombolaTicket({ ticket, compact = false, isWinner: isWinnerProp }) {
  if (!ticket) return null;

  const isWinner = Boolean(isWinnerProp ?? (ticket.isWinner || Number(ticket.isPulledOut) === 1));

  return (
    <article className={`tombola-ticket-card ${isWinner ? 'is-winner' : ''} ${compact ? 'is-compact' : ''}`}>
      {/* Bal oldali csonk (Stub) - nyertes esetén arany/borostyán színű */}
      <div className="ticket-stub">
        <div className="ticket-brand">BRICKATHLON</div>
        <div className="ticket-sub">TOMBOLA</div>
      </div>

      {/* Perforált választóvonal */}
      <div className="ticket-perforation">
        <span className="perf-notch top-notch"></span>
        <span className="perf-line"></span>
        <span className="perf-notch bottom-notch"></span>
      </div>

      {/* Fő szelvény test */}
      <div className="ticket-body">
        <div className="ticket-header-row">
          <span className="ticket-badge">
            <i className={`bi ${isWinner ? 'bi-trophy-fill text-warning' : 'bi-ticket-perforated'} me-1`} />
            {isWinner ? 'Nyertes szelvény' : 'Hivatalos szelvény'}
          </span>
        </div>

        {/* Hatalmas tombolakód */}
        <div className="ticket-code-display">
          <span className="ticket-code-label">SZELVÉNYSZÁM:</span>
          <div className="ticket-code-number">{ticket.code}</div>
        </div>
      </div>
    </article>
  );
}
