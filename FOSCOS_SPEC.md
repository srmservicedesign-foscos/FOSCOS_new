# FoSCoS — Full Design & Specification Document (Target State)
> One-shot clone spec. Covers both FOSCOS_v4 (citizen app) and fssai-backend (officer portal).  
> All 34 feature changes from the brief are incorporated as the target state — this is what to build, not what exists.

---

## 1. TECH STACK & GLOBAL CONSTANTS

```
Framework:     Single HTML file per portal (no build step for prototype; Next.js 14 for prod)
Fonts:         DM Serif Display (headings), DM Sans (body), DM Mono (codes)
Icon lib:      Emoji only (no icon font dependency)
OTP:           MSG91 (5-digit for FBO, 6-digit for Consumer/Agent)
Storage:       AWS S3 / Cloudflare R2 (document uploads)
Payment GW:    PayGov (government gateway redirect)
Maps/GPS:      Browser Geolocation API + reverse geocode via pincode lookup
Date/Time:     Real-time via JS Date(), synced across all displays
```

### CSS Design Tokens
```css
--navy:      #355070   /* Primary navy */
--navyDk:    #1e3a5f
--navyLt:    #e8eef5
--sage:      #6B8F71   /* Primary green */
--sageDk:    #4a6b50
--sageLt:    #e8f0e9
--amber:     #DFA36D   /* Primary accent */
--amberDk:   #c4894f
--amberLt:   #fdf3e7
--charcoal:  #2D3748
--gray:      #6B7280
--cream:     #F5F3EE   /* Page background */
--border:    #E5E7EB
--red:       #dc2626
--redLt:     #fee2e2
--green:     #16a34a
--greenLt:   #dcfce7
--blue:      #3b82f6
--blueLt:    #dbeafe
--purple:    #7c3aed
--purpleLt:  #ede9fe
```

### Shared Component Patterns
- **btn-primary**: background amber gradient, white text, border-radius 12px, padding 14px 28px, font-weight 700
- **btn-ghost**: transparent, navy border 1.5px, navy text
- **btn-sage**: sage background, white text
- **back-btn-light**: small ghost button `← Back`
- **home-btn-light**: small ghost button `🏠 Home`
- **card**: white bg, 1px border (--border), border-radius 16px, box-shadow subtle, padding 20px
- **info-banner**: flex row, icon + text, colored left accent. Variants: amber, sage, navy
- **field-label**: 12px, font-weight 700, navy, uppercase tracking 0.8px, margin-bottom 6px
- **field-input**: width 100%, padding 10px 14px, border 1.5px solid --border, border-radius 10px, 14px font
- **required asterisk**: `<span style="color:var(--red)">*</span>` after every required label
- **optional tag**: `<span style="font-size:11px;color:var(--gray);font-weight:400;">(optional)</span>` inline after label text
- **pill-toggle**: inline pill for selecting options; active state = amber bg + white text
- **sel-card**: white card with 2px border, selected state = amber border + amberLt bg + visible checkmark (absolute top-right circle)
- **Progress bar (flow)**: 4 steps — Setup / Details / Documents / Review. `.prog-line` dots + labels below.

---

## 2. CITIZEN APP — FOSCOS_v4

### 2.1 Screen Inventory (all screens are `<div class="screen">`, only one `.active` at a time)

| Screen ID | Name | Entry Point |
|---|---|---|
| `home-screen` | Home | Default / always |
| `login-screen` | Login (existing account) | Hero "Login" button |
| `otp-screen` | OTP Verify (login) | login-screen |
| `fbo-login-screen` | FBO Login | Gateway modal → FBO |
| `fbo-otp-screen` | FBO OTP Verify | fbo-login-screen |
| `license-choice-screen` | Permanent vs Temp choice | After FBO OTP verified |
| `q-setup-screen` | Business Type Selection | license-choice-screen → Permanent |
| `q-menu-screen` | Food Items Selection | q-setup-screen |
| `q-turnover-screen` | Turnover / Tier Calculator | q-menu-screen |
| `details-screen` | Personal + Business Details | q-turnover-screen |
| `documents-screen` | Document Upload | details-screen |
| `one-stop-screen` | One Stop Shop | documents-screen "Continue to Review" |
| `review-screen` | Review Application | one-stop-screen |
| `payment-options-screen` | Payment Method | review-screen |
| `payment-screen` | PayGov redirect + confirmation | payment-options-screen |
| `dashboard-screen` | FBO Dashboard | After payment / login |
| `tracker-screen` | Track Application | Dashboard |
| `annual-return-screen` | File Annual Return | Dashboard |
| `my-tl-screen` | My Temp License (dashboard view) | Dashboard (temp license holders) |
| `tl-s1` | Temp — Eligibility Check | license-choice-screen → Temp / home services |
| `tl-purpose` | Temp — Purpose (stall vs business) | tl-s1 |
| `tl-s2` | Temp — OTP Account Creation | tl-purpose |
| `tl-s3` | Temp — Personal Details | tl-s2 |
| `tl-s4` | Temp — Geotagged Photos | tl-s3 |
| `tl-s5` | Temp — KYC Documents | tl-s4 |
| `tl-s6` | Temp — Disclaimer / T&C | tl-s5 |
| `tl-s7` | Temp — License Issued | tl-s6 |
| `tl-s8` | Temp — FoSTaC Training | tl-s7 |
| `cc-login` | Consumer Corner — Login | Home services grid / gateway |
| `cc-search` | Consumer Corner — Search FBOs | cc-login |
| `cc-grievance` | Consumer Corner — Rate / Grievance | cc-search → FBO selected |
| `cc-submit` | Consumer Corner — Submission confirm | cc-grievance |
| `cc-track` | Consumer Corner — Track Complaints | cc-search |
| `cc-report` | Consumer Corner — Report unlicensed | cc-search |
| `agent-login-screen` | Agent Login | Gateway modal → Agent |
| `agent-otp-screen` | Agent OTP | agent-login-screen |
| `agent-dashboard` | Agent Dashboard | agent-otp-screen |
| `agent-add-client` | Agent Add Client | agent-dashboard |
| `agent-claim-otp` | Agent Claim Client OTP | agent-add-client |
| `agent-client-view` | Agent — View Client | agent-dashboard client list |
| `fostac-quiz-screen` | FoSTaC Training Quiz | tracker-screen → FoSTaC tab |
| `temp-license-screen` | Legacy temp KYC (retain for fallback) | — |

---

### 2.2 GLOBAL ELEMENTS (always rendered, shown/hidden per screen)

#### Progress Bar (`#progress-bar`)
Shown on all flow screens. Hidden on home/dashboard/consumer/agent screens.
```
Steps: [0] Setup  [1] Details  [2] Documents  [3] Review
Each step: .prog-line (dash/dot) + .prog-label below
State classes: (none)=pending, .active=current, .done=completed
```

#### TL Progress Bar (`#tl-progress-bar`)  
Shown only during temp license flow. 8 steps:
```
[0] Info  [1] Location  [2] Docs  [3] Food  [4] Rules  [5] License  [6] FoSTaC  [7] Upgrade
```

