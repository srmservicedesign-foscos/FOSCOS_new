/* ============================================================
   AGENT_ADD_CLIENT.JS — Add new client (existing or new)
   ============================================================ */
(function () {
  'use strict';

  function $$(id) { return document.getElementById(id); }
  function setErr(id, msg) { var el = $$(id); if (el) el.textContent = msg; }

  window.selectPath = function (path) {
    var existing = $$('pathExisting');
    var newCard  = $$('pathNew');
    var formEx   = $$('formExisting');
    var formNew  = $$('formNew');

    if (existing) existing.classList.toggle('selected', path === 'existing');
    if (newCard)  newCard.classList.toggle('selected',  path === 'new');
    if (formEx)   formEx.classList.toggle('active',     path === 'existing');
    if (formNew)  formNew.classList.toggle('active',    path === 'new');
  };

  function handleSendClientOtp() {
    var phone = ($$('existingPhone').value || '').trim().replace(/\D/g, '');
    if (phone.length !== 10) { setErr('existingError', 'Enter a valid 10-digit mobile number.'); return; }
    setErr('existingError', '');
    sessionStorage.setItem('claimClientPhone', phone);
    window.location.href = '/agent/claim-otp';
  }

  function handleCreateClient() {
    var name    = ($$('newClientName').value || '').trim();
    var bizName = ($$('newBizName').value    || '').trim();
    if (!name)    { setErr('newClientError', 'Please enter the client name.'); return; }
    if (!bizName) { setErr('newClientError', 'Please enter the business name.'); return; }
    setErr('newClientError', '');

    sessionStorage.setItem('agentNewClientName',    name);
    sessionStorage.setItem('agentNewClientBizName', bizName);

    window.location.href = '/about-business';
  }

  document.addEventListener('firebase-ready', function () {
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) { window.location.href = '/agent'; return; }

      var sendBtn   = $$('sendClientOtpBtn');
      var createBtn = $$('createClientBtn');

      if (sendBtn)   sendBtn.addEventListener('click', handleSendClientOtp);
      if (createBtn) createBtn.addEventListener('click', handleCreateClient);
    });
  });

})();
