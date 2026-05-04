/* ============================================================
   TL_DETAILS.JS — P17 Personal + establishment details
   ============================================================ */
(function () {
  'use strict';

  var selectedEstab = '';
  var photo1Data    = null;
  var photo2Data    = null;

  function $$(id) { return document.getElementById(id); }
  function val(id) { var el = $$(id); return el ? el.value.trim() : ''; }
  function setErr(msg) { var el = $$('tlDetailsError'); if (el) el.textContent = msg; }

  var SETUP_MAP = { cart: 'cart', stall: 'stall', home: 'home', tiffin: 'tiffin', juice: 'other', other: 'other' };

  function setupPhotoUpload(inputId, thumbId, isFirst) {
    var area  = document.getElementById(isFirst ? 'tlPhoto1Area' : 'tlPhoto2Area');
    var input = document.getElementById(inputId);
    if (!input) return;
    if (area) area.addEventListener('click', function (e) {
      if (e.target !== input) { e.preventDefault(); input.click(); }
    });
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;

      if (isFirst && typeof exifr !== 'undefined') {
        exifr.gps(file).then(function (pos) {
          if (pos && pos.latitude && pos.longitude) {
            var tag  = document.getElementById('tlGpsTag');
            var text = document.getElementById('tlGpsText');
            if (tag)  tag.style.display = '';
            if (text) text.textContent  = pos.latitude.toFixed(5) + ', ' + pos.longitude.toFixed(5);
          }
        }).catch(function () {});
      }

      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var MAX = 640, w = img.width, h = img.height;
          if (w > h && w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
          else if (h > MAX)     { w = Math.round(w * MAX / h); h = MAX; }
          var canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          var b64 = canvas.toDataURL('image/jpeg', 0.55);
          if (isFirst) { photo1Data = b64; } else { photo2Data = b64; }
          var thumb = document.getElementById(thumbId);
          if (thumb) { thumb.src = b64; thumb.style.display = ''; }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function setupEstabCards() {
    document.querySelectorAll('#tlEstabGrid .tl-setup-card').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#tlEstabGrid .tl-setup-card').forEach(function (b) {
          b.classList.remove('selected');
        });
        btn.classList.add('selected');
        selectedEstab = btn.dataset.estab;
      });
    });

    var prior = sessionStorage.getItem('tlSetup');
    if (prior) {
      var mapped = SETUP_MAP[prior] || 'other';
      var card = document.querySelector('#tlEstabGrid [data-estab="' + mapped + '"]');
      if (card) { card.classList.add('selected'); selectedEstab = mapped; }
    }
  }

  function prefillPhone(user) {
    var phoneEl = $$('tlPhone');
    if (!phoneEl || phoneEl.value) return;
    var raw = user.phoneNumber || '';
    var digits = raw.replace(/^\+91/, '').replace(/\D/g, '');
    if (digits) phoneEl.value = digits;
  }

  function prefillSaved() {
    var saved = JSON.parse(sessionStorage.getItem('tlDetails') || '{}');
    if (saved.name      && $$('tlName'))     $$('tlName').value     = saved.name;
    if (saved.bizName   && $$('tlBizName'))  $$('tlBizName').value  = saved.bizName;
    if (saved.email     && $$('tlEmail'))    $$('tlEmail').value    = saved.email;
    if (saved.state     && $$('tlState'))    $$('tlState').value    = saved.state;
    if (saved.district  && $$('tlDistrict')) $$('tlDistrict').value = saved.district;
    if (saved.pincode   && $$('tlPincode'))  $$('tlPincode').value  = saved.pincode;
  }

  function handleContinue() {
    setErr('');
    var name     = val('tlName');
    var bizName  = val('tlBizName');
    var phone    = val('tlPhone');
    var email    = val('tlEmail');
    var state    = val('tlState');
    var district = val('tlDistrict');
    var pincode  = val('tlPincode');

    if (!name)                               { setErr('Please enter your full name.'); return; }
    if (!bizName)                            { setErr('Please enter your business / stall name.'); return; }
    if (phone.length !== 10 || !/^\d{10}$/.test(phone)) {
      setErr('Please enter a valid 10-digit mobile number.'); return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr('Please enter a valid email address or leave it blank.'); return;
    }
    if (!state)                              { setErr('Please select your state / UT.'); return; }
    if (!district)                           { setErr('Please enter your district.'); return; }
    if (!/^\d{6}$/.test(pincode))            { setErr('Please enter a valid 6-digit pincode.'); return; }
    if (!selectedEstab)                      { setErr('Please select your kind of establishment.'); return; }

    var details = {
      name: name, bizName: bizName, phone: phone, email: email,
      state: state, district: district, pincode: pincode,
      area: district + ', ' + state,
      estType: selectedEstab
    };
    sessionStorage.setItem('tlDetails', JSON.stringify(details));

    var user = firebase.auth().currentUser;
    if (user) {
      var update = {};
      update['tempLicense.details'] = details;
      if (photo1Data) { update['tempLicense.photos.photo1'] = photo1Data; }
      if (photo2Data) { update['tempLicense.photos.photo2'] = photo2Data; }
      firebase.firestore().collection('users').doc(user.uid).set(update, { merge: true })
        .catch(function (e) { console.error(e); });
    }

    window.location.href = '/temp-license/docs';
  }

  document.addEventListener('DOMContentLoaded', function () {
    setupEstabCards();
    prefillSaved();
    setupPhotoUpload('tlPremisesPhoto1', 'tlPhoto1Thumb', true);
    setupPhotoUpload('tlPremisesPhoto2', 'tlPhoto2Thumb', false);
    var btn = $$('tlDetailsContinue');
    if (btn) btn.addEventListener('click', handleContinue);
  });

  document.addEventListener('firebase-ready', function () {
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) {
        sessionStorage.setItem('tlLastPage', window.location.pathname);
        sessionStorage.setItem('tlFlow', '1');
        window.location.href = '/signup';
        return;
      }
      prefillPhone(user);
    });
  });

})();
