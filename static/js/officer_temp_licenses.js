/* ============================================================
   OFFICER_TEMP_LICENSES.JS — Temp license tracker + inspection scheduler
   ============================================================ */
(function () {
  'use strict';

  var allRecords = [];
  var activeRecord = null;

  /* ── Helpers ─────────────────────────────────────────────── */
  function $(id) { return document.getElementById(id); }
  function setText(id, val) { var el = $(id); if (el) el.textContent = val || '—'; }

  function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function daysLeft(expiresAt) {
    if (!expiresAt) return null;
    var diff = new Date(expiresAt).getTime() - Date.now();
    return Math.ceil(diff / (24 * 60 * 60 * 1000));
  }

  function deadlineBadge(days) {
    if (days === null) return '<span class="tl-deadline tl-deadline--expired">—</span>';
    if (days < 0)  return '<span class="tl-deadline tl-deadline--expired">Expired</span>';
    if (days <= 7) return '<span class="tl-deadline tl-deadline--critical">' + days + ' days</span>';
    if (days <= 14) return '<span class="tl-deadline tl-deadline--warn">' + days + ' days</span>';
    return '<span class="tl-deadline tl-deadline--ok">' + days + ' days</span>';
  }

  function complianceDots(rec) {
    function dot(done, label) {
      var cls = done ? 'compliance-dot--done' : 'compliance-dot--todo';
      return '<span class="compliance-dot ' + cls + '" title="' + label + '">' + (done ? '✓' : '·') + '</span>';
    }
    return '<div class="compliance-dots">' +
      dot(rec.waterTestDone,  'Water Report') +
      dot(rec.fostacEnrolled, 'FoSTaC') +
      dot(rec.inspectionDone, 'Inspection') +
    '</div>';
  }

  function inspBadge(rec) {
    if (rec.inspectionDone) return '<span style="font-size:12px;color:#16a34a;font-weight:600;">✓ Done</span>';
    if (rec.inspectionScheduledDate) return '<span style="font-size:12px;color:#7c3aed;font-weight:600;">📅 ' + fmtDate(rec.inspectionScheduledDate) + '</span>';
    return '<span style="font-size:12px;color:#94a3b8;">Not scheduled</span>';
  }

  /* ── Render table ────────────────────────────────────────── */
  function renderTable(records) {
    var tbody = $('tlTableBody');
    if (!tbody) return;
    if (!records.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="officer-table__empty">No temp licenses found.</td></tr>';
      setText('tlCount', '0 records');
      return;
    }
    tbody.innerHTML = records.map(function (r) {
      var days = daysLeft(r.expiresAt);
      var name = (r.details && r.details.name) || r.userId || '—';
      var phone = r.phone || (r.details && r.details.mobile) || '—';
      var purpose = r.purpose === 'business' ? 'Business Setup' : 'Stall / Event';
      return '<tr>' +
        '<td style="font-weight:600;font-size:13px;">' + (r.licenseNo || '—') + '</td>' +
        '<td><div style="font-weight:600;font-size:13px;">' + name + '</div><div style="font-size:12px;color:#94a3b8;">' + phone + '</div></td>' +
        '<td style="font-size:13px;">' + purpose + '</td>' +
        '<td style="font-size:13px;">' + fmtDate(r.issuedAt) + '</td>' +
        '<td>' + deadlineBadge(days) + '</td>' +
        '<td>' + complianceDots(r) + '</td>' +
        '<td>' + inspBadge(r) + '</td>' +
        '<td><a class="officer-table-link" href="#" onclick="openDetail(\'' + r.licenseNo + '\');return false;">View →</a></td>' +
      '</tr>';
    }).join('');
    setText('tlCount', records.length + ' record' + (records.length !== 1 ? 's' : ''));
  }

  /* ── Stats ───────────────────────────────────────────────── */
  function updateStats(records) {
    var total    = records.length;
    var active   = records.filter(function (r) { return daysLeft(r.expiresAt) >= 0; }).length;
    var expiring = records.filter(function (r) { var d = daysLeft(r.expiresAt); return d >= 0 && d <= 14; }).length;
    var expired  = records.filter(function (r) { var d = daysLeft(r.expiresAt); return d !== null && d < 0; }).length;
    setText('tlStatTotal',    String(total));
    setText('tlStatActive',   String(active));
    setText('tlStatExpiring', String(expiring));
    setText('tlStatExpired',  String(expired));

    var badge = $('sidebarTlBadge');
    if (badge && expiring > 0) { badge.textContent = String(expiring); badge.style.display = ''; }
  }

  /* ── Filtering ───────────────────────────────────────────── */
  function applyFilters() {
    var q     = ($('tlSearch').value || '').toLowerCase();
    var status = $('tlFilterStatus').value;
    var comp   = $('tlFilterCompliance').value;

    var filtered = allRecords.filter(function (r) {
      if (q) {
        var haystack = ((r.licenseNo || '') + ' ' + ((r.details && r.details.name) || '') + ' ' + (r.phone || '')).toLowerCase();
        if (haystack.indexOf(q) === -1) return false;
      }
      if (status) {
        var days = daysLeft(r.expiresAt);
        if (status === 'active'   && !(days >= 0))          return false;
        if (status === 'expiring' && !(days >= 0 && days <= 14)) return false;
        if (status === 'expired'  && !(days !== null && days < 0)) return false;
      }
      if (comp) {
        var done = [r.waterTestDone, r.fostacEnrolled, r.inspectionDone].filter(Boolean).length;
        if (comp === 'complete' && done < 3) return false;
        if (comp === 'partial'  && (done === 0 || done === 3)) return false;
        if (comp === 'none'     && done > 0) return false;
      }
      return true;
    });

    renderTable(filtered);
  }

  /* ── Detail modal ────────────────────────────────────────── */
  window.openDetail = function (licenseNo) {
    var rec = null;
    for (var i = 0; i < allRecords.length; i++) {
      if (allRecords[i].licenseNo === licenseNo) { rec = allRecords[i]; break; }
    }
    if (!rec) return;
    activeRecord = rec;

    var name    = (rec.details && rec.details.name)   || '—';
    var phone   = rec.phone || (rec.details && rec.details.mobile) || '—';
    var area    = (rec.details && rec.details.area)   || '—';
    var setup   = (rec.details && rec.details.estType) || rec.setup || '—';
    var docs    = (rec.docs) || {};

    setText('tlModalTitle', rec.licenseNo || 'License Detail');
    setText('dlName',    name);
    setText('dlPhone',   phone);
    setText('dlArea',    area);
    setText('dlSetup',   setup);
    setText('dlLicNo',   rec.licenseNo);
    setText('dlPurpose', rec.purpose === 'business' ? 'Business Setup (60 days)' : 'Stall / Event (30 days)');
    setText('dlIssued',  fmtDate(rec.issuedAt));
    setText('dlExpires', fmtDate(rec.expiresAt));

    var foodsEl = $('dlFoods');
    if (foodsEl) {
      var foods = rec.foods || [];
      foodsEl.innerHTML = foods.length
        ? foods.map(function (f) { return '<span class="tl-food-chip">' + f + '</span>'; }).join('')
        : '<span style="font-size:13px;color:#94a3b8;">None recorded</span>';
    }

    var idProofEl = $('dlIdProof');
    if (idProofEl) idProofEl.innerHTML = docs.idProof
      ? '<a href="' + docs.idProof + '" target="_blank">View document ↗</a>'
      : '<span style="color:#94a3b8;font-size:13px;">Not uploaded</span>';

    var estEl = $('dlEstProof');
    if (estEl) estEl.innerHTML = docs.establishment
      ? '<a href="' + docs.establishment + '" target="_blank">View document ↗</a>'
      : '<span style="color:#94a3b8;font-size:13px;">Not uploaded</span>';

    var photos = rec.photos || {};
    var photoKeys = Object.keys(photos).filter(function (k) { return photos[k]; });
    var photoSection = $('dlPhotosSection');
    var photoWrap    = $('dlPhotosWrap');
    if (photoSection && photoWrap) {
      if (photoKeys.length) {
        photoWrap.innerHTML = photoKeys.map(function (k) {
          var src = photos[k];
          return '<img src="' + src + '" alt="' + k + '" style="height:100px;width:auto;border-radius:8px;object-fit:cover;border:1px solid #e2e8f0;">';
        }).join('');
        photoSection.style.display = '';
      } else {
        photoSection.style.display = 'none';
      }
    }

    refreshCompButtons(rec);

    var insp = $('dlInspDate');
    if (insp && rec.inspectionScheduledDate) insp.value = rec.inspectionScheduledDate.slice(0, 10);

    var overlay = $('tlDetailOverlay');
    if (overlay) overlay.classList.add('open');
  };

  window.closeDetail = function () {
    var overlay = $('tlDetailOverlay');
    if (overlay) overlay.classList.remove('open');
    activeRecord = null;
  };

  function refreshCompButtons(rec) {
    function setState(btnId, done) {
      var btn = $(btnId);
      if (!btn) return;
      if (done) { btn.textContent = '✓ Done'; btn.className = 'tl-comp-action tl-comp-action--done'; btn.disabled = true; }
      else      { btn.textContent = 'Mark Done'; btn.className = 'tl-comp-action'; btn.disabled = false; }
    }
    setState('dlWaterBtn',  rec.waterTestDone);
    setState('dlFostacBtn', rec.fostacEnrolled);
    setState('dlInspBtn',   rec.inspectionDone);

    var remBtn = $('dlReminderBtn');
    if (remBtn && rec.lastReminder) remBtn.textContent = 'Sent ✓';
  }

  /* ── Compliance actions ──────────────────────────────────── */
  window.markCompliance = function (type) {
    if (!activeRecord) return;
    var update = {};
    if (type === 'water')      update.waterTestDone  = true;
    if (type === 'fostac')     update.fostacEnrolled = true;
    if (type === 'inspection') update.inspectionDone = true;

    Object.assign(activeRecord, update);
    refreshCompButtons(activeRecord);
    renderTable(filterCurrentView());

    firebase.firestore().collection('tempApplications').doc(activeRecord.licenseNo)
      .set(update, { merge: true }).catch(function (e) { console.error('[TL officer]', e); });

    if (activeRecord.userId) {
      var userUpdate = {};
      Object.keys(update).forEach(function (k) { userUpdate['tempLicense.' + k] = update[k]; });
      firebase.firestore().collection('users').doc(activeRecord.userId)
        .set(userUpdate, { merge: true }).catch(function (e) { console.error('[TL officer user]', e); });
    }
  };

  window.scheduleInspection = function () {
    if (!activeRecord) return;
    var dateVal = $('dlInspDate') && $('dlInspDate').value;
    if (!dateVal) { alert('Please select a date first.'); return; }

    var update = { inspectionScheduledDate: dateVal };
    Object.assign(activeRecord, update);
    renderTable(filterCurrentView());

    firebase.firestore().collection('tempApplications').doc(activeRecord.licenseNo)
      .set(update, { merge: true }).catch(function (e) { console.error('[TL schedule]', e); });

    if (activeRecord.userId) {
      firebase.firestore().collection('users').doc(activeRecord.userId)
        .set({ 'tempLicense.inspectionScheduledDate': dateVal }, { merge: true })
        .catch(function (e) { console.error('[TL schedule user]', e); });
    }

    var btn = $('dlInspBtn');
    if (btn && !activeRecord.inspectionDone) {
      btn.closest('.tl-comp-row').querySelector('.tl-insp-date-wrap').insertAdjacentHTML(
        'afterend', '<div style="font-size:12px;color:#7c3aed;margin-top:4px;">📅 Scheduled for ' + dateVal + '</div>'
      );
    }
  };

  window.sendReminder = function () {
    if (!activeRecord) return;
    var days = daysLeft(activeRecord.expiresAt);
    var msg  = 'Reminder sent to ' + (activeRecord.phone || 'operator') +
               '. License expires in ' + (days !== null ? days : '?') + ' days.';
    alert('🔔 Mock SMS\n\n' + msg);

    var now = new Date().toISOString();
    activeRecord.lastReminder = now;
    refreshCompButtons(activeRecord);

    firebase.firestore().collection('tempApplications').doc(activeRecord.licenseNo)
      .set({ lastReminder: now }, { merge: true }).catch(function (e) { console.error('[TL reminder]', e); });
  };

  function filterCurrentView() {
    var q     = ($('tlSearch') && $('tlSearch').value || '').toLowerCase();
    var status = $('tlFilterStatus') && $('tlFilterStatus').value;
    var comp   = $('tlFilterCompliance') && $('tlFilterCompliance').value;
    return allRecords.filter(function (r) {
      if (q) {
        var h = ((r.licenseNo||'')+' '+((r.details&&r.details.name)||'')+' '+(r.phone||'')).toLowerCase();
        if (h.indexOf(q) === -1) return false;
      }
      if (status) {
        var d = daysLeft(r.expiresAt);
        if (status === 'active'   && !(d >= 0)) return false;
        if (status === 'expiring' && !(d >= 0 && d <= 14)) return false;
        if (status === 'expired'  && !(d !== null && d < 0)) return false;
      }
      if (comp) {
        var done = [r.waterTestDone, r.fostacEnrolled, r.inspectionDone].filter(Boolean).length;
        if (comp === 'complete' && done < 3) return false;
        if (comp === 'partial'  && (done === 0 || done === 3)) return false;
        if (comp === 'none'     && done > 0) return false;
      }
      return true;
    });
  }

  /* ── Load data ───────────────────────────────────────────── */
  function loadTempLicenses() {
    firebase.firestore().collection('tempApplications')
      .orderBy('issuedAt', 'desc')
      .get()
      .then(function (snap) {
        allRecords = snap.docs.map(function (d) { return Object.assign({ licenseNo: d.id }, d.data()); });
        updateStats(allRecords);
        renderTable(allRecords);
      })
      .catch(function (e) {
        console.error('[TL load]', e);
        var tbody = $('tlTableBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="officer-table__empty">Failed to load. Check Firestore rules.</td></tr>';
      });
  }

  /* ── Init ────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    var dateEl = $('tlDate');
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

    ['tlSearch', 'tlFilterStatus', 'tlFilterCompliance'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('input', applyFilters);
      if (el && el.tagName === 'SELECT') el.addEventListener('change', applyFilters);
    });

    var clearBtn = $('tlFilterClear');
    if (clearBtn) clearBtn.addEventListener('click', function () {
      $('tlSearch').value = '';
      $('tlFilterStatus').value = '';
      $('tlFilterCompliance').value = '';
      renderTable(allRecords);
    });

    var overlay = $('tlDetailOverlay');
    if (overlay) overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeDetail();
    });
  });

  document.addEventListener('officer-ready', function () {
    loadTempLicenses();
  });

})();
