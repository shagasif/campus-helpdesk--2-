import { useMemo, useState } from 'react'
import Icon from './Icon'
import TicketCard from './TicketCard'
import TicketDetailModal from './TicketDetailModal'

const FILTERS = ['All', 'Pending', 'In Progress', 'Resolved']

const WORKFLOW = [
  { cls: 'pending', n: '1', title: 'Pending', text: 'Logged in queue & awaiting assignment' },
  { cls: 'progress', n: '2', title: 'In Progress', text: 'Technician assigned & actively investigating' },
  { cls: 'resolved', n: '3', title: 'Resolved', text: 'Repairs completed & verified by staff' },
]

// Mount with `key={initialTicketId}` so a newly created ticket pre-fills the search and opens.
export default function TrackTickets({ tickets, initialTicketId = '', onNavigateToSubmit }) {
  const [query, setQuery] = useState(initialTicketId)
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedId, setSelectedId] = useState(initialTicketId || null)

  const selected = tickets.find((t) => t.id === selectedId) || null

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return tickets.filter((t) => {
      if (statusFilter !== 'All' && t.status !== statusFilter) return false
      if (!q) return true
      return (
        t.id.toLowerCase().includes(q) ||
        (t.submitterEmail || '').toLowerCase().includes(q) ||
        t.submitterName.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q)
      )
    })
  }, [tickets, statusFilter, query])

  return (
    <div className="track-tickets-container">
      <div className="section-hero-card">
        <div className="hero-text-col">
          <div className="hero-pill"><span className="pulsing-dot" />Public Ticket Tracker</div>
          <h1 className="hero-title">Track Campus Issue Progress</h1>
          <p className="hero-description">
            Search for your ticket by Reference ID (e.g. <code>TICK-1042</code>) or campus email to see live status
            updates, assigned technicians, and resolution notes.
          </p>
        </div>
        <div className="hero-stats-quick">
          <button type="button" className="btn btn-primary" onClick={onNavigateToSubmit}>Submit New Issue</button>
        </div>
      </div>

      <div className="search-filter-card">
        <div className="track-search-row">
          <div className="track-search-input-box">
            <Icon name="search" />
            <input type="text" placeholder="Search by Ticket ID (e.g. TICK-1042) or your email address..."
              aria-label="Search tickets" value={query} onChange={(e) => setQuery(e.target.value)} className="track-input" />
            {query && (
              <button type="button" className="clear-search-btn" onClick={() => setQuery('')} aria-label="Clear search">×</button>
            )}
          </div>
        </div>
        <div className="track-status-filter-pills">
          <span className="filter-label">Filter Status:</span>
          {FILTERS.map((f) => (
            <button key={f} type="button" className={`pill-btn ${statusFilter === f ? 'active' : ''}`} onClick={() => setStatusFilter(f)}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="workflow-steps-banner">
        {WORKFLOW.map((step, i) => (
          <div key={step.cls} style={{ display: 'contents' }}>
            {i > 0 && <div className="wf-arrow">→</div>}
            <div className="wf-step">
              <div className={`wf-step-num ${step.cls}`}>{step.n}</div>
              <div className="wf-step-desc">
                <strong>{step.title}</strong>
                <span>{step.text}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="tickets-grid-wrapper">
        {filtered.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-state-icon"><Icon name="minusCircle" strokeWidth={1.5} /></div>
            <h3>No tickets found matching your query</h3>
            <p>Check the ticket reference number (e.g. <code>TICK-1042</code>) or your email address.</p>
            <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: '12px' }}
              onClick={() => { setQuery(''); setStatusFilter('All') }}>
              Show all tickets
            </button>
          </div>
        ) : (
          <div className="tickets-cards-grid">
            {filtered.map((t) => (
              <TicketCard key={t.id} ticket={t} onSelect={(ticket) => setSelectedId(ticket.id)} isAdmin={false} />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <TicketDetailModal key={selected.id} ticket={selected} isAdmin={false} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}
