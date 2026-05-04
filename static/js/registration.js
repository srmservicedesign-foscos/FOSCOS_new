/* ============================================================
   REGISTRATION.JS — About Business (P06) · Food Type (P07)
   ============================================================ */
(function () {
  'use strict';

  // ── Card selection via native checkboxes ──────────────────────
  function setupCardSelection(gridId) {
    var grid = document.getElementById(gridId);
    if (!grid) return;

    grid.querySelectorAll('.reg-card__input').forEach(function (input) {
      input.addEventListener('change', function () {
        var card = input.parentElement;
        if (input.checked) {
          card.classList.add('selected');
        } else {
          card.classList.remove('selected');
        }
      });
    });
  }

  function getSelectedValues(gridId) {
    var grid = document.getElementById(gridId);
    if (!grid) return [];
    return Array.from(grid.querySelectorAll('.reg-card__input:checked'))
      .map(function (i) { return i.value; });
  }

  function prefillGrid(gridId, savedValues) {
    if (!savedValues || !savedValues.length) return;
    var grid = document.getElementById(gridId);
    if (!grid) return;
    grid.querySelectorAll('.reg-card__input').forEach(function (input) {
      if (savedValues.indexOf(input.value) !== -1) {
        input.checked = true;
        input.parentElement.classList.add('selected');
      }
    });
  }

  // ── Firestore save ────────────────────────────────────────────
  function saveToFirestore(data, onSuccess, onError) {
    var user = firebase.auth().currentUser;
    if (!user) { onError(new Error('Not authenticated')); return; }
    firebase.firestore()
      .collection('users')
      .doc(user.uid)
      .set(data, { merge: true })
      .then(onSuccess)
      .catch(onError);
  }

  // ── Page: /about-business (P06) ───────────────────────────────
  function initAboutBusiness() {
    setupCardSelection('businessTypeGrid');

    var btn = document.getElementById('businessTypeContinueBtn');
    var err = document.getElementById('businessTypeError');
    if (!btn) return;

    btn.addEventListener('click', function () {
      var selected = getSelectedValues('businessTypeGrid');
      if (selected.length === 0) {
        if (err) err.textContent = 'Please select at least one type of business to continue.';
        return;
      }
      if (err) err.textContent = '';
      btn.disabled = true;
      btn.textContent = 'Saving...';

      var user = firebase.auth().currentUser;
      saveToFirestore({
        uid:           user.uid,
        phone:         user.phoneNumber || '',
        displayName:   user.displayName || '',
        businessTypes: selected,
        updatedAt:     firebase.firestore.FieldValue.serverTimestamp(),
      }, function () {
        var params = new URLSearchParams(window.location.search);
        window.location.href = params.get('from') === 'review' ? '/review' : '/food-type';
      }, function (e) {
        console.error('[FOSCOS] Firestore save businessTypes:', e);
        if (err) err.textContent = 'Could not save. Please try again.';
        btn.disabled = false;
        btn.textContent = 'Sounds good, continue';
      });
    });
  }

  // ── Page: /food-type (P07) ────────────────────────────────────
  function initFoodType() {
    setupCardSelection('foodTypeGrid');

    var btn = document.getElementById('foodTypeContinueBtn');
    var err = document.getElementById('foodTypeError');
    if (!btn) return;

    btn.addEventListener('click', function () {
      var selected = getSelectedValues('foodTypeGrid');
      if (selected.length === 0) {
        if (err) err.textContent = 'Please select at least one food type to continue.';
        return;
      }
      if (err) err.textContent = '';
      btn.disabled = true;
      btn.textContent = 'Saving...';

      saveToFirestore({
        foodTypes: selected,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, function () {
        var params = new URLSearchParams(window.location.search);
        window.location.href = params.get('from') === 'review' ? '/review' : '/scale';
      }, function (e) {
        console.error('[FOSCOS] Firestore save foodTypes:', e);
        if (err) err.textContent = 'Could not save. Please try again.';
        btn.disabled = false;
        btn.textContent = 'That is my menu, continue';
      });
    });
  }

  // ── Auth guard + prefill ──────────────────────────────────────
  document.addEventListener('firebase-ready', function () {
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) { window.location.href = '/'; return; }

      firebase.firestore().collection('users').doc(user.uid).get().then(function (doc) {
        if (!doc.exists) return;
        var d = doc.data();
        if (d.businessTypes) prefillGrid('businessTypeGrid', d.businessTypes);
        if (d.foodTypes)     prefillGrid('foodTypeGrid',     d.foodTypes);
      });
    });
  });

  // ── Init ─────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('businessTypeGrid')) initAboutBusiness();
    if (document.getElementById('foodTypeGrid'))     initFoodType();
  });

})();
