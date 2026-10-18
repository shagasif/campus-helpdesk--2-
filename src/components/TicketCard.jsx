import Icon from './Icon'
import { STATUSES } from '../data/mockData'
import { getPriorityClass, getStatusStyle, timeAgo } from '../utils/helpers'

export default function TicketCard({ ticket, onSelect, isAdmin = false, onQuickStatusChange }) {
  const status = getStatusStyle(ticket.status)

  return (
    <div
      className={`ticket-card status-border-${ticket.status.toLowerCase().replace(/\s+/g, '-')}`}
      onClick={() => onSelect(ticket)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(ticket)
        }
      }}
    >
      <div className="ticket-card-top">
        <div className="ticket-card-header-left">
          <span className="ticket-code-tag">{ticket.id}</span>
          <span className="ticket-category-tag">{ticket.category}</span>
        </div>
        <div className="ticket-card-header-right">
          <span className={`priority-tag ${getPriorityClass(ticket.priority)}`}>{ticket.priority}</span>
          <span
            className="status-pill-badge"
            style={{ backgroundColor: status.bg, color: status.color, borderColor: status.borderColor }}
          >
            <span className="status-dot" style={{ backgroundColor: status.dotColor }} />
            {ticket.status}
          </span>
        </div>
      </div>

      <h3 className="ticket-card-title">{ticket.title}</h3>
      <p className="ticket-card-desc">{ticket.description}</p>

      <div className="ticket-card-meta">
        <div className="meta-item location-item">
          <Icon name="pin" />
          <span>{ticket.location}</span>
        </div>
        <div className="meta-item submitter-item">
          <Icon name="user" />
          <span>{ticket.submitterName} ({ticket.department})</span>
        </div>
        <div className="meta-item time-item">
          <Icon name="clock" />
          <span>{timeAgo(ticket.createdAt)}</span>
        </div>
      </div>

      {isAdmin && onQuickStatusChange && (
        <div className="ticket-card-admin-bar" onClick={(e) => e.stopPropagation()}>
          <span className="admin-bar-label">Quick Status:</span>
          <select
            className="status-inline-select"
            value={ticket.status}
            onChange={(e) => onQuickStatusChange(ticket.id, e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