#### Potato Chatbot (`#potato-btn`, `#potato-window`)
- Floating button bottom-right, emoji 🥔
- Window: header "🥔 Potato — FSSAI Guide", message list, chip buttons, text input + send
- Context-aware chips: changes based on current screen (permanent / temp / consumer / default)
- Keyword-matched reply map (see JS section 2.14)
- "📞 Talk to a person (1800-112-100)" link at bottom
- Auto-closes on screen change

#### Language Toggle
- EN / HI toggle in hero area
- `data-en` / `data-hi` attributes on all copy-bearing elements
- JS `setLang(lang)` swaps text content

#### Speaker Button (🔊 Listen)
- On all flow screens, top-right of nav-row
- Calls `speak(text)` → `window.speechSynthesis.speak()`

---

### 2.3 HOME SCREEN (`home-screen`)

#### Hero Section
- Background: `linear-gradient(155deg, --navyDk 0%, --navy 50%, #3a5a3a 100%)`, min-height 520px
- Dot pattern overlay: `radial-gradient(circle, #fff 1px, transparent 1px)`, 42px grid, 5% opacity
- Layout: CSS grid `1fr 420px`, gap 56px, max-width 1160px, padding 80px 56px
- **Left column:**
  - Gov badge pill: sage dot + "GOVERNMENT OF INDIA" text
  - `<h1>`: "Food Safety **Made Easy.**" — span colored --amber
  - Subtitle: "Get your FSSAI license in minutes — not months…"
  - **Two CTA buttons side by side:**
    - `hero-cta-primary` → "Hi, I'm new here 🙏" → `openGatewayModal()`
    - `hero-cta-outline` → "Login →" → `showScreen('login-screen')`
- **Right column:** full-bleed hero image (food/kitchen imagery)
  - Container: `border-radius: 20px; overflow: hidden; height: 310px`
  - Image fills 100% width/height (`object-fit: cover`)
  - Overlay gradient on left edge: `linear-gradient(to right, rgba(30,58,95,0.6), transparent)` so it bleeds into the navy without a hard edge
  - No card/glass container — image is bare inside the rounded div

#### Animated Stats Section (NEW — below hero)
Placed in a white/cream band between the hero and "How can we help" section.  
Max-width 1160px, padding 56px, 4-column grid.

| Stat | End Value | Suffix | Label |
|---|---|---|---|
| Licenses Issued | 9400000 | + | 94 Lakh+ Licenses Issued |
| Avg Processing Time | 15 | min | Average Processing Time |
| Starting Cost | 100 | ₹ prefix | Starting Cost |
| States Covered | 36 | + | States & UTs Covered |

- Numbers count up from 0 when element enters viewport (IntersectionObserver)
- Duration: 2000ms, easeOut easing
- Each stat: large bold number (amber color), label below in gray
- Separator lines between stats on desktop

#### "How Can We Help" Section
- Section tag: "OUR SERVICES"
- Title: "Everything your food business needs"
- Sub: "From registration to compliance — all in one place"
- **Services grid: single row, 5 cards**
  - Order: Apply for Permanent License → Apply for Instant Temporary License → Track Application → One Stop Shop → Consumer Corner
  - All cards: white bg by default, green (--sageLt bg + --sage border) on hover only
  - Card structure: icon (46×46px rounded square, sageLt bg) top-left, title + desc below
  - **Remove: Renew License card**
  
| Card | Icon | Title | onclick |
|---|---|---|---|
| 1 | 📋 | Apply for Permanent License | `startFBOGateway()` |
| 2 | ⚡ | Apply for Instant Temporary License | `startTempLicense()` |
| 3 | 📊 | Track Application | `showScreen('tracker-screen')` |
| 4 | 🛒 | One Stop Shop | `openOneStopShop()` |
| 5 | 👤 | Consumer Corner | `showScreen('cc-search')` |

#### Updates Section
Dark navy band (`--navyDk`), 3-column grid of update cards.  
Each card: amber tag (CIRCULAR / NOTIFICATION / REGULATION), title, date.  
Cards are clickable (no-op in prototype, log to console).

#### Testimonials Section (NEW — above footer)
- Cream background, section tag "WHAT BUSINESSES SAY"
- 3 testimonial cards in a grid
- Each card: star rating (⭐⭐⭐⭐⭐), quote text (italic), name + business type + city
- Sample data:
  1. "Getting my FSSAI license used to feel impossible. FoSCoS guided me step by step — done in 20 minutes." — Priya S., Home Baker, Pune
  2. "The instant temporary license let me start my food stall the same day. No paperwork, no running around." — Mohan R., Street Vendor, Ahmedabad
  3. "As an agent I manage 40+ clients. The dashboard makes renewals and tracking effortless." — Rekha A., FSSAI Agent, Chennai

#### Footer
- Dark charcoal bg
- Left: FSSAI logo img
- Center: footer links (Privacy Policy, Terms, Accessibility, RTI, Sitemap)
- Right: "© 2026 FSSAI, Government of India"

---

### 2.4 GATEWAY MODAL (`#gateway-modal`)

Triggered by "Hi, I'm new here" hero button. Overlay dims background.  
Modal box: white, border-radius 20px, padding 36px, max-width 420px, centered.

Header:
- FSSAI logo
- "Namaste! How can we help? 🙏"
- "Tell us who you are and we'll guide you from here."

Three gateway cards (vertical stack, each clickable):
```
👨‍🍳  Food Business (FBO)
     "Apply, renew, or manage your FSSAI license"
     onclick: startFBOGateway(); closeGatewayModal();

👤  Consumer
     "Check licenses, rate food safety, report issues"
     onclick: closeGatewayModal(); showScreen('cc-search');

🤝  Agent / Facilitator
     "Manage applications for multiple clients"
     onclick: closeGatewayModal(); showScreen('agent-login-screen');
```

Close button (✕) top-right. Click overlay to close.  
Auto-opens 800ms after page load.

---

### 2.5 LOGIN SCREEN — Existing Account (`login-screen`)

Entry point: Hero "Login" button.  
Purpose: returning users (FBO / Consumer / Agent) who already have accounts.

Layout: card centered, max-width 460px.

Step 1 — Role selection (3 cards, stacked):
```
👨‍🍳  FBO — Food Business Owner     → sets _loginRole='fbo'
👤  Consumer                        → sets _loginRole='consumer'
🤝  Agent / Facilitator             → sets _loginRole='agent'
```

Step 2 (shown after role selected) — Mobile number input:
- Label: "Mobile Number *"
- Input: type tel, maxlength 10, placeholder "10-digit mobile number"
- Button: "Send OTP →" → validates 10 digits → `showScreen('otp-screen')`

`otp-screen`: 5-box OTP entry (for FBO) or 6-box (consumer/agent).  
On verify → routes to appropriate dashboard based on `_loginRole`:
- fbo → `showScreen('dashboard-screen')`
- consumer → `showScreen('cc-search')`
- agent → `showScreen('agent-dashboard')`

---

### 2.6 FBO LOGIN (`fbo-login-screen`, `fbo-otp-screen`)

