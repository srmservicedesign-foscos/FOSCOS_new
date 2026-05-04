# FOSCOS — Claude Code Context

This file is the single source of truth for any Claude Code session on this project.
Read it fully before writing a single line of code.

---

## What This Project Is

**FOSCOS** (Food Safety Compliance Operating System) is a **prototype/demo** of India's FSSAI
(Food Safety and Standards Authority of India) licensing portal. It is not a production
government system — it simulates the end-to-end flow a food business owner would use to
apply for, manage, and renew an FSSAI license.

Three user roles exist:
- **FBO (Food Business Operator)** — citizen applying for/managing a license
- **Officer** — FSSAI government official reviewing applications
- **Consumer** — general public (not yet built)

All payment flows, document uploads, and inspection scheduling are **mock** — no real money
moves, no real files are stored.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Backend | Python / Flask | Routing + template serving only. No business logic in Python. |
| Templating | Jinja2 | All pages extend `_base.html` or `officer/_base.html` |
| Frontend JS | Vanilla JS (ES5) | No frameworks. No build step. No npm. No TypeScript. |
| Styling | Plain CSS | CSS custom properties for design tokens. No preprocessors. |
| Auth | Firebase Auth | Phone OTP (citizens), Email/Password (officers) |
| Database | Cloud Firestore | NoSQL. All app state lives here. |
| Charts | Chart.js v4.4.3 | CDN only. Officer dashboard. |
| Fonts | Google Fonts | Inter + Playfair Display. CDN. |

**There is no build step.** Editing a `.js` or `.css` file takes effect immediately on refresh.
Never introduce npm, webpack, vite, babel, or any build toolchain without explicit approval.

---

## Running the App

```bash
# Install dependencies (first time only)
pip install flask python-dotenv

# Run
python app.py
```

**Default port is 5001.** On macOS, port 5000 is occupied by AirPlay Receiver (macOS Monterey+)
and will silently return 204 to all requests. Always use 5001 or higher on Mac.

The `.env` file **must** be present in the project root. It is not committed to version control.
Without it, Firebase config returns empty strings and all auth silently fails.

### `.env` format
```
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...
```

These values come from Firebase Console → Project Settings → Your apps → Web app → SDK setup.

---

## Firebase Setup (New Machine Checklist)

1. Copy `.env` from the previous machine into the project root
2. Firebase Console → Authentication → Settings → **Authorized domains** → confirm `localhost` is listed. Add `127.0.0.1` if accessing via IP.
3. Firebase Console → Authentication → Sign-in method → **Phone** must be enabled
4. For real SMS OTP: project must be on **Blaze (pay-as-you-go)** billing plan
5. For development without billing: Firebase Console → Authentication → Sign-in method → Phone → **Phone numbers for testing** → add test numbers (e.g. `+91 9999999999` / OTP `123456`)
6. Officer portal login uses **Email/Password** auth — no billing needed. First successful login auto-creates the `officers/{uid}` Firestore document.

---

## Architecture

### Flask is only a router

`app.py` does two things: serves the Firebase config via `/api/firebase-config` (reads `.env`)
and renders Jinja2 templates. All application logic is in client-side JS + Firestore.
Never add business logic to Python routes.

### Firebase initialisation chain

Every page (except officer portal) loads these scripts in order via `_base.html`:
1. Firebase SDK (CDN compat build)
2. `firebase-init.js` — fetches `/api/firebase-config`, initialises Firebase app, dispatches `firebase-ready` custom event
3. `auth.js` — listens for `firebase-ready`, starts `onAuthStateChanged`
4. `global.js` — chatbot FAB wiring
5. Page-specific JS (via `{% block extra_js %}`)

**Critical rule:** All Firestore reads/writes in page JS must be inside a
`document.addEventListener('firebase-ready', ...)` listener. Never call `firebase.firestore()`
at the top level — Firebase may not be initialised yet.

Officer pages use `officer-ready` instead of `firebase-ready`. `officer_auth.js` verifies the
user is in the `officers` collection, then dispatches `officer-ready` with
`{ detail: { user, officer } }`.

