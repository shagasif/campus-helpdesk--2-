# Campus Helpdesk

The existing React/Vite helpdesk now has a Node.js API, account-scoped complaint storage, and a Gemini-powered multi-agent triage workflow. The original submit, tracking, FAQ, and staff dashboard screens remain in place.

## Requirements

- Node.js 22.13 or newer (the backend uses Node's built-in `node:sqlite` module)
- npm
- A Google Gemini API key for AI triage

## Local setup

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Create a private environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Set `GEMINI_API_KEY` in `.env`. Choose a long `ADMIN_PASSWORD` (at least 12 characters) and set `ADMIN_EMAIL`. Those values provision the staff administrator on the first server start; public sign-up can only create student accounts. Do not commit `.env`.

4. Start the API and frontend in separate terminals:

   ```powershell
   npm run dev:server
   ```

   ```powershell
   npm run dev
   ```

5. Open the Vite URL shown in the frontend terminal. Students can create local-password accounts; sign in to the staff console with the configured administrator credentials.

The Vite development server proxies `/api` to port 3001. The default SQLite file is `server/data/helpdesk.sqlite`; set `DB_PATH` to change it. For deployment, serve the frontend and API on one HTTPS origin or configure `APP_ORIGINS` for the frontend origin and set `NODE_ENV=production`.

## Existing browser tickets

The prior project stored tickets in browser localStorage and included sample records; it had no server, user accounts, or database to migrate. After signing in, a student can choose the one-time browser-ticket import. The API imports only records whose stored submitter email matches the signed-in account, preserves valid history and IDs where possible, maps legacy `Urgent` to `Critical`, and rejects other owners' data. The original localStorage data is not deleted. Records that fail server validation are skipped.

New backend accounts start with no seeded demo tickets. The former “Reset Demo Data” control is now “Refresh Tickets”; it does not insert fake complaints into the database.

## AI and FAQ source safety

The backend sends issue text to Gemini; the API key remains server-side. Workflows make six structured Gemini requests and are limited to one active workflow per server process, with a default eight-requests-per-minute quota guard and bounded retries. Missing configuration and exhausted quota fail visibly; no fake AI output is used.

### Gemini setup troubleshooting

`GEMINI_API_KEY` is read when the backend starts. After adding or replacing the key in the project-root `.env`, stop and restart `npm run dev:server`; rerunning a workflow does not reload environment variables. Start a new workflow after restarting, since an earlier failed workflow keeps its original error. The activity panel now distinguishes invalid keys, denied API access, unavailable models, quota limits, and malformed requests without displaying or logging the key.

If the key was shared or pasted into a chat, revoke it in Google AI Studio and configure a replacement in `.env`. Never put the key in frontend code or browser developer tools.

The FAQ text shipped in the original app has no source or approval metadata. Consequently, the resolution agent does **not** use it as authoritative guidance: it returns no recommendation until an FAQ is explicitly marked approved with an HTTPS university source URL in `server/config.js`. Review each item against current university policy before enabling it. This prevents the system from presenting the demo FAQ content as verified.

Student passwords are locally managed and email addresses are not verified; this does not prove university affiliation. Before production use, replace local registration with the university identity provider, configure strong secret management, use HTTPS, and protect/backup the SQLite data directory.

## Validation

```powershell
npm test
npm run lint
npm run build
```

See [the architecture and API notes](./docs/ai-agent-architecture.md) for workflow, authorization, schema, and operational details.