Entry: Gateway → FBO card.

`fbo-login-screen`:
- FSSAI logo centered
- "Welcome back to FoSCoS" heading
- "New to FoSCoS? Start your fresh application right now." sub
- Mobile number field (10-digit, required *)
- "Send OTP →" button → `goToFBOOTP()`

`fbo-otp-screen`:
- Back button → `fbo-login-screen`
- 5 OTP boxes (id: fo1–fo5), auto-advance on input
- "Verify & Continue →" → `verifyFBOOTP()`
- On verify → show '✅ Verified!' → `setTimeout` → `showScreen('license-choice-screen')`
- "Didn't receive it? Resend OTP" link

---

### 2.7 LICENSE CHOICE SCREEN (`license-choice-screen`) — NEW

Shown immediately after FBO OTP verification, before any flow begins.

Layout: max-width 600px centered, padding 56px 28px.

Heading: "What would you like to apply for? 📋"  
Sub: "Choose the right license for your business. You can always upgrade later."

Two sel-cards side by side:
```
Card 1: 📋 Permanent License
  Title: "Permanent License"
  Eligibility bullets:
    ✅ Annual turnover above ₹12 Lakh → State or Central License
    ✅ Any turnover → Basic Registration (₹100/yr)
    ✅ Manufacturers, restaurants, caterers, processors
    ✅ Valid 1–5 years (your choice)
  onclick: goFlow('q-setup-screen', 0)

Card 2: ⚡ Instant Temporary License
  Title: "Instant Temporary License"
  Eligibility bullets:
    ✅ Annual turnover under ₹12 Lakh
    ✅ Street vendors, home kitchens, event stalls
    ✅ Issued same day — 3 documents only
    ✅ Valid 30 days (stall) or 60 days (business)
  onclick: startTempLicense()
```

"Not sure?" info banner (amber) with Potato tip about eligibility.

---

### 2.8 PERMANENT LICENSE FLOW

#### Step 0 — Business Type Selection (`q-setup-screen`)
Progress: step 0 active.

Nav-row: Back → `license-choice-screen`, Home.  
Heading: "What kind of food business do you run? 🍽️"  
Sub: "Select all that apply — we'll figure out your license category."

Icon-button cards grid (3 cols on desktop, 2 on mobile).  
**Card layout (target state):** icon on RIGHT side of card, text (title + subtitle) on left. Icon size: 48px. Title: 15px bold navy. Subtitle: 12px gray.

KOB categories with official codes:

| Emoji | Label | Subtitle | KOB Code |
|---|---|---|---|
| 🍽️ | Restaurant / Dhaba | Dine-in, takeaway, food court | 10 |
| 🌩️ | Cloud Kitchen | Online-only delivery kitchen | 10 |
| 🍰 | Bakery | Bread, cakes, pastries | 5 |
| 🍬 | Sweet Shop / Mithai | Traditional sweets, confectionery | 5 |
| 🚐 | Food Truck | Mobile food vehicle | 10 |
| 🎪 | Catering Service | Events, weddings, bulk cooking | 10 |
| 🏭 | Packaged Food Manufacturer | Factory / processing unit | 1 |
| 🏪 | Wholesale / Retailer | Distributor, shop, supermarket | 12 |
| ☕ | Café / Tea Stall | Beverages, snacks | 10 |
| 🏠 | Home-Based Kitchen | Home food business | 10 |
| 🧊 | Cold Storage / Warehouse | Food storage facility | 12 |
| 🚚 | Food Transporter | Vehicle-based distribution | 14 |
| 🌾 | Primary Food Producer | Farm produce, raw materials | 2 |
| 🛒 | Online Food Aggregator | Platform / marketplace | 10 |

Multi-select. Selected state: amber border + amberLt bg + amber checkmark top-right.  
"Continue →" button (disabled until ≥1 selected): `goFlow('q-menu-screen', 0)`  
State stored in `S.setup[]` (array of KOB codes).

#### Step 0b — Food Items Selection (`q-menu-screen`)
Progress: step 0 active.

Heading: "What food items will you sell? 🥘"  
Sub: "Select all that apply."

Food cards (smaller, icon-centered, emoji top then label):

Categories (multi-select, `.food-card`, green selected state):
```
🥩 Meat & Poultry   🐟 Fish & Seafood   🥛 Dairy & Milk
🥚 Eggs             🥬 Vegetables       🍎 Fruits
🌾 Grains & Cereals 🫙 Packaged Snacks  🍰 Baked Goods
🍬 Sweets/Mithai    🧃 Beverages        🌶️ Spices & Masalas
🫒 Oils & Fats      🍱 Ready-to-eat     🧊 Frozen Foods
```

Selected items pushed to `S.menu[]`.  
Continue → `goFlow('q-turnover-screen', 0)`

#### Step 1 — Turnover / Tier Calculator (`q-turnover-screen`)
Progress: step 0 active (sub-step).

**Left column:** Turnover counter widget.
- Month selector: dropdown Jan–Dec (current month default)
- Daily customers counter: +/- buttons + display
- Avg spend: +/- buttons in ₹50 increments
- "Calculate" button → computes annual = daily×avg×365, shows result
- Tier box appears: color-coded by tier

Tier logic:
```
< ₹10L/yr  → Basic Registration — ₹100/yr (show temp license hint)
₹10–12L/yr → Basic Registration — ₹100/yr
₹12L–20Cr  → State License — ₹2,000–₹5,000/yr
> ₹20Cr    → Central License — ₹7,500/yr
```

Temp license hint (shown if < ₹12L): info card offering temp license fast-track with two buttons — "⚡ Get Temp License →" and "Continue with Full License".

**Right column:**
- Tier comparison table (all 3 tiers, fees, requirements)
- "Don't worry" sage info banner

Continue → `proceedFromTurnover()` → `goFlow('details-screen', 1)`  
State stored: `S.tier`, `S.annual`

#### Step 2 — Personal + Business Details (`details-screen`)
Progress: step 1 active.

Two-column layout.

**Left column — Business Information card:**
- Business Name * (text input)
- Full Address * (text input)
- Pincode * (6-digit) — on entry triggers area auto-detect
- State * (auto-filled from pincode)
- District * (auto-filled)
- Premises Type * (dropdown: Owned / Rented / Leased)
- **PAN Card field** (shown ONLY if S.tier = State or Central License):
  - Label: "PAN Card Number *"
  - Input: uppercase, 10-char PANNO pattern

**Right column — Person in Charge card:**
- Full Name *
- Mobile Number * (pre-filled from login)
- Email (optional) — no asterisk, "(optional)" tag inline
- **Photo ID Type * dropdown:** Aadhaar / PAN Card / Voter ID / Passport / Driving License / Ration Card / Passbook
  - On selection, show a corresponding ID number input field:
    - Aadhaar: 12-digit numeric
    - PAN: 10-char alphanumeric
    - Voter ID: alphanumeric
    - Passport: 8-char
    - Driving License: alphanumeric
    - Ration Card: alphanumeric
    - Passbook: numeric

