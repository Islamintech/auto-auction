/* Imports review queue. Everything shown here comes from CKAuto via
 * car-microservice and is treated as untrusted text: it is only ever put on
 * the page through textContent / attributes, never innerHTML. */

var state = { status: 'pending', page: 1, limit: 20, total: 0, current: null };

var DAMAGE = { TOTAL_LOSS: 'Total loss', PARTIAL_LOSS: 'Partial loss', FLOOD: 'Flood', UNKNOWN: 'Unknown' };
var DISPOSAL = {
  SCRAP: 'Scrap', TRANSFER: 'Transfer', TRANSFER_OR_SCRAP: 'Transfer / scrap', BATTERY: 'Battery',
  EV_BATTERY: 'EV battery', PARTS: 'Parts', PARTS_SALE: 'Parts sale', THIRD_PARTY_TOTAL_LOSS: '3rd-party total loss',
  UNKNOWN: 'Unknown',
};
var SOURCE_STATUS = { LIVE: 'Live auction', PENDING_AWARD: 'Auction ended', AWARDED: 'Awarded', UNKNOWN: 'Unknown' };

/* ---------- helpers ---------- */

function el(tag, attrs, children) {
  var node = document.createElement(tag);
  Object.keys(attrs || {}).forEach(function (k) {
    if (k === 'text') node.textContent = attrs[k];
    else if (k === 'className') node.className = attrs[k];
    else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), attrs[k]);
    else node.setAttribute(k, attrs[k]);
  });
  (children || []).forEach(function (c) { if (c) node.appendChild(c); });
  return node;
}

var fmtNum = function (n) { return n === undefined || n === null ? '—' : Number(n).toLocaleString('en-US'); };
var fmtDate = function (d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' }) + ' KST';
};
var title = function (v) { return [v.year, v.make, v.model].filter(Boolean).join(' ') || v.sourceId; };
var firstPhoto = function (v) {
  var imgs = (v.images || []).filter(function (i) { return i.secureUrl; }).sort(function (a, b) { return a.order - b.order; });
  return imgs.length ? imgs[0].secureUrl : null;
};

/** fetch + JSON, turning an expired admin session (HTML alert page) into a clear error. */
function api(method, path, body) {
  return fetch('/admin/imports/api' + path, {
    method: method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  }).then(function (r) {
    var type = r.headers.get('content-type') || '';
    if (type.indexOf('application/json') === -1) {
      throw { message: 'Your admin session has expired. Reload the page and log in again.' };
    }
    return r.json().then(function (data) {
      if (!r.ok) throw { status: r.status, message: data.message || ('Request failed (' + r.status + ')'), problems: data.problems || [] };
      return data;
    });
  });
}

/* ---------- list ---------- */

function setStatus(status) {
  state.status = status;
  state.page = 1;
  document.querySelectorAll('.pill[data-status]').forEach(function (p) {
    p.classList.toggle('active', p.dataset.status === status);
  });
  loadList();
}

function changePage(delta) {
  state.page = Math.max(1, state.page + delta);
  loadList();
}

function loadList() {
  var tbody = document.getElementById('imports-tbody');
  tbody.replaceChildren(el('tr', {}, [el('td', { colspan: '7', className: 't-empty', text: 'Loading…' })]));

  api('GET', '/list?status=' + state.status + '&page=' + state.page)
    .then(function (data) {
      state.total = data.total;
      document.getElementById('metric-total').textContent = fmtNum(data.total);
      var pages = Math.max(1, Math.ceil(data.total / data.limit));
      document.getElementById('page-info').textContent = 'Page ' + data.page + ' of ' + pages + ' · ' + fmtNum(data.total) + ' lots';
      document.getElementById('prev-page').disabled = data.page <= 1;
      document.getElementById('next-page').disabled = data.page >= pages;

      if (!data.items.length) {
        tbody.replaceChildren(el('tr', {}, [el('td', { colspan: '7', className: 't-empty', text: 'Nothing here.' })]));
        return;
      }
      tbody.replaceChildren.apply(tbody, data.items.map(row));
    })
    .catch(function (err) {
      tbody.replaceChildren(el('tr', {}, [el('td', { colspan: '7', className: 't-empty', text: err.message })]));
    });
}

