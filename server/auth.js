import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)
export const SESSION_COOKIE = 'campus_session'
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const derived = await scryptAsync(password, salt, 64)
  return `${salt.toString('hex')}:${derived.toString('hex')}`
}

export async function verifyPassword(password, encoded) {
  const [saltHex, hashHex] = String(encoded).split(':')
  if (!saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, 'hex')
  const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export function createSession(db, userId) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = Date.now() + SESSION_TTL_MS
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now())
  db.prepare(
    'INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
  ).run(hashSessionToken(token), userId, expiresAt, new Date().toISOString())
  return { token, expiresAt }
}

export function getCookie(req, name) {
  const cookie = req.headers.cookie
  if (!cookie) return null
  for (const part of cookie.split(';')) {
    const [key, ...value] = part.trim().split('=')
    if (key === name) {
      try {
        return decodeURIComponent(value.join('='))
      } catch {
        return null
      }
    }
  }
  return null
}

export function setSessionCookie(res, token, production) {
  const attributes = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/api',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ]
  if (production) attributes.push('Secure')
  res.setHeader('Set-Cookie', attributes.join('; '))
}

export function clearSessionCookie(res, production) {
  const attributes = [`${SESSION_COOKIE}=`, 'HttpOnly', 'SameSite=Strict', 'Path=/api', 'Max-Age=0']
  if (production) attributes.push('Secure')
  res.setHeader('Set-Cookie', attributes.join('; '))
}

export async function createBootstrapAdmin(db, env) {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = env.ADMIN_PASSWORD
  if (!email && !password) return
  if (!email || !password || password.length < 12 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_EMAIL and a 12-character ADMIN_PASSWORD must both be configured.')
  }
  const existing = db.prepare('SELECT role FROM users WHERE email = ?').get(email)
  if (existing) {
    if (existing.role !== 'admin') {
      throw new Error('ADMIN_EMAIL already belongs to a student account; configure a separate administrator email.')
    }
    return
  }
  const passwordHash = await hashPassword(password)
  db.prepare(
    'INSERT INTO users (id, name, email, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(randomBytes(16).toString('hex'), env.ADMIN_NAME?.trim() || 'Helpdesk Administrator', email, 'admin', passwordHash, new Date().toISOString())
}

export function userFromSession(db, req) {
  const token = getCookie(req, SESSION_COOKIE)
  if (!token) return null
  const session = db.prepare(
    `SELECT users.id, users.name, users.email, users.role, sessions.token_hash
     FROM sessions JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
  ).get(hashSessionToken(token), Date.now())
  if (!session) return null
  return { id: session.id, name: session.name, email: session.email, role: session.role, tokenHash: session.token_hash }
}