**License Duration selector (MOVED HERE from elsewhere):**
- Dropdown: "License Duration" * 
- Options: 1 Year (₹100), 2 Years (₹200), … 10 Years (₹1,000)
- Selecting updates `S.duration` and `updateFee()`

Continue → `goFlow('documents-screen', 2)`  
State: `S.details{}` object.

#### Step 3 — Document Upload (`documents-screen`)
Progress: step 2 active.

**Dynamic document checklist** — required docs change by license category:

| Doc | Basic Reg | State License | Central License |
|---|---|---|---|
| Photo Identity Proof | ✅ required | ✅ required | ✅ required |
| Address Proof (geotagged photos) | ✅ required | ✅ required | ✅ required |
| Food Safety Plan | ❌ | ✅ required | ✅ required |
| Water Test Report | ❌ | ✅ required | ✅ required |
| List of Food Items | ✅ required | ✅ required | ✅ required |
| PAN Card / ITR | ❌ | ✅ required | ✅ required |
| Partnership / Ownership Deed | ❌ | ✅ required | ✅ required |
| GST Certificate | ❌ | optional | ✅ required |
| NOC from Municipality | ❌ | optional | ✅ required |
| Form B (Application) | auto-generated | auto-generated | auto-generated |

Doc row structure (accordions):
```
[num badge]  [doc title + formats subtitle]  [scan status]  [Upload btn] [▾ chevron]
Expanded: tips text + accepted file types + acceptable substitutes
```
On upload (simulated): badge turns green, btn text → "✓ Uploaded", scan AI message appears.

**Right panel:**
- Storefront photo upload box (dashed, click to upload)
- Kitchen photo upload box
- On both uploaded: `geo-confirm` banner appears: "🥔 Location detected: [City, State PIN] — ✓ Confirm Location | ✏️ Edit / Enter Manually"
  - **"✓ Confirm Location"**: sets `S.locationConfirmed = true`, banner turns green → "📍 Location saved"
  - **"✏️ Edit / Enter Manually"**: reveals address text inputs (street, city, pincode) inline
- Progress bar: `X/N uploaded` with fill animation

Continue → `goFlow('one-stop-screen', 2)`  
(Navigates to OSS with Routine Safety Kit tab auto-opened)

#### Step 3b — One Stop Shop (`one-stop-screen`)
Progress: step 2 active.

Heading: "One Stop Shop 🛒"  
Sub: "Book services, safety kits, and hygiene checks — all from one place"

**Navigation tabs (target state): VERTICAL layout on right side**  
Styled as book-edge tabs on the right of the content area. Each tab is a vertical rectangle label.

Tabs:
```
💧 Water Testing
🩺 Medical Cert
🔥 Fire Safety
🧰 Food Testing Kit
📖 User Manual
🧹 Hygiene Check
🐛 Pest Control (NEW)
♻️ Garbage Pickup Subscription (NEW)
```

**Download User Manual button** (NEW): floats in the User Manual tab content.  
Click → simulated PDF download → button text "✅ Downloading…" → resets.

**Tab grouping (NEW):** Services are grouped under category headers inside the content area:
- **Testing & Certification**: Water Testing, Medical Cert, Food Testing Kit
- **Safety & Compliance**: Fire Safety, Hygiene Check, Pest Control
- **Operations**: Garbage Pickup Subscription, User Manual

**Water Testing tab:**
- Amber info banner: "You need a water potability report…"
- 3 lab cards: each with lab name, rating, price (₹800–₹1,500), turnaround, "Book →" button
- `bookLab(i)`: selected card border turns sage, button → "✓ Booked"

**Food Testing Kit tab:**
- Kit description (starter / advanced / complete)
- Price (₹3,500)
- "Add to Cart →" button → updates `#oss-cart-bar`

**Hygiene Check tab:**
- Monthly subscription ₹999/month
- Annual subscription ₹8,999/year
- "Subscribe →" buttons

**Pest Control tab (NEW):**
- Monthly visits: 2x/month
- Price: ₹1,200/month or ₹10,000/year
- "Subscribe →"

**Garbage Pickup Subscription tab (NEW):**
- Daily pickup service
- Price: ₹500/month
- "Subscribe →"

**Cart bar (`#oss-cart-bar`):** sage info banner at bottom, shows items added + total, "Review & Pay →" button.  
Routing: "Continue to Review →" → `goFlow('review-screen', 3)`  
Cart state carried to review page.

#### Step 4 — Review Application (`review-screen`)
Progress: step 3 active.

Heading: "Almost there — let's review! 🎉"  
Sub: "Potato has scanned your application. — Ready to submit!"

Two-column layout.

**Left — Review summary card:**
All fields auto-populated from `S` state object:
- Business Name (from `S.details.bname`) — **must display, was previously blank**
- Business Type (from `S.setup` → mapped to human label) — **must display**
- License Category (from `S.tier.name`)
- License Duration (from `S.duration`)
- Full Address
- Pincode + State
- Person in Charge
- Mobile
- Photo ID type + number (masked last 4 digits)
- Documents uploaded count
- OSS items in cart (if any)

Each row: label (gray, 11px uppercase) + value (navy, 14px bold).

**"Preview Application" button (NEW):**  
Opens a modal with a PDF-styled preview of the complete application with all entered data.  
Simulated: `downloadPDF()` function → shows loading state → "✅ PDF Ready" message.

**Right — Fee breakdown card:**
```
Base license fee: ₹[tier.fee] × [S.duration] year(s)  =  ₹[total]
OSS items:        ₹[cart total]
─────────────────────────────────────
Total:            ₹[grand total]
```

"Review complete" amber banner with Potato tip.

Continue → `goFlow('payment-options-screen', 3)`

**Payment resume logic (target):**  
`S.paymentIncomplete` flag. If set, after validation passes on any page, `goFlow` destination is overridden to `payment-options-screen`.

#### Step 4b — Payment Options (`payment-options-screen`)
Total amount display (amber, 22px, bold).

4 payment method cards (each with `pay-check-*` circle selector):
```
📱 UPI — PhonePe, Google Pay, BHIM, Paytm
🏦 Net Banking — All major banks
💳 Debit / Credit Card — Visa, Mastercard, RuPay
👛 Wallet — Paytm, Amazon Pay, Mobikwik
```
Selected card: sage border.  
"🔒 Pay Now →" → `proceedToPayment()` → validates all S fields → `showScreen('payment-screen')`

`payment-screen`: 
- Progress bar animation (PayGov redirect simulation)
- On complete (2.4s): show success state
  - ✅ checkmark animation
  - "Application Submitted!"
  - App ID: FSSAI-2026-XXXXX, License Type, Expected Approval date, Amount Paid
  - Buttons: "Download Receipt 📄" + "💬 Share on WhatsApp"
  - "📊 Track My Application →" → `showTracker()`
  - "Go to Dashboard" → `showScreen('dashboard-screen')`

---

### 2.9 FBO DASHBOARD (`dashboard-screen`)

