# FoSCoS — Agent Flow: Complete Documentation

---

## What Is the Agent Flow?

An **Agent** (or Facilitator) is a third-party professional — typically a licensing consultant, CA, or regulatory agent — who manages FSSAI license applications on behalf of multiple food business clients. Instead of each business going through the process themselves, they authorise an agent to handle it. The agent has a dedicated portal that lets them track all clients, their license statuses, pending actions, and renewals from a single dashboard.

---

## Entry Points

There is currently **one entry point** into the agent flow in the prototype:

**Gateway Modal → "Agent / Facilitator" card**

The homepage has a "How can we help?" / "Namaste!" button that opens a modal with three user-type cards:

- Food Business (FBO)
- Consumer
- **Agent / Facilitator** → routes to `agent-login-screen`

The back button on the agent login screen returns to the gateway modal (not the home screen directly) — the intent is backing out of a user-type choice, not exiting the site.

---

## Page-by-Page Breakdown

---

### Page 1 — Agent Login (`agent-login-screen`)

**What the user sees:**
- A centred card with a blue gradient icon (🤝), heading "Agent Login", and the description: *"Enter your registered mobile number to access the agent portal and manage client applications."*
- A mobile number input field with +91 prefix
- A "Send OTP →" button in dark navy-blue (distinct from the amber used in FBO flows)

**What happens:**
- User enters their 10-digit mobile number
- `agentSendOTP()` validates it is exactly 10 digits; shows an alert if not
- On valid input: stores the number in `_agentMobile` and routes to the OTP screen

**Backend logic (implied):**
- The number is checked against a registered agent database
- Only pre-approved, FSSAI-registered agents can log in here
- If the number is not in the agent registry, the system returns an error (not prototyped)

**Back button:** Returns to the gateway modal (`openGatewayModal()`)

---

### Page 2 — Agent OTP (`agent-otp-screen`)

**What the user sees:**
- A 6-box OTP input, same visual pattern as FBO OTP screens
- Auto-focus advances to the next box on each digit input (`agentOtpInput(n)`)
- "Verify & Enter Portal →" button in the same dark blue gradient
- "Resend OTP" link (currently clears and re-focuses the boxes; no real resend logic)

**What happens:**
- `agentVerifyOTP()` is called — in the prototype, any OTP entry immediately succeeds and routes to `agent-dashboard`
- Back button → `agent-login-screen`

**Backend logic (implied):**
- Real system sends an SMS OTP via MSG91 to the registered agent mobile
- OTP is time-limited (typically 5–10 minutes)
- Verification confirms agent identity and creates an authenticated session

---

### Page 3 — Agent Dashboard (`agent-dashboard`)

**What the user sees:**

**Header row:**
- Left: "Agent Portal" label + "Welcome, Agent 🤝" heading
- Right: 🏠 Home button (routes to home screen)

**Summary bar — 4 stat cards in a grid:**

| Stat | Value | Colour |
|---|---|---|
| Total Clients | 6 | Navy |
| Pending Applications | 2 | Amber |
| Active Licenses | 4 | Green |
| Renewals Due | 1 | Red |

These are hardcoded in the prototype. In a real system they would be computed dynamically from the agent's client portfolio.

**"My Clients" section:**

A list of client cards, each showing:
- Business emoji icon with a category-coded coloured background
- Business name
- License type · State · Status detail line
- Status badge (Active / Pending / Renew Soon)
- "Manage →" button calling `agentOpenClient(name)`

**Clients shown in the prototype:**

| Business | License | Location | Status |
|---|---|---|---|
| Annapurna Catering | State License | Shillong | ● Active — expires in 127 days |
| Rani Sweets & Confectionery | Basic Registration | Tura | ⏳ Pending — application in progress |
| Kumar Tiffin Centre | State License | Meghalaya | 🔴 Renew Soon — expires in 23 days |

**"+ Add New Client" button** — routes to `agent-add-client`

