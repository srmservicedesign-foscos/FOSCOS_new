/* ============================================================
   TL_ISSUED.JS — P21 License issued screen
   ============================================================ */
(function () {
  'use strict';

  function fmt(isoStr) {
    if (!isoStr) return '—';
    var d = new Date(isoStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function daysRemaining(expiryIso) {
    if (!expiryIso) return '—';
    var diff = new Date(expiryIso).getTime() - Date.now();
    var days = Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
    return String(days);
  }

  function populate() {
    var licenseNo = sessionStorage.getItem('tlLicenseNo') || '';
    var issuedAt  = sessionStorage.getItem('tlIssuedAt')  || '';
    var expiresAt = sessionStorage.getItem('tlExpiresAt') || '';
    var details   = JSON.parse(sessionStorage.getItem('tlDetails') || '{}');

    var bizName = (details.name || '') + (details.area ? ', ' + details.area : '');

    var el = function (id) { return document.getElementById(id); };
    if (el('issuedLicenseNo')) el('issuedLicenseNo').textContent = licenseNo || 'TL-2026-···-······';
    if (el('issuedBizName'))   el('issuedBizName').textContent   = bizName   || '—';
    if (el('issuedDate'))      el('issuedDate').textContent      = fmt(issuedAt);
    if (el('issuedExpiry'))    el('issuedExpiry').textContent    = fmt(expiresAt);
    if (el('issuedDaysLeft'))  el('issuedDaysLeft').textContent  = daysRemaining(expiresAt);
  }

  function handleDownload() {
    var licenseNo = sessionStorage.getItem('tlLicenseNo') || 'TL-2026-XXX-000000';
    alert('📄 Download ready\n\nLicense ' + licenseNo + ' would be generated as a PDF in the production system.');
  }

  document.addEventListener('DOMContentLoaded', function () {
    populate();
    var btn = document.getElementById('downloadBtn');
    if (btn) btn.addEventListener('click', handleDownload);
  });

  document.addEventListener('firebase-ready', function () {
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) {
        sessionStorage.setItem('tlLastPage', window.location.pathname);
        sessionStorage.setItem('tlFlow', '1');
        window.location.href = '/signup';
        return;
      }
      /* Optionally pull fresh data from Firestore if sessionStorage was cleared */
      var licenseNo = sessionStorage.getItem('tlLicenseNo');
      if (!licenseNo) {
        firebase.firestore().collection('users').doc(user.uid).get().then(function (doc) {
          if (doc.exists) {
            var tl = doc.data().tempLicense || {};
            if (tl.licenseNo)  sessionStorage.setItem('tlLicenseNo',  tl.licenseNo);
            if (tl.issuedAt)   sessionStorage.setItem('tlIssuedAt',   tl.issuedAt);
            if (tl.expiresAt)  sessionStorage.setItem('tlExpiresAt',  tl.expiresAt);
            if (tl.details)    sessionStorage.setItem('tlDetails',    JSON.stringify(tl.details));
            populate();
          }
        });
      }
    });
  });

})();