**State A — Active License:**
```
Header: "Good morning, [Name] 🍽️"
Sub: "Your Dashboard"

License card (dark navy gradient with green shimmer):
  - "FSSAI [State/Central/Basic] License"
  - Business Name (large, bold)
  - Business type + structure
  - ● ACTIVE badge (sage)
  - License number (monospace)
  - Expires: [N days left] (sage if >90d, amber if <90d, red if <30d)
  - Category label

Action grid (2 rows):
  Row 1: Track Application | Renew Now | Modify License | File Annual Return
  Row 2: One Stop Shop (spans full width, sage bg)

  [Modify License] is now functional: onclick → alert "Modification request flow — coming soon" or route to details-screen with pre-populated values and a "Save Changes" mode flag

Potato banner (amber): contextual tip

Right sidebar:
  Tab switcher for multiple licenses (replaces Application History):
  - If user has 1 license: "License Details" tab with key fields
  - If user has 2+ licenses: tabs "License 1", "License 2", etc.
    Each tab shows that license's details

  Consumer Feedback & Grievances tab (NEW):
    - List of consumer ratings submitted about this business
    - Avg rating (food/hygiene/premise)
    - Any open grievances with status badge
    - "Respond" button per grievance (no-op in prototype)

  FoSTaC Training tab (NEW):
    - Enrolment status
    - Upcoming sessions near user's pincode
    - "Enrol Online ₹200 →" and "Find a Centre ₹350 →" buttons
    - `enrollFoSTaC(type)` → button shows "✅ Enrolled!"
```

**State B — Application Pending (no active license yet):**
```
Header: "Good morning, [Name] 🍽️"
Sub: "Application in Progress"

Different layout — no license card
Instead: large status card showing:
  App ID + filed date
  Visual progress bar (current step highlighted): 
    Submitted → Documents Verified → Under Review → Approved
  Expected approval date
  "📊 Track Details →" button

Action grid (simplified):
  Row 1: Track Application | Upload Missing Docs | One Stop Shop
  Row 2: (empty or contextual tip)

No Temp License option shown unless user has applied for one.
```

**Temp License visibility rule:**  
Only show "My Temp License" card/tab if `user.hasTempLicense === true`. Hide entirely otherwise.

---

### 2.10 TRACKER SCREEN (`tracker-screen`)

Nav: Back → dashboard, Home.  
Heading: "Track Your Application"  
Sub: "Application ID: FSSAI-2026-38642 · Basic Registration · Filed 12 Mar 2026"

Tabs:
```
📊 Application Status  |  📄 Document Processing  |  🔍 Inspection  |  🎓 FoSTaC Training
```

**Application Status tab:**
Visual progress bar (target state — NEW) showing pipeline:
```
[Submitted ✅] ──── [Documents Verified ✅] ──── [Under Review 🔄] ──── [Approved ○]
```
Each step: circle icon (done/active/pending), step label, timestamp or "Expected: date".  
Below bar: full tracker-step cards with detail text.

Sage info banner: "Your application is being processed by FSSAI Regional Office…"

Tracker steps:
1. ✅ Application Submitted — Filed 12 March 2026, ₹100 paid
2. ✅ Documents Verified — All 3 accepted
3. 🔄 Under Review — Regional Office, expected date shown
4. ○ License Issuance — pending

**Document Processing tab:**  
List of each document: name, upload date, status badge (Verified/Pending/Missing), officer notes.

**Inspection tab:**  
Scheduled inspection details (date, officer name, instructions).

**FoSTaC Training tab:**  
Training modules + session finder + enrolment buttons.

---

### 2.11 TEMP LICENSE FLOW (8 steps)

Progress bar visible throughout. All back buttons functional.  
Rename "Temporary License" → "Instant Temporary License" everywhere.

#### Step 1 — Eligibility (`tl-s1`)
Heading: "Let's check your eligibility ⚡"

Q1: What kind of setup? (sel-cards, single-select):
```
🛺 Street Food Stall / Cart
🏠 Home Kitchen
🎪 Pop-up / Event Stall
🚐 Food Truck
🛖 Dhaba / Small Eatery
🏗️ Permanent Business Setup (starting out)
```
Stored in `_tlEligSetup`

Q2: Turnover (shown only if "Permanent Business Setup" selected):
```
🟢 Under ₹12 Lakh/year → eligible
🟡 ₹12–20 Lakh/year → not eligible (redirect to permanent)
🔴 Above ₹20 Lakh/year → not eligible
```
Counter widget for other options (not shown if stall/event/cart).

Q3: Food items (multi-select mini cards):
- Each item: on hover turns green if eligible, red if restricted
- Eligible: snacks, beverages, packaged goods, fruits/veg, cooked meals, sweets
- Restricted (hover → red): raw meat, alcohol, infant formula, export items

`tlCheckEligibility()`:
- High-risk foods → ineligible overlay → "Apply for Correct License →"
- Over turnover → ineligible overlay
- Otherwise → eligible overlay → "Continue →" → `showScreen('tl-purpose')`

#### tl-purpose — Purpose Screen
Heading: "What is this license for? 📋"

Two sel-cards:
```
🛖 Stall / Event (1 Month)
   "Setting up a stall for festival, event, or one-time occasion."
   Tags: 30-day license, No conversion needed

🏗️ Business Setup (60 Days)
   "Starting a permanent food business."
   Tags: 60-day license, Convert to permanent
```
`tlSelectPurpose(type, el)` → stores `_tlPurpose`  
Continue → `showScreen('tl-s2')`

#### Step 2 — Account Creation (`tl-s2`)
Step badge: "📱 Step 2 of 8 — Create Account"

Mobile number input → "Send OTP →"  
6-box OTP entry → `tlVerifyOTP()` → `tlGo(3)` (next step)

#### Step 3 — Personal Details (`tl-s3`)
Step badge: "📍 Step 3 of 8 — Your Details"

Fields:
- Full Name *
- Mobile (pre-filled from step 2)
- **Pincode * (NEW — replaces "area" field)**  
  On valid 6-digit entry: auto-fetches area name → displays "📍 [Area], [City], [State]" below input
- Business Name * (NEW — added here)
- Setup Type: **auto-filled** from eligibility screen, displayed as read-only chip (not an input)

Continue → `tlGo(4)`  
State: `TLData.name`, `TLData.address`, `TLData.bizType` (auto from eligibility)

#### Step 4 — Geotagged Photos (`tl-s4`)
Step badge: "📸 Step 4 of 8 — Location"

Info banner: "GPS must be ON"

2 upload rows (accordion):
1. 📸 Setup / Stall Photo — geotagged
2. 🔧 Equipment / Cooking Area Photo — geotagged

Upload progress bar: 0/2.  
On both uploaded: `TLData.geoTagged = true`  
Continue → `tlGo(5)`

#### Step 5 — KYC Documents (`tl-s5`)
Step badge: "📄 Step 5 of 8 — KYC"

Potato tip: "Aadhaar + cart purchase bill is all you need."

2 KYC doc rows:
1. 🪪 Photo Identity Proof — Aadhaar / PAN / Voter ID / DL / Passport
2. 🏪 Proof of Establishment — Cart bill / Rent agreement / Electricity bill

Progress bar: 0/2.  
Continue → `tlGo(6)`