### Firestore collections

```
users/{uid}
  ├── businessTypes: string[]
  ├── foodTypes: string[]
  ├── scale: { tier, fee, turnover, panIndia }
  ├── details: { bizName, ownerName, bizPhone, addrLine1, addrLine2, addrDistrict, addrState, addrPincode }
  ├── documents: { selfie, idProof, addressProof, form9, blueprint, ... }  (true/false flags, mock)
  ├── ossCart: { items: [{ id, name, price, qty, type }], total: number }
  ├── review: { years, totalFee, submittedAt }
  ├── applicationId: string  (e.g. "FSSAI-2026-12345")
  ├── applicationStatus: string  (see status machine below)
  ├── submittedAt: timestamp
  └── updatedAt: timestamp

applications/{appId}
  ├── (all fields from users doc snapshot at payment time)
  ├── applicationStatus: string
  ├── auditTrail: [{ action, by, timestamp }]
  └── (officer actions append to auditTrail and update applicationStatus)

officers/{uid}
  ├── displayName: string
  ├── email: string
  ├── role: "officer"
  └── createdAt: timestamp

notifications/{newId}
  └── (created by officer actions — not yet consumed by any UI)
```

### Application status machine

```
submitted → documents_requested → inspection_scheduled → inspection_complete → final_review → approved
                                                                                             ↘ rejected (any stage)
```

Every status change writes to both `applications/{appId}` and `users/{uid}` (merge).

All status checks in JS use an array, never a single string comparison:
```javascript
var PORTAL_STATUSES = ['submitted','pending','approved','documents_requested',
  'inspection_scheduled','inspection_complete','final_review'];
```

`'pending'` is kept in the array for backwards compatibility with any older test data.

---

## Registration Flow (FBO)

Full sequence and what each step writes to `users/{uid}`:

| Step | Route | Writes to Firestore |
|---|---|---|
| 1 | `/signup` + `/signup/verify` | Creates auth user (phone OTP) |
| 2 | `/about-business` | `businessTypes: []` |
| 3 | `/food-type` | `foodTypes: []` |
| 4 | `/scale` | `scale: { tier, fee, turnover, panIndia }` |
| 5 | `/business-details` | `details: { bizName, ... }` |
| 6 | `/documents` | `documents: { selfie, idProof, ... }` (boolean flags) |
| 7 | `/one-stop-shop?from=documents` | `ossCart: { items, total }` (if items added) |
| 8 | `/review` | `review: { years, totalFee, submittedAt }` |
| 9 | `/payment` | Batch write: `applications/{appId}` (full doc) + `users/{uid}` merge (applicationId, applicationStatus: 'submitted') |
| 10 | `/application-submitted` | Read-only receipt page |
| 11 | `/fbo-portal` | Read-only dashboard |

**Resume routing** (FBO help modal button in `auth.js`): checks each field in order and redirects
to the first incomplete step. After documents: routes to `/one-stop-shop?from=documents` unless
`d.review` already exists (meaning OSS was previously skipped), then goes to `/review`.

---

## File Map

### Templates
```
templates/
  _base.html              Global layout: navbar, footer, login modal, help modal, chatbot FAB, Firebase scripts
  _placeholder.html       Generic "coming soon" page used by unbuilt routes
  index.html              Home page: hero + services grid + updates
  signup.html             New user: phone number entry
  signup_verify.html      New user: OTP verification
  about_business.html     Reg step 1: business type selection
  food_type.html          Reg step 2: food category selection
  scale.html              Reg step 3: turnover + tier determination
  business_details.html   Reg step 4: address + contact form
  documents.html          Reg step 5: document upload (mock)
  review.html             Reg step 6: application review + duration picker
  payment.html            Reg step 7: fee summary + mock payment with step indicators
  application_submitted.html  Post-payment receipt with OSS breakdown + "what's next" timeline
  fbo_portal.html         FBO dashboard: pending state (timeline) or approved state (quick actions)
  one_stop_shop.html      6-tab compliance marketplace (water testing, medical cert, fire NOC, kit, manual, hygiene)
  officer/
    _base.html            Officer layout: sidebar with FSSAI logo, nav links, user pill
    login.html            Officer email/password login
    dashboard.html        Stats + Chart.js charts + recent applications table
    applications.html     Full applications table with search/filter/sort
    application_detail.html  Application detail: pipeline indicator + 4 tabs + action buttons
```