function row(v) {
  var photo = firstPhoto(v);
  var flags = (v.needsReview || []).length;
  var open = function () { openReview(v.sourceId); };

  return el('tr', {}, [
    el('td', { 'data-label': 'Vehicle' }, [
      el('div', { className: 'flex items-center gap-3' }, [
        el('div', { className: 'thumb', style: 'width:56px;height:42px' }, [
          photo ? el('img', { src: photo, alt: '', loading: 'lazy' }) : el('span', { className: 'hint', text: '—' }),
        ]),
        el('div', { className: 'min-w-0' }, [
          el('div', { className: 't-primary truncate', text: title(v) }),
          el('div', { className: 't-secondary truncate', text: v.trim || v.modelName || '' }),
        ]),
      ]),
    ]),
    el('td', { 'data-label': 'Lot' }, [
      el('div', { className: 'num', text: v.sourceId }),
      el('div', { className: 't-secondary', text: v.location || '' }),
    ]),
    el('td', { 'data-label': 'Damage' }, [
      el('span', { className: 'tag ' + (v.damageType === 'UNKNOWN' ? 'tag-amber' : 'tag-red'), text: DAMAGE[v.damageType] || '—' }),
    ]),
    el('td', { 'data-label': 'Mileage', className: 't-right num', text: v.mileageKm ? fmtNum(v.mileageKm) + ' km' : '—' }),
    el('td', { 'data-label': 'Auction ends' }, [
      el('div', { text: fmtDate(v.auctionEndsAt) }),
      el('div', { className: 't-secondary', text: SOURCE_STATUS[v.sourceStatus] || '' }),
    ]),
    el('td', { 'data-label': 'Photos' }, [
      el('span', { className: 'num', text: String((v.images || []).filter(function (i) { return i.secureUrl; }).length) }),
      flags ? el('span', { className: 'tag tag-amber', style: 'margin-left:8px', text: flags + ' to check' }) : null,
      v.publishError ? el('span', { className: 'tag tag-red', style: 'margin-left:8px', text: 'publish failed' }) : null,
    ]),
    el('td', { 'data-label': 'Actions', className: 't-right' }, [
      el('button', { type: 'button', className: 'btn btn-ghost btn-sm', text: 'Review', onclick: open }),
    ]),
  ]);
}

function runNow() {
  var btn = document.getElementById('run-now');
  if (!confirm('Fetch the latest CKAuto snapshot now? New lots appear here when it finishes (it can take a while).')) return;
  btn.disabled = true;
  api('POST', '/run-now')
    .then(function () { alert('Fetch queued. Refresh this page in a few minutes.'); })
    .catch(function (err) { alert(err.message); })
    .finally(function () { btn.disabled = false; });
}

/* ---------- review modal ---------- */

function openReview(sourceId) {
  var modal = document.getElementById('review-modal');
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  document.getElementById('review-title').textContent = 'Loading…';
  document.getElementById('review-sub').textContent = sourceId;
  document.getElementById('review-alerts').replaceChildren();

  api('GET', '/' + encodeURIComponent(sourceId))
    .then(fillReview)
    .catch(function (err) { showAlerts([{ kind: 'red', text: err.message }]); });
}

function closeReview() {
  document.getElementById('review-modal').hidden = true;
  document.body.style.overflow = '';
  state.current = null;
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && !document.getElementById('review-modal').hidden) closeReview();
});

