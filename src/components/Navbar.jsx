import Icon from './Icon'

const TABS = [
  { id: 'submit', label: 'Submit Issue', icon: 'edit' },
  { id: 'track', label: 'Track Tickets', icon: 'search' },
  { id: 'faq', label: 'Help & FAQ', icon: 'help' },
  { id: 'admin', label: 'Admin Dashboard', icon: 'grid' },
]

export default function Navbar({ activeTab, setActiveTab, pendingCount, theme, onThemeChange, user, onLogout }) {
  const visibleTabs = TABS.filter((tab) => tab.id !== 'admin' || user?.role === 'admin')

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
          {visibleTabs.map((tab) => (
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
          <div className="navbar-user">
            <span>{user?.name}</span>
            <button type="button" className="link-button" onClick={onLogout}>Sign out</button>
          </div>
          <div className="theme-toggle-group" role="group" aria-label="Color theme">
            <button
              type="button"
              className={`theme-option-btn ${theme === 'light' ? 'active' : ''}`}
              onClick={() => onThemeChange('light')}
              aria-pressed={theme === 'light'}
            >
              <Icon name="sun" />
              <span>Light Mode</span>
            </button>
            <button
              type="button"
              className={`theme-option-btn ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => onThemeChange('dark')}
              aria-pressed={theme === 'dark'}
            >
              <Icon name="moon" />
              <span>Dark Mode</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
