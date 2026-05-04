/* ============================================================
   OFFICER_AUTH.JS — Login page + sidebar auth guard + sign-out
   ============================================================ */
(function () {
  'use strict';

  var isLoginPage = !!document.getElementById('officerLoginForm');

  // ── Login page ────────────────────────────────────────────────
  function initLoginPage() {
    var form     = document.getElementById('officerLoginForm');
    var emailEl  = document.getElementById('officerEmail');
    var passEl   = document.getElementById('officerPassword');
    var btn      = document.getElementById('officerLoginBtn');
    var errEl    = document.getElementById('officerLoginError');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = emailEl.value.trim();
      var pass  = passEl.value;
      if (!email || !pass) { errEl.textContent = 'Please enter your email and password.'; return; }

      errEl.textContent = '';
      btn.disabled = true;
      btn.textContent = 'Signing in...';

      firebase.auth().signInWithEmailAndPassword(email, pass)
        .then(function (cred) {
          var uid = cred.user.uid;
          return firebase.firestore().collection('officers').doc(uid).get()
            .then(function (doc) {
              if (doc.exists) return;
              // First-time setup: auto-create officer document
              return firebase.firestore().collection('officers').doc(uid).set({
                displayName: cred.user.displayName || cred.user.email.split('@')[0],
                email:       cred.user.email,
                role:        'officer',
                createdAt:   firebase.firestore.FieldValue.serverTimestamp()
              });
            });
        })
        .then(function () {
          window.location.href = '/officer/dashboard';
        })
        .catch(function (err) {
          console.error('[FOSCOS] officer login:', err);
          var msg = err.message || 'Login failed. Please try again.';
          if (msg.indexOf('auth/') !== -1) {
            msg = 'Invalid email or password.';
          }
          errEl.textContent = msg;
          btn.disabled = false;
          btn.textContent = 'Sign in →';
        });
    });
  }

  // ── Portal pages auth guard + sidebar ─────────────────────────
  function initPortalPage() {
    var nameEl   = document.getElementById('officerName');
    var avatarEl = document.getElementById('officerAvatar');
    var signout  = document.getElementById('officerSignOutBtn');

    if (signout) {
      signout.addEventListener('click', function () {
        firebase.auth().signOut().then(function () {
          window.location.href = '/officer/login';
        });
      });
    }

    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) {
        window.location.href = '/officer/login';
        return;
      }

      firebase.firestore().collection('officers').doc(user.uid).get().then(function (doc) {
        if (!doc.exists) {
          firebase.auth().signOut();
          window.location.href = '/officer/login';
          return;
        }

        var d        = doc.data();
        var name     = d.displayName || user.email || 'Officer';
        var initials = name.split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();

        if (nameEl)   nameEl.textContent   = name;
        if (avatarEl) avatarEl.textContent = initials;

        // Dispatch event so page JS can start loading data
        document.dispatchEvent(new CustomEvent('officer-ready', { detail: { user: user, officer: d } }));
      }).catch(function () {
        window.location.href = '/officer/login';
      });
    });
  }

  // ── Init ──────────────────────────────────────────────────────
  document.addEventListener('firebase-ready', function () {
    if (isLoginPage) {
      // If already signed in as an officer, go straight to dashboard
      firebase.auth().onAuthStateChanged(function (user) {
        if (!user) return;
        firebase.firestore().collection('officers').doc(user.uid).get().then(function (doc) {
          if (doc.exists) window.location.href = '/officer/dashboard';
        });
      });
      initLoginPage();
    } else {
      initPortalPage();
    }
  });

})();
