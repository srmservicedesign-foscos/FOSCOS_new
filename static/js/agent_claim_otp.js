/* ============================================================
   AGENT_CLAIM_OTP.JS — Client consent OTP verification
   ============================================================ */
(function () {
  'use strict';

  var resendInterval = null;

  function $$(id) { return document.getElementById(id); }
  function setErr(msg) { var el = $$('claimOtpError'); if (el) el.textContent = msg; }

  function setupOtpInputs() {
    var digits = document.querySelectorAll('.claim-otp-digit');
    digits.forEach(function (input, i) {
      input.addEventListener('input', function (e) {
        var val = e.target.value.replace(/\D/g, '');
        if (val.length > 1) {
          var code = val.slice(0, 6);
          digits.forEach(function (d, j) { d.value = code[j] || ''; });
          var next = digits[Math.min(code.length, digits.length - 1)];
          if (next) next.focus();
        } else {
          e.target.value = val;
          if (val && i < digits.length - 1) digits[i + 1].focus();
        }
        var otp = Array.from(digits).map(function (d) { return d.value; }).join('');
        if (otp.length === 6) handleVerify();
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !e.target.value && i > 0) digits[i - 1].focus();
      });
    });
  }

  function handleVerify() {
    var digits = document.querySelectorAll('.claim-otp-digit');
    var otp = Array.from(digits).map(function (d) { return d.value; }).join('');
    if (otp.length < 6) { setErr('Enter all 6 digits.'); return; }
    setErr('');

    var phone = sessionStorage.getItem('claimClientPhone') || '';
    var msg = $$('claimSuccessMsg');
    if (msg && phone) {
      msg.textContent = 'Client (+91 ' + phone + ') has been added to your portfolio. You can now manage their applications.';
    }

    $$('claimOtpState').style.display    = 'none';
    $$('claimSuccessState').style.display = '';
  }

  function startResendTimer() {
    var secs = 30;
    var rb = $$('claimResendBtn'), rt = $$('claimResendTimer');
    if (rb) rb.style.display = 'none';
    if (rt) { rt.textContent = 'Resend in ' + secs + 's'; rt.style.display = 'inline'; }
    clearInterval(resendInterval);
    resendInterval = setInterval(function () {
      secs--;
      if (secs <= 0) {
        clearInterval(resendInterval);
        if (rt) rt.style.display = 'none';
        if (rb) rb.style.display = 'inline';
      } else {
        if (rt) rt.textContent = 'Resend in ' + secs + 's';
      }
    }, 1000);
  }

  document.addEventListener('firebase-ready', function () {
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) { window.location.href = '/agent'; return; }

      var phone = sessionStorage.getItem('claimClientPhone') || '';
      var badge = $$('claimClientPhone');
      if (badge && phone) badge.textContent = '+91 ' + phone;

      setupOtpInputs();
      startResendTimer();

      var first = document.querySelector('.claim-otp-digit');
      if (first) first.focus();

      var btn = $$('claimVerifyBtn');
      if (btn) btn.addEventListener('click', handleVerify);

      var rb = $$('claimResendBtn');
      if (rb) rb.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelectorAll('.claim-otp-digit').forEach(function (d) { d.value = ''; });
        var first = document.querySelector('.claim-otp-digit');
        if (first) first.focus();
        startResendTimer();
      });
    });
  });

})();