### JavaScript
```
static/js/
  firebase-init.js        Fetches /api/firebase-config, inits Firebase, fires 'firebase-ready'
  auth.js                 Login modal (OTP), help modal, auth state observer, FBO resume routing, sign-out
  global.js               Chatbot FAB toggle (placeholder)
  signup.js               Phone input + send OTP
  signup_verify.js        OTP verification + first-time user Firestore doc creation
  registration.js         Shared multi-step progress bar logic (used across reg pages)
  about_business.js       Business type card selection + Firestore write
  food_type.js            Food category selection + Firestore write
  scale.js                Turnover slider + tier/fee calculation + Firestore write
  business_details.js     Address form + validation + Firestore write
  documents.js            Mock file selection + Firestore write + routes to OSS
  review.js               Reads user doc → populates fields, duration picker, saveAndPay
  payment.js              Reads user doc, shows fee+OSS summary, 4-step mock payment animation, batch Firestore write
  application_submitted.js  Reads user doc, populates receipt (license + OSS items + total)
  fbo_portal.js           Reads user doc, shows pending or approved dashboard state
  one_stop_shop.js        Tab switching, booking modal, cart management, Firestore cart persistence
  officer_auth.js         Officer login (email/pass + auto-create officers doc), portal auth guard, officer-ready event
  officer_dashboard.js    Reads all applications, Chart.js doughnut + bar charts, recent table
  officer_applications.js Full table: search by name/appId/phone, status filter, tier filter, sort
  officer_detail.js       Loads application, renders pipeline, 4 tabs, action buttons + confirmation modal
```

### CSS
```
static/css/
  global.css              Design tokens (--navy, --amber, --cream), navbar, footer, login modal styles
  login.css               Login modal, help modal (including FSSAI logo sizing)
  home.css                Hero (background image + gradient overlay), services grid, updates section
  registration.css        All registration steps + payment steps + payment-processing animation + submitted receipt
  fbo_portal.css          FBO dashboard: header chip, status banner, timeline, license panel, cards grid
  one_stop_shop.css       All OSS components: tabs, cards, booking modal, cart bar, hygiene modal
  officer_portal.css      Officer sidebar, nav links, dashboard cards, table, detail page, action buttons
```

### Images
```
static/images/
  fssai_logo.png          Official FSSAI logo — used in navbar, footer, help modal, officer sidebar
  hero.jpeg               Food market photo — full-width hero background on home page
```

---

## Design Tokens (global.css)

```css
--navy:       #1c2b4a   /* Primary dark colour — navbar, headings, buttons */
--amber:      #c8813a   /* Accent — CTAs, highlights, FSSAI brand colour */
--cream:      #faf7ed   /* Page background */
--cream-2:    #f0eada   /* Slightly darker cream — card backgrounds */
--font-display: 'Playfair Display', Georgia, serif   /* Headings */
--font-body:    'Inter', -apple-system, sans-serif   /* Body text */
--nav-h:      72px      /* Navbar height — use for padding-top on full-height pages */
```

The FSSAI logo (white background PNG) is always displayed inside a white rounded container
(`background: white; padding: 4px 10px; border-radius: 8px`) so it reads on the dark navy navbar.

---

## Coding Conventions

### JavaScript
- **IIFE pattern always**: `(function () { 'use strict'; ... })();`
- **ES5 only**: `var`, not `let`/`const`. Regular functions, not arrow functions.
- **No comments** unless the WHY is non-obvious (a hidden constraint, a known quirk)
- **DOM access**: use `document.getElementById()` directly, never jQuery
- **Firebase calls** always inside `firebase-ready` or `officer-ready` event listeners
- **Status checks** always use array + `indexOf`, never `=== 'submitted'` alone (status machine has many states)
- **setText helper** pattern: `function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val || '—'; }`

