import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { STATUSES, TECHNICIANS } from '../data/mockData'
import { copyText, formatDate, getPriorityClass, getStatusStyle, timeAgo } from '../utils/helpers'

// Render with `key={ticket.id}` so local edit state resets when a different ticket is opened.
export default function TicketDetailModal({ ticket, onClose, isAdmin = false, onStatusChange, onDelete, onUpdateTicket }) {
  const [notes, setNotes] = useState(ticket.adminNotes || '')
  const [assignee, setAssignee] = useState(ticket.assignedTo || 'Unassigned')
  const [dirty, setDirty] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef(null)
  const closeBtn = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    closeBtn.current?.focus()
    return () => clearTimeout(copyTimer.current)
  }, [])

  const status = getStatusStyle(ticket.status)
  const currentStep = STATUSES.indexOf(ticket.status)

  const handleCopy = async () => {
    if (await copyText(ticket.id)) {
      setCopied(true)
      clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleStatus = (next) => {
    if (next === ticket.status) return
    // Only attach a note to the history entry if the admin actually edited it.
    if (onStatusChange(ticket.id, next, dirty ? notes : '', assignee)) setDirty(false)
  }

  const cancelEdits = () => {
    setNotes(ticket.adminNotes || '')
    setAssignee(ticket.assignedTo || 'Unassigned')
    setDirty(false)
  }

  const saveEdits = () => {
    if (onUpdateTicket(ticket.id, { adminNotes: notes, assignedTo: assignee })) setDirty(false)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container ticket-detail-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-modal-title"
      >
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="ticket-modal-id-wrap">
              <span className="modal-ticket-id">{ticket.id}</span>
              <button type="button" className="copy-mini-btn" onClick={handleCopy} title="Copy Ticket ID">
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <span
              className="status-pill-badge"
              style={{ backgroundColor: status.bg, color: status.color, borderColor: status.borderColor }}
            >
              <span className="status-dot" style={{ backgroundColor: status.dotColor }} />
              {ticket.status}
            </span>
            <span className={`priority-tag ${getPriorityClass(ticket.priority)}`}>{ticket.priority} Priority</span>
          </div>
          <button type="button" ref={closeBtn} className="modal-close-btn" onClick={onClose} aria-label="Close dialog">×</button>
        </div>

        <div className="modal-body">
          <div className="status-stepper-wrap">
            <div className="stepper-track">
              {STATUSES.map((label, i) => {
                const reached = i <= currentStep
                return (
                  <div key={label} className={`stepper-step ${reached ? 'completed' : ''} ${i === currentStep ? 'current' : ''}`}>
                    <div className="step-circle">{reached && i < currentStep ? <Icon name="check" strokeWidth={3} /> : i + 1}</div>
                    <span className="step-label">{label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <h2 id="ticket-modal-title" className="ticket-detail-title">{ticket.title}</h2>

          <div className="ticket-meta-grid">
            <div className="meta-card">
              <span className="meta-card-label">Submitter</span>
              <span className="meta-card-val font-semibold">{ticket.submitterName}</span>
              <span className="meta-card-sub">{ticket.submitterRole} • {ticket.submitterEmail}</span>
            </div>
            <div className="meta-card">
              <span className="meta-card-label">Department</span>
              <span className="meta-card-val">{ticket.department}</span>
              <span className="meta-card-sub">Category: {ticket.category}</span>
            </div>
            <div className="meta-card">
              <span className="meta-card-label">Building / Location</span>
              <span className="meta-card-val">{ticket.location}</span>
              <span className="meta-card-sub">Submitted: {timeAgo(ticket.createdAt)}</span>
            </div>
            <div className="meta-card">
              <span className="meta-card-label">Assigned Technician</span>
              <span className="meta-card-val">{ticket.assignedTo || 'Unassigned'}</span>
              <span className="meta-card-sub">Updated: {formatDate(ticket.updatedAt)}</span>
            </div>
          </div>

          <div className="detail-section">
            <h4 className="detail-section-heading">Detailed Description</h4>
            <div className="detail-description-box">{ticket.description}</div>
          </div>

          {isAdmin && (
            <div className="admin-controls-card">
              <div className="admin-card-header">
                <div className="admin-card-title">
                  <Icon name="gear" />
                  <span>Admin Triage &amp; Status Actions</span>
                </div>
              </div>

              <div className="status-action-group">
                <span className="status-action-label">Change Status:</span>
                <div className="status-buttons-row">
                  {[
                    ['Pending', 'btn-status-pending'],
                    ['In Progress', 'btn-status-progress'],
                    ['Resolved', 'btn-status-resolved'],
                  ].map(([label, cls]) => (
                    <button key={label} type="button" className={`btn-status-toggle ${cls} ${ticket.status === label ? 'active' : ''}`} onClick={() => handleStatus(label)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="admin-edit-row">
                <div className="form-group" style={{ flex: '1', minWidth: '220px' }}>
                  <label htmlFor="modal-assignee" className="form-label">Assign Technician</label>
                  <select id="modal-assignee" className="form-select" value={assignee}
                    onChange={(e) => { setAssignee(e.target.value); setDirty(true) }}>
                    {(TECHNICIANS.includes(assignee) ? TECHNICIANS : [...TECHNICIANS, assignee]).map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ flex: '2', minWidth: '260px' }}>
                  <label htmlFor="modal-admin-note" className="form-label">Staff Resolution Notes / Status Comment</label>
                  <input type="text" id="modal-admin-note" className="form-input"
                    placeholder="e.g. Dispatched hardware technician to replace power cable..."
                    value={notes} onChange={(e) => { setNotes(e.target.value); setDirty(true) }} />
                </div>
              </div>

              {dirty && (
                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={cancelEdits}>Cancel</button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={saveEdits}>Save Changes</button>
                </div>
              )}
            </div>
          )}

          {!isAdmin && ticket.adminNotes && (
            <div className="detail-section">
              <h4 className="detail-section-heading">Helpdesk Staff Response</h4>
              <div className="staff-note-callout">
                <div className="staff-note-icon"><Icon name="message" /></div>
                <div className="staff-note-text">
                  <p>{ticket.adminNotes}</p>
                  <span className="staff-note-author">• Assigned: {ticket.assignedTo || 'Campus Helpdesk'}</span>
                </div>
              </div>
            </div>
          )}

          {ticket.history && ticket.history.length > 0 && (
            <div className="detail-section">
              <h4 className="detail-section-heading">Status Activity &amp; History</h4>
              <div className="history-timeline">
                {ticket.history.map((entry, i) => (
                  <div key={i} className="timeline-item">
                    <div className="timeline-marker" />
                    <div className="timeline-content">
                      <div className="timeline-row">
                        <span className="timeline-status">{entry.status}</span>
                        <span className="timeline-time">{formatDate(entry.timestamp)}</span>
                      </div>
                      {entry.note && <p className="timeline-note">{entry.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {isAdmin && (
            <div className="footer-left">
              {confirmDelete ? (
                <div className="delete-confirm-group">
                  <span className="delete-confirm-text">Permanently delete this ticket?</span>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => { if (onDelete(ticket.id)) onClose() }}>Confirm Delete</button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
                </div>
              ) : (
                <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setConfirmDelete(true)}>
                  <Icon name="trash" />
                  Delete Ticket
                </button>
              )}
            </div>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
