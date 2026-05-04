# 🥔 "Potato" — The FoSCoS Chatbot: Complete Feature Documentation

## What It Is

Potato is a floating, context-aware FAQ chatbot that lives as a persistent button on every screen of the app. It is **not an AI** — it is a keyword-matching bot with hardcoded replies, designed to handle the 8–10 most common questions a first-time FSSAI applicant will ask, without them having to call the helpline or leave the page.

The name and visual identity (brown potato emoji) are a deliberate personality choice to make a government form feel approachable. It does not store any conversation history between sessions.

---

## Visual Structure

The chatbot has two states:

**Closed state** — A 66×66px circular button, fixed at bottom-right of every screen (z-index 400). Brown gradient background (`#8B4513 → #A0522D`). Shows the 🥔 emoji. Has a pulsing glow animation to draw attention.

**Open state** — A 340×460px panel that appears above the button, bottom-right anchored (z-index 399). It has five parts stacked vertically:

1. **Header** — Dark brown gradient, shows "🥔 Potato · Your FSSAI Guide" branding
2. **Message area** — Scrollable feed of conversation bubbles. Potato's messages appear left-aligned in navy-light background. User messages appear right-aligned in brown.
3. **Quick-reply chips** — Pill-shaped shortcut buttons that change based on which screen the user is on (explained below)
4. **Input row** — A text field ("Ask Potato anything…") + a send arrow button
5. **Footer link** — "📞 Talk to a person (1800-112-100)" — static, always visible at the very bottom

**Toggle behavior:** Clicking the button switches between open and closed. When open, the button itself changes from 🥔 to ✕. When the user navigates to any new screen, the chatbot **auto-closes** — this is hardcoded into the `showScreen()` function so Potato never lingers open on a screen it wasn't opened from.

---

## The Four Contexts

The chatbot has **four distinct operating modes**, each with a different opening greeting and a different set of quick-reply chips. The mode is determined automatically by which screen the user is currently on when they open Potato.

### Context 1 — `permanent`

**Triggered on screens:** `q-setup-screen`, `q-menu-screen`, `q-turnover-screen`, `details-screen`, `documents-screen`, `review-screen`, `payment-options-screen`, `payment-screen`, `one-stop-screen`

**Greeting:** *"Hello! 🥔 I'm Potato, your FSSAI guide. I can help you with your permanent license application."*

**Quick chips:**

| Chip label | Message sent |
|---|---|
| Documents needed? | "What documents do I need for a permanent license?" |
| How long does approval take? | "How long does the permanent license approval take?" |
| Who needs this license? | "What kind of businesses need a permanent license?" |

---

### Context 2 — `temp`

**Triggered on screens:** `tl-s1` through `tl-s8`, `temp-kyc-screen`, `fostac-quiz-screen`, `temp-license-screen`, `my-tl-screen`

**Greeting:** *"Hello! 🥔 I'm Potato. Let's check if you're eligible for a temporary license and what you can sell."*

**Quick chips:**

| Chip label | Message sent |
|---|---|
| Am I eligible? | "Am I eligible for a temporary license?" |
| What foods can I sell? | "What foods can I sell with a temporary license?" |
| Restrictions? | "What are the restrictions on a temporary license?" |

---

### Context 3 — `consumer`

**Triggered on screens:** Any screen whose ID starts with `cc-` (Consumer Corner login, search, grievance, submit, track, report)

**Greeting:** *"Hello! 🥔 I'm Potato. I can help you check food safety, licenses, or raise a complaint."*

**Quick chips:**

| Chip label | Message sent |
|---|---|
| Check a license? | "How can I check if a food business is licensed?" |
| File a complaint? | "How do I file a complaint about a food business?" |
| Is this food safe? | "How do I know if this food is safe to eat?" |

---

### Context 4 — `default`

**Triggered on:** All other screens — home, dashboard, tracker, OSS entry

**Greeting:** *"Hello! 🥔 I'm Potato, your FSSAI guide. Ask me anything about your license application!"*

**Quick chips** (also rendered statically in the HTML as the initial state before any screen navigation):

| Chip label | Message sent |
|---|---|
| Missing documents? | "I don't have all my documents" |
| Water testing | "Water testing help" |
| Update later? | "Can I update my license later?" |

---

## The Reply Engine

The reply logic is a simple keyword scan. When a message is sent (either by typing or tapping a chip), the function `getChatReply()` lowercases the full message string and checks whether it **contains** any of the following keywords in order. The first match wins. If nothing matches, the fallback fires.

There is a **700ms artificial delay** before Potato's reply appears — to simulate thinking and avoid the response feeling instant/robotic.

### Full Keyword → Reply Map

| Keyword detected | Potato's response |
|---|---|
| `document` | "No worries! Tap 'WhatsApp Me This Checklist' and I'll send your personalised list. Your progress is saved — come back whenever you're ready. 🥔" |
| `water` | "For water testing, tap 'Book Lab Test' on the Documents page. The lab uploads the approved report directly to your application — you don't need to do anything else!" |
| `update` | "Yes! You can upgrade from Registration → State License → Central License at any time as your business grows. Just file a modification request." |
| `pan` | "PAN is optional for Basic Registration. Aadhaar alone is enough. State and Central licenses require PAN though." |
| `two` | "Each location needs its own separate license. But if combined turnover is under ₹12L, both qualify for Basic Registration at ₹100 each." |
| `temporary` | "Temporary License lets you start operating with just 3 documents. You then have 2 months to complete full compliance. This automatically upgrades to a Basic Registration once your compliance window closes. No water report or inspection upfront." |
| `check` | "To check if a food business is licensed, go to the Consumer Corner and use the License Search feature. Enter the business name or FSSAI number to verify their license status. 🥔" |
| `complaint` | "To file a complaint, go to Consumer Corner → File Grievance. You'll need the business name, location, and details of your complaint. FSSAI investigates all complaints within 30 days. 📝" |
| `safe` | "Look for the FSSAI license number on the packaging — it's a 14-digit number starting with the year. You can verify it on our portal. Also check the expiry date and look for the FSSAI logo. 🛡️" |
| *(no match)* | "Good question! 🥔 For specific help, call the FSSAI helpline at 1800-112-100 (Mon–Sat, 9am–6pm). Want me to show you quick FAQs?" |

