import { useState } from 'react'
import { api } from '../utils/api'

export default function AuthScreen({ onAuthenticated, errorMessage = '' }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const isRegister = mode === 'register'

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const user = isRegister
        ? await api.register({ name, email, password })
        : await api.login({ email, password })
      onAuthenticated(user)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="hero-pill"><span className="pulsing-dot" />Campus Helpdesk</div>
        <h1 id="auth-title">{isRegister ? 'Create your account' : 'Sign in to your helpdesk'}</h1>
        <p>Sign in to submit and track your own support requests.</p>
        {(errorMessage || error) && <p className="error-text" role="alert">{error || errorMessage}</p>}
        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label required" htmlFor="auth-name">Full name</label>
              <input className="form-input" id="auth-name" autoComplete="name" value={name}
                onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={100} />
            </div>
          )}
          <div className="form-group">
            <label className="form-label required" htmlFor="auth-email">Email address</label>
            <input className="form-input" id="auth-email" type="email" autoComplete="email" value={email}
              onChange={(event) => setEmail(event.target.value)} required maxLength={254} />
          </div>
          <div className="form-group">
            <label className="form-label required" htmlFor="auth-password">Password</label>
            <input className="form-input" id="auth-password" type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'} value={password}
              onChange={(event) => setPassword(event.target.value)} required minLength={isRegister ? 12 : 1}
              maxLength={128} />
            {isRegister && <span className="form-hint">Use at least 12 characters.</span>}
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <p className="auth-switch">
          {isRegister ? 'Already have an account?' : 'New to the helpdesk?'}{' '}
          <button type="button" className="link-button" onClick={() => { setError(''); setMode(isRegister ? 'login' : 'register') }}>
            {isRegister ? 'Sign in' : 'Create a student account'}
          </button>
        </p>
        <p className="auth-notice">
          Student accounts use locally managed passwords. Email addresses are not verified, so this does not verify university affiliation.
        </p>
      </section>
    </main>
  )
}