#### Step 6 — Disclaimer (`tl-s6`)
Step badge: "📋 Step 6 of 8 — Rules"

T&C checklist (all must be checked):
- [ ] I confirm the food items listed are accurate
- [ ] I understand this license does not permit sale of restricted items
- [ ] I agree to comply with FSSAI food safety standards

Food rules card (eligible green items / restricted red items displayed).

**Payment page (NEW — was missing):**  
After disclaimer → payment screen:
- Total: ₹0 (free for basic temp) or ₹100
- Payment method selector (same as permanent flow)
- "🔒 Pay & Get License →"

Continue → `tlGo(7)` (license issued)

#### Step 7 — License Issued (`tl-s7`)
Step badge: "🎉 Step 7 of 8 — License"

Dark green gradient card (`.tl-card-issued`):
- "⚡ Instant Temporary License — ISSUED"
- License number (monospace)
- Business name
- Valid until: [date based on purpose: +30d stall, +60d business]
- Compliance window: "X days remaining"
- FSSAI logo

"📥 Download License PDF" button → `tlDownloadPDF()`  
"💬 Share on WhatsApp" button

**Branch by setup type:**
- If stall: `tl-stall-note` shown — "30-day stall license. No conversion required."
- If business: `tl-convert-note` shown — "60-day compliance window. You must apply for a permanent license before expiry."  
  Show countdown timer: large number, "days remaining", updates every second.

Continue → `tlGo(8)`

#### Step 8 — FoSTaC Training (`tl-s8`)
Step badge: "🎓 Step 8 of 8 — FoSTaC"

Info about mandatory food safety training.  
"Enrol in FoSTaC →" button → `tlEnrollFostac()` → shows "✅ Enrolled! Training details sent to your mobile."

"Go to Dashboard →":
- If stall → `showScreen('dashboard-screen')` with temp license card visible, standard options
- If business → `showScreen('dashboard-screen')` with temp license card + "Next Steps" panel + 60-day countdown timer widget

---

### 2.12 ONE STOP SHOP — Standalone Entry

Accessible from: home services grid, dashboard "One Stop Shop" button.  
When reached via "Continue to Review" from documents page, opens with **Routine Safety Kit / Food Testing Kit tab auto-activated**.

OSS from dashboard opens independently (not in flow context, no progress bar step change).  
Cart items still carry through to review if user proceeds.

---

### 2.13 CONSUMER CORNER

#### `cc-search` — Search
- Heading: "Consumer Corner 👤"
- FBO search input + nearby licensed businesses list (4 sample FBOs)
- Each FBO card: emoji icon, name, license type, rating badge (X/100), address
- Tabs at top: "📍 Nearby" | "🔍 Search" | "📊 Track Complaints" | "🚨 Report Unlicensed"
- Click FBO → opens grievance/rating screen

#### `cc-grievance` — Rate & Report
3-range sliders (1–5): Food Quality / Hygiene / Premises  
Overall score computed: avg of 3.  
If any ≤ 2 → show issue checklist (multi-select by category: food/hygiene/packaging/premises).  
Text area: "Additional comments (optional)"  
Submit → `ccSubmitGrievance()` → `showScreen('cc-submit')`

#### `cc-submit` — Confirmation
✅ success animation.  
Complaint ID, Filed On, Status badge ("Submitted"), Expected Response ("Within 7 days").  
Buttons: "📊 Track Status" → `cc-track`, "🏠 Back" → home.

#### `cc-track` — Track Complaints
List of user's complaints with status progress bars (Submitted → Under Review → Resolved).

#### `cc-report` — Report Unlicensed Business
Form: Business Name, Location (+ GPS button), Description, Photo upload.  
Submit → red "🚨 Submit Report" button.

---

### 2.14 AGENT PORTAL

#### `agent-login-screen`
Mobile input → OTP → `agent-dashboard`

#### `agent-dashboard`
Summary bar: Total Clients / Pending Applications / Active Licenses / Renewals Due (4 stat cards).  
Client list table: Name, Business, License Type, Status, Expiry, Action.  
"+ Add Client" button → `agent-add-client`

#### `agent-add-client`
Two sel-cards: "Link Existing Client" (by mobile OTP) vs "Create New Client".  
Link existing: mobile input → `agent-claim-otp` → verify → success message.  
Create new: Name + Business Name → `agentCreateClient()` → starts FBO flow.

#### `agent-client-view`
License card for that client, action grid (Track / Renew / Modify / New Application / Annual Return / One Stop Shop).

---

### 2.15 STATE OBJECT (`S`)

All flow state lives in a single JS object:
```js
const S = {
  setup: [],          // Array of KOB codes selected
  menu: [],           // Array of food category keys
  annual: null,       // Annual turnover (number)
  tier: null,         // { name, fee, code } object
  duration: 1,        // License duration in years
  details: {},        // All details-screen field values
  docs: {},           // Document upload statuses
  photos: {},         // Storefront/kitchen upload statuses
  locationConfirmed: false,
  cart: [],           // OSS cart items
  paymentIncomplete: false,  // Resume-to-payment flag
};
```

---

### 2.16 KEY JS FUNCTIONS

```js
showScreen(id)         // Activates screen, deactivates all others, scrolls to top, updates Potato context
goFlow(id, step)       // showScreen + updateProgress(step)
updateProgress(n)      // Sets prog-line/prog-label classes for step n
openGatewayModal()     // Shows gateway modal
closeGatewayModal()    // Hides it; closeGatewayModalBg(e) closes on overlay click
startFBOFlow()         // closeGatewayModal + goFlow('q-setup-screen', 0)
startFBOGateway()      // Sets _fboMode=true, shows fbo-login-screen
startTempLicense()     // showScreen('tl-s1') + tlShowBar() + tlSetProgress(0)
tlGo(step, fromStep?)  // Navigates temp flow to tl-s[step], updates TL progress bar
tlSetProgress(n)       // Sets TL progress bar active step
proceedFromTurnover()  // Reads tier, sets S.tier + S.annual, goFlow('details-screen',1)
proceedToPayment()     // Validates all S fields; if incomplete → alert + goFlow to missing screen; if S.paymentIncomplete → go to payment-options
updateFee()            // Recomputes fee from S.tier.fee * S.duration, updates #fee-total
uploadDoc(key)         // Simulates upload: progress animation, updates doc count, updates progress bar
uploadPhoto(key)       // Simulates upload, checks if both done → shows geo-confirm
ossTab(tab)            // Activates OSS tab, hides others
updateOSSCart()        // Recomputes cart bar items and total
bookLab(i)             // Marks lab card booked (border + text change)
ossDownloadManual()    // Simulates PDF download
setLang(lang)          // Swaps all data-en / data-hi attributes
speak(text)            // speechSynthesis.speak for current language
potatoSend(msg?)       // Sends message to Potato chatbot; matches against POTATO_REPLIES
updatePotatoChips(id)  // Updates chip buttons based on current screen context
animateStats()         // IntersectionObserver-triggered counter animation for home stats
verifyOTP()            // Marks OTP verified, routes by _fboMode or _loginRole
setDuration(el, yr)    // Sets S.duration, updates fee display
realTimeClock()        // setInterval every second, updates all #time / #date elements
```

