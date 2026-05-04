/* ============================================================
   TRACK_APPLICATION.JS — P25 Application status tracker
   ============================================================ */
(function () {
  'use strict';

  var PIPELINE_STEPS = [
    { key: 'submitted',            label: 'Application Submitted',   icon: '📋' },
    { key: 'documents_requested',  label: 'Document Review',          icon: '📄' },
    { key: 'inspection_scheduled', label: 'Inspection Scheduled',    icon: '📅' },
    { key: 'inspection_complete',  label: 'Inspection Complete',     icon: '✅' },
    { key: 'final_review',         label: 'Final Review',            icon: '🔍' },
    { key: 'approved',             label: 'Approved',                icon: '🎉' }
  ];

  var STATUS_ORDER = PIPELINE_STEPS.map(function (s) { return s.key; });

  var DOC_NAMES = {
    selfie:          'Photo of Applicant',
    idProof:         'Identity Proof',
    addressProof:    'Address Proof',
    form9:           'Form IX',
    blueprint:       'Premises Blueprint',
    waterTestReport: 'Water Analysis Report',
    nocFireDept:     'NOC from Fire Department'
  };

  // ── Tab switching ─────────────────────────────────────────────
  function setupTabs() {
    document.querySelectorAll('.track-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.track-tab').forEach(function (t) { t.classList.remove('active'); });
        document.querySelectorAll('.track-tab-panel').forEach(function (p) { p.classList.remove('active'); });
        tab.classList.add('active');
        var panel = document.getElementById('tab-' + tab.dataset.tab);
        if (panel) panel.classList.add('active');
      });
    });
  }

  // ── Render Application Status timeline ───────────────────────
  function renderTimeline(appData) {
    var container = document.getElementById('trackTimeline');
    if (!container) return;

    var currentStatus = appData.applicationStatus || 'submitted';
    var currentIdx    = STATUS_ORDER.indexOf(currentStatus);
    if (currentIdx === -1) currentIdx = 0;

    var auditMap = {};
    if (appData.auditTrail && appData.auditTrail.length) {
      appData.auditTrail.forEach(function (entry) {
        if (entry.statusKey) auditMap[entry.statusKey] = entry;
      });
    }

    container.innerHTML = '';

    PIPELINE_STEPS.forEach(function (step, idx) {
      var isDone   = idx < currentIdx || (currentStatus === 'approved' && idx === PIPELINE_STEPS.length - 1);
      var isActive = idx === currentIdx;

      var div = document.createElement('div');
      div.className = 'track-timeline__step' + (isDone ? ' done' : '') + (isActive ? ' active' : '');

      var dotContent = isDone ? '✓' : (isActive ? step.icon : '');
      var dateStr = '';
      var entry   = auditMap[step.key];
      if (entry && entry.timestamp) {
        var d = new Date(entry.timestamp);
        dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      }

      var noteHtml = '';
      if (isActive && entry && entry.note) {
        noteHtml = '<div class="track-timeline__note">Officer note: ' + entry.note + '</div>';
      }
      if (isActive && appData.lastOfficerNote) {
        noteHtml = '<div class="track-timeline__note">Officer note: ' + appData.lastOfficerNote + '</div>';
      }

      div.innerHTML =
        '<div class="track-timeline__dot">' + dotContent + '</div>' +
        '<div class="track-timeline__body">' +
          '<div class="track-timeline__label">' + step.label + '</div>' +
          (dateStr ? '<div class="track-timeline__date">' + dateStr + '</div>' : '') +
          noteHtml +
        '</div>';

      container.appendChild(div);
    });
  }

  // ── Render Document Processing tab ───────────────────────────
  function renderDocProcessing(appData) {
    var container = document.getElementById('trackDocGrid');
    if (!container) return;

    var docs = appData.documents || {};
    var keys = Object.keys(DOC_NAMES);

    if (!keys.length) {
      container.innerHTML = '<div style="color:var(--text-muted);">No documents on record.</div>';
      return;
    }

    container.innerHTML = '';
    keys.forEach(function (key) {
      var val   = docs[key];
      var name  = DOC_NAMES[key];
      if (!val) return;

      var badgeClass = 'track-badge--pending';
      var badgeText  = 'Submitted';

      var item = document.createElement('div');
      item.className = 'track-doc-item';
      item.innerHTML =
        '<span class="track-doc-item__name">' + name + '</span>' +
        '<span class="track-badge ' + badgeClass + '">' + badgeText + '</span>';
      container.appendChild(item);
    });

    if (!container.children.length) {
      container.innerHTML = '<div style="color:var(--text-muted);">No documents uploaded yet.</div>';
    }
  }

  // ── Render Inspection tab ─────────────────────────────────────
  function renderInspection(appData) {
    var panel = document.getElementById('trackInspectionPanel');
    if (!panel) return;

    var status = appData.applicationStatus || '';
    if (status === 'inspection_scheduled' || status === 'inspection_complete') {
      var entry = null;
      if (appData.auditTrail) {
        appData.auditTrail.forEach(function (e) {
          if (e.statusKey === 'inspection_scheduled') entry = e;
        });
      }
      var dateStr = entry && entry.timestamp
        ? new Date(entry.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Date not set';

      panel.innerHTML =
        '<div class="big-icon">📅</div>' +
        '<div class="title">Inspection ' + (status === 'inspection_complete' ? 'Completed' : 'Scheduled') + '</div>' +
        '<div class="sub">Scheduled on: ' + dateStr + '.<br>' +
        (entry && entry.note ? 'Note: ' + entry.note : 'An FSSAI officer will visit your premises.') + '</div>';
    }
  }

  // ── Load data from Firestore ──────────────────────────────────
  function loadTrackData(user) {
    firebase.firestore().collection('users').doc(user.uid).get().then(function (doc) {
      if (!doc.exists) { window.location.href = '/fbo-portal'; return; }
      var d   = doc.data();
      var appId = d.applicationId;

      if (!appId) { window.location.href = '/fbo-portal'; return; }

      var sub = document.getElementById('trackSubHeading');
      if (sub) {
        var tier = d.scale && d.scale.tier;
        var tierMap = {
          'temporary-basic': 'Basic Registration',
          'basic':           'State License (Basic)',
          'state':           'State License',
          'central':         'Central License'
        };
        sub.textContent = appId + ' · ' + (tierMap[tier] || 'License') +
          (d.submittedAt && d.submittedAt.toDate
            ? ' · Filed ' + d.submittedAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : '');
      }

      firebase.firestore().collection('applications').doc(appId).get().then(function (appDoc) {
        var appData = appDoc.exists ? appDoc.data() : d;
        renderTimeline(appData);
        renderDocProcessing(appData);
        renderInspection(appData);
      }).catch(function () {
        renderTimeline(d);
        renderDocProcessing(d);
      });
    }).catch(function () {
      window.location.href = '/fbo-portal';
    });
  }

  // ── Auth guard ────────────────────────────────────────────────
  document.addEventListener('firebase-ready', function () {
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) { window.location.href = '/'; return; }
      loadTrackData(user);
    });
  });

  document.addEventListener('DOMContentLoaded', function () {
    setupTabs();
  });

})();
