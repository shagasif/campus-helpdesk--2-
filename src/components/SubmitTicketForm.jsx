import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import AIAgentActivity from './AIAgentActivity'
import { CATEGORIES, DEPARTMENTS, PRIORITIES } from '../data/mockData'
import { copyText } from '../utils/helpers'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function createInitialForm(user) {
  return {
    submitterName: user.name,
    submitterEmail: user.email,
    submitterRole: user.role === 'admin' ? 'Staff' : 'Student',
    department: DEPARTMENTS[0],
    location: '',
    category: CATEGORIES[0],
    priority: 'Medium',
    neededBy: '',
    title: '',
    description: '',
  }
}

function validate(form) {
  const errors = {}
  if (!form.submitterName.trim()) errors.submitterName = 'Please provide your full name in your account.'
  if (!form.submitterEmail.trim()) errors.submitterEmail = 'Your account email is required.'
  else if (!EMAIL_RE.test(form.submitterEmail)) errors.submitterEmail = 'Your account email is invalid.'
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

export default function SubmitTicketForm({ user, onAnalyze, workflows, onConfirmWorkflow, onTicketCreated, onNavigateToTrack }) {
  const [form, setForm] = useState(() => createInitialForm(user))
  const [errors, setErrors] = useState({})
  const [submissionError, setSubmissionError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [activeWorkflowId, setActiveWorkflowId] = useState('')
  const [created, setCreated] = useState(null)
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef(null)

  useEffect(() => () => clearTimeout(copyTimer.current), [])
  useEffect(() => {
    if (!created) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setCreated(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [created])

  const workflow = workflows.find((item) => item.id === activeWorkflowId)
  const currentUserRole = user.role === 'admin' ? 'Staff' : 'Student'
  const approved = workflow?.status === 'awaiting_confirmation' && workflow.result?.validation?.approved === true
  const workflowNeedsReview = workflow && ['pending', 'running', 'awaiting_confirmation', 'confirmed'].includes(workflow.status)
  const displayedForm = approved
    ? {
      ...form,
      category: workflow.result.classification.category,
      priority: workflow.result.priority.priority,
      department: workflow.result.routing.department,
    }
    : form

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setSubmissionError('')
    setActiveWorkflowId('')
    if (errors[name]) setErrors((previous) => ({ ...previous, [name]: null }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const found = validate(displayedForm)
    setErrors(found)
    if (Object.keys(found).length) return

    setSubmitting(true)
    setSubmissionError('')
    setCreated(null)
    try {
      const nextWorkflow = await onAnalyze({
        title: displayedForm.title,
        description: displayedForm.description,
        location: displayedForm.location,
        neededBy: displayedForm.neededBy,
        requestedCategory: displayedForm.category,
        requestedPriority: displayedForm.priority,
      })
      setActiveWorkflowId(nextWorkflow.id)
    } catch (error) {
      setSubmissionError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirm = async () => {
    if (!workflow || !approved || confirming) return
    setConfirming(true)
    setSubmissionError('')
    try {
      const ticket = await onConfirmWorkflow(workflow.id)
      setCreated(ticket)
      onTicketCreated?.(ticket)
    } catch (error) {
      setSubmissionError(error.message)
    } finally {
      setConfirming(false)
    }
  }

  const handleCopy = async () => {
    if (!created) return
    if (await copyText(created.id)) {
      setCopied(true)
      clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 2500)
    }
  }

  const resetForm = () => {
    setForm(createInitialForm(user))
    setErrors({})
    setSubmissionError('')
    setActiveWorkflowId('')
    setCreated(null)
  }

  const inputClass = (base, name) => `${base} ${errors[name] ? 'input-error' : ''}`
  const fieldError = (name) => errors[name] && <p className="error-text">{errors[name]}</p>

  return (
    <div className="portal-content-wrapper">
      <div className="section-hero-card">
        <div className="hero-text-col">
          <div className="hero-pill"><span className="pulsing-dot" />IT, Facilities &amp; Academic Helpdesk</div>
          <h1 className="hero-title">Report an Issue or Request Campus Support</h1>
          <p className="hero-description">
            Describe the issue and the real AI agents will classify, prioritize, find verified help, and route it for your review.
          </p>
        </div>
        <div className="hero-stats-quick">
          <div className="quick-badge"><span className="quick-label">Signed in as</span><span className="quick-value">{user.email}</span></div>
        </div>
      </div>

      {created && (
        <div className="modal-backdrop">
          <div className="ticket-success-card" role="dialog" aria-modal="true" aria-labelledby="success-heading">
            <div className="success-icon-wrap"><Icon name="checkCircle" strokeWidth={2.5} /></div>
            <h2 id="success-heading" className="success-title">Complaint Submitted Successfully</h2>
            <p className="success-subtitle">The confirmed request was saved as <strong>Pending</strong>.</p>
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
              <div className="summary-row"><span className="summary-lbl">Department:</span><span className="summary-val">{created.department}</span></div>
              <div className="summary-row"><span className="summary-lbl">Priority:</span><span className={`summary-val priority-tag priority-${created.priority.toLowerCase()}`}>{created.priority}</span></div>
              <div className="summary-row"><span className="summary-lbl">Location:</span><span className="summary-val">{created.location}</span></div>
            </div>
            <div className="success-actions">
              <button type="button" className="btn btn-primary" onClick={() => onNavigateToTrack(created.id)}>Track Ticket Status</button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>Submit Another Issue</button>
            </div>
          </div>
        </div>
      )}

      {workflow && <AIAgentActivity workflows={[workflow]} />}

      {workflow?.result && (
        <section className="ai-review-card" aria-labelledby="ai-review-title">
          <h2 id="ai-review-title">Review the AI triage before submission</h2>
          <p>{workflow.result.manager.summary}</p>
          <div className="ai-review-grid">
            <div><strong>Classification</strong><span>{workflow.result.classification.issueType} · {workflow.result.classification.category}</span><small>{workflow.result.classification.reason}</small></div>
            <div><strong>Priority</strong><span>{workflow.result.priority.priority}</span><small>{workflow.result.priority.reason} {workflow.result.priority.deadlineSignal}</small></div>
            <div><strong>Department &amp; team</strong><span>{workflow.result.routing.department} · {workflow.result.routing.team}</span><small>{workflow.result.routing.reason}</small></div>
            <div>
              <strong>Approved FAQ excerpts</strong>
              {workflow.result.resolution.available
                ? workflow.result.resolution.matches.flatMap((match) => match.excerpts).map((excerpt, index) => <small key={`${excerpt}-${index}`}>{excerpt}</small>)
                : <small>No verified university FAQ source is currently configured. No troubleshooting recommendation was generated.</small>}
            </div>
          </div>
          {workflow.result.validation.concerns.length > 0 && (
            <p className="error-text" role="alert">{workflow.result.validation.concerns.join(' ')}</p>
          )}
          {approved && (
            <button type="button" className="btn btn-primary" onClick={() => { void handleConfirm() }} disabled={confirming}>
              {confirming ? 'Submitting confirmed complaint…' : 'Confirm and Submit Complaint'}
            </button>
          )}
          {workflow.status === 'rejected' && <p className="error-text">Validation blocked complaint creation. Revise the details and run triage again.</p>}
        </section>
      )}

      <div className="form-container-card">
        <div className="form-header">
          <h2>Campus Issue Submission Form</h2>
          <p>AI suggestions are reviewed before a complaint is created. No ticket is submitted until you confirm.</p>
        </div>

        <form onSubmit={handleSubmit} className="ticket-form" noValidate>
          {submissionError && <p className="error-text" role="alert">{submissionError}</p>}
          <div className="form-section-title"><Icon name="user" /><span>1. Submitter Information</span></div>

          <div className="form-grid-3">
            <div className="form-group">
              <label htmlFor="submitterName" className="form-label required">Full Name</label>
              <input type="text" id="submitterName" name="submitterName" className={inputClass('form-input', 'submitterName')}
                value={displayedForm.submitterName} readOnly aria-describedby="submitterName-help" />
              <span id="submitterName-help" className="form-hint">From your signed-in account.</span>
              {fieldError('submitterName')}
            </div>
            <div className="form-group">
              <label htmlFor="submitterEmail" className="form-label required">Account Email</label>
              <input type="email" id="submitterEmail" name="submitterEmail" className={inputClass('form-input', 'submitterEmail')}
                value={displayedForm.submitterEmail} readOnly aria-describedby="submitterEmail-help" />
              <span id="submitterEmail-help" className="form-hint">Used to scope your tickets to this account.</span>
              {fieldError('submitterEmail')}
            </div>
            <div className="form-group">
              <label htmlFor="submitterRole" className="form-label">Campus Role</label>
              <input id="submitterRole" className="form-input" value={currentUserRole} readOnly />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="department" className="form-label">Department / Faculty (AI suggestion)</label>
              <select id="department" name="department" className="form-select" value={displayedForm.department} onChange={handleChange}>
                {DEPARTMENTS.map((department) => <option key={department} value={department}>{department}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="location" className="form-label required">Building &amp; Room / Specific Location</label>
              <input type="text" id="location" name="location" className={inputClass('form-input', 'location')}
                placeholder="e.g. Science Hall Rm 304, or North Dorm 2F" value={displayedForm.location} onChange={handleChange} maxLength={160} />
              {fieldError('location')}
            </div>
          </div>

          <div className="form-section-title" style={{ marginTop: '24px' }}><Icon name="alert" /><span>2. Issue Classification &amp; Urgency</span></div>
          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="category" className="form-label required">Issue Category</label>
              <select id="category" name="category" className="form-select" value={displayedForm.category} onChange={handleChange}>
                {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              {fieldError('category')}
            </div>
            <div className="form-group">
              <label htmlFor="priority" className="form-label required">Requested Priority (AI will assess)</label>
              <select id="priority" name="priority" className="form-select" value={displayedForm.priority} onChange={handleChange}>
                {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </select>
              {fieldError('priority')}
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label htmlFor="neededBy" className="form-label">Deadline (optional)</label>
            <input id="neededBy" name="neededBy" type="date" className="form-input" value={displayedForm.neededBy} onChange={handleChange} />
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label htmlFor="title" className="form-label required">Issue Subject / Summary</label>
            <input type="text" id="title" name="title" className={inputClass('form-input', 'title')}
              placeholder="e.g. Wi-Fi dropping in Library Study Hall 2" value={displayedForm.title} onChange={handleChange} maxLength={120} />
            {fieldError('title')}
          </div>

          <div className="form-group">
            <div className="label-with-hint">
              <label htmlFor="description" className="form-label required">Detailed Description &amp; Error Messages</label>
              <span className="char-count">{displayedForm.description.length} characters</span>
            </div>
            <textarea id="description" name="description" rows={4} className={inputClass('form-textarea', 'description')}
              placeholder="Describe the issue, impact, any deadlines, steps already tried, and relevant error messages."
              value={displayedForm.description} onChange={handleChange} maxLength={4000} />
            {fieldError('description')}
          </div>

          <div className="form-actions-row">
            <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={submitting || confirming}>Clear Form</button>
            <button type="submit" className="btn btn-primary submit-btn" disabled={submitting || confirming || workflowNeedsReview}>
              {submitting ? (<><span className="spinner-icon" />Running AI triage…</>) : (<><Icon name="send" />Analyze &amp; Review with AI</>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