### CSS
- Add styles to the existing relevant CSS file, never create new CSS files unless a whole new feature area warrants it
- Use existing CSS custom properties — never hardcode colours
- Component styles go near related styles in the file, not at the bottom

### Templates
- All citizen-facing pages extend `_base.html`
- All officer pages extend `officer/_base.html`
- Use `_placeholder.html` via `placeholder('Page Name', 'page-id')` in `app.py` for unbuilt pages
- Never inline `<style>` blocks in templates — put styles in the relevant CSS file

### Flask
- Routes only call `render_template()` or `placeholder()` — no logic
- New routes added to `app.py` follow the existing grouping comments

---

## Current State: Built vs Placeholder

### Fully built and functional
- Home page (hero with background image, services grid, updates)
- Signup flow (phone OTP → new user)
- Full 8-step FBO registration flow (about-business → payment)
- Payment: 4-step animated mock flow → `/application-submitted` receipt
- FBO Portal: pending state (timeline) + approved state (quick actions grid)
- One Stop Shop: all 6 tabs functional with mock booking/cart flows
- Officer Portal: login, dashboard (charts), applications table, application detail with full action pipeline

### Placeholder (route exists, page not built)
These all render `_placeholder.html`:
- `/regulations`
- `/latest-updates`
- `/about-fssai`
- `/consumer` — Consumer role (complaints, license lookup)
- `/agent` — Agent/Facilitator role
- `/help`
- `/apply-permanent-license` — separate from the main `/about-business` reg flow
- `/temporary-license` — distinct short-duration license flow
- `/temp-license`
- `/renew-license`
- `/check-status`
- `/consumer-corner`
- `/updates`

### Stubbed UI elements (button exists, action not wired)
- FBO Portal → Download License card (placeholder click handler shows alert)
- FBO Portal → Renew License card
- FBO Portal → Update Details card
- FBO Portal → Compliance Checklist card
- FBO Portal → Notifications card
- Language toggle button (navbar) — button exists, no i18n implemented
- Chatbot FAB "Potato" — panel opens but is placeholder content
- OSS → User Manual tab — video buttons are placeholders
- One Stop Shop booking confirmation — shows success state but no real booking backend

---

## Known Gaps & Work in Progress

### High priority / incomplete flows
1. **Temporary license flow** — completely unbuilt. Should be a fast-track 30/60-day license for street vendors/home kitchens. Referenced in the home page services card but routes to placeholder.
2. **Renew license flow** — unbuilt. FBO portal has the card but no flow.
3. **Consumer role** — entirely unbuilt. Complaint filing, license lookup, hygiene ratings.
4. **Notifications** — `notifications/{newId}` collection is written by officer actions but nothing reads/displays them to the FBO. The FBO portal Notifications card is a stub.
5. **Real document upload** — currently mock (boolean flags). Firestore Storage integration is not implemented.

### Known design decisions to revisit
- The `/apply-permanent-license` navbar/service route is a separate placeholder from the actual registration flow at `/about-business`. These need to be unified or clarified.
- Officer application detail "Approved" state does not currently update the FBO portal to show an actual license number — the FBO portal shows the application ID as a proxy.

### Data consistency
- `users/{uid}` stores registration progress. After submission, `applicationId` and `applicationStatus` are written there. The officer portal reads from `applications/{appId}`. Both collections need to stay in sync — officer actions always write to both via Firestore batch writes.

---

## Common Pitfalls (Lessons Learned)

1. **Edit tool requires reading first.** The Claude Code Edit tool will throw `"File has not been read yet"` if you attempt to edit a file without having called Read on it in the current session. Always Read before Edit, even if you think you know the content.

2. **Firebase `merge: true` scope.** `set({field: value}, {merge: true})` merges at the TOP-LEVEL field level only. Nested fields inside an existing object are replaced wholesale. This is intentional and correct — `ossCart` and `review` are separate top-level fields and preserve each other.

