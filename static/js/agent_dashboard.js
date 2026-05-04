/* ============================================================
   AGENT_DASHBOARD.JS — Agent client list
   ============================================================ */
(function () {
  'use strict';

  var CLIENTS = [
    {
      id: 'annapurna',
      name: 'Annapurna Catering',
      emoji: '🍽️', emojiColor: '#dcfce7',
      license: 'State License', state: 'Shillong',
      status: 'active', statusText: 'Active — expires in 127 days',
      daysLeft: 127
    },
    {
      id: 'rani',
      name: 'Rani Sweets & Confectionery',
      emoji: '🍬', emojiColor: '#fef3c7',
      license: 'Basic Registration', state: 'Tura',
      status: 'pending', statusText: 'Pending — application in progress',
      daysLeft: null
    },
    {
      id: 'kumar',
      name: 'Kumar Tiffin Centre',
      emoji: '🍱', emojiColor: '#fee2e2',
      license: 'State License', state: 'Meghalaya',
      status: 'renew', statusText: 'Renew Soon — expires in 23 days',
      daysLeft: 23
    }
  ];

  var BADGE_STATUS = {
    active: 'Active', pending: 'Pending', renew: 'Renew Soon'
  };

  function renderClients() {
    var wrap = document.getElementById('agentClientList');
    if (!wrap) return;
    wrap.innerHTML = '';

    CLIENTS.forEach(function (c) {
      var card = document.createElement('div');
      card.className = 'agent-client-card';
      card.innerHTML =
        '<div class="agent-client-card__emoji" style="background:' + c.emojiColor + ';">' + c.emoji + '</div>' +
        '<div class="agent-client-card__info">' +
          '<div class="agent-client-card__name">' + c.name + '</div>' +
          '<div class="agent-client-card__meta">' + c.license + ' · ' + c.state + '</div>' +
          '<span class="agent-badge agent-badge--' + c.status + '">' + c.statusText + '</span>' +
        '</div>' +
        '<button class="agent-manage-btn">Manage →</button>';

      card.querySelector('.agent-manage-btn').addEventListener('click', function () {
        sessionStorage.setItem('agentClientData', JSON.stringify(c));
        window.location.href = '/agent/client';
      });

      wrap.appendChild(card);
    });
  }

  document.addEventListener('firebase-ready', function () {
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) { window.location.href = '/agent'; return; }
      renderClients();
    });
  });

})();
