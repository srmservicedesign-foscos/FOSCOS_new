/* ============================================================
   DOCUMENTS.JS — P10 Accordion doc upload; real Firebase Storage
   ============================================================ */
(function () {
  'use strict';

  var uid         = null;
  var currentTier = null;
  var uploadedDocs = {};  // key → URL string (or true for legacy boolean)

  var DOC_SPECS = {
    selfie: {
      icon: '🤳', title: 'Photo of Applicant',
      desc: 'Clear, passport-style photo or selfie. JPG or PNG.',
      required: true,
      tiers: ['state', 'central']
    },
    idProof: {
      icon: '🪪', title: 'Photo ID Proof',
      desc: 'Aadhaar, PAN, Passport, Voter ID, or Driving Licence.',
      required: true,
      tiers: ['temporary-basic', 'basic', 'state', 'central']
    },
    addressProof: {
      icon: '🏠', title: 'Address Proof',
      desc: 'Electricity bill, ration card, or lease agreement.',
      required: true,
      tiers: ['temporary-basic', 'basic', 'state', 'central']
    },
    form9: {
      icon: '📋', title: 'Form IX — Nomination of Person',
      desc: 'Signed nomination form (download from FSSAI website).',
      required: true,
      tiers: ['state', 'central']
    },
    blueprint: {
      icon: '🗺️', title: 'Premises Blueprint / Layout',
      desc: 'Scaled layout plan of the food premises.',
      required: true,
      tiers: ['state', 'central']
    },
    waterTestReport: {
      icon: '💧', title: 'Water Test Report',
      desc: 'Potability test from an approved lab — confirms water used in food preparation is safe.',
      required: true,
      tiers: ['basic', 'state', 'central'],
      bookLabTest: true
    },
    nocFireDept: {
      icon: '🔥', title: 'NOC from Fire Department',
      desc: 'Required for large premises (over 1000 sq ft).',
      required: false,
      tiers: ['central']
    }
  };

  // ── Upload a file to Firebase Storage ────────────────────────
  function uploadDoc(key, file, onDone, onError) {
    var path = 'documents/' + uid + '/' + key + '_' + Date.now();
    var ref  = firebase.storage().ref(path);
    ref.put(file).then(function () {
      return ref.getDownloadURL();
    }).then(function (url) {
      onDone(url);
    }).catch(function (e) {
      console.error('[FOSCOS] Storage upload ' + key + ':', e);
      onError(e);
    });
  }

  // ── Save URL to Firestore ─────────────────────────────────────
  function saveDocUrl(key, url) {
    var update = {};
    update['documents.' + key] = url;
    update['updatedAt'] = firebase.firestore.FieldValue.serverTimestamp();
    firebase.firestore().collection('users').doc(uid).update(update).catch(function (e) {
      console.error('[FOSCOS] Firestore save doc url:', e);
    });
  }

  // ── Update progress bar + sidebar ────────────────────────────
  function updateProgress() {
    var required = getRequiredKeys();
    var done = required.filter(function (k) { return !!uploadedDocs[k]; });
    var pct  = required.length ? Math.round((done.length / required.length) * 100) : 0;

    var bar   = document.getElementById('docsProgressBar');
    var label = document.getElementById('docsProgressLabel');
    if (bar)   bar.style.width = pct + '%';
    if (label) label.textContent = done.length + ' of ' + required.length + ' uploaded';

    var sideList = document.getElementById('uploadProgressList');
    if (!sideList) return;
    sideList.innerHTML = '';
    required.forEach(function (k) {
      var spec = DOC_SPECS[k];
      var isUploaded = !!uploadedDocs[k];
      var row = document.createElement('div');
      row.className = 'reg-docs-upload-row ' + (isUploaded ? 'uploaded' : 'pending');
      row.innerHTML = '<span class="status-dot"></span><span>' + spec.title + '</span>';
      sideList.appendChild(row);
    });
  }

  // ── Build accordion ───────────────────────────────────────────
  function buildDocList(tier) {
    currentTier = tier;
    var list = document.getElementById('docList');
    if (!list) return;
    list.innerHTML = '';

    Object.keys(DOC_SPECS).forEach(function (key) {
      var spec = DOC_SPECS[key];
      if (spec.tiers.indexOf(tier) === -1) return;

      var isUploaded = !!uploadedDocs[key];
      var isOptional = !spec.required;

      var item = document.createElement('div');
      item.className = 'reg-doc-item';
      item.id        = 'docItem-' + key;

      var tagHtml = isOptional
        ? '<span class="reg-doc-item__tag optional">Optional</span>'
        : '<span class="reg-doc-item__tag">Required</span>';

      var checkHtml = isUploaded
        ? '<div class="reg-doc-item__check uploaded">✓</div>'
        : '<div class="reg-doc-item__check" id="docCheck-' + key + '"></div>';

      var bookLabHtml = spec.bookLabTest
        ? '<a class="reg-doc-item__book-lab" href="/one-stop-shop">🧪 Book a Lab Test →</a>'
        : '';

      item.innerHTML =
        '<div class="reg-doc-item__header" data-key="' + key + '">' +
          checkHtml +
          '<span class="reg-doc-item__name">' + spec.icon + ' ' + spec.title + '</span>' +
          tagHtml +
          '<span class="reg-doc-item__arrow">▼</span>' +
        '</div>' +
        '<div class="reg-doc-item__body">' +
          '<p class="reg-doc-item__desc">' + spec.desc + '</p>' +
          bookLabHtml +
          '<label class="reg-doc-item__upload-btn" id="docLabel-' + key + '">' +
            (isUploaded ? '✓ Uploaded — Replace?' : '⬆ Upload file') +
            '<input type="file" class="reg-doc-item__file-input" id="docInput-' + key + '" accept="image/*,.pdf" data-key="' + key + '" />' +
          '</label>' +
          '<div class="reg-doc-item__uploaded-name" id="docStatus-' + key + '">' +
            (isUploaded ? 'File uploaded successfully' : '') +
          '</div>' +
          '<div class="reg-doc-item__links">' +
            '<button class="reg-doc-item__link-btn">▶ Watch a guide</button>' +
            '<button class="reg-doc-item__link-btn">📖 Read FAQ</button>' +
          '</div>' +
        '</div>';

      list.appendChild(item);

      // Accordion toggle
      item.querySelector('.reg-doc-item__header').addEventListener('click', function () {
        item.classList.toggle('open');
      });

      // File input change → upload
      var fileInput = document.getElementById('docInput-' + key);
      fileInput.addEventListener('change', function (e) {
        e.stopPropagation();
        var file = fileInput.files[0];
        if (!file) return;

        var label  = document.getElementById('docLabel-' + key);
        var status = document.getElementById('docStatus-' + key);
        if (label)  label.textContent = '⏳ Uploading…';
        if (status) status.textContent = '';

        uploadDoc(key, file, function (url) {
          uploadedDocs[key] = url;
          saveDocUrl(key, url);

          var check = document.getElementById('docCheck-' + key);
          if (check) { check.className = 'reg-doc-item__check uploaded'; check.textContent = '✓'; }
          if (label)  label.textContent = '✓ Uploaded — Replace?';
          if (status) status.textContent = file.name + ' — uploaded';

          document.getElementById('docsError').textContent = '';
          updateProgress();
        }, function () {
          if (label)  label.textContent = '⬆ Upload file';
          if (status) status.textContent = 'Upload failed — please try again';
        });
      });

      // Open item if already done so user can see status
      if (isUploaded) item.classList.remove('open');
    });

    updateProgress();
    setupWhatsApp();
  }

  function getRequiredKeys() {
    if (!currentTier) return [];
    return Object.keys(DOC_SPECS).filter(function (k) {
      return DOC_SPECS[k].tiers.indexOf(currentTier) !== -1 && DOC_SPECS[k].required;
    });
  }

  function allRequiredProvided() {
    return getRequiredKeys().every(function (k) { return !!uploadedDocs[k]; });
  }

  // ── WhatsApp checklist ────────────────────────────────────────
  function setupWhatsApp() {
    var btn = document.getElementById('whatsappChecklistBtn');
    if (!btn || !currentTier) return;
    var lines = ['*FOSCOS Document Checklist*', 'License tier: ' + currentTier, ''];
    Object.keys(DOC_SPECS).forEach(function (k) {
      if (DOC_SPECS[k].tiers.indexOf(currentTier) !== -1) {
        lines.push((uploadedDocs[k] ? '✅' : '⬜') + ' ' + DOC_SPECS[k].title);
      }
    });
    btn.href = 'https://wa.me/?text=' + encodeURIComponent(lines.join('\n'));
  }

  // ── Load from Firestore ───────────────────────────────────────
  function loadExisting(user) {
    uid = user.uid;
    firebase.firestore().collection('users').doc(uid).get().then(function (doc) {
      var d    = doc.exists ? doc.data() : {};
      var tier = (d.scale && d.scale.tier) || 'basic';

      if (d.documents) {
        Object.keys(d.documents).forEach(function (k) {
          if (d.documents[k]) uploadedDocs[k] = d.documents[k];
        });
      }

      buildDocList(tier);
    });
  }

  // ── Continue ─────────────────────────────────────────────────
  function continueFlow() {
    if (!allRequiredProvided()) {
      document.getElementById('docsError').textContent = 'Please upload all required documents before continuing.';
      return;
    }
    document.getElementById('docsError').textContent = '';
    var params = new URLSearchParams(window.location.search);
    window.location.href = params.get('from') === 'review' ? '/review' : '/one-stop-shop?from=documents';
  }

  // ── Auth guard ────────────────────────────────────────────────
  document.addEventListener('firebase-ready', function () {
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) { window.location.href = '/'; return; }
      loadExisting(user);
    });
  });

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('docsContinueBtn');
    if (btn) btn.addEventListener('click', continueFlow);
  });

})();
