import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export function createDatabase(filename = 'server/data/helpdesk.sqlite') {
  if (filename !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(filename)), { recursive: true })
  const db = new DatabaseSync(filename)
  db.pragma = (statement) => db.exec(`PRAGMA ${statement}`)
  db.transaction = (operation) => (...args) => {
    db.exec('BEGIN IMMEDIATE')
    try {
      const result = operation(...args)
      db.exec('COMMIT')
      return result
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }
  db.pragma('foreign_keys = ON')
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL COLLATE NOCASE UNIQUE,
      role TEXT NOT NULL CHECK (role IN ('student', 'admin')),
      password_hash TEXT NOT NULL,
      legacy_imported_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
    CREATE TABLE IF NOT EXISTS tickets (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id TEXT NOT NULL UNIQUE,
      owner_user_id TEXT NOT NULL REFERENCES users(id),
      workflow_id TEXT UNIQUE,
      legacy_id TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      issue_type TEXT,
      priority TEXT NOT NULL,
      status TEXT NOT NULL,
      submitter_name TEXT NOT NULL,
      submitter_email TEXT NOT NULL,
      submitter_role TEXT NOT NULL,
      department TEXT NOT NULL,
      location TEXT NOT NULL,
      needed_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      assigned_to TEXT NOT NULL,
      admin_notes TEXT NOT NULL DEFAULT '',
      history_json TEXT NOT NULL,
      UNIQUE(owner_user_id, legacy_id)
    );
    CREATE INDEX IF NOT EXISTS tickets_owner_idx ON tickets(owner_user_id);
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL,
      current_task TEXT NOT NULL,
      input_json TEXT NOT NULL,
      plan_json TEXT,
      result_json TEXT,
      error_code TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS workflows_owner_idx ON workflows(owner_user_id, created_at);
    CREATE TABLE IF NOT EXISTS agent_runs (
      workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
      agent_name TEXT NOT NULL,
      status TEXT NOT NULL,
      output_json TEXT,
      error_code TEXT,
      started_at TEXT,
      completed_at TEXT,
      PRIMARY KEY(workflow_id, agent_name)
    );
    CREATE TABLE IF NOT EXISTS workflow_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS workflow_events_idx ON workflow_events(workflow_id, id);
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log(created_at);
  `)
  return db
}

export function recordAudit(db, actorId, action, entityId = null) {
  db.prepare(
    'INSERT INTO audit_log (actor_user_id, action, entity_id, created_at) VALUES (?, ?, ?, ?)',
  ).run(actorId || null, action, entityId, new Date().toISOString())
}