---

### 2.17 REAL-TIME DATE/TIME

On page load and every second:
```js
const now = new Date();
document.querySelectorAll('[data-time]').forEach(el => el.textContent = now.toLocaleTimeString('en-IN'));
document.querySelectorAll('[data-date]').forEach(el => el.textContent = now.toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' }));
```
All displayed dates/times use these selectors — no hardcoded date strings.

---

## 3. OFFICER PORTAL — fssai-backend

### 3.1 Layout Structure
Two-pane: fixed sidebar (240px) + scrollable main.  
Topbar: page title | search | live date | notifications bell | settings.

### 3.2 Sidebar Navigation
```
[FS logo] FSSAI Portal — Officer Management System

MY WORKSPACE
  ⊞ Dashboard
  📌 My Queue [badge: 7]

FBO MANAGEMENT
  📋 Applications [badge: 12]
  🏢 FBO Directory

COMPLIANCE
  🧪 Routine Monitoring [badge: 3]
  🔍 Inspections

ESCALATIONS
  💬 Grievances [badge: 5]

INSIGHTS
  🏆 Clean Kitchen League
  📊 Reports

ACCOUNT
  ⚙️ Settings & Profile

Footer: [Avatar: RK] Rajesh Kumar — Senior FSSAI Officer · Ahmedabad
```

### 3.3 Pages

#### Dashboard (`page-dashboard`)
**Today's Action Items** card:
- Urgent (red): high-priority grievance item, overdue inspection
- Normal (amber): renewal reminder, pending doc item
- Low (green): completed items

4-stat row: Pending Applications / Approved Today / Inspections Scheduled / Open Grievances  
Activity feed (right): recent system events with colored dots and timestamps  
Bar chart: Application Trend (last 7 days)  
Risk by Zone: list of zones with risk level badges

#### My Queue (`page-myqueue`)
Meta bar: Total Assigned / Urgent / This Week / Overdue  
3 tabs: Applications (4) / Inspections (2) / Grievances (1)  
Table per tab with SLA column (green/amber/red by days remaining)

#### Applications (`page-applications`)
Filter tabs: All / New / Pending / Approved / Delayed  
Search input  
Table: App ID | Business Name | Category | Date Filed | Pipeline Step | Status | Officer | [action]  
Row click → `openAppDetail(id)` → pushes app-detail-page active

**Application Detail Page** (overlay, not a separate page):
- Header: App ID, business name, category, date, status badge
- Pipeline steps visual (5 steps): Submitted → Docs Review → Inspection → Final Review → Approved
- Tabs: Business Info / Documents / Audit Trail / Flag History
- Business Info: full address, proprietor, GSTIN, turnover, products
- Documents: list with Verified/Pending/Missing badges + Approve/Return buttons per doc
- Audit Trail: chronological action log with colored dots
- Flag History: any flags with reason + officer + date
- Action buttons: Approve / Request More Docs / Flag Issue / Assign Inspection / Forward

#### FBO Directory (`page-fbo`)
Search + filter (compliance: All/High/Medium/Low, location dropdown, type dropdown)  
Table: FSSAI No. | Business | Type | Location | Expiry | Compliance | Platform Ratings | Risk  
Row click → `openFBOProfile(fssai, 'fbo')` → full-page FBO profile

**FBO Profile Page:**
- Header: emoji logo, name, FSSAI no., type, location, compliance + risk badges
- 6 tabs: Overview / Application Status / Documents / Compliance / Grievances / Ratings
- Overview: contact, address, turnover, license card
- Grievances tab: list of consumer complaints filed against this FBO
- Ratings: Zomato / Swiggy / Google ratings inline badges

#### Routine Monitoring (`page-monitoring`)
Two-pane: Recently Updated (sage) / Flagged / Suspicious (red)  
Table: FBO | Last Test | Days Since | Frequency | Status  
Filters: All / Regular / Irregular / Missing

#### Inspections (`page-inspections`)
Scheduled inspections table with officer assignment and status.

#### Grievances (`page-grievances`)
Filter tabs: All / Open / Pending / Resolved  
Table: Grievance ID | Consumer | Business | Issue | Priority | Status | Filed | Officer  
Priority badges: Critical (red) / High (amber) / Normal (navy)

#### Clean Kitchen League (`page-league`)
Gamification leaderboard of top-compliant FBOs.  
Table: Rank | Business | Score | Compliance | Ratings | Risk | Badge  
Trophy badge icons for top 3.

#### Reports (`page-reports`)
Report generation cards (License Issuance, Compliance, Grievance Summary, Inspection, FoSTaC).  
Each card: title, description, "Generate →" button (no-op / download simulation).

#### Settings & Profile (`page-settings`)
Officer profile form: name, designation, zone, email, mobile.  
Notification preferences toggles.  
Password change section.

### 3.4 Officer Portal Data Fixtures

**Applications (APPS array):**
```js
// 12 sample applications with:
// id, name, cat, date, status (New/Pending/Approved/Delayed), officer, fssai, flagged, flagReason, flagNote, step (1-5)
```

**FBOs (FBOS array):**
```js
// Each FBO: fssai, name, type, loc, emoji, compliance (High/Medium/Low),
// risk (Low/Medium/High), expiry, ratings: { zomato, swiggy, google }
```

**Pipeline Steps:**
```js
[Submitted 📩, Docs Review 📄, Inspection 🔍, Final Review ✅, Approved 🎉]
```

### 3.5 Officer Portal JS Functions

```js
navigate(page)           // Activates page, deactivates others, updates sidebar, updates topbar title
renderApps()             // Filters APPS by FILT.app + search query, renders tbody
renderFBO()              // Filters FBOS by compliance, location, type, search
renderMonitoring()       // Filters MONITORING by FILT.mon + search
renderGrievances()       // Filters GRIEVANCES by FILT.griev
openAppDetail(id)        // Renders full app detail page with all tabs populated
closeAppDetail()         // Hides detail page, returns to applications
openFBOProfile(fssai, source) // Renders FBO profile with all 6 tabs populated
setFilt(type, val, el)   // Updates FILT state + re-renders
switchTab(group, tab, el) // Manages tab-pane visibility for given group
openNotifPanel()         // Opens side panel with notification list
closePanel()             // Closes side panel + overlay
showToast(msg)           // Shows bottom toast notification, auto-hides 2.5s
renderPipeline(step)     // Renders pipeline dot row for step N (1-5)
renderBarChart()         // Draws simple bar chart in #dash-chart
renderRiskByZone()       // Renders zone risk list in #dash-risk
```

### 3.6 Modals (Officer Portal)

**Flag Modal (`modal-flag`):**  
Issue Type dropdown / Priority dropdown / Notes textarea / Cancel + Submit Flag

**Assign Inspection Modal (`modal-assign`):**  
Officer dropdown / Date picker / Notes / Cancel + Assign

Both modals: `.modal-ov` overlay, `.modal` white box, `.modal-title`, `.modal-sub`, `.modal-actions`.