**Backend logic (implied):**
- Client list is fetched from an `agents_clients` join table keyed to the logged-in agent's ID
- Each client record includes their FBO account ID, business name, current license status, expiry date, and license category
- Renewal alerts are auto-triggered when expiry is ≤ 30 days (configurable)
- Summary bar numbers are aggregated server-side

---

### Page 4 — Agent: Client View (`agent-client-view`)

This is the most important screen in the flow. When the agent clicks "Manage →" on any client card, they enter a client-specific view that is essentially the **FBO dashboard rendered in an agent context**.

**What the user sees:**

**Agent banner (full-width top strip, blue gradient):**
- "🤝 Agent View — Acting on behalf of [Client Name]"
- "← Back to Dashboard" button

This banner makes it visually unmistakable that the agent is operating on someone else's account.

**Two-column layout:**

**Left column — main content:**

License card (large dark card) showing:
- License type (e.g. "FSSAI State License")
- Business name (populated dynamically via `agent-client-bname`)
- "Acting as Agent" subtitle
- Status badge: ● ACTIVE
- License number (placeholder)
- Expiry: "127 days left"
- Category: "State License"

Action grid (2 × 3 buttons):

| Button | Action |
|---|---|
| 📊 Track Application | Routes to `tracker-screen` |
| 🔄 Renew License | Calls `startFBOFlow()` |
| 📄 File Annual Return | Routes to `annual-return-screen` |
| 📋 New Application | Calls `startFBOFlow()` |
| ✏️ Modify License | Non-functional (no onclick wired) |
| 🛒 One Stop Shop | Calls `openOneStopShop()` |

**Right column — sidebar:**

Client Application History mini-card:
- APPROVED — State License · Jan 2025
- APPROVED — Basic Reg. · Jan 2023

Agent Note amber banner: *"License expires in 127 days. Initiate renewal at least 30 days before expiry to avoid gaps."*

**Backend logic (implied):**
- The agent accesses this screen only because the client previously granted authorisation (via OTP — see Page 6)
- All actions the agent takes here are logged against both the agent ID and the FBO's account ID
- Requires an `agent_authorisations` table with: `agent_id`, `fbo_id`, `status` (active/revoked), `granted_at`
- Annual Return filing and license renewal go through the same backend flows as a direct FBO login, but the `submitted_by` field records the agent's ID

---

### Page 5 — Add New Client (`agent-add-client`)

When the agent wants to bring a new client into their portfolio, they land here.

**What the user sees:**
- Heading: "Add New Client"
- Subtext: *"Add a client to your portfolio. If they already have an FSSAI account, link it via OTP."*
- Two mutually exclusive selection cards:

  **🔗 Existing Account** — "Client has FSSAI login — link via OTP"

  **✨ New Client** — "No account yet — fill in details"

Selecting either card calls `agentClientPath(path, el)` which toggles the relevant form below.

---

**Branch A — Existing Account Path:**

Fields shown:
- Client Mobile Number (with +91 prefix)
- "Send OTP to Client →" button — calls `agentLinkClient()`
- Helper text: *"An OTP will be sent to the client's number. They confirm to grant you access."*

On click: validates the mobile is 10 digits, pre-populates the claim OTP screen with the client's number displayed, then routes to `agent-claim-otp`.

---

**Branch B — New Client Path:**

Fields shown:
- Client Name (text input)
- Business Name (text input)
- Mobile Number (tel input)
- Business Type (dropdown): Street Vendor / Home Kitchen · Restaurant / Café · Catering / Cloud Kitchen · Retail Food Shop · Food Manufacturer · Other

"Add Client & Start Application →" button — calls `agentCreateClient()`

On click: validates name and business name are filled, confirms via alert, routes to `agent-dashboard`, then calls `startFBOFlow()` — kicking off the standard FBO application flow on behalf of this new client.

