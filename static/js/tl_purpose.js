/* ============================================================
   TL_PURPOSE.JS — P16 Purpose selection (stall vs business)
   ============================================================ */
(function () {
  'use strict';

  var selectedPurpose = '';
  var selectedDays    = 0;

  function $$(id) { return document.getElementById(id); }

  function setupCards() {
    document.querySelectorAll('.tl-purpose-card').forEach(function (card) {
      card.addEventListener('click', function () {
        document.querySelectorAll('.tl-purpose-card').forEach(function (c) {
          c.classList.remove('selected');
        });
        card.classList.add('selected');
        selectedPurpose = card.dataset.purpose;
        selectedDays    = parseInt(card.dataset.days) || 60;
        var btn = $$('purposeContinue');
        if (btn) btn.disabled = false;
      });
    });
  }

  function handleContinue() {
    if (!selectedPurpose) return;

    sessionStorage.setItem('tlPurpose', selectedPurpose);
    sessionStorage.setItem('tlDays',    String(selectedDays));

    var user = firebase.auth().currentUser;
    if (user) {
      var update = {};
      update['tempLicense.purpose'] = selectedPurpose;
      update['tempLicense.days']    = selectedDays;
      firebase.firestore().collection('users').doc(user.uid)
        .update(update)
        .catch(function () {
          firebase.firestore().collection('users').doc(user.uid)
            .set({ tempLicense: { purpose: selectedPurpose, days: selectedDays } }, { merge: true });
        });
    }

    window.location.href = '/temp-license/details';
  }

  document.addEventListener('DOMContentLoaded', function () {
    setupCards();
    var btn = $$('purposeContinue');
    if (btn) btn.addEventListener('click', handleContinue);
  });

  document.addEventListener('firebase-ready', function () {
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) {
        sessionStorage.setItem('tlLastPage', window.location.pathname);
        sessionStorage.setItem('tlFlow', '1');
        window.location.href = '/signup';
      }
    });
  });

})();