**Important design note:** The keyword check is substring-based. So "documents", "my document", "document list" all match `document`. "I have two locations" matches `two`. "Is my PAN needed?" matches `pan`. The chips are deliberately worded to always trigger a keyword match — e.g. the chip sends "Water testing help" which contains `water`.

---

## Page-by-Page Presence

| Screen | Context active | Chatbot purpose on that screen |
|---|---|---|
| **Home** | `default` | General onboarding questions, document gaps, license update queries |
| **Gateway modal** | `default` | User hasn't chosen a path yet — generic help |
| **q-setup-screen** (Business type) | `permanent` | Helps users unsure which business category fits them |
| **q-menu-screen** (Food items) | `permanent` | Questions about what food categories are regulated |
| **q-turnover-screen** (Turnover / tier) | `permanent` | Clarifies license tiers, PAN requirement, multi-location rules |
| **details-screen** (Business details) | `permanent` | Document questions, field-level clarification |
| **documents-screen** | `permanent` | Water test booking, WhatsApp checklist, what's acceptable |
| **one-stop-screen** | `permanent` | Treated as permanent flow continuation |
| **review-screen** | `permanent` | Pre-payment reassurance |
| **payment-options-screen / payment-screen** | `permanent` | Any last-minute document or eligibility doubts |
| **tl-s1 through tl-s8** (Temp license flow) | `temp` | Eligibility questions, food restrictions, what happens after 60 days |
| **temp-kyc-screen** | `temp` | Identity document questions for temp applicants |
| **fostac-quiz-screen** | `temp` | Quiz help (chips redirect to general temp queries — not quiz-specific) |
| **temp-license-screen** | `temp` | Post-issuance questions |
| **my-tl-screen** | `temp` | Dashboard for temp license holders |
| **cc-login / cc-search / cc-grievance / cc-submit / cc-track / cc-report** | `consumer` | Helps consumers verify licenses and file complaints |
| **Dashboard / Tracker** | `default` | General queries, modification, update questions |

---

## Chip-to-Reply Coverage Audit

Not all chips are guaranteed to trigger a named reply. This table shows which chips hit a keyword match and which fall through to the helpline fallback:

| Context | Chip message sent | Keyword hit | Reply type |
|---|---|---|---|
| permanent | "What documents do I need for a permanent license?" | `document` ✓ | Named reply |
| permanent | "How long does the permanent license approval take?" | *(none)* | **Fallback** |
| permanent | "What kind of businesses need a permanent license?" | *(none)* | **Fallback** |
| temp | "Am I eligible for a temporary license?" | `temporary` ✓ | Named reply |
| temp | "What foods can I sell with a temporary license?" | `temporary` ✓ | Named reply |
| temp | "What are the restrictions on a temporary license?" | `temporary` ✓ | Named reply |
| consumer | "How can I check if a food business is licensed?" | `check` ✓ | Named reply |
| consumer | "How do I file a complaint about a food business?" | `complaint` ✓ | Named reply |
| consumer | "How do I know if this food is safe to eat?" | `safe` ✓ | Named reply |
| default | "I don't have all my documents" | `document` ✓ | Named reply |
| default | "Water testing help" | `water` ✓ | Named reply |
| default | "Can I update my license later?" | `update` ✓ | Named reply |

**Two permanent chips always hit the fallback** — "How long does approval take?" and "Who needs this license?" — and both return the helpline number instead of a useful answer.

---

## Known Gaps

1. **No memory** — Each time Potato opens (even on the same screen), it starts fresh with the greeting. No conversation history is preserved between opens or across sessions.

2. **Two chips always return the fallback** — The `permanent` context chips for "How long does approval take?" and "Who needs this license?" have no matching keyword in `POTATO_REPLIES` and always fall through to the helpline response. These need either a new keyword added or the chip messages reworded to contain an existing keyword.

3. **No Hindi support** — All Potato replies are English-only, even though the rest of the app has a working English/Hindi toggle via `setLang()`. The `POTATO_REPLIES` object has no Hindi equivalents.

4. **Footer link is not a `tel:` link** — "📞 Talk to a person (1800-112-100)" is rendered as plain text, not a tappable phone link. On mobile this means users cannot tap-to-call from within Potato.

5. **FoSTaC quiz screen uses generic temp chips** — When the user is on `fostac-quiz-screen`, the chips offer eligibility and food-restriction questions, which are irrelevant at that point. The chips were never updated for the quiz-specific moment in the flow.

6. **No input sanitisation** — The `potatoSend()` function injects user input directly into `innerHTML` via string concatenation, which is an XSS risk if this prototype is ever ported to production without sanitisation.

7. **Potato auto-closes on every screen change** — This is intentional UX, but it means if a user opens Potato mid-flow, reads a reply, and then navigates (e.g. hits Back), they lose the conversation and must re-open and re-ask.
