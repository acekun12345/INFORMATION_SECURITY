# CCDI Campus Queue — repaired source

Complete React + TypeScript project. The supplied third and fourth attachments contain the same `StaffDashboard` component. Keep **one** `StaffDashboard.tsx`; do not mount both copies. The inline staff panel formerly inside `App.tsx` has also been removed.

## Quick start

Use Node.js 22.12+ or Node.js 24 LTS.

```sh
npm ci
npm run dev
```

Open the localhost address printed by Vite. No `.env` is required for the default browser demo.

Demo login:

| Role | Password |
| --- | --- |
| Student | `ccdistudent` |
| Staff | `ccdistaff` |

Enter any fictional full name and ID for testing. Use the same student ID after signing in again to recover that student's records. Open a second tab on the **same localhost address and port**, sign in as Staff, then call a student's ticket. The two tabs share browser demo data. Local demo does not synchronize different devices or different browsers.

The login is deliberately labeled **prototype access**. A shared password and a client-side role check are not real authentication. The short lockout is only a UI demonstration. It resets when the page is reloaded. Do not use actual student records in this prototype.

## Files to use

| File | Purpose |
| --- | --- |
| `src/App.tsx` | Login, navigation, student dashboard, dialogs, one set of subscriptions, requests |
| `src/App.css` | Complete responsive design system, scoped with `cq-` names |
| `src/StaffDashboard.tsx` | The only staff queue interface |
| `src/queueService.ts` | Shared subscriptions and writes; browser demo or Firebase adapter |
| `src/queueLogic.ts` | Validated ticket allocation, FIFO order, cancellation and staff transitions |
| `src/types.ts` | Shared TypeScript definitions |
| `src/firebase.ts` | Mode selection and optional Firebase configuration |
| `src/main.tsx` | React entry point |

If adapting an existing Vite app, back it up first and use the entire matching `src` set. Replace the old `App.css`; do not append this stylesheet to the old one. Remove any old `index.css` starter styles that center `body` or constrain `#root`. The supplied `main.tsx` intentionally imports no such starter stylesheet. Do not keep a second legacy staff component or separate queue listener mounted elsewhere.

Keep your own Firebase values private to your project configuration. The original `firebase.ts`, `types.ts`, package manifest and database rules were not supplied; this package includes complete compatible replacements rather than assuming their contents.

## What changed

- One staff component and one shared subscription owner. No conditional Hook after an early return.
- Separate serving state for Cashier, Accounting and Registrar. No single global `currentQueue` value overwriting another department.
- Ticket numbers are allocated from persisted history inside the **same transaction** as ticket creation. They no longer depend on a counter in one browser's React state.
- A normalized student ID can have only one active ticket across departments. Existing legacy duplicates are shown for staff resolution.
- Call next checks the expected current/next tickets again inside the transaction. A second operator using stale queue state cannot accidentally advance the queue a second time.
- Complete & call next closes existing serving tickets and starts the next one atomically. Done completes the last ticket even when the queue is empty. Skip marks a no-show. Recall sends a fresh student alert without changing queue position.
- People ahead is based on actual waiting tickets plus active service, not arithmetic subtraction of ticket numbers.
- One pending mutation at a time, disabled unavailable actions, visible read/write errors, reconnect status, recovery from listener errors, and listener cleanup.
- Student cancellation is limited to their waiting ticket. Serving tickets must be handled by staff.
- Requests persist, have unique IDs and real timestamps. Staff can advance Pending → Processing → Ready → Released.
- Native accessible dialogs provide Escape-to-close and focus management. Light/dark themes, mobile layouts and reduced-motion support share one stylesheet.
- Hardcoded example balances were removed. The account balance screen states that a verified billing source is not connected.

## Firebase connection across devices

Local development defaults to **local demo mode**. Production builds use the existing CCDI Firebase web configuration and store this app's data under a separate `/ccdiQueue/` namespace, leaving the old app's `/queues` and `/currentQueue` paths untouched.

The Firebase web configuration is public client configuration, not an access-control mechanism. Actual access is controlled by Realtime Database rules. This prototype uses client-side role checks, not Firebase Authentication. Review your existing rules before enabling live mode, and do not make a production database publicly writable to work around permission errors.

For local Firebase testing, copy `.env.example` to `.env.local`, set `VITE_QUEUE_MODE=firebase`, and restart `npm run dev`. Optional `VITE_FIREBASE_*` values can override the existing project configuration.

For Vercel, set the project's **Root Directory** to `ccdi-queue` and deploy the latest `main` commit. Production builds select Firebase via `.env.production`; no Vercel environment variables are needed unless you want to override the Firebase web configuration. Vite embeds client settings at build time.

The Firebase adapter reads and writes only these Realtime Database paths:

| Path | Use |
| --- | --- |
| `/ccdiQueue/queues/{id}` | Queue records; transactions operate on `/ccdiQueue/queues` |
| `/ccdiQueue/documentRequests/{id}` | Document requests and status transitions |
| `/.info/connected` | Actual connection state |

The database rules must permit the intended access under `/ccdiQueue`. This project does not modify Firebase rules. Old `/currentQueue` data is not imported; the legacy app's queue format is incompatible with this app's validated ticket format. Firebase Realtime Database automatically reconnects listeners, and the app clears each listener's error after it receives valid data again.

Database rules must already authorize the relevant reads and writes. This package does **not** deploy rules, open your database, or authenticate a Firebase user. If your database requires Firebase Authentication, this prototype's shared-password login does not satisfy it; the app will show the permission error. Do not fix that by making a real student database public.

For production, replace prototype login with Firebase Authentication, verify staff roles on a trusted backend, and move privileged ticket allocation/status transitions to that backend. Expose only public queue summaries and each student's own records. Client filtering is not a privacy boundary: this prototype subscribes to all queue and document records. Production authentication, secure backend endpoints, billing integration and deployment are **not included or verified** here.

The root queue transaction is suitable for a small test dataset, not an indefinitely growing production queue. It requires read access to the transaction location as well as write access. See [Firebase transaction documentation](https://firebase.google.com/docs/database/web/read-and-write#save_data_as_transactions).

Keep historical queue records when using this allocator. Deleting the history can reset/reuse ticket numbers. Daily resets and historical archiving need a server-side sequence/day strategy before adding those features. FIFO uses client timestamps and an ID tie-breaker in this prototype; use a trusted server clock for strict production ordering.

## Validation

```sh
npm test
npm run build
npm run preview
```

Verified on the supplied project:

- Strict TypeScript check and Vite production build passed.
- 14 tests passed: sequence persistence, department prefixes, duplicate active tickets, conflict retry, stale staff actions, atomic call-next, empty-queue handling, recall, skip, final completion, legacy multiple-serving cleanup, deterministic ordering, cancellation ownership/state, and malformed document records.
- Browser demo: student login and C-101 creation; a second tab signed in as staff; Call next displayed the student turn dialog; Recall displayed it again; Done cleared the active ticket.
- Browser demo: a two-copy document request appeared in the staff list and progressed through Processing, Ready and Released; the student tab displayed Released.
- Desktop light layout and mobile dark staff layout inspected. Mobile viewport had no document-wide horizontal overflow. No browser errors/warnings were captured in that flow.
- Development server, React StrictMode login and native queue dialog verified without captured browser errors/warnings.

The live Firebase project was not tested because its configuration, rules and credentials were not provided. Passing the build and demo tests does not guarantee compatibility with an unseen existing project. Use the included package lock and complete file set for the verified dependency combination.

Demo records remain only in the current browser storage. No real school data, Firebase settings or existing repository files were changed.
