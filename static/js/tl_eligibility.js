/* ============================================================
   TL_ELIGIBILITY.JS — P14 Eligibility check + verdict modal
   ============================================================ */
(function () {
  'use strict';

  var RESTRICTED = ['meat', 'dairy'];
  var selectedSetup = '';
  var selectedFoods = [];
  var annualTurnover = 0;

  function $$(id) { return document.getElementById(id); }

  function formatINR(n) {
    if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr';
    if (n >= 100000)   return '₹' + (n / 100000).toFixed(2) + ' Lakh';
    return '₹' + n.toLocaleString('en-IN');
  }

  // ── Q1: Setup cards ─────────────────────────────────────────
  function setupSetupCards() {
    document.querySelectorAll('.tl-setup-card').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.tl-setup-card').forEach(function (b) {
          b.classList.remove('selected');
        });
        btn.classList.add('selected');
        selectedSetup = btn.dataset.type;
        var otherWrap = $$('tlOtherWrap');
        if (otherWrap) otherWrap.style.display = (selectedSetup === 'other') ? '' : 'none';
      });
    });
  }

  // ── Q2: Turnover calculator ──────────────────────────────────
  function setupCalc() {
    var revEl  = $$('tlDailyRevenue');
    var daysEl = $$('tlDaysPerWeek');

    function recalc() {
      var rev  = parseFloat(revEl ? revEl.value : 0)  || 0;
      var days = parseFloat(daysEl ? daysEl.value : 0) || 0;
      var result = $$('tlCalcResult');

      if (!rev || !days) {
        annualTurnover = 0;
        if (result) result.style.display = 'none';
        return;
      }

      annualTurnover = rev * days * 52;
      if (!result) return;

      result.style.display = '';
      $$('tlCalcVal').textContent = formatINR(annualTurnover);

      result.classList.remove('tl-calc__result--eligible', 'tl-calc__result--ineligible');
      if (annualTurnover < 1000000) {
        result.classList.add('tl-calc__result--eligible');
        $$('tlCalcNote').textContent = '✅ Eligible for Temporary License (under ₹10 Lakh/year)';
      } else {
        result.classList.add('tl-calc__result--ineligible');
        $$('tlCalcNote').textContent = '⚠️ Exceeds ₹10 Lakh — may require a Permanent License';
      }
    }

    if (revEl)  revEl.addEventListener('input', recalc);
    if (daysEl) daysEl.addEventListener('input', recalc);
  }

  // ── Q3: Food chips ───────────────────────────────────────────
  function setupFoodChips() {
    document.querySelectorAll('.tl-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        chip.classList.toggle('selected');
        var food = chip.dataset.food;
        var idx  = selectedFoods.indexOf(food);
        if (idx === -1) selectedFoods.push(food);
        else selectedFoods.splice(idx, 1);
      });
    });
  }

  // ── Eligibility logic ────────────────────────────────────────
  function checkEligibility() {
    if (!selectedSetup) {
      alert('Please select your type of setup (Question 1).');
      return;
    }
    if (!selectedFoods.length) {
      alert('Please select at least one food item (Question 3).');
      return;
    }
    if (!annualTurnover) {
      alert('Please enter your daily revenue and operating days (Question 2).');
      return;
    }

    var hasRestricted = selectedFoods.some(function (f) {
      return RESTRICTED.indexOf(f) !== -1;
    });

    if (annualTurnover >= 1000000) {
      showIneligible('Your estimated turnover of ' + formatINR(annualTurnover) + '/year exceeds ₹10 Lakh. You need a State or Central FSSAI License.');
      return;
    }
    if (hasRestricted) {
      showIneligible('Selling raw meat or unpasteurised dairy requires a higher-category license. Please apply for a Permanent License instead.');
      return;
    }

    var setupToSave = selectedSetup;
    if (selectedSetup === 'other') {
      var otherVal = $$('tlOtherType') ? $$('tlOtherType').value.trim() : '';
      if (!otherVal) { alert('Please describe your setup type in the text box.'); return; }
      setupToSave = otherVal;
    }

    sessionStorage.setItem('tlSetup',  setupToSave);
    sessionStorage.setItem('tlFoods',  JSON.stringify(selectedFoods));
    sessionStorage.setItem('tlAnnual', String(annualTurnover));

    $$('tlEligibleModal').style.display = 'flex';
  }

  function showIneligible(msg) {
    $$('tlIneligibleMsg').textContent = msg;
    $$('tlIneligibleModal').style.display = 'flex';
  }

  // ── Continue: check auth then proceed ───────────────────────
  function handleContinue() {
    var user = firebase.auth().currentUser;
    if (user) {
      window.location.href = '/temp-license/purpose';
    } else {
      sessionStorage.setItem('tlFlow', '1');
      window.location.href = '/signup';
    }
  }

  // ── Init ─────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    setupSetupCards();
    setupCalc();
    setupFoodChips();

    var checkBtn = $$('tlCheckBtn');
    if (checkBtn) checkBtn.addEventListener('click', checkEligibility);

    var contBtn = $$('tlEligibleContinue');
    if (contBtn) contBtn.addEventListener('click', handleContinue);

    var backBtn = $$('tlIneligibleBack');
    if (backBtn) backBtn.addEventListener('click', function () {
      $$('tlIneligibleModal').style.display = 'none';
    });
  });

  document.addEventListener('firebase-ready', function () {
    firebase.auth().onAuthStateChanged(function (user) {
      if (user && sessionStorage.getItem('tlFlow') === '1') {
        sessionStorage.removeItem('tlFlow');
        window.location.href = '/temp-license/purpose';
      }
    });
  });

})();
