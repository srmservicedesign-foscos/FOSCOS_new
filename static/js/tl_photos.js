/* ============================================================
   TL_PHOTOS.JS — P18 Geotagged setup photos
   ============================================================ */
(function () {
  'use strict';

  var uploaded = [false, false];
  var uid = '';

  function $$(id) { return document.getElementById(id); }

  function updateProgress() {
    var done  = uploaded.filter(Boolean).length;
    var pct   = (done / 2) * 100;
    var fill  = $$('photoProgressFill');
    var count = $$('photoCount');
    var btn   = $$('photosContinue');
    if (fill)  fill.style.width  = pct + '%';
    if (count) count.textContent = done + ' / 2';
    if (btn)   btn.disabled      = (done < 2);
  }

  function markDone(idx) {
    uploaded[idx] = true;
    var row = $$('photoRow' + (idx + 1));
    var num = $$('photoNum' + (idx + 1));
    var btn = $$('photoBtn' + (idx + 1));
    if (row) row.classList.add('done');
    if (num) num.textContent = '✓';
    if (btn) { btn.textContent = '✓ Done'; btn.disabled = true; }
    updateProgress();
  }

  function handleUpload(idx, file) {
    if (!file) return;
    var btn = $$('photoBtn' + (idx + 1));
    if (btn) { btn.textContent = 'Uploading…'; btn.disabled = true; }

    if (!uid) { markDone(idx); return; }

    var path = 'tl_photos/' + uid + '/photo' + (idx + 1) + '_' + Date.now();
    firebase.storage().ref(path).put(file)
      .then(function (snap) { return snap.ref.getDownloadURL(); })
      .then(function (url) {
        var update = {};
        update['tempLicense.photos.photo' + (idx + 1)] = url;
        return firebase.firestore().collection('users').doc(uid).set(update, { merge: true });
      })
      .then(function () { markDone(idx); })
      .catch(function (e) {
        console.error('[TL photos]', e);
        // Still mark done for prototype resilience
        markDone(idx);
      });
  }

  function setupUploadBtn(idx) {
    var btn   = $$('photoBtn' + (idx + 1));
    var input = $$('photoInput' + (idx + 1));
    if (btn && input) {
      btn.addEventListener('click', function () { input.click(); });
      input.addEventListener('change', function () {
        if (input.files && input.files[0]) handleUpload(idx, input.files[0]);
      });
    }
  }

  function handleContinue() {
    window.location.href = '/temp-license/docs';
  }

  document.addEventListener('DOMContentLoaded', function () {
    setupUploadBtn(0);
    setupUploadBtn(1);
    updateProgress();
    var btn = $$('photosContinue');
    if (btn) btn.addEventListener('click', handleContinue);
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
