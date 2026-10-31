import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import SubmitTicketForm from './components/SubmitTicketForm'
import TrackTickets from './components/TrackTickets'
import KnowledgeBase from './components/KnowledgeBase'
import AdminDashboard from './components/AdminDashboard'
import AuthScreen from './components/AuthScreen'
import Toast from './components/Toast'
import { api } from './utils/api'
import { getLegacyTicketsForEmail, getTheme, saveTheme } from './utils/storage'

function replaceWorkflow(workflows, workflow) {
  return [workflow, ...workflows.filter((item) => item.id !== workflow.id)]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 25)
}

export default function App() {
  const [user, setUser] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [sessionError, setSessionError] = useState('')
  const [tickets, setTickets] = useState([])
  const [workflows, setWorkflows] = useState([])
  const [dataLoadedUserId, setDataLoadedUserId] = useState(null)
  const [dataError, setDataError] = useState('')
  const [activeTab, setActiveTab] = useState('submit')
  const [trackTicketId, setTrackTicketId] = useState('')
  const [theme, setTheme] = useState(() => getTheme())
  const [toast, setToast] = useState(null)
  const [migrationComplete, setMigrationComplete] = useState(true)
  const [migrationBusy, setMigrationBusy] = useState(false)
  const toastTimer = useRef(null)

  const showToast = useCallback((message, type = 'success') => {
    clearTimeout(toastTimer.current)
    setToast({ message, type })
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }, [])

  const legacyTickets = useMemo(
    () => user?.role === 'student' ? getLegacyTicketsForEmail(user.email) : [],
    [user],
  )
  const dataLoading = Boolean(user) && dataLoadedUserId !== user.id

  useEffect(() => {
    let active = true
    api.currentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser)
      })
      .catch((error) => {
        if (!active) return
        if (error.status !== 401) setSessionError(error.message)
      })
      .finally(() => {
        if (active) setSessionLoading(false)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  useEffect(() => {
    if (!user) return undefined
    let active = true
    const load = user.role === 'student'
      ? Promise.all([api.listTickets(), api.listWorkflows(), api.migrationStatus()])
      : Promise.all([api.listTickets(), api.listWorkflows(), Promise.resolve({ migrated: true })])
    load.then(([nextTickets, nextWorkflows, migration]) => {
      if (!active) return
      setTickets(nextTickets)
      setWorkflows(nextWorkflows)
      setMigrationComplete(migration.migrated)
      setDataError('')
    }).catch((error) => {
      if (!active) return
      setDataError(error.message)
      if (error.status === 401) setUser(null)
    }).finally(() => {
      if (active) setDataLoadedUserId(user.id)
    })
    return () => { active = false }
  }, [user])

  const activeWorkflowIds = workflows
    .filter((workflow) => workflow.status === 'pending' || workflow.status === 'running')
    .map((workflow) => workflow.id)
    .join('|')

  useEffect(() => {
    if (!user || !activeWorkflowIds) return undefined
    let active = true
    let timer
    const poll = async () => {
      try {
        const updates = await Promise.all(activeWorkflowIds.split('|').map((id) => api.getWorkflow(id)))
        if (active) {
          setWorkflows((current) => updates.reduce((items, workflow) => replaceWorkflow(items, workflow), current))
        }
      } catch (error) {
        if (active && error.status === 401) setUser(null)
        else if (active && error.status !== 404) showToast(error.message, 'warning')
      }
      if (active) timer = setTimeout(poll, 1200)
    }
    timer = setTimeout(poll, 700)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [activeWorkflowIds, showToast, user])

  const goToTab = (tab) => {
    if (tab === 'admin' && user?.role !== 'admin') return
    setActiveTab(tab)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleThemeChange = (nextTheme) => {
    if (nextTheme === theme) return
    setTheme(nextTheme)
    saveTheme(nextTheme)
    showToast(`Switched to ${nextTheme === 'dark' ? 'Dark' : 'Light'} theme`, 'info')
  }

  const handleTicketCreated = (ticket) => {
    setTickets((current) => [ticket, ...current.filter((item) => item.id !== ticket.id)])
    showToast(`Ticket ${ticket.id} created successfully!`, 'success')
  }

  const handleAnalyze = async (input) => {
    const workflow = await api.startWorkflow(input)
    setWorkflows((current) => replaceWorkflow(current, workflow))
    return workflow
  }

  const handleConfirmWorkflow = async (id) => {
    const ticket = await api.confirmWorkflow(id)
    try {
      const workflow = await api.getWorkflow(id)
      setWorkflows((current) => replaceWorkflow(current, workflow))
    } catch (error) {
      if (error.status === 401) setUser(null)
      else showToast(`Ticket was created, but workflow history could not be refreshed: ${error.message}`, 'warning')
    }
    return ticket
  }

  const handleStatusChange = async (id, status, note = '', assignedTo) => {
    try {
      const ticket = await api.changeStatus(id, { status, note, assignedTo })
      setTickets((current) => current.map((item) => item.id === id ? ticket : item))
      showToast(`Ticket ${id} status updated to ${status}`, 'success')
      return true
    } catch (error) {
      if (error.status === 401) setUser(null)
      showToast(error.message, 'warning')
      return false
    }
  }

  const handleUpdateTicket = async (id, changes) => {
    try {
      const ticket = await api.updateTicket(id, changes)
      setTickets((current) => current.map((item) => item.id === id ? ticket : item))
      showToast(`Ticket ${id} updated`, 'info')
      return true
    } catch (error) {
      if (error.status === 401) setUser(null)
      showToast(error.message, 'warning')
      return false
    }
  }

  const handleDeleteTicket = async (id) => {
    try {
      await api.deleteTicket(id)
      setTickets((current) => current.filter((ticket) => ticket.id !== id))
      showToast(`Ticket ${id} deleted`, 'warning')
      return true
    } catch (error) {
      if (error.status === 401) setUser(null)
      showToast(error.message, 'warning')
      return false
    }
  }

  const handleRefreshTickets = async () => {
    try {
      const next = await api.listTickets()
      setTickets(next)
      showToast('Tickets refreshed from the helpdesk server', 'info')
    } catch (error) {
      if (error.status === 401) setUser(null)
      showToast(error.message, 'warning')
    }
  }

  const handleImportLegacy = async () => {
    if (!user || migrationBusy || !legacyTickets.length) return
    setMigrationBusy(true)
    try {
      const result = await api.importLocalTickets(legacyTickets)
      setMigrationComplete(true)
      setTickets(await api.listTickets())
      showToast(`${result.importedCount} previous ticket(s) imported. ${result.skippedOwnership + result.skippedInvalid + result.skippedDuplicate} skipped.`, 'info')
    } catch (error) {
      showToast(error.message, 'warning')
    } finally {
      setMigrationBusy(false)
    }
  }

  const handleLogout = async () => {
    try {
      await api.logout()
    } catch (error) {
      if (error.status !== 401) {
        showToast(error.message, 'warning')
        return
      }
    }
    setUser(null)
    setTickets([])
    setWorkflows([])
    setDataLoadedUserId(null)
    setActiveTab('submit')
    setTrackTicketId('')
    setSessionError('')
  }

  const handleAuthenticated = (nextUser) => {
    setSessionError('')
    setUser(nextUser)
  }

  const handleNavigateToTrack = (id) => {
    setTrackTicketId(id)
    goToTab('track')
  }

  if (sessionLoading) {
    return <main className="auth-page"><p role="status">Connecting to the helpdesk…</p></main>
  }

  if (!user) {
    return (
      <>
        <AuthScreen onAuthenticated={handleAuthenticated} errorMessage={sessionError} />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </>
    )
  }

  const pendingCount = tickets.filter((ticket) => ticket.status === 'Pending').length

  return (
    <div className="campus-app-layout">
      <Navbar
        activeTab={activeTab}
        setActiveTab={goToTab}
        pendingCount={pendingCount}
        theme={theme}
        onThemeChange={handleThemeChange}
        user={user}
        onLogout={handleLogout}
      />

      {user.role === 'student' && !migrationComplete && legacyTickets.length > 0 && (
        <aside className="migration-notice" aria-label="Previous browser tickets">
          <div>
            <strong>Previous browser tickets found</strong>
            <p>{legacyTickets.length} ticket record(s) use this account email. Importing keeps only records matching your signed-in email.</p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleImportLegacy} disabled={migrationBusy}>
            {migrationBusy ? 'Importing…' : 'Import my previous tickets'}
          </button>
        </aside>
      )}

      <main className="campus-main-content">
        {dataError && <p className="error-text app-error" role="alert">{dataError}</p>}
        {dataLoading ? (
          <p role="status" className="app-loading">Loading your helpdesk data…</p>
        ) : (
          <>
            {activeTab === 'submit' && (
              <SubmitTicketForm
                user={user}
                onAnalyze={handleAnalyze}
                workflows={workflows}
                onConfirmWorkflow={handleConfirmWorkflow}
                onTicketCreated={handleTicketCreated}
                onNavigateToTrack={handleNavigateToTrack}
              />
            )}
            {activeTab === 'track' && (
              <TrackTickets
                key={`${user.id}-${trackTicketId}`}
                tickets={tickets}
                initialTicketId={trackTicketId}
                onNavigateToSubmit={() => goToTab('submit')}
              />
            )}
            {activeTab === 'faq' && <KnowledgeBase onNavigateToSubmit={() => goToTab('submit')} />}
            {activeTab === 'admin' && user.role === 'admin' && (
              <AdminDashboard
                tickets={tickets}
                workflows={workflows}
                onStatusChange={handleStatusChange}
                onDeleteTicket={handleDeleteTicket}
                onUpdateTicket={handleUpdateTicket}
                onRefreshTickets={handleRefreshTickets}
                onOpenSubmit={() => goToTab('submit')}
              />
            )}
          </>
        )}
      </main>

      <Footer onSwitchTab={goToTab} />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
