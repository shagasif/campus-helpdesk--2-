import Icon from './Icon'

export default function Footer({ onSwitchTab }) {
  return (
    <footer className="campus-footer">
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-col brand-col">
            <div className="footer-logo">
              <Icon name="cap" />
              <span>Campus Central Helpdesk</span>
            </div>
            <p className="footer-desc">
              Dedicated student, faculty, and administrative support infrastructure. Rapid incident triage and
              resolution for physical and digital campus environments.
            </p>
            <div className="footer-storage-badge">
              <span className="storage-dot" />
              <span>Local Storage Active • Offline Ready</span>
            </div>
          </div>

          <div className="footer-col">
            <h4>Quick Navigation</h4>
            <ul className="footer-links">
              <li><button type="button" onClick={() => onSwitchTab('submit')}>Submit Incident</button></li>
              <li><button type="button" onClick={() => onSwitchTab('track')}>Track Existing Ticket</button></li>
              <li><button type="button" onClick={() => onSwitchTab('faq')}>Knowledge Base &amp; FAQ</button></li>
              <li><button type="button" onClick={() => onSwitchTab('admin')}>Staff Admin Dashboard</button></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Helpdesk Hours</h4>
            <ul className="footer-schedule">
              <li><span>Mon – Fri:</span> <strong>7:30 AM – 9:00 PM</strong></li>
              <li><span>Saturday:</span> <strong>9:00 AM – 6:00 PM</strong></li>
              <li><span>Sunday:</span> <strong>10:00 AM – 5:00 PM</strong></li>
              <li className="emergency-note">Critical outages monitored 24/7/365</li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Support Contacts</h4>
            <p className="footer-contact-line"><strong>Hotline:</strong> (555) 019-HELP</p>
            <p className="footer-contact-line"><strong>Email:</strong> helpdesk@campus.edu</p>
            <p className="footer-contact-line"><strong>Main Desk:</strong> Library 1st Floor Commons</p>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <p>© {new Date().getFullYear()} Campus Helpdesk &amp; Incident Response System. All rights reserved.</p>
          <div className="footer-status-tag">
            <span className="live-indicator" />
            All Campus IT Systems Operational
          </div>
        </div>
      </div>
    </footer>
  )
}
