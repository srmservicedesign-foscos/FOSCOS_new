/* ============================================================
   TL_NEXT_STEPS.JS — P22 Compliance steps (water / FoSTaC / inspection)
   ============================================================ */
(function () {
  'use strict';

  var uid = '';

  /* ── Tab switching ───────────────────────────────────────── */
  window.switchTab = function (name) {
    var tabs   = ['water', 'fostac', 'inspection'];
    var labels = { water: 'tabWater', fostac: 'tabFostac', inspection: 'tabInspection' };
    var panels = { water: 'panelWater', fostac: 'panelFostac', inspection: 'panelInspection' };

    tabs.forEach(function (t) {
      var tab   = document.getElementById(labels[t]);
      var panel = document.getElementById(panels[t]);
      if (tab)   tab.classList.toggle('active',   t === name);
      if (panel) panel.classList.toggle('active', t === name);
    });
  };

  /* ── Mock booking ────────────────────────────────────────── */
  window.mockBook = function (type, label, btnEl) {
    if (btnEl) {
      btnEl.disabled    = true;
      btnEl.textContent = 'Booking…';
      btnEl.style.background = '#94a3b8';
    }
    setTimeout(function () {
      if (btnEl) {
        btnEl.textContent      = '✓ Requested';
        btnEl.style.background = '#2563eb';
        btnEl.style.color      = 'white';
      }
      var msgId = type + 'BookedMsg';
      var msg   = document.getElementById(msgId);
      if (msg) { msg.style.display = 'flex'; }

      var pendingId = type + 'PendingNote';
      var pending   = document.getElementById(pendingId);
      if (pending) { pending.style.display = ''; }

      if (!uid) return;
      var update = {};
      if (type === 'fostac')     update['tempLicense.fostacEnrolledPending']  = true;
      if (type === 'inspection') update['tempLicense.inspectionPending']       = true;
      if (type === 'water')      update['tempLicense.waterTestPending']        = true;
      firebase.firestore().collection('users').doc(uid).set(update, { merge: true })
        .catch(function (e) { console.error('[TL next-steps]', e); });
    }, 900);
  };

  /* ── Upload handlers ─────────────────────────────────────── */
  function setupUpload(inputId, doneId, firestoreKey) {
    var input = document.getElementById(inputId);
    var btn   = document.getElementById(inputId.replace('Input', 'UploadBtn'));
    if (!input || !btn) return;

    btn.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;
      btn.disabled = true;
      btn.textContent = 'Uploading…';

      if (!uid) { showDone(doneId, btn); return; }

      var path = 'tl_compliance/' + uid + '/' + firestoreKey + '_' + Date.now();
      firebase.storage().ref(path).put(file)
        .then(function (snap) { return snap.ref.getDownloadURL(); })
        .then(function (url) {
          var update = {};
          update['tempLicense.compliance.' + firestoreKey] = url;
          if (firestoreKey === 'waterReport') { update['tempLicense.waterTestDone'] = true; complianceState.water = true; }
          return firebase.firestore().collection('users').doc(uid).set(update, { merge: true });
        })
        .then(function () { showDone(doneId, btn); })
        .catch(function (e) { console.error('[TL upload]', e); showDone(doneId, btn); });
    });
  }

  function showDone(doneId, btn) {
    var el = document.getElementById(doneId);
    if (el) el.style.display = 'block';
    if (btn) { btn.style.display = 'none'; }
  }

  /* ── Countdown banner ────────────────────────────────────── */
  function populateCountdown() {
    var expiresAt = sessionStorage.getItem('tlExpiresAt') || '';
    var el        = document.getElementById('nsCountdown');
    var exEl      = document.getElementById('nsExpiry');
    if (expiresAt) {
      var diff = new Date(expiresAt).getTime() - Date.now();
      var days = Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
      if (el) el.textContent = String(days);
      if (exEl) exEl.textContent = new Date(expiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  }

  /* ── URL tab param ───────────────────────────────────────── */
  function applyUrlTab() {
    var params = new URLSearchParams(window.location.search);
    var tab    = params.get('tab');
    if (tab && ['water', 'fostac', 'inspection'].indexOf(tab) !== -1) {
      switchTab(tab);
    }
  }

  /* ── Upgrade to permanent ────────────────────────────────── */
  var complianceState = { water: false, fostac: false, inspection: false };

  var SETUP_TO_BIZ = {
    cart: 'cart-thela', stall: 'fixed-stall-kiosk',
    home: 'home-kitchen', tiffin: 'catering-service',
    vendor: 'cart-thela', other: 'fixed-stall-kiosk'
  };

  function handleUpgrade() {
    var blockedMsg = document.getElementById('upgradeBlockedMsg');
    var pendingMsg = document.getElementById('upgradePendingMsg');
    var upgradeBtn = document.getElementById('upgradeBtn');

    if (!uid) { window.location.href = '/about-business'; return; }

    if (upgradeBtn) { upgradeBtn.disabled = true; upgradeBtn.textContent = 'Checking…'; }

    firebase.firestore().collection('users').doc(uid).get().then(function (doc) {
      var tl = doc.exists ? (doc.data().tempLicense || {}) : {};
      complianceState.water      = !!tl.waterTestDone;
      complianceState.fostac     = !!tl.fostacEnrolled;
      complianceState.inspection = !!tl.inspectionDone;

      var hasPending = tl.waterTestPending || tl.fostacEnrolledPending || tl.inspectionPending;
      var allDone    = complianceState.water && complianceState.fostac && complianceState.inspection;

      if (!allDone) {
        if (upgradeBtn) { upgradeBtn.disabled = false; upgradeBtn.textContent = 'Upgrade to Permanent License →'; }
        if (hasPending && pendingMsg) {
          pendingMsg.style.display = '';
          if (blockedMsg) blockedMsg.style.display = 'none';
        } else {
          if (blockedMsg) blockedMsg.style.display = '';
          if (pendingMsg) pendingMsg.style.display  = 'none';
        }
        return Promise.resolve();
      }

      if (blockedMsg) blockedMsg.style.display = 'none';
      if (pendingMsg) pendingMsg.style.display  = 'none';
      if (upgradeBtn) { upgradeBtn.disabled = true; upgradeBtn.textContent = 'Preparing…'; }

      var details  = tl.details || {};
      var setup    = tl.setup || sessionStorage.getItem('tlSetup') || 'other';

      var prefill = {
        bizName:      details.bizName   || '',
        ownerName:    details.name      || '',
        bizPhone:     details.phone     || '',
        addrDistrict: details.district  || details.area || '',
        addrState:    details.state     || '',
        addrPincode:  details.pincode   || '',
        upgradedFromTL: tl.licenseNo    || true
      };

      var bizTypes = [SETUP_TO_BIZ[setup] || 'fixed-stall-kiosk'];

      return firebase.firestore().collection('users').doc(uid).set({
        details:       prefill,
        businessTypes: bizTypes
      }, { merge: true });
    }).then(function () {
      if (complianceState.water && complianceState.fostac && complianceState.inspection) {
        window.location.href = '/about-business';
      }
    }).catch(function (e) {
      console.error('[TL upgrade]', e);
      window.location.href = '/about-business';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    populateCountdown();
    applyUrlTab();
    setupUpload('waterInput',   'waterDoneMsg',      'waterReport');
    setupUpload('fostacInput',  'fostacDoneMsg',     'fostacCert');

    var upgradeBtn = document.getElementById('upgradeBtn');
    if (upgradeBtn) upgradeBtn.addEventListener('click', handleUpgrade);
  });

  document.addEventListener('firebase-ready', function () {
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) {
        sessionStorage.setItem('tlLastPage', window.location.pathname);
        sessionStorage.setItem('tlFlow', '1');
        window.location.href = '/signup';
        return;
      }
      uid = user.uid;

      firebase.firestore().collection('users').doc(user.uid).get().then(function (doc) {
        if (!doc.exists) return;
        var tl = doc.data().tempLicense || {};
        if (tl.expiresAt && !sessionStorage.getItem('tlExpiresAt')) {
          sessionStorage.setItem('tlExpiresAt', tl.expiresAt);
          populateCountdown();
        }
        complianceState.water      = !!tl.waterTestDone;
        complianceState.fostac     = !!tl.fostacEnrolled;
        complianceState.inspection = !!tl.inspectionDone;
      });
    });
  });

})();
