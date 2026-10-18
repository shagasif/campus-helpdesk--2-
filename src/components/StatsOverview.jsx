import Icon from './Icon'
import { CATEGORIES } from '../data/mockData'

const pct = (part, total) => (total ? Math.round((part / total) * 100) : 0)

export default function StatsOverview({ tickets = [] }) {
  const total = tickets.length
  const pending = tickets.filter((t) => t.status === 'Pending').length
  const inProgress = tickets.filter((t) => t.status === 'In Progress').length
  const resolved = tickets.filter((t) => t.status === 'Resolved').length
  const urgent = tickets.filter((t) => t.priority === 'Urgent').length
  const critical = urgent + tickets.filter((t) => t.priority === 'High').length
  const pendingPct = pct(pending, total)
  const progressPct = pct(inProgress, total)
  const resolvedPct = pct(resolved, total)

  const byCategory = CATEGORIES.map((name) => ({ name, count: tickets.filter((t) => t.category === name).length }))
    .sort((a, b) => b.count - a.count)
  const maxCategory = Math.max(...byCategory.map((c) => c.count), 1)

  const deptCounts = {}
  tickets.forEach((t) => {
    const d = t.department || 'Other'
    deptCounts[d] = (deptCounts[d] || 0) + 1
  })
  const topDepts = Object.entries(deptCounts)
    .map(([dept, count]) => ({ dept, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const cards = [
    { cls: 'stat-total', icon: 'file', label: 'Total Tickets', value: total, sub: 'Campus helpdesk volume' },
    { cls: 'stat-pending', icon: 'clock', label: 'Pending Triage', value: pending, sub: `${pendingPct}% of all tickets` },
    { cls: 'stat-progress', icon: 'spinner', label: 'In Progress', value: inProgress, sub: `${progressPct}% under active work` },
    { cls: 'stat-resolved', icon: 'checkCircle', label: 'Resolved', value: resolved, sub: `${resolvedPct}% resolution rate` },
  ]

  return (
    <div className="stats-overview-container">
      <div className="stats-metric-grid">
        {cards.map((c) => (
          <div key={c.cls} className={`stat-card ${c.cls}`}>
            <div className="stat-card-icon"><Icon name={c.icon} /></div>
            <div className="stat-card-content">
              <span className="stat-label">{c.label}</span>
              <span className="stat-value">{c.value}</span>
              <span className="stat-subtext">{c.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="stats-charts-grid">
        <div className="chart-panel">
          <div className="chart-panel-header">
            <h3>Status Breakdown</h3>
            <span className="chart-panel-subtitle">Current workflow distribution</span>
          </div>
          <div className="stacked-status-bar" aria-label="Status Distribution">
            <div className="bar-segment bar-pending" style={{ width: `${total ? (pending / total) * 100 : 0}%` }} title={`Pending: ${pending} (${pendingPct}%)`} />
            <div className="bar-segment bar-progress" style={{ width: `${total ? (inProgress / total) * 100 : 0}%` }} title={`In Progress: ${inProgress} (${progressPct}%)`} />
            <div className="bar-segment bar-resolved" style={{ width: `${total ? (resolved / total) * 100 : 0}%` }} title={`Resolved: ${resolved} (${resolvedPct}%)`} />
          </div>
          <div className="chart-legend">
            <div className="legend-item"><span className="legend-dot dot-pending" /><span className="legend-text">Pending: <strong>{pending}</strong> ({pendingPct}%)</span></div>
            <div className="legend-item"><span className="legend-dot dot-progress" /><span className="legend-text">In Progress: <strong>{inProgress}</strong> ({progressPct}%)</span></div>
            <div className="legend-item"><span className="legend-dot dot-resolved" /><span className="legend-text">Resolved: <strong>{resolved}</strong> ({resolvedPct}%)</span></div>
          </div>
          <div className="critical-alert-box" style={{ marginTop: '16px' }}>
            <div className="alert-icon"><Icon name="warning" /></div>
            <div className="alert-text">
              <strong>{critical} Critical / High Priority</strong> issues recorded.
              {urgent > 0 && ` (${urgent} marked Urgent).`}
            </div>
          </div>
        </div>

        <div className="chart-panel">
          <div className="chart-panel-header">
            <h3>Issues by Category</h3>
            <span className="chart-panel-subtitle">Top technical incident areas</span>
          </div>
          <div className="category-bars-list">
            {byCategory.slice(0, 5).map((c) => (
              <div key={c.name} className="cat-bar-row">
                <div className="cat-bar-header">
                  <span className="cat-bar-name">{c.name}</span>
                  <span className="cat-bar-count">{c.count}</span>
                </div>
                <div className="cat-bar-track">
                  <div className="cat-bar-fill" style={{ width: `${pct(c.count, maxCategory)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-panel">
          <div className="chart-panel-header">
            <h3>Top Campus Departments</h3>
            <span className="chart-panel-subtitle">Incident volume by faculty / unit</span>
          </div>
          <div className="dept-tags-list">
            {topDepts.map((d) => (
              <div key={d.dept} className="dept-tag-item">
                <span className="dept-name">{d.dept}</span>
                <span className="dept-badge">{d.count} tickets</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