---

## 4. SHARED UX RULES

1. **Required asterisk**: every required `<label>` gets `<span style="color:var(--red)">*</span>` appended.  
2. **Optional label**: `(optional)` in 11px gray, no asterisk.  
3. **Continue button position**: always fixed at the bottom of the content column, full-width, never floated mid-page.  
4. **Back button**: always in nav-row top-left. Never missing. On temp flow all back buttons call `tlGo(-1, currentStep)`.  
5. **"Instant Temporary License"**: this exact phrase replaces "Temporary License" everywhere — headings, badges, buttons, Potato replies, tracker labels.  
6. **Date/time**: no static strings — all use `data-time` / `data-date` attributes updated by `realTimeClock()`.  
7. **Card icon layout (icon-button cards)**: icon on right side, text on left. Icon size 48px. Not centered above text.  
8. **Payment resume**: if `S.paymentIncomplete` is true, `proceedToPayment()` at end of any corrected page routes directly to `payment-options-screen`, bypassing remaining flow steps.  
9. **Temporary license hiding**: if `user.hasTempLicense !== true`, hide all temp license UI from dashboard.  
10. **OSS auto-tab**: when reached via documents → "Continue to Review", OSS opens with kit/food-testing tab active.

---

## 5. ANIMATION & INTERACTION SPEC

| Element | Animation | Trigger |
|---|---|---|
| Screen transitions | `fadeUp` keyframe: opacity 0→1, translateY 16px→0, 0.22s ease | `.active` class added |
| Stats counters | `requestAnimationFrame` count-up, easeOut, 2000ms | IntersectionObserver, threshold 0.3 |
| Progress bar fill | `transition: width 0.4s` | On doc upload |
| Payment progress | CSS transition `width 0%→100%` over 2.2s | On payment-screen shown |
| Check pop (✅) | `@keyframes checkPop: scale 0.5→1.1→1`, 0.5s | On success screens |
| Sel-card checkmark | `opacity: 0→1`, 0.15s | `.selected` class toggle |
| Food card selection | border-color + background transition | `.sel` class toggle |
| OSS tab content | `fadeUp`, 0.2s | Tab button click |
| OTP boxes | border-color: --border → --amber (filled), --sage (verified) | On input / verify |
| Potato window | slide up from bottom-right | Toggle |
| Modal | fade-in overlay + scale 0.96→1 modal | Display show |

---

## 6. ROUTING / NAVIGATION MAP

```
home-screen
  ├── "Hi, I'm new here" → gateway-modal
  │     ├── FBO → fbo-login-screen → fbo-otp-screen → license-choice-screen
  │     │     ├── Permanent → q-setup-screen → q-menu-screen → q-turnover-screen
  │     │     │   → details-screen → documents-screen → one-stop-screen
  │     │     │   → review-screen → payment-options-screen → payment-screen → dashboard-screen
  │     │     └── Temp → tl-s1 → tl-purpose → tl-s2 → tl-s3 → tl-s4 → tl-s5
  │     │           → tl-s6 → [payment] → tl-s7 → tl-s8 → dashboard-screen
  │     ├── Consumer → cc-search → cc-grievance → cc-submit
  │     │                       → cc-track
  │     │                       → cc-report
  │     └── Agent → agent-login-screen → agent-otp-screen → agent-dashboard
  │                   → agent-add-client → agent-claim-otp
  │                   → agent-client-view → (starts FBO flow)
  ├── "Login" → login-screen → otp-screen → dashboard/cc-search/agent-dashboard (by role)
  └── Services grid
        ├── Permanent License → startFBOGateway()
        ├── Instant Temporary License → startTempLicense()
        ├── Track Application → tracker-screen
        ├── One Stop Shop → one-stop-screen (standalone)
        └── Consumer Corner → cc-search

dashboard-screen
  ├── Track Application → tracker-screen
  ├── Renew Now → startFBOFlow()
  ├── Modify License → details-screen (pre-populated, modification mode)
  ├── File Annual Return → annual-return-screen
  ├── One Stop Shop → one-stop-screen (standalone)
  ├── Consumer Feedback tab → inline in dashboard right panel
  └── FoSTaC Training tab → inline in dashboard right panel

tracker-screen
  └── FoSTaC tab → fostac-quiz-screen
```

---

## 7. SAMPLE / FIXTURE DATA

### License Tiers
```js
const TIERS = [
  { name: 'Basic Registration', fee: 100, code: 'BR', note: 'Turnover under ₹12 Lakh', color: 'sage' },
  { name: 'State License', fee: 2000, code: 'SL', note: 'Turnover ₹12 Lakh – ₹20 Crore', color: 'navy' },
  { name: 'Central License', fee: 7500, code: 'CL', note: 'Turnover above ₹20 Crore or multi-state', color: 'amber' },
];
```

### FBO Dashboard (State A — Active)
```
Business: Annapurna Catering
Type: Proprietorship · Restaurant & Catering
License: FSSAI State License
Number: 2026 0303 1083 8642 3
Status: ACTIVE
Expires: 127 days left
```

### Application Submission Confirmation
```
Application ID: FSSAI-2026-38642
License Type: Basic Registration
Expected Approval: 27 March 2026
Amount Paid: ₹100
```

### Consumer FBOs
```js
const CC_FBOS = [
  { name: 'Annapurna Catering', lic: '2026 0303 1083 8642', type: 'State License', rating: '87/100', addr: 'Laitumkhrah, Shillong', icon: '🍽️' },
  { name: 'Raj Snacks Corner', lic: '2024 1201 5842 1109', type: 'Basic Registration', rating: '91/100', addr: 'Police Bazar, Shillong', icon: '🥙' },
  { name: 'Meera Tiffin Service', lic: '2025 0606 2291 4403', type: 'State License', rating: '79/100', addr: 'Mawlai, Shillong', icon: '🍱' },
  { name: 'Fresh Juice Hub', lic: '2026 0201 9912 3301', type: 'Basic Registration', rating: '93/100', addr: 'Rynjah, Shillong', icon: '🥤' },
];
```

---

## 8. ACCESSIBILITY & VALIDATION RULES

- All required inputs: validated on Continue press, not on blur
- Validation messages: `alert()` in prototype, inline error in production
- Mobile number: 10 digits, numeric only, validated with `/^\d{10}$/`
- Pincode: 6 digits, `/^\d{6}$/`
- PAN: `/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/`
- Aadhaar: 12 digits, numeric
- OTP fields: auto-advance on single digit entry, backspace returns to previous box
- All forms: `box-sizing: border-box` on inputs, `font-family: 'DM Sans', sans-serif`

---

## 9. NOT BUILT IN PROTOTYPE (defer to Next.js)

- Real OTP sending (MSG91)
- Real file storage (S3/R2)
- Real payment (PayGov)
- Real GPS reverse geocoding
- Real pincode-to-area lookup
- Multi-user sessions / JWT auth
- PostgreSQL persistence
- Email confirmations
- Annual return actual submission
- Modify License backend workflow
- Consumer grievance backend routing
- FoSTaC session real availability lookup
