/* ============================================================
   GLOBAL.JS — Potato chatbot (keyword-matching, context-aware)
   ============================================================ */

(function () {
  'use strict';

  /* ── Context detection by URL path ──────────────────────── */
  var PERMANENT_PATHS = [
    '/about-business', '/food-type', '/scale', '/business-details',
    '/documents', '/review', '/payment', '/one-stop-shop',
    '/application-submitted', '/fbo-portal', '/track-application'
  ];

  function getContext() {
    var path = window.location.pathname;
    if (path.indexOf('/temp-license') === 0) return 'temp';
    if (path.indexOf('/consumer-corner') === 0) return 'consumer';
    for (var i = 0; i < PERMANENT_PATHS.length; i++) {
      if (path.indexOf(PERMANENT_PATHS[i]) === 0) return 'permanent';
    }
    return 'default';
  }

  /* ── Context definitions ─────────────────────────────────── */
  var CONTEXTS = {
    permanent: {
      greeting: "Hello! 🥔 I'm Potato, your FSSAI guide. I can help you with your permanent license application.",
      chips: [
        { label: 'Documents needed?',        msg: 'What documents do I need for a permanent license?' },
        { label: 'How long does approval take?', msg: 'How long does the license approval take?' },
        { label: 'Who needs this license?',  msg: 'What kind of businesses need a permanent license?' }
      ]
    },
    temp: {
      greeting: "Hello! 🥔 I'm Potato. Let’s check if you’re eligible for a temporary license and what you can sell.",
      chips: [
        { label: 'Am I eligible?',          msg: 'Am I eligible for a temporary license?' },
        { label: 'What foods can I sell?',  msg: 'What foods can I sell with a temporary license?' },
        { label: 'Restrictions?',           msg: 'What are the restrictions on a temporary license?' }
      ]
    },
    consumer: {
      greeting: "Hello! 🥔 I'm Potato. I can help you check food safety, licenses, or raise a complaint.",
      chips: [
        { label: 'Check a license?',   msg: 'How can I check if a food business is licensed?' },
        { label: 'File a complaint?',  msg: 'How do I file a complaint about a food business?' },
        { label: 'Is this food safe?', msg: 'How do I know if this food is safe to eat?' }
      ]
    },
    'default': {
      greeting: "Hello! 🥔 I'm Potato, your FSSAI guide. Ask me anything about your license application!",
      chips: [
        { label: 'Missing documents?', msg: "I don’t have all my documents" },
        { label: 'Water testing',      msg: 'Water testing help' },
        { label: 'Update later?',      msg: 'Can I update my license later?' }
      ]
    }
  };

  /* ── Keyword reply map (first match wins) ────────────────── */
  var REPLIES = [
    ['document',  "No worries! For your personalised checklist, visit the Documents page. Your progress is saved — come back whenever you’re ready. 🥔"],
    ['water',     "For water testing, use the ‘Book Lab Test’ option on the Documents page. The lab uploads the approved report directly to your application — you don’t need to do anything else!"],
    ['approval',  "Permanent license approval typically takes 30–60 working days after document verification and inspection. Basic Registration can be faster — sometimes within 7 days."],
    ['how long',  "Permanent license approval typically takes 30–60 working days after document verification and inspection. Basic Registration can be faster — sometimes within 7 days."],
    ['kind',      "Restaurants, food manufacturers, packaged food businesses, and any operation with annual turnover above ₹12L need a permanent license. Street vendors and home kitchens under ₹12L can use a Temporary License."],
    ['update',    "Yes! You can upgrade from Registration → State License → Central License at any time as your business grows. Just file a modification request."],
    ['pan',       "PAN is optional for Basic Registration — Aadhaar alone is enough. State and Central licenses do require PAN though."],
    ['two',       "Each location needs its own separate license. But if combined turnover is under ₹12L, both qualify for Basic Registration at ₹100 each."],
    ['temporary', "Temporary License lets you start operating with just 3 documents. You then have 2 months to complete full compliance. It automatically upgrades to Basic Registration once your compliance window closes — no water report or inspection upfront."],
    ['check',     "To check if a food business is licensed, go to Consumer Corner and use the License Search feature. Enter the business name or FSSAI number to verify their status. 🥔"],
    ['complaint', "To file a complaint, go to Consumer Corner → File Grievance. You’ll need the business name, location, and complaint details. FSSAI investigates all complaints within 30 days. 📝"],
    ['safe',      "Look for the FSSAI license number on the packaging — it’s a 14-digit number starting with the year. You can verify it on our portal. Also check the expiry date and look for the FSSAI logo. 🛡️"]
  ];

  var FALLBACK = "Good question! 🥔 For specific help, call the FSSAI helpline at 1800-112-100 (Mon–Sat, 9am–6pm). Want me to show you quick FAQs?";

  function getChatReply(msg) {
    var lower = msg.toLowerCase();
    for (var i = 0; i < REPLIES.length; i++) {
      if (lower.indexOf(REPLIES[i][0]) !== -1) return REPLIES[i][1];
    }
    return FALLBACK;
  }

  /* ── DOM refs ────────────────────────────────────────────── */
  var fab       = document.getElementById('chatbotFab');
  var panel     = document.getElementById('chatbotPanel');
  var closeBtn  = document.getElementById('chatbotClose');
  var messages  = document.getElementById('chatMessages');
  var chipsWrap = document.getElementById('chatChips');
  var input     = document.getElementById('chatInput');
  var sendBtn   = document.getElementById('chatSend');

  if (!fab || !panel) return;

  var opened = false;

  /* ── Message rendering ───────────────────────────────────── */
  function addMessage(text, side) {
    var bubble = document.createElement('div');
    bubble.className = 'chatbot-msg chatbot-msg--' + side;
    bubble.textContent = text;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
  }

  function showTyping() {
    var el = document.createElement('div');
    el.className = 'chatbot-msg chatbot-msg--bot chatbot-typing';
    el.id = 'chatTyping';
    el.innerHTML = '<span></span><span></span><span></span>';
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
  }

  function removeTyping() {
    var el = document.getElementById('chatTyping');
    if (el) el.parentNode.removeChild(el);
  }

  /* ── Chip rendering ──────────────────────────────────────── */
  function renderChips(chips) {
    chipsWrap.innerHTML = '';
    chips.forEach(function (chip) {
      var btn = document.createElement('button');
      btn.className = 'chatbot-chip';
      btn.textContent = chip.label;
      btn.addEventListener('click', function () { sendMessage(chip.msg); });
      chipsWrap.appendChild(btn);
    });
  }

  /* ── Send a message ──────────────────────────────────────── */
  function sendMessage(text) {
    text = (text || '').trim();
    if (!text) return;

    addMessage(text, 'user');
    if (input) input.value = '';

    showTyping();
    setTimeout(function () {
      removeTyping();
      addMessage(getChatReply(text), 'bot');
    }, 700);
  }

  /* ── Open / close ────────────────────────────────────────── */
  function openChat() {
    panel.classList.add('open');
    fab.textContent = '✕';

    if (!opened) {
      opened = true;
      var ctx = CONTEXTS[getContext()];
      addMessage(ctx.greeting, 'bot');
      renderChips(ctx.chips);
    }

    setTimeout(function () { if (input) input.focus(); }, 80);
  }

  function closeChat() {
    panel.classList.remove('open');
    fab.textContent = '🥔';
  }

  /* ── Event wiring ────────────────────────────────────────── */
  fab.addEventListener('click', function () {
    panel.classList.contains('open') ? closeChat() : openChat();
  });

  closeBtn.addEventListener('click', closeChat);

  if (sendBtn) sendBtn.addEventListener('click', function () { sendMessage(input.value); });

  if (input) {
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); sendMessage(input.value); }
    });
  }

})();
