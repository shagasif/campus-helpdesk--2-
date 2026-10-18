import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { CATEGORIES, DEPARTMENTS, PRIORITIES } from '../data/mockData'
import { createTicket } from '../utils/storage'
import { copyText } from '../utils/helpers'

const INITIAL_FORM = {
  submitterName: '',
  submitterEmail: '',
  submitterRole: 'Student',
  department: 'Computer Science',
  location: '',
  category: 'Wi-Fi & Network',
  priority: 'Medium',
  title: '',
  description: '',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(form) {
  const errors = {}
  if (!form.submitterName.trim()) errors.submitterName = 'Please provide your full name.'
  if (!form.submitterEmail.trim()) errors.submitterEmail = 'Please provide your campus or contact email.'
  else if (!EMAIL_RE.test(form.submitterEmail)) errors.submitterEmail = 'Please enter a valid email address (e.g. name@campus.edu).'
  if (!form.title.trim()) errors.title = 'Please enter a concise title for the issue.'
  else if (form.title.trim().length < 6) errors.title = 'Title should be at least 6 characters.'
  if (!form.description.trim()) errors.description = 'Please describe the problem so technicians can assist.'
  else if (form.description.trim().length < 15) errors.description = 'Please provide more detail (at least 15 characters).'
  if (!form.location.trim()) errors.location = 'Please specify the building, hall, or room number.'
  if (!CATEGORIES.includes(form.category)) errors.category = 'Please choose a valid category.'
  if (!PRIORITIES.includes(form.priority)) errors.priority = 'Please choose a priority level.'
  if (!DEPARTMENTS.includes(form.department)) errors.department = 'Please choose a valid department.'
  return errors
}

export default function SubmitTicketForm({ onTicketCreated, onNavigateToTrack }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState(null)
  const [copied, setCopied] = useState(false)
  const timers = useRef([])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    timers.current.push(
      setTimeout(() => {
        const ticket = createTicket(form)
        setSubmitting(false)
        setCreated(ticket)
        onTicketCreated?.(ticket)
      }, 350),
    )
  }

  const handleCopy = async () => {
    if (!created) return
    if (await copyText(created.id)) {
      setCopied(true)
      timers.current.push(setTimeout(() => setCopied(false), 2500))
    }
  }

  const resetForm = () => {
    setForm(INITIAL_FORM)
    setErrors({})
    setCreated(null)
  }

  const inputClass = (base, name) => `${base} ${errors[name] ? 'input-error' : ''}`
  const fieldError = (name) => errors[name] && <p className="error-text">{errors[name]}</p>

  return (
    <div className="portal-content-wrapper">
      <div className="section-hero-card">
        <div className="hero-text-col">
          <div className="hero-pill">
            <span className="pulsing-dot" />
            IT, Facilities &amp; Academic Helpdesk
          </div>
          <h1 className="hero-title">Report an Issue or Request Campus Support</h1>
          <p className="hero-description">
            Submit your hardware, network, classroom tech, dorm facilities, or LMS issues. Our technicians triage
            tickets in real-time.
          </p>
        </div>
        <div className="hero-stats-quick">
          <div className="quick-badge">
            <span className="quick-label">Avg. Response</span>
            <span className="quick-value">&lt; 2 Hours</span>
          </div>
          <div className="quick-badge">
            <span className="quick-label">Campus Coverage</span>
            <span className="quick-value">24/7 IT &amp; Facilities</span>
          </div>
        </div>
      </div>

      {created && (
        <div className="modal-backdrop">
          <div className="ticket-success-card" role="dialog" aria-modal="true" aria-labelledby="success-heading">
            <div className="success-icon-wrap">
              <Icon name="checkCircle" strokeWidth={2.5} />
            </div>
            <h2 id="success-heading" className="success-title">Ticket Submitted Successfully!</h2>
            <p className="success-subtitle">
              Your issue has been logged into the campus support queue as <strong>Pending</strong>.
            </p>

            <div className="ticket-id-box">
              <span className="ticket-id-label">Your Ticket Reference ID</span>
              <div className="ticket-id-row">
                <span className="ticket-id-code">{created.id}</span>
                <button type="button" className="copy-id-btn" onClick={handleCopy} title="Copy reference ID to clipboard">
                  {copied ? (<><Icon name="check" />Copied!</>) : (<><Icon name="copy" />Copy ID</>)}
                </button>
              </div>
            </div>

            <div className="ticket-summary-preview">
              <div className="summary-row"><span className="summary-lbl">Subject:</span><span className="summary-val">{created.title}</span></div>
              <div className="summary-row"><span className="summary-lbl">Category:</span><span className="summary-val">{created.category}</span></div>
              <div className="summary-row">
                <span className="summary-lbl">Priority:</span>
                <span className={`summary-val priority-tag priority-${created.priority.toLowerCase()}`}>{created.priority}</span>
              </div>
              <div className="summary-row"><span className="summary-lbl">Location:</span><span className="summary-val">{created.location}</span></div>
              <div className="summary-row">
                <span className="summary-lbl">Submitter:</span>
                <span className="summary-val">{created.submitterName} ({created.submitterEmail})</span>
              </div>
            </div>

            <div className="success-actions">
              <button type="button" className="btn btn-primary" onClick={() => onNavigateToTrack(created.id)}>
                Track Ticket Status
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Submit Another Issue
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="form-container-card">
        <div className="form-header">
          <h2>Campus Issue Submission Form</h2>
          <p>Please fill in all details accurately so our helpdesk crew can locate and resolve your problem quickly.</p>
        </div>

        <form onSubmit={handleSubmit} className="ticket-form" noValidate>
          <div className="form-section-title">
            <Icon name="user" />
            <span>1. Submitter Information</span>
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label htmlFor="submitterName" className="form-label required">Full Name</label>
              <input type="text" id="submitterName" name="submitterName" className={inputClass('form-input', 'submitterName')}
                placeholder="e.g. Alex Morgan" value={form.submitterName} onChange={handleChange} />
              {fieldError('submitterName')}
            </div>
            <div className="form-group">
              <label htmlFor="submitterEmail" className="form-label required">Campus Email</label>
              <input type="email" id="submitterEmail" name="submitterEmail" className={inputClass('form-input', 'submitterEmail')}
                placeholder="e.g. a.morgan@campus.edu" value={form.submitterEmail} onChange={handleChange} />
              {fieldError('submitterEmail')}
            </div>
            <div className="form-group">
              <label htmlFor="submitterRole" className="form-label">Campus Role</label>
              <select id="submitterRole" name="submitterRole" className="form-select" value={form.submitterRole} onChange={handleChange}>
                <option value="Student">Student</option>
                <option value="Faculty">Faculty / Professor</option>
                <option value="Staff">University Staff</option>
                <option value="Visitor">Campus Visitor / Other</option>
              </select>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="department" className="form-label">Department / Faculty</label>
              <select id="department" name="department" className="form-select" value={form.department} onChange={handleChange}>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="location" className="form-label required">Building &amp; Room / Specific Location</label>
              <input type="text" id="location" name="location" className={inputClass('form-input', 'location')}
                placeholder="e.g. Science Hall Rm 304, or North Dorm 2F" value={form.location} onChange={handleChange} />
              {fieldError('location')}
            </div>
          </div>

          <div className="form-section-title" style={{ marginTop: '24px' }}>
            <Icon name="alert" />
            <span>2. Issue Classification &amp; Urgency</span>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="category" className="form-label required">Issue Category</label>
              <select id="category" name="category" className="form-select" value={form.category} onChange={handleChange}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {fieldError('category')}
            </div>
            <div className="form-group">
              <span className="form-label required">Priority Level</span>
              <div className="priority-selector" role="radiogroup" aria-label="Priority Level">
                {PRIORITIES.map((p) => (
                  <label key={p} className={`priority-radio-btn priority-${p.toLowerCase()} ${form.priority === p ? 'selected' : ''}`}>
                    <input type="radio" name="priority" value={p} checked={form.priority === p} onChange={handleChange} />
                    <span>{p}</span>
                  </label>
                ))}
              </div>
              {fieldError('priority')}
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label htmlFor="title" className="form-label required">Issue Subject / Summary</label>
            <input type="text" id="title" name="title" className={inputClass('form-input', 'title')}
              placeholder="e.g. Wi-Fi dropping in Library Study Hall 2" value={form.title} onChange={handleChange} maxLength={120} />
            {fieldError('title')}
          </div>

          <div className="form-group">
            <div className="label-with-hint">
              <label htmlFor="description" className="form-label required">Detailed Description &amp; Error Messages</label>
              <span className="char-count">{form.description.length} characters</span>
            </div>
            <textarea id="description" name="description" rows={4} className={inputClass('form-textarea', 'description')}
              placeholder="Please provide steps to reproduce, device type (Mac, Windows, iOS), error codes or messages, and when the issue started..."
              value={form.description} onChange={handleChange} />
            {fieldError('description')}
          </div>

          <div className="form-actions-row">
            <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={submitting}>
              Clear Form
            </button>
            <button type="submit" className="btn btn-primary submit-btn" disabled={submitting}>
              {submitting ? (<><span className="spinner-icon" />Submitting Issue...</>) : (<><Icon name="send" />Submit Ticket</>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
