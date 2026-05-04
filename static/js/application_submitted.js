/* ============================================================
   APPLICATION_SUBMITTED.JS — P13 Payment confirmation receipt
   ============================================================ */
(function () {
  'use strict';

  var TIER_LABELS = {
    'temporary-basic': 'Basic Registration',
    'basic':           'State License (Basic)',
    'state':           'State License',
    'central':         'Central License'
  };

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val || '—';
  }

  function addWorkingDays(startDate, days) {
    var d = new Date(startDate);
    var added = 0;
    while (added < days) {
      d.setDate(d.getDate() + 1);
      var day = d.getDay();
      if (day !== 0 && day !== 6) added++;
    }
    return d;
  }

  document.addEventListener('firebase-ready', function () {
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) { window.location.href = '/'; return; }

      firebase.firestore().collection('users').doc(user.uid).get().then(function (doc) {
        if (!doc.exists) return;
        var d = doc.data();

        setText('submittedAppId',  d.applicationId || '—');
        setText('sub-licenseType', TIER_LABELS[d.scale && d.scale.tier] || '—');

        var licenseFee = (d.review && d.review.totalFee) || 0;
        var ossTotal   = 0;
        var ossCart    = d.ossCart;
        if (ossCart && ossCart.items) {
          ossCart.items.forEach(function (item) { ossTotal += item.price || 0; });
        }
        var grandTotal = licenseFee + ossTotal;
        setText('sub-total', grandTotal ? '₹' + grandTotal.toLocaleString('en-IN') : '—');

        // Expected approval date (~30 working days from now)
        var approvalDate = addWorkingDays(new Date(), 30);
        var options = { day: 'numeric', month: 'short', year: 'numeric' };
        setText('sub-expectedDate', approvalDate.toLocaleDateString('en-IN', options));

        // WhatsApp share
        var bizName = (d.details && d.details.bizName) || 'My Business';
        var appId   = d.applicationId || '—';
        var msg = 'My FSSAI license application has been submitted!\n\nBusiness: ' + bizName + '\nApp ID: ' + appId + '\nStatus: Under Review\n\nTrack it at FOSCOS.';
        var waBtn = document.getElementById('btnWhatsApp');
        if (waBtn) waBtn.href = 'https://wa.me/?text=' + encodeURIComponent(msg);
      });
    });
  });

  document.addEventListener('DOMContentLoaded', function () {
    var dlBtn = document.getElementById('btnDownloadReceipt');
    if (dlBtn) dlBtn.addEventListener('click', function () { window.print(); });
  });

})();
