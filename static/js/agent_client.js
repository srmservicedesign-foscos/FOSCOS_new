/* ============================================================
   AGENT_CLIENT.JS — Agent client view
   ============================================================ */
(function () {
  'use strict';

  function $$(id) { return document.getElementById(id); }
  function setText(id, val) { var el = $$(id); if (el) el.textContent = val || '—'; }

  function showToast(msg) {
    var toast = $$('agentToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 2800);
  }

  function comingSoon() { showToast('🚧 Coming soon'); }

  function populatePage(c) {
    setText('clientBannerName', c.name);
    setText('clientLicBiz', c.name);
    setText('clientLicType', c.license);
    setText('clientCategory', c.license);

    if (c.status === 'active') {
      setText('clientStatus', 'Active');
      setText('clientDaysLeft', c.daysLeft ? c.daysLeft + ' days' : '—');
    } else if (c.status === 'pending') {
      setText('clientStatus', 'Pending');
      setText('clientDaysLeft', '—');
    } else if (c.status === 'renew') {
      setText('clientStatus', 'Renew Soon');
      setText('clientDaysLeft', c.daysLeft ? c.daysLeft + ' days' : '—');
    }

    var note = $$('clientNote');
    if (note) {
      if (c.daysLeft && c.daysLeft <= 30) {
        note.textContent = '⚠️ License expires in ' + c.daysLeft + ' days. Initiate renewal at least 30 days before expiry to avoid gaps.';
      } else if (c.daysLeft) {
        note.textContent = '📋 License expires in ' + c.daysLeft + ' days. Initiate renewal at least 30 days before expiry to avoid gaps.';
      } else if (c.status === 'pending') {
        note.textContent = '⏳ Application is currently under review. No action required.';
      }
    }
  }

  document.addEventListener('firebase-ready', function () {
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) { window.location.href = '/agent'; return; }

      var raw = sessionStorage.getItem('agentClientData');
      if (!raw) { window.location.href = '/agent/dashboard'; return; }

      var client = JSON.parse(raw);
      populatePage(client);

      var renewBtn  = $$('renewBtn');
      var annualBtn = $$('annualBtn');
      var modifyBtn = $$('modifyBtn');

      if (renewBtn)  renewBtn.addEventListener('click', comingSoon);
      if (annualBtn) annualBtn.addEventListener('click', comingSoon);
      if (modifyBtn) modifyBtn.addEventListener('click', comingSoon);
    });
  });

})();
