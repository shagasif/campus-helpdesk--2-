import { useCallback, useEffect, useRef, useState } from 'react'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import SubmitTicketForm from './components/SubmitTicketForm'
import TrackTickets from './components/TrackTickets'
import KnowledgeBase from './components/KnowledgeBase'
import AdminDashboard from './components/AdminDashboard'
import Toast from './components/Toast'
import { deleteTicket, getTheme, getTickets, saveTheme, updateTicket, updateTicketStatus } from './utils/storage'

export default function App() {
  const [tickets, setTickets] = useState(() => getTickets())
  const [activeTab, setActiveTab] = useState('submit')
  const [trackTicketId, setTrackTicketId] = useState('')
  const [theme, setTheme] = useState(() => getTheme())
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const showToast = useCallback((message, type = 'success') => {
    clearTimeout(toastTimer.current)
    setToast({ message, type })
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }, [])

  const goToTab = (tab) => {
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
    setTickets((prev) => [ticket, ...prev])
    showToast(`Ticket ${ticket.id} created successfully!`, 'success')
  }

  const handleStatusChange = (id, status, note = '', assignedTo) => {
    setTickets(updateTicketStatus(id, status, note, assignedTo))
    showToast(`Ticket ${id} status updated to ${status}`, 'success')
  }

  const handleUpdateTicket = (id, changes) => {
    setTickets(updateTicket(id, changes))
    showToast(`Ticket ${id} updated`, 'info')
  }

  const handleDeleteTicket = (id) => {
    setTickets(deleteTicket(id))
    showToast(`Ticket ${id} deleted`, 'warning')
  }

  const handleRefreshTickets = (next) => {
    setTickets(next)
    showToast('Demo data successfully restored', 'info')
  }

  const handleNavigateToTrack = (id) => {
    setTrackTicketId(id)
    goToTab('track')
  }

  const pendingCount = tickets.filter((t) => t.status === 'Pending').length

  return (
    <div className="campus-app-layout">
      <Navbar activeTab={activeTab} setActiveTab={goToTab} pendingCount={pendingCount} theme={theme} onThemeChange={handleThemeChange} />

      <main className="campus-main-content">
        {activeTab === 'submit' && (
          <SubmitTicketForm onTicketCreated={handleTicketCreated} onNavigateToTrack={handleNavigateToTrack} />
        )}
        {activeTab === 'track' && (
          <TrackTickets
            key={trackTicketId}
            tickets={tickets}
            initialTicketId={trackTicketId}
            onNavigateToSubmit={() => goToTab('submit')}
          />
        )}
        {activeTab === 'faq' && <KnowledgeBase onNavigateToSubmit={() => goToTab('submit')} />}
        {activeTab === 'admin' && (
          <AdminDashboard
            tickets={tickets}
            onStatusChange={handleStatusChange}
            onDeleteTicket={handleDeleteTicket}
            onUpdateTicket={handleUpdateTicket}
            onRefreshTickets={handleRefreshTickets}
            onOpenSubmit={() => goToTab('submit')}
          />
        )}
      </main>

      <Footer onSwitchTab={goToTab} />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
