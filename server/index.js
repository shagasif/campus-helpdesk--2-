import 'dotenv/config'
import process from 'node:process'
import { createApp } from './api.js'
import { createBootstrapAdmin } from './auth.js'
import { createDatabase } from './database.js'
import { AGENT_NAMES } from './config.js'

const db = createDatabase(process.env.DB_PATH || 'server/data/helpdesk.sqlite')
await createBootstrapAdmin(db, process.env)

const interrupted = db.prepare("SELECT id, owner_user_id FROM workflows WHERE status IN ('pending', 'running')").all()
for (const workflow of interrupted) {
  db.prepare("UPDATE workflows SET status = 'failed', current_task = ?, error_code = ?, updated_at = ? WHERE id = ?")
    .run('Server restarted before triage completed. Start a new workflow.', 'server_restarted', new Date().toISOString(), workflow.id)
  db.prepare("UPDATE agent_runs SET status = 'failed', error_code = ?, completed_at = ? WHERE workflow_id = ? AND status = 'running'")
    .run('server_restarted', new Date().toISOString(), workflow.id)
  db.prepare("UPDATE agent_runs SET status = 'skipped', error_code = ?, completed_at = ? WHERE workflow_id = ? AND status = 'pending'")
    .run('server_restarted', new Date().toISOString(), workflow.id)
  for (const agentName of AGENT_NAMES) {
    db.prepare('INSERT INTO workflow_events (workflow_id, event_type, message, created_at) VALUES (?, ?, ?, ?)')
      .run(workflow.id, 'workflow_interrupted', `${agentName} execution was interrupted by a server restart.`, new Date().toISOString())
  }
}

const app = createApp({ db })
const port = Number(process.env.PORT || 3001)
const server = app.listen(port, () => {
  console.log(`Campus Helpdesk API listening on port ${port}`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => {
      db.close()
      process.exit(0)
    })
  })
}
