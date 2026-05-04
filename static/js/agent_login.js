/* ============================================================
   AGENT_LOGIN.JS — Agent phone OTP entry
   ============================================================ */
(function () {
  'use strict';

  var recaptchaVerifier = null;

  function $$(id) { return document.getElementById(id); }
  function setErr(msg) { var el = $$('agentLoginError'); if (el) el.textContent = msg; }
  function setLoading(loading) {
    var btn = $$('agentSendOtpBtn');
    if (btn) { btn.disabled = loading; btn.textContent = loading ? 'Sending…' : 'Send OTP →'; }
  }

  function handleSendOtp() {
    var phone = ($$('agentPhone').value || '').trim().replace(/\D/g, '');
    if (phone.length !== 10) { setErr('Enter a valid 10-digit mobile number.'); return; }
    setErr('');
    setLoading(true);

    try {
      if (recaptchaVerifier) { try { recaptchaVerifier.clear(); } catch (_) {} }
      recaptchaVerifier = new firebase.auth.RecaptchaVerifier('agentRecaptcha', { size: 'invisible' });
    } catch (e) {
      setLoading(false); setErr('reCAPTCHA error. Refresh and try again.'); return;
    }

    firebase.auth().signInWithPhoneNumber('+91' + phone, recaptchaVerifier)
      .then(function (result) {
        sessionStorage.setItem('agentVerificationId', result.verificationId);
        sessionStorage.setItem('agentPhone', phone);
        window.location.href = '/agent/verify';
      })
      .catch(function (err) {
        setLoading(false);
        setErr(err.message || 'Failed to send OTP. Try again.');
        if (recaptchaVerifier) { try { recaptchaVerifier.clear(); } catch (_) {} recaptchaVerifier = null; }
      });
  }

  document.addEventListener('firebase-ready', function () {
    var btn = $$('agentSendOtpBtn');
    if (btn) btn.addEventListener('click', handleSendOtp);

    var input = $$('agentPhone');
    if (input) input.addEventListener('keydown', function (e) { if (e.key === 'Enter') handleSendOtp(); });

    firebase.auth().onAuthStateChanged(function (user) {
      if (user) { window.location.href = '/agent/dashboard'; }
    });
  });

})();