3. **Status string coverage.** Whenever checking `applicationStatus`, always check the full array: `['submitted','pending','approved','documents_requested','inspection_scheduled','inspection_complete','final_review']`. A single `=== 'submitted'` check will miss other states and cause silent redirects to `/about-business`.

4. **`firebase-ready` event is mandatory.** Direct calls to `firebase.firestore()` or `firebase.auth()` at module load time will fail intermittently because Firebase config is fetched async. Everything must be inside `document.addEventListener('firebase-ready', ...)`.

5. **Port 5000 on macOS.** AirPlay Receiver occupies port 5000 on macOS Monterey+. Flask will appear to start but all requests silently return 204. Always run on port 5001 (`app.run(debug=True, port=5001)`).

6. **Firebase Phone Auth domain.** If auth gives "hostname match not found", go to Firebase Console → Authentication → Settings → Authorized domains and add the hostname (e.g. `localhost`, or the LAN IP if accessing from another device).

7. **Firebase Phone Auth billing.** Real SMS requires the Blaze plan. For dev/testing, always configure test phone numbers in Firebase Console (Authentication → Sign-in method → Phone → Phone numbers for testing). This works without billing.

8. **Officer portal first login.** The `officers/{uid}` Firestore document is auto-created on first successful email/password login. No manual Firebase Console setup needed. Any Firebase Auth email/password user can become an officer on first login.

9. **OSS cart bypass.** The FBO help modal resume routing previously sent existing users directly to `/review`, skipping the OSS step entirely. Fixed: auth.js now routes to `/one-stop-shop?from=documents` if `d.review` is not yet set.

10. **`populateReview` with empty data.** review.js previously only called `populateReview(doc.data())` when `doc.exists`. If the Firestore doc was missing, all fields showed dashes. Fixed: always call `populateReview(doc.exists ? doc.data() : {})`.

---

## User Preferences & Workflow

- **No over-engineering.** Three similar lines is better than a premature abstraction. No helper classes, no utility files unless the need is overwhelming.
- **No unnecessary comments.** Code should be self-explanatory from naming. Only comment when there's a hidden constraint or surprising behaviour.
- **Mock flows are fine.** The project is a prototype. Payment, document uploads, and external APIs are intentionally mocked. Do not add real integrations without discussion.
- **Discuss before adding costs.** Any tool, library, service, or API that incurs real costs must be raised with the user before implementation. Firebase (Blaze) is already approved. Everything else needs explicit sign-off.
- **Free and open source by default.** Prefer MIT/BSD/Apache-licensed libraries. Avoid proprietary SDKs. If a paid service is the only option for a feature, present free alternatives first.
- **No frameworks without discussion.** The user has not asked for React, Vue, Next.js, or similar. Do not introduce them.
- **Confirm before destructive changes.** Deleting files, reworking major flows, or changing the data schema in Firestore should be discussed first.

---

## Cost & Dependency Policy

| Tool | Status | Notes |
|---|---|---|
| Flask | ✅ Approved | BSD licence, free |
| Firebase Auth | ✅ Approved | Blaze plan active |
| Cloud Firestore | ✅ Approved | Blaze plan, pay-as-you-go |
| Chart.js | ✅ Approved | MIT licence, CDN |
| Google Fonts | ✅ Approved | Free CDN |
| Firebase Storage | 🔲 Not yet used | Free tier exists — discuss before adding |
| Real payment gateway | 🚫 Not approved | Razorpay/Stripe etc. — discuss first |
| Email/SMS services | 🚫 Not approved | SendGrid, Twilio etc. — discuss first |
| Any new npm package | 🔲 Discuss first | Only add if no vanilla equivalent exists |

---

## Asking Before Acting

If you are about to do any of the following, **stop and confirm with the user first**:

- Add a new npm/pip dependency
- Introduce a paid API or third-party service
- Change the Firestore data schema in a breaking way
- Delete or significantly restructure existing files
- Change the Flask port, CORS config, or deployment settings
- Add any tracking, analytics, or external data sharing
