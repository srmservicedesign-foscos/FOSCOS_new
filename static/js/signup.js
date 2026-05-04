/* ============================================================
   SIGNUP.JS — /signup page (P04): phone entry → store verificationId → navigate
   ============================================================ */
(function () {
  'use strict';

  var recaptchaVerifier = null;

  function $$(id) { return document.getElementById(id); }

  function setError(msg) {
    var el = $$('signupPhoneError'); if (el) el.textContent = msg;
  }

  function setLoading(loading) {
    var btn = $$('signupSendOtpBtn'); if (!btn) return;
    btn.disabled    = loading;
    btn.textContent = loading ? 'Sending…' : 'Send OTP →';
  }

  function initRecaptcha() {
    if (recaptchaVerifier) {
      try { recaptchaVerifier.clear(); } catch (_) {}
      recaptchaVerifier = null;
    }
    recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
      'signup-recaptcha-container', { size: 'invisible' }
    );
  }

  function handleSendOtp() {
    var pi = $$('signupPhoneInput');
    var phone = pi ? pi.value.trim().replace(/\D/g, '') : '';
    setError('');

    if (phone.length !== 10) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);

    try { initRecaptcha(); } catch (e) {
      setLoading(false);
      setError('reCAPTCHA error. Please refresh and try again.');
      return;
    }

    firebase.auth().signInWithPhoneNumber('+91' + phone, recaptchaVerifier)
      .then(function (result) {
        sessionStorage.setItem('signup_verification_id', result.verificationId);
        sessionStorage.setItem('signup_phone', phone);
        window.location.href = '/signup/verify';
      })
      .catch(function (err) {
        console.error('[FOSCOS] signup sendOtp:', err);
        setError(err.message || 'Failed to send OTP. Try again.');
        if (recaptchaVerifier) { try { recaptchaVerifier.clear(); } catch (_) {} recaptchaVerifier = null; }
        setLoading(false);
      });
  }

  // Redirect already-logged-in users away from signup
  document.addEventListener('firebase-ready', function () {
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) return;
      if (sessionStorage.getItem('tlFlow') === '1') {
        sessionStorage.removeItem('tlFlow');
        var lastPage = sessionStorage.getItem('tlLastPage') || '/temp-license/purpose';
        sessionStorage.removeItem('tlLastPage');
        window.location.href = lastPage;
      } else {
        window.location.href = '/fbo-portal';
      }
    });
  });

  document.addEventListener('DOMContentLoaded', function () {
    var btn = $$('signupSendOtpBtn');
    if (btn) btn.addEventListener('click', handleSendOtp);

    var pi = $$('signupPhoneInput');
    if (pi) pi.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') handleSendOtp();
    });

    var strip = $$('tlInfoStrip');
    if (strip) {
      strip.addEventListener('click', function () {
        sessionStorage.setItem('tlFlow', '1');
        strip.classList.add('signup-info-strip--selected');
        var msg = $$('tlInfoStripMsg');
        if (msg) msg.textContent = '✓ After sign-in you\'ll be directed to Instant License';
      });
    }
  });

})();
