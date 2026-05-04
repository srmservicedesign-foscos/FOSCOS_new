/* ============================================================
   REVIEW.JS — P11 Application review (read-only license duration)
   ============================================================ */
(function () {
  'use strict';

  var selectedYears = 1;
  var baseFee       = 0;

  var TIER_LABELS = {
    'temporary-basic': 'Basic Registration',
    'basic':           'State License (Basic)',
    'state':           'State License',
    'central':         'Central License'
  };

  var DOC_NAMES = {
    selfie:          'Photo of Applicant',
    idProof:         'Identity Proof',
    addressProof:    'Address Proof',
    form9:           'Form IX',
    blueprint:       'Premises Blueprint',
    nocFireDept:     'NOC from Fire Department',
    waterTestReport: 'Water Analysis Report'
  };

  function formatINR(n) {
    if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr';
    if (n >= 100000)   return '₹' + (n / 100000).toFixed(2) + ' L';
    return '₹' + n.toLocaleString('en-IN');
  }

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val || '—';
  }

  function populateReview(d) {
    if (d.businessTypes && d.businessTypes.length) {
      setText('rv-businessTypes', d.businessTypes.map(humanise).join(', '));
    }

    if (d.foodTypes && d.foodTypes.length) {
      setText('rv-foodTypes', d.foodTypes.map(humanise).join(', '));
    }

    if (d.scale) {
      setText('rv-turnover', formatINR(d.scale.turnover || 0));
      setText('rv-tier', TIER_LABELS[d.scale.tier] || d.scale.tier);
      setText('rv-panIndia', d.scale.panIndia ? 'Yes' : 'No');
      baseFee = d.scale.fee || 0;
    }

    if (d.details) {
      setText('rv-bizName',  d.details.bizName);
      setText('rv-ownerName', d.details.ownerName);
      setText('rv-bizPhone', d.details.bizPhone ? '+91 ' + d.details.bizPhone : '—');
      var addr = d.details.addrLine1 || '';
      setText('rv-address', addr || '—');
      setText('rv-location', [d.details.addrDistrict, d.details.addrState].filter(Boolean).join(', ') || '—');
      setText('rv-pincode', d.details.addrPincode || '—');

      selectedYears = parseInt(d.details.licenseDuration) || 1;
    }

    var totalFee = baseFee * selectedYears;
    setText('rv-duration', selectedYears === 1 ? '1 Year' : selectedYears + ' Years');
    setText('rv-totalFee', '₹' + totalFee.toLocaleString('en-IN'));

    if (d.documents) {
      var uploaded = Object.keys(d.documents)
        .filter(function (k) { return d.documents[k]; })
        .map(function (k) { return DOC_NAMES[k] || k; });
      setText('rv-documents', uploaded.length ? uploaded.join(', ') : 'None uploaded');
    }
  }

  function humanise(slug) {
    return slug.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function saveAndPay() {
    var user = firebase.auth().currentUser;
    if (!user) { window.location.href = '/'; return; }

    var btn = document.getElementById('reviewPayBtn');
    btn.disabled    = true;
    btn.textContent = 'Saving…';

    var totalFee = baseFee * selectedYears;

    firebase.firestore().collection('users').doc(user.uid).set({
      review: {
        years:       selectedYears,
        totalFee:    totalFee,
        submittedAt: firebase.firestore.FieldValue.serverTimestamp()
      },
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true })
    .then(function () {
      window.location.href = '/payment';
    })
    .catch(function (e) {
      console.error('[FOSCOS] review save:', e);
      document.getElementById('reviewError').textContent = 'Could not save. Please try again.';
      btn.disabled    = false;
      btn.textContent = 'Proceed to Payment →';
    });
  }

  document.addEventListener('firebase-ready', function () {
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) { window.location.href = '/'; return; }
      firebase.firestore().collection('users').doc(user.uid).get().then(function (doc) {
        populateReview(doc.exists ? doc.data() : {});
      });
    });
  });

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('reviewPayBtn');
    if (btn) btn.addEventListener('click', saveAndPay);
  });

})();