**Backend logic (implied):**
- New Client path: creates a new FBO account with the provided details and immediately links it to the agent's portfolio
- The agent is effectively registering the client into the system on their behalf
- Existing Account path: system verifies the mobile is registered, then initiates a consent OTP flow

---

### Page 6 — Client OTP Confirmation (`agent-claim-otp`)

This is the **consent mechanism** — the client must confirm they are granting the agent access to their account.

**What the user sees:**
- Heading: "Client Confirmation"
- Description: *"An OTP has been sent to your client's number. Ask them to share the code with you to confirm agent access."*
- The client's mobile number displayed in a navy badge
- 6-box OTP input (auto-advances on each digit)
- "Verify & Link Client →" button
- "Resend OTP" link

**Two states:**

*Pre-verification:* OTP boxes + verify button

*Post-verification (success state):*
- ✅ animation replaces the OTP section
- "Client Linked!" heading in green
- Confirmation message: *"Client (+91 [number]) has been added to your portfolio. You can now manage their applications."*
- "Go to Dashboard →" button → routes to `agent-dashboard`

**Function logic:**
- `agentClaimOtpInput(n)` — auto-advances between OTP boxes
- `agentResendClaim()` — clears and re-focuses the boxes
- `agentClaimVerify()` — joins all 6 digits, validates length ≥ 6, shows success state, populates the confirmation message with the client's number

**Backend logic (implied):**
- This is a **dual-party consent flow**: the OTP goes to the client's phone, not the agent's
- The agent physically asks the client (in person or on a call) to share the code
- On verification: a record is created in `agent_authorisations` with `status: active`
- The client can revoke this authorisation from their own FBO dashboard at any time
- The OTP is a one-time-use token tied to the specific agent-client pair

---

## Full Flow Map

```
Home Page
  └── Gateway Modal
        └── "Agent / Facilitator"
              └── agent-login-screen
                    └── [valid mobile + Send OTP]
                          └── agent-otp-screen
                                └── [any OTP + Verify]
                                      └── agent-dashboard
                                            ├── [click client card or Manage →]
                                            │     └── agent-client-view
                                            │           ├── Track Application  → tracker-screen
                                            │           ├── Renew License      → FBO flow
                                            │           ├── File Annual Return → annual-return-screen
                                            │           ├── New Application    → FBO flow
                                            │           ├── Modify License     → (non-functional)
                                            │           ├── One Stop Shop      → one-stop-screen
                                            │           └── ← Back to Dashboard → agent-dashboard
                                            │
                                            └── [+ Add New Client]
                                                  └── agent-add-client
                                                        ├── Existing Account path
                                                        │     └── [mobile + Send OTP to Client]
                                                        │           └── agent-claim-otp
                                                        │                 └── [OTP verified]
                                                        │                       └── ✅ Client Linked
                                                        │                             └── agent-dashboard
                                                        │
                                                        └── New Client path
                                                              └── [fill details + Add Client & Start Application]
                                                                    └── agent-dashboard → FBO flow
```

---

## Known Gaps and Issues in the Prototype

| # | Issue | Location | Notes |
|---|---|---|---|
| 1 | Modify License button has no `onclick` | `agent-client-view` | Non-functional as noted in the brief |
| 2 | All three demo clients open the same hardcoded data (Annapurna Catering) | `agent-client-view` | Real implementation needs each client to resolve to their own license data |
| 3 | Resend OTP clears the boxes but does not trigger a real resend API call | `agent-otp-screen`, `agent-claim-otp` | Needs MSG91 integration |
| 4 | New Client flow immediately calls `startFBOFlow()` which shares global state with direct FBO logins | `agent-add-client` | Agent context must be passed through the entire FBO flow so the application is submitted under the FBO's account, not the agent's |
| 5 | "Acting as Agent" session state is not persisted | `agent-client-view` | Navigating away and back loses the agent context in the current prototype |
| 6 | No error state if an unregistered mobile number is entered on agent login | `agent-login-screen` | System silently proceeds to OTP; should validate against agent registry first |
