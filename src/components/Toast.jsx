import Icon from './Icon'

const ICONS = { success: 'check', info: 'info', warning: 'warning' }

export default function Toast({ message, type = 'info', onClose }) {
  if (!message) return null

  return (
    <div className={`toast-notification toast-${type}`} role="status">
      <div className="toast-icon">
        {ICONS[type] && <Icon name={ICONS[type]} strokeWidth={2.5} />}
      </div>
      <div className="toast-message">{message}</div>
      {onClose && (
        <button type="button" className="toast-close" onClick={onClose} aria-label="Close notification">
          ×
        </button>
      )}
    </div>
  )
}