function fillReview(v) {
  state.current = v;
  var p = v.cataloguePreview || {};
  var o = v.catalogueOverrides || {};

  document.getElementById('review-title').textContent = title(v);
  document.getElementById('review-sub').textContent =
    'Lot ' + v.sourceId + ' · ' + (SOURCE_STATUS[v.sourceStatus] || '') + (v.status !== 'pending' ? ' · ' + v.status : '');

  // Photos
  var photos = (v.images || []).filter(function (i) { return i.secureUrl; }).sort(function (a, b) { return a.order - b.order; });
  var main = document.getElementById('photo-main');
  var strip = document.getElementById('photo-strip');
  document.getElementById('photo-none').hidden = photos.length > 0;
  main.hidden = !photos.length;
  var show = function (i) {
    main.src = photos[i].secureUrl;
    strip.querySelectorAll('.strip-thumb').forEach(function (t, j) { t.classList.toggle('active', i === j); });
  };
  strip.replaceChildren.apply(strip, photos.map(function (img, i) {
    return el('button', { type: 'button', className: 'thumb strip-thumb', 'aria-label': 'Photo ' + (i + 1), onclick: function () { show(i); } }, [
      el('img', { src: img.secureUrl, alt: '', loading: 'lazy' }),
    ]);
  }));
  if (photos.length) show(0);

  // Source facts (read-only)
  var facts = [
    ['Model', [v.modelName, v.trim].filter(Boolean).join(' · ')],
    ['First registered', v.year ? v.year + (v.month ? '-' + String(v.month).padStart(2, '0') : '') : ''],
    ['Damage', DAMAGE[v.damageType]],
    ['Disposal', DISPOSAL[v.disposalType]],
    ['Fuel / gearbox', [v.fuelType, v.transmission].filter(Boolean).join(' · ')],
    ['Engine', [v.engineCode, v.displacementCc ? fmtNum(v.displacementCc) + ' cc' : ''].filter(Boolean).join(' · ')],
    ['Inspection', v.inspectionDate ? new Date(v.inspectionDate).toLocaleDateString('en-GB', { timeZone: 'Asia/Seoul' }) : ''],
    ['Yard', v.location],
    ['Insurer', v.insurer],
    ['Auction ends', v.auctionEndsAt ? fmtDate(v.auctionEndsAt) : ''],
    ['Current bid', v.currentBidKrw ? fmtNum(v.currentBidKrw) + ' KRW' : ''],
    ['Our cost / fee', [v.costKrw ? fmtNum(v.costKrw) + ' KRW' : '', v.commissionRate !== undefined ? (v.commissionRate * 100).toFixed(1) + '%' : ''].filter(Boolean).join(' · ')],
  ];
  var dl = document.getElementById('source-facts');
  dl.replaceChildren();
  facts.forEach(function (f) {
    if (!f[1]) return;
    dl.appendChild(el('dt', { text: f[0] }));
    dl.appendChild(el('dd', { text: f[1] }));
  });
  document.getElementById('source-notes').textContent = v.notes ? 'CKAuto memo: ' + v.notes : '';

  // Form: admin's saved choices first, then what approval would send.
  var set = function (id, value) { document.getElementById('f-' + id).value = value === undefined || value === null ? '' : value; };
  set('carTitle', o.carTitle || p.carTitle);
  set('priceKrw', v.priceKrw ? fmtNum(v.priceKrw) : '');
  set('mileageKm', v.mileageKm);
  set('make', p.carBrand || v.make);
  set('model', v.model);
  set('year', v.year);
  set('fuelType', p.carFuel || '');
  set('transmission', p.carTransmission || '');
  set('carType', o.carType || 'OTHER');
  set('carCondition', o.carCondition || p.carCondition || 'DAMAGED');
  set('color', v.color || p.carColor);
  set('plateOrVin', p.carVin || v.plateOrVin);
  set('carDesc', o.carDesc || '');

  var published = v.status === 'approved' && v.catalogueCarId;
  document.querySelectorAll('#review-form input, #review-form select, #review-form textarea').forEach(function (f) { f.disabled = !!published; });
  document.getElementById('review-actions').hidden = !!published;

  var alerts = [];
  if (published) alerts.push({ kind: 'green', text: 'Published to the catalogue (car ' + v.catalogueCarId + ').' });
  if (v.publishError) alerts.push({ kind: 'red', text: 'Last publish attempt failed: ' + v.publishError });
  if ((v.needsReview || []).length) alerts.push({ kind: 'amber', text: 'Check these source values:', items: v.needsReview });
  if (!published && (v.missing || []).length) alerts.push({ kind: 'amber', text: 'Needed before approval:', items: v.missing });
  showAlerts(alerts);
}

function showAlerts(list) {
  var box = document.getElementById('review-alerts');
  box.replaceChildren.apply(box, list.map(function (a) {
    return el('div', { className: 'alert alert-' + a.kind, role: a.kind === 'red' ? 'alert' : 'status' }, [
      el('div', { text: a.text }),
      a.items && a.items.length ? el('ul', {}, a.items.map(function (t) { return el('li', { text: t }); })) : null,
    ]);
  }));
}

function formBody() {
  var body = {};
  ['carTitle', 'priceKrw', 'mileageKm', 'make', 'model', 'year', 'fuelType', 'transmission',
    'carType', 'carCondition', 'color', 'plateOrVin', 'carDesc'].forEach(function (k) {
    var v = document.getElementById('f-' + k).value.trim();
    if (v !== '') body[k] = v;
  });
  return body;
}

function setBusy(busy) {
  document.getElementById('btn-approve').disabled = busy;
  document.getElementById('btn-reject').disabled = busy;
}

function approve(e) {
  e.preventDefault();
  var v = state.current;
  if (!v) return;
  setBusy(true);
  api('POST', '/' + encodeURIComponent(v.sourceId) + '/approve', formBody())
    .then(function () {
      closeReview();
      loadList();
    })
    .catch(function (err) {
      showAlerts([{ kind: 'red', text: err.message, items: err.problems }]);
      document.getElementById('review-alerts').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    })
    .finally(function () { setBusy(false); });
}

function reject() {
  var v = state.current;
  if (!v || !confirm('Reject lot ' + v.sourceId + '? It will not be listed.')) return;
  setBusy(true);
  api('POST', '/' + encodeURIComponent(v.sourceId) + '/reject')
    .then(function () {
      closeReview();
      loadList();
    })
    .catch(function (err) { showAlerts([{ kind: 'red', text: err.message }]); })
    .finally(function () { setBusy(false); });
}
