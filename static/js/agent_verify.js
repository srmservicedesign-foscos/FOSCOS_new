/* ============================================================
   AGENT_VERIFY.JS — Agent OTP confirmation
   ============================================================ */
(function () {
  'use strict';

  var resendInterval = null;

  function $$(id) { return document.getElementById(id); }
  function setErr(msg) { var el = $$('agentOtpError'); if (el) el.textContent = msg; }
  function setLoading(loading) {
    var btn = $$('agentVerifyBtn');
    if (btn) { btn.disabled = loading; btn.textContent = loading ? 'Verifying…' : 'Verify & Enter Portal →'; }
  }

  function setupOtpInputs() {
    var digits = document.querySelectorAll('.agent-otp-digit');
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
    var digits = document.querySelectorAll('.agent-otp-digit');
    var otp = Array.from(digits).map(function (d) { return d.value; }).join('');
    if (otp.length !== 6) return;

    var verificationId = sessionStorage.getItem('agentVerificationId');
    if (!verificationId) { setErr('Session expired. Please go back and try again.'); return; }

    setErr('');
    setLoading(true);

    var credential = firebase.auth.PhoneAuthProvider.credential(verificationId, otp);
    firebase.auth().signInWithCredential(credential)
      .then(function () {
        sessionStorage.removeItem('agentVerificationId');
        window.location.href = '/agent/dashboard';
      })
      .catch(function () {
        setErr('Incorrect OTP. Please try again.');
        digits.forEach(function (d) { d.value = ''; });
        if (digits[0]) digits[0].focus();
        setLoading(false);
      });
  }

  function startResendTimer() {
    var secs = 30;
    var rb = $$('agentResendBtn'), rt = $$('agentResendTimer');
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
    var phone = sessionStorage.getItem('agentPhone') || '';
    var disp = $$('agentOtpPhone');
    if (disp && phone) disp.textContent = 'XXXXX' + phone.slice(5);

    if (!sessionStorage.getItem('agentVerificationId')) {
      window.location.href = '/agent'; return;
    }

    setupOtpInputs();
    startResendTimer();

    var first = document.querySelector('.agent-otp-digit');
    if (first) first.focus();

    var btn = $$('agentVerifyBtn');
    if (btn) btn.addEventListener('click', handleVerify);

    var rb = $$('agentResendBtn');
    if (rb) rb.addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelectorAll('.agent-otp-digit').forEach(function (d) { d.value = ''; });
      var firstDigit = document.querySelector('.agent-otp-digit');
      if (firstDigit) firstDigit.focus();
      startResendTimer();
    });
  });

})();
