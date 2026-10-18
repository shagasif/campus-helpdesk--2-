import { useState } from 'react'
import Icon from './Icon'
import { FAQS } from '../data/mockData'

const CONTACTS = [
  { cls: 'danger', icon: 'shield', name: 'Campus Safety & Security', line: '(555) 019-4444 (24/7)', loc: 'North Gate Security Tower' },
  { cls: 'warning', icon: 'phone', name: 'IT Helpdesk Hotline', line: '(555) 019-4357 (HELP)', loc: 'Library 1st Floor Commons' },
  { cls: 'info', icon: 'home', name: 'Campus Housing & Dorms', line: '(555) 019-3310', loc: 'Student Union Suite 200' },
]

export default function KnowledgeBase({ onNavigateToSubmit }) {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <div className="knowledge-base-wrapper">
      <div className="section-hero-card">
        <div className="hero-text-col">
          <div className="hero-pill"><span className="pulsing-dot" />Help Articles &amp; Fast Answers</div>
          <h1 className="hero-title">Frequently Asked Questions &amp; Quick Help</h1>
          <p className="hero-description">
            Find immediate solutions to the most common campus network, printing, dorm keycard, and LMS issues before submitting a ticket.
          </p>
        </div>
        <div className="hero-stats-quick">
          <button type="button" className="btn btn-primary" onClick={onNavigateToSubmit}>Submit an Issue</button>
        </div>
      </div>

      <div className="faq-grid-layout">
        <div className="faq-main-col">
          <h2 className="faq-section-title">Common Campus IT &amp; Facilities Solutions</h2>
          <div className="accordion-list">
            {FAQS.map((faq, i) => {
              const open = openIndex === i
              return (
                <div key={faq.question} className={`accordion-item ${open ? 'open' : ''}`}>
                  <button type="button" className="accordion-header" aria-expanded={open}
                    onClick={() => setOpenIndex(open ? null : i)}>
                    <span className="accordion-title">{faq.question}</span>
                    <span className="accordion-icon">{open ? '−' : '+'}</span>
                  </button>
                  {open && <div className="accordion-content"><p>{faq.answer}</p></div>}
                </div>
              )
            })}
          </div>
        </div>

        <div className="faq-sidebar-col">
          <div className="contact-card">
            <h3>Urgent &amp; Emergency Contacts</h3>
            <p className="contact-sub">For active water leaks, power outages, or physical security concerns:</p>
            {CONTACTS.map((c) => (
              <div key={c.name} className="contact-item">
                <div className={`contact-icon ${c.cls}`}><Icon name={c.icon} /></div>
                <div className="contact-info">
                  <strong>{c.name}</strong>
                  <span>{c.line}</span>
                  <span className="contact-loc">{c.loc}</span>
                </div>
              </div>
            ))}
            <div className="sidebar-action">
              <p>Problem still unresolved?</p>
              <button type="button" className="btn btn-primary btn-block" onClick={onNavigateToSubmit}>Submit Helpdesk Ticket</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
