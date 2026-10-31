import { useMemo, useState } from 'react'
import Icon from './Icon'
import StatsOverview from './StatsOverview'
import TicketDetailModal from './TicketDetailModal'
import AIAgentActivity from './AIAgentActivity'
import { CATEGORIES, PRIORITIES, STATUSES } from '../data/mockData'
import { exportJSON } from '../utils/storage'
import { formatDate, getPriorityClass, getStatusStyle, timeAgo } from '../utils/helpers'

const PRIORITY_RANK = { Critical: 4, High: 3, Medium: 2, Low: 1 }

export default function AdminDashboard({ tickets, workflows = [], onStatusChange, onDeleteTicket, onUpdateTicket, onRefreshTickets, onOpenSubmit }) {
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [sortBy, setSortBy] = useState('newest')

  // Always derive the open ticket from live data so the modal reflects updates.
  const selected = tickets.find((t) => t.id === selectedId) || null

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return tickets
      .filter((t) => {
        if (statusFilter !== 'All' && t.status !== statusFilter) return false
        if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false
        if (categoryFilter !== 'All' && t.category !== categoryFilter) return false
        if (!q) return true
        return [t.id, t.title, t.description, t.submitterName, t.submitterEmail, t.department, t.location].some((v) =>
          (v || '').toLowerCase().includes(q),
        )
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt)
        if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt)
        return (PRIORITY_RANK[b.priority] || 0) - (PRIORITY_RANK[a.priority] || 0)
      })
  }, [tickets, statusFilter, priorityFilter, categoryFilter, search, sortBy])

  const counts = useMemo(
    () => ({
      all: tickets.length,
      pending: tickets.filter((t) => t.status === 'Pending').length,
      inProgress: tickets.filter((t) => t.status === 'In Progress').length,
      resolved: tickets.filter((t) => t.status === 'Resolved').length,
    }),
    [tickets],
  )

  const filtersActive = Boolean(search) || statusFilter !== 'All' || priorityFilter !== 'All' || categoryFilter !== 'All'

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('All')
    setPriorityFilter('All')
    setCategoryFilter('All')
  }

  const pills = [
    { value: 'All', label: 'All Tickets', count: counts.all, cls: '' },
    { value: 'Pending', label: 'Pending', count: counts.pending, cls: 'pill-pending' },
    { value: 'In Progress', label: 'In Progress', count: counts.inProgress, cls: 'pill-progress' },
    { value: 'Resolved', label: 'Resolved', count: counts.resolved, cls: 'pill-resolved' },
  ]

  return (
    <div className="admin-dashboard-wrapper">
      <div className="admin-header-card">
        <div className="admin-header-text">
          <div className="admin-badge-role">
            <Icon name="shield" />
            Staff Operations Console
          </div>
          <h1 className="admin-title">Campus Helpdesk Administration</h1>
          <p className="admin-subtitle">
            Manage incident triage, assign technicians, update resolution statuses, and track key operational campus metrics.
          </p>
        </div>
        <div className="admin-quick-actions">
          <button type="button" className="btn btn-outline" onClick={() => exportJSON(tickets)} title="Download all tickets as JSON file">
            <Icon name="download" />Export JSON
          </button>
          <button type="button" className="btn btn-outline" onClick={onRefreshTickets} title="Refresh tickets from the helpdesk server">
            <Icon name="reset" />Refresh Tickets
          </button>
          <button type="button" className="btn btn-primary" onClick={onOpenSubmit}>
            <Icon name="plus" />New Incident
          </button>
        </div>
      </div>

      <AIAgentActivity workflows={workflows} />
      <StatsOverview tickets={tickets} />

      <div className="table-container-card">
        <div className="filter-tabs-row">
          <div className="status-pill-group">
            {pills.map((p) => (
              <button key={p.value} type="button" className={`pill-btn ${p.cls} ${statusFilter === p.value ? 'active' : ''}`} onClick={() => setStatusFilter(p.value)}>
                {p.label} <span className="pill-count">{p.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="search-filter-bar">
          <div className="search-input-wrapper">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" className="search-input" aria-label="Search tickets"
              placeholder="Search by ID (e.g. TICK-1042), submitter, title, department..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && <button type="button" className="clear-search-btn" onClick={() => setSearch('')} aria-label="Clear search">×</button>}
          </div>
          <div className="filter-dropdowns">
            <select className="filter-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} aria-label="Filter by priority">
              <option value="All">All Priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className="filter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Filter by category">
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort tickets by">
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="priority">Sort: Highest Priority</option>
            </select>
            {filtersActive && <button type="button" className="btn btn-secondary btn-sm" onClick={clearFilters}>Reset Filters</button>}
          </div>
        </div>

        <div className="results-status-bar">
          <span>Showing <strong>{filtered.length}</strong> of {tickets.length} tickets</span>
          {filtersActive && <span className="filtered-indicator">(Filters active)</span>}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-state-icon"><Icon name="minusCircle" strokeWidth={1.5} /></div>
            <h3>No matching tickets found</h3>
            <p>Try adjusting your search criteria or resetting the status/priority filters.</p>
            {filtersActive && (
              <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: '12px' }} onClick={clearFilters}>Clear all filters</button>
            )}
          </div>
        ) : (
          <div className="responsive-table-wrapper">
            <table className="tickets-table">
              <thead>
                <tr>
                  <th>Ticket</th><th>Subject &amp; Category</th><th>Submitter &amp; Dept</th><th>Location</th>
                  <th>Priority</th><th>Status</th><th>Last Updated</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const st = getStatusStyle(t.status)
                  return (
                    <tr key={t.id} className="table-row-clickable" onClick={() => setSelectedId(t.id)}>
                      <td className="cell-id"><span className="table-ticket-code">{t.id}</span></td>
                      <td className="cell-subject">
                        <div className="subject-title">{t.title}</div>
                        <span className="subject-cat">{t.category}</span>
                      </td>
                      <td className="cell-submitter">
                        <div className="submitter-name">{t.submitterName}</div>
                        <div className="submitter-sub">{t.department} • {t.submitterRole}</div>
                      </td>
                      <td className="cell-location"><span className="location-text">{t.location}</span></td>
                      <td className="cell-priority"><span className={`priority-tag ${getPriorityClass(t.priority)}`}>{t.priority}</span></td>
                      <td className="cell-status" onClick={(e) => e.stopPropagation()}>
                        <div className="status-cell-wrapper">
                          <select className="status-dropdown-select" value={t.status} aria-label={`Status for ${t.id}`}
                            onChange={(e) => { void onStatusChange(t.id, e.target.value) }}
                            style={{ backgroundColor: st.bg, color: st.color, borderColor: st.borderColor }}>
                            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </td>
                      <td className="cell-date">
                        <span className="time-ago-text">{timeAgo(t.updatedAt)}</span>
                        <span className="full-date-sub">{formatDate(t.updatedAt).split(',')[0]}</span>
                      </td>
                      <td className="cell-actions" onClick={(e) => e.stopPropagation()}>
                        <div className="action-buttons-group">
                          <button type="button" className="btn-icon" onClick={() => setSelectedId(t.id)} title="Inspect & edit ticket" aria-label={`Inspect ${t.id}`}>
                            <Icon name="eye" />
                          </button>
                          <button type="button" className="btn-icon btn-icon-delete" title="Delete ticket" aria-label={`Delete ${t.id}`}
                            onClick={() => { if (window.confirm(`Delete ticket ${t.id}?`)) void onDeleteTicket(t.id) }}>
                            <Icon name="trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <TicketDetailModal
          key={selected.id}
          ticket={selected}
          isAdmin
          onClose={() => setSelectedId(null)}
          onStatusChange={onStatusChange}
          onDelete={async (id) => {
            const deleted = await onDeleteTicket(id)
            if (deleted) setSelectedId(null)
            return deleted
          }}
          onUpdateTicket={onUpdateTicket}
        />
      )}
    </div>
  )
}
