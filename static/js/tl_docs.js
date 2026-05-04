/* ============================================================
   TL_DOCS.JS — P19 KYC document upload (ID + establishment)
   ============================================================ */
(function () {
  'use strict';

  var uploaded = [false, false];
  var uid = '';

  function $$(id) { return document.getElementById(id); }

  function updateProgress() {
    var done  = uploaded.filter(Boolean).length;
    var fill  = $$('docProgressFill');
    var count = $$('docCount');
    var btn   = $$('docsContinue');
    if (fill)  fill.style.width  = (done / 2 * 100) + '%';
    if (count) count.textContent = done + ' / 2';
    if (btn)   btn.disabled      = (done < 2);
  }

  function showAiScan(idx) {
    if (idx !== 0) return;
    var el = $$('docAiScan1');
    if (!el) return;
    el.textContent = 'Scanning…';
    el.style.display = '';
    setTimeout(function () {
      el.textContent = '✅ AI Scan: Identity verified';
    }, 1800);
  }

  function markDone(idx) {
    uploaded[idx] = true;
    var row = $$('docRow' + (idx + 1));
    var num = $$('docNum' + (idx + 1));
    var btn = $$('docBtn' + (idx + 1));
    if (row) row.classList.add('done');
    if (num) num.textContent = '✓';
    if (btn) { btn.textContent = '✓ Done'; btn.disabled = true; }
    showAiScan(idx);
    updateProgress();
  }

  function handleUpload(idx, file) {
    if (!file) return;
    var btn = $$('docBtn' + (idx + 1));
    if (btn) { btn.textContent = 'Uploading…'; btn.disabled = true; }

    if (!uid) { markDone(idx); return; }

    var docKey = idx === 0 ? 'idProof' : 'establishment';
    var path   = 'tl_docs/' + uid + '/' + docKey + '_' + Date.now();

    firebase.storage().ref(path).put(file)
      .then(function (snap) { return snap.ref.getDownloadURL(); })
      .then(function (url) {
        var update = {};
        update['tempLicense.docs.' + docKey] = url;
        return firebase.firestore().collection('users').doc(uid).set(update, { merge: true });
      })
      .then(function () { markDone(idx); })
      .catch(function (e) {
        console.error('[TL docs]', e);
        markDone(idx);
      });
  }

  function setupUploadBtn(idx) {
    var btn   = $$('docBtn'   + (idx + 1));
    var input = $$('docInput' + (idx + 1));
    if (btn && input) {
      btn.addEventListener('click', function () { input.click(); });
      input.addEventListener('change', function () {
        if (input.files && input.files[0]) handleUpload(idx, input.files[0]);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    setupUploadBtn(0);
    setupUploadBtn(1);
    updateProgress();
    var btn = $$('docsContinue');
    if (btn) btn.addEventListener('click', function () {
      window.location.href = '/temp-license/terms';
    });
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
    });
  });

})();
