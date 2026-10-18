import Icon from './Icon'

const TABS = [
  { id: 'submit', label: 'Submit Issue', icon: 'edit' },
  { id: 'track', label: 'Track Tickets', icon: 'search' },
  { id: 'faq', label: 'Help & FAQ', icon: 'help' },
  { id: 'admin', label: 'Admin Dashboard', icon: 'grid' },
]

export default function Navbar({ activeTab, setActiveTab, pendingCount, theme, toggleTheme }) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        <div
          className="navbar-brand"
          onClick={() => setActiveTab('submit')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setActiveTab('submit')
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="brand-icon">
            <Icon name="cap" />
          </div>
          <div className="brand-text">
            <span className="brand-title">Campus Helpdesk</span>
            <span className="brand-badge">Central IT &amp; Facilities</span>
          </div>
        </div>

        <nav className="navbar-nav" aria-label="Main Navigation">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`nav-tab ${tab.id === 'admin' ? 'admin-tab' : ''} ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon name={tab.icon} />
              <span>{tab.label}</span>
              {tab.id === 'admin' && pendingCount > 0 && (
                <span className="nav-badge" title={`${pendingCount} pending issues awaiting triage`}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="navbar-actions">
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${nextTheme} mode`}
            title={`Switch to ${nextTheme} mode`}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
        </div>
      </div>
    </header>
  )
}
