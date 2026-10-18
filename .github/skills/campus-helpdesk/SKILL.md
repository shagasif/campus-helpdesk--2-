---
name: campus-helpdesk
description: Guidelines for working on the Campus Helpdesk React + Vite project (ticket submission, tracking, admin dashboard, FAQ). Use when adding or changing components, forms, ticket statuses, dashboard statistics, or styling, and when testing and building the app.
---

# Campus Helpdesk Skill

Use this skill when changing the existing Campus Helpdesk project (React 19 + Vite, localStorage persistence, no router, no backend). Do not create a new project; edit the files already here.

## Project map

- `src/App.jsx` holds the tickets state, the active tab (`submit`, `track`, `faq`, `admin`), theme, and toasts.
- `src/components/` holds the UI: `Navbar`, `Footer`, `SubmitTicketForm`, `TrackTickets`, `TicketCard`, `TicketDetailModal`, `StatsOverview`, `AdminDashboard`, `KnowledgeBase`, `Toast`, `Icon`.
- `src/data/mockData.js` holds the constants (`CATEGORIES`, `PRIORITIES`, `STATUSES`, `DEPARTMENTS`, `TECHNICIANS`, `FAQS`) and the sample tickets.
- `src/utils/storage.js` is the only place that reads or writes localStorage. `src/utils/helpers.js` holds date and style helpers.
- `src/index.css` holds all styling through CSS variables and a `data-theme` attribute for dark mode.

## 1. Clean, reusable React components

- One component per file, default export, PascalCase file name. Keep files that export components free of other exports (the react-refresh lint rule requires this); put constants and helpers in `data/` or `utils/`.
- Components receive data and callbacks as props. Only `storage.js` touches localStorage, and only `App.jsx` owns ticket state.
- Reuse what exists before adding anything: `Icon` for SVGs, `TicketCard` and `TicketDetailModal` for ticket display, and the helpers in `helpers.js` for status and priority styling and date formatting. Do not copy-paste markup.
- Take option lists from `mockData.js` instead of hard-coding strings in JSX.
- Derive values during render instead of copying props into state. Do not call setState while rendering. Hold ids in state and look up the live ticket (for example `tickets.find(...)`) so modals never show stale data. Reset local state with a `key` prop.
- Clean up timers and listeners in `useEffect`. Guard browser APIs (`navigator.clipboard`, `localStorage`) with try/catch.
- Match the existing CSS class names and variables. Add new styles to `index.css`, never inline except for dynamic values.

## 2. Responsive and accessible UI

- Layouts must work from about 360px wide up. Use the existing grid and flex classes and check the media queries in `index.css`.
- Use semantic elements: `button` for actions, `nav`, `main`, `header`, `footer`, `table` with `thead`/`th`. Never put a click handler on a `div` without `role`, `tabIndex`, and an Enter/Space key handler.
- Every input needs a visible `label` linked with `htmlFor`/`id`. Icon-only buttons need `aria-label`. Dialogs need `role="dialog"`, `aria-modal`, `aria-labelledby`, and must close on Escape.
- Show errors as text next to the field, not only through colour. Status and priority must always include the text label, not just a colour dot.
- Keep text contrast readable in both light and dark themes. Test both by toggling the theme.
- Keep focus visible and keyboard order logical.

## 3. Validating student issue forms

Validation lives in `SubmitTicketForm.jsx` (`validate`). Keep these rules:

- Full name: required.
- Email: required and must match a basic `name@domain.tld` pattern.
- Location: required.
- Title: required, at least 6 characters (max 120).
- Description: required, at least 15 characters.
- Category, priority, role, and department must come from the constants in `mockData.js`.
- Trim values before validating and before saving (`createTicket` does the trimming).
- Show all errors on submit, clear a field's error when the user edits it, and do not save when any error exists.
- Never trust stored data blindly. Handle missing fields and bad JSON in localStorage without crashing.
- Do not log or display personal data (names, emails) anywhere beyond the ticket views.

## 4. Managing Pending, In Progress, and Resolved

- The only valid statuses are `Pending`, `In Progress`, `Resolved`, defined once in `STATUSES`. Do not add or rename statuses without updating `helpers.js`, the stepper, the filters, the CSS classes, and the statistics.
- New tickets always start as `Pending`, with `assignedTo: 'Unassigned'` and a first history entry.
- Change status only through `updateTicketStatus` in `storage.js`. It sets `updatedAt` and appends a `{ status, timestamp, note }` entry to `history`. Never mutate a ticket's status directly.
- Only add an admin note to history when the admin actually typed one. Otherwise log `Status changed to <status>`.
- Editing notes or the assignee without changing the status uses `updateTicket`.
- After any storage change, update React state from the value the storage function returns so the UI and localStorage agree.

## 5. Keeping dashboard statistics accurate

- Compute every number from the current `tickets` array on each render. Never keep separate counters or cached totals.
- Pending + In Progress + Resolved must equal Total. Percentages come from `Math.round(count / total * 100)` and must return 0 when total is 0 (no divide by zero).
- The Navbar pending badge, the admin filter pill counts, and the `StatsOverview` cards must all use the same status values and agree with each other.
- The "Critical / High" count is Urgent + High tickets. Do not count a ticket twice.
- After create, status change, edit, delete, and "Reset Demo Data", check by hand that all counts update.
- Rounded percentages may not add to exactly 100. That is fine, but the raw counts must always add up.

## 6. Testing changes and running the build

The project has no test runner. Verify changes yourself:

1. `npm install` (only when dependencies changed or `node_modules` is missing).
2. `npm run lint` and fix every error. Do not disable rules to silence them.
3. `npm run build` must finish with no errors. This is required before saying a change is done.
4. `npm run dev` and check the affected flow in the browser:
   - Submit a ticket with invalid data, then with valid data, and confirm the success dialog and new ID.
   - Find that ticket in Track Tickets and in the Admin dashboard.
   - Change its status through the dropdown and through the modal buttons, and confirm the history timeline, toast, and statistics update.
   - Delete a ticket, use Reset Demo Data, and reload the page to confirm persistence.
   - Check light and dark themes and a narrow (mobile) window.
   - Open the browser console and confirm there are no errors or warnings.
5. If you add logic that can be tested without the UI (for example a helper in `utils/`), test it with a small script or add a test runner only if the user asks for one.

## 7. Reporting errors honestly

- Report exactly what happened, with the real command output. Quote the error message instead of paraphrasing it.
- Never claim that lint, the build, or a test passed unless you ran it and saw it pass. If you could not run something (no network, missing dependencies, no browser), say so plainly and say what is still unverified.
- Do not hide, skip, or comment out failing code or lint rules to get a green result. Fix the cause, or explain why it cannot be fixed now.
- Separate what you confirmed from what you assume. Mention known limits, such as: there is no login on the Admin tab, and the Track tab lists all tickets by default.
- If a fix is partial or you changed something the user did not ask for, say so in the summary.
- End each task with a short summary: files changed, commands run with their results, and anything left to check.
