(function () {
  'use strict';

  var HOUSES = window.GARNI_HOUSES || [];
  var CONFIG = window.GARNI_CONFIG || { requestMinutes: 30 };
  var I18N = window.I18N;
  var EXTRAS = ['pool', 'bbq', 'sauna', 'billiard', 'parking', 'breakfast'];
  var GROUPS = ['family', 'friends', 'men', 'couple'];
  var LANG_NAME_HY = { hy: 'հայերեն', ru: 'ռուսերեն', en: 'անգլերեն' };

  /* ---------- helpers ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function amd(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0'); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseIso(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function daysBetween(a, b) { return Math.round((parseIso(b) - parseIso(a)) / 86400000); }

  var toastTimer;
  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  /* ---------- language ---------- */
  var lang = store.get('garni.lang', null);
  if (!I18N[lang]) {
    var nav = (navigator.language || 'hy').slice(0, 2);
    lang = I18N[nav] ? nav : 'hy';
  }
  function t(key) {
    var v = I18N[lang][key];
    if (v === undefined) v = I18N.hy[key];
    if (typeof v === 'function') return v.apply(null, Array.prototype.slice.call(arguments, 1));
    return v;
  }
  function L(obj) { return obj ? (obj[lang] || obj.hy) : ''; }

  function fmtDate(s, opts, lng) {
    try { return new Intl.DateTimeFormat(I18N[lng || lang].locale, opts).format(parseIso(s)); }
    catch (e) { return s; }
  }
  // Many browsers ship no Armenian date names, so Armenian is formatted by hand.
  var HY_WD = ['Կիր', 'Երկ', 'Երք', 'Չրք', 'Հնգ', 'Ուրբ', 'Շբթ'];
  var HY_MS = ['հունվ', 'փետր', 'մարտ', 'ապր', 'մայիս', 'հունիս', 'հուլիս', 'օգոստ', 'սեպտ', 'հոկտ', 'նոյ', 'դեկտ'];
  var HY_ML = ['հունվարի', 'փետրվարի', 'մարտի', 'ապրիլի', 'մայիսի', 'հունիսի', 'հուլիսի', 'օգոստոսի', 'սեպտեմբերի', 'հոկտեմբերի', 'նոյեմբերի', 'դեկտեմբերի'];
  function fmtShort(s) {
    if (lang === 'hy') { var d = parseIso(s); return HY_WD[d.getDay()] + ', ' + d.getDate() + ' ' + HY_MS[d.getMonth()]; }
    return fmtDate(s, { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function fmtRange(a, b, lng) {
    lng = lng || lang;
    var da = parseIso(a), db = parseIso(b);
    var same = da.getMonth() === db.getMonth() && da.getFullYear() === db.getFullYear();
    if (lng === 'hy') {
      return same ? da.getDate() + '–' + db.getDate() + ' ' + HY_ML[db.getMonth()]
                  : da.getDate() + ' ' + HY_ML[da.getMonth()] + ' – ' + db.getDate() + ' ' + HY_ML[db.getMonth()];
    }
    if (same) return da.getDate() + '–' + fmtDate(b, { day: 'numeric', month: 'long' }, lng);
    return fmtDate(a, { day: 'numeric', month: 'long' }, lng) + ' – ' + fmtDate(b, { day: 'numeric', month: 'long' }, lng);
  }

  function setLang(l) {
    lang = l;
    store.set('garni.lang', l);
    document.documentElement.lang = I18N[l].htmlLang;
    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    $$('[data-i18n-ph]').forEach(function (el) { el.placeholder = t(el.getAttribute('data-i18n-ph')); });
    $$('[data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === l)); });
    renderChoices();
    renderFormDerived();
    if (active) renderResults();
  }

  /* ---------- form state ---------- */
  var form = {
    adults: 2,
    kids: 0,
    group: 'family',
    extras: []
  };

  (function initDates() {
    var d = new Date();
    var toSat = (6 - d.getDay() + 7) % 7 || 7;
    var a = new Date(d.getFullYear(), d.getMonth(), d.getDate() + toSat);
    var b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 1);
    $('#checkin').value = iso(a);
    $('#checkout').value = iso(b);
    $('#checkin').min = iso(d);
    $('#checkout').min = iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
  })();

  function nights() {
    var a = $('#checkin').value, b = $('#checkout').value;
    if (!a || !b) return 0;
    return daysBetween(a, b);
  }

  function renderChoices() {
    var g = $('#groups'), e = $('#extras');
    var check = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3 3 7-7"/></svg>';
    g.innerHTML = GROUPS.map(function (id) {
      return '<label class="choice"><input type="radio" name="group" value="' + id + '"' + (form.group === id ? ' checked' : '') + '><span>' + esc(t('groups')[id]) + '</span></label>';
    }).join('');
    e.innerHTML = EXTRAS.map(function (id) {
      return '<label class="choice"><input type="checkbox" name="extra" value="' + id + '"' + (form.extras.indexOf(id) !== -1 ? ' checked' : '') + '><span>' + check + esc(t('features')[id]) + '</span></label>';
    }).join('');
  }

  function renderFormDerived() {
    var a = $('#checkin').value, b = $('#checkout').value, n = nights();
    $('#checkin-text').textContent = a ? fmtShort(a) : '—';
    $('#checkout-text').textContent = b ? fmtShort(b) : '—';
    $('#nights-text').textContent = n > 0 ? t('nights', n) : '';
    $('#adults-out').textContent = form.adults;
    $('#kids-out').textContent = form.kids;
    $('[data-step="adults:-1"]').disabled = form.adults <= 1;
    $('[data-step="kids:-1"]').disabled = form.kids <= 0;
    var parts = [t('people', form.adults + form.kids)];
    if (n > 0) parts.push(t('nights', n));
    parts.push(t('groups')[form.group]);
    $('#summary').textContent = parts.join(', ');
  }

  document.addEventListener('click', function (ev) {
    var step = ev.target.closest('[data-step]');
    if (step) {
      var p = step.getAttribute('data-step').split(':');
      var key = p[0], delta = +p[1];
      var min = key === 'adults' ? 1 : 0, max = key === 'adults' ? 30 : 20;
      form[key] = Math.max(min, Math.min(max, form[key] + delta));
      if (navigator.vibrate) navigator.vibrate(8);
      renderFormDerived();
      return;
    }
    var lb = ev.target.closest('[data-lang]');
    if (lb) { setLang(lb.getAttribute('data-lang')); }
  });

  $('#request-form').addEventListener('change', function (ev) {
    var el = ev.target;
    if (el.name === 'group') form.group = el.value;
    if (el.name === 'extra') {
      form.extras = $$('input[name="extra"]:checked').map(function (x) { return x.value; });
    }
    if (el.id === 'checkin') {
      var next = parseIso(el.value); next.setDate(next.getDate() + 1);
      $('#checkout').min = iso(next);
      if (nights() <= 0) $('#checkout').value = iso(next);
    }
    renderFormDerived();
  });

  // Make the whole date tile open the native picker where supported.
  $$('.date input').forEach(function (inp) {
    inp.addEventListener('click', function () { try { if (inp.showPicker) inp.showPicker(); } catch (e) {} });
  });

  ['name', 'phone'].forEach(function (id) {
    $('#' + id).addEventListener('input', function () {
      this.removeAttribute('aria-invalid');
      $('#' + id + '-err').textContent = '';
    });
  });

  $('#request-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var name = $('#name').value.trim();
    var phone = $('#phone').value.trim();
    var ok = true;
    $('#dates-err').textContent = '';
    if (nights() <= 0) { $('#dates-err').textContent = t('errDates'); ok = false; }
    if (!name) { $('#name').setAttribute('aria-invalid', 'true'); $('#name-err').textContent = t('errName'); ok = false; }
    if (phone.replace(/\D/g, '').length < 8) { $('#phone').setAttribute('aria-invalid', 'true'); $('#phone-err').textContent = t('errPhone'); ok = false; }
    if (!ok) {
      var bad = $('[aria-invalid="true"]');
      if (bad) bad.focus();
      return;
    }
    store.set('garni.contact', { name: name, phone: phone });
    startRequest({
      id: Date.now().toString(36),
      checkIn: $('#checkin').value,
      checkOut: $('#checkout').value,
      nights: nights(),
      adults: form.adults,
      kids: form.kids,
      group: form.group,
      extras: form.extras.slice(),
      name: name,
      phone: phone,
      lang: lang
    });
    show('results', true);
  });

  (function restoreContact() {
    var c = store.get('garni.contact', null);
    if (c) { $('#name').value = c.name || ''; $('#phone').value = c.phone || ''; }
  })();

  /* ---------- screens ---------- */
  function show(name, push) {
    ['form', 'results', 'setup'].forEach(function (s) {
      var el = $('#screen-' + s);
      var on = s === name;
      el.hidden = !on;
      if (on) { el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); }
    });
    window.scrollTo(0, 0);
    if (push) history.pushState({ screen: name }, '', name === 'setup' ? '#setup' : (name === 'results' ? '#results' : '#'));
    if (name === 'setup') renderSetup();
  }
  window.addEventListener('popstate', function () { route(); });
  window.addEventListener('hashchange', function () { route(); });
  function route() {
    var h = location.hash;
    if (h === '#setup') show('setup');
    else if (h === '#results' && active) show('results');
    else show('form');
  }
  $('#edit-btn').addEventListener('click', function () { history.back(); });
  $('#again-btn').addEventListener('click', function () { history.back(); });

  /* ---------- Telegram ---------- */
  function chatIds() {
    var saved = store.get('garni.chatIds', {});
    var out = {};
    HOUSES.forEach(function (h) {
      var v = String(saved[h.id] || h.chatId || '').trim();
      if (v) out[h.id] = v;
    });
    return out;
  }

  var tg = {
    offset: 0,
    call: function (method, params, signal) {
      var token = store.get('garni.token', '');
      if (!token) return Promise.reject(new Error('no token'));
      var qs = new URLSearchParams();
      Object.keys(params || {}).forEach(function (k) { if (params[k] !== undefined) qs.append(k, params[k]); });
      return fetch('https://api.telegram.org/bot' + token + '/' + method + '?' + qs.toString(), { signal: signal })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (!j.ok) throw new Error(j.description || 'Telegram error'); return j.result; });
    },
    syncOffset: function () {
      var self = this;
      return self.call('getUpdates', { offset: -1, timeout: 0 }).then(function (u) {
        self.offset = u.length ? u[u.length - 1].update_id + 1 : 0;
      });
    }
  };

  function ownerText(req, h, state) {
    var hy = I18N.hy;
    var s = '🔔 <b>Նոր հայտ</b> · Ազատ է\n\n';
    s += '📅 ' + esc(fmtRange(req.checkIn, req.checkOut, 'hy')) + ' (' + req.nights + ' գիշեր)\n';
    s += '👥 ' + req.adults + ' մեծահասակ' + (req.kids ? ', ' + req.kids + ' երեխա' : '') + '\n';
    s += '🏡 ' + hy.groups[req.group] + '\n';
    if (req.extras.length) s += '✨ Ցանկալի է՝ ' + req.extras.map(function (x) { return hy.features[x]; }).join(', ') + '\n';
    s += '🌐 Հաճախորդի լեզուն՝ ' + LANG_NAME_HY[req.lang] + '\n';
    s += '💰 Ձեր գինը՝ ' + amd(h.price) + ' ֏ / գիշեր\n\n';
    if (state === 'accepted') {
      s += '✅ <b>Դուք վերցրիք հայտը</b>\n';
      s += 'Հաճախորդ՝ ' + esc(req.name) + ', ' + esc(req.phone) + '\n';
      s += 'Նա արդեն տեսնում է ձեր տունը և կկապվի ձեզ հետ։';
    } else if (state === 'declined') {
      s += '❌ Նշվեց՝ զբաղված եք այս օրերին։';
    } else if (state === 'expired') {
      s += '⌛ Հայտը փակվեց։';
    } else {
      s += '⏳ Պատասխանի ժամկետ՝ ' + CONFIG.requestMinutes + ' րոպե';
    }
    return s;
  }

  /* ---------- request engine ---------- */
  var active = null;
  var wakeLock = null;

  function stopRequest() {
    if (!active) return;
    active.closed = true;
    try { active.ctrl.abort(); } catch (e) {}
    active.timers.forEach(clearTimeout);
    clearInterval(active.ticker);
    releaseWake();
  }

  function startRequest(req) {
    stopRequest();
    var total = req.adults + req.kids;
    var matched = HOUSES.filter(function (h) {
      return h.capacity >= total && !(req.group === 'men' && !h.allowMen);
    });
    var a = {
      req: req,
      matched: matched,
      answered: {},
      order: [],
      declined: {},
      closed: false,
      startedAt: Date.now(),
      endsAt: Date.now() + CONFIG.requestMinutes * 60000,
      ctrl: new AbortController(),
      timers: [],
      sent: {},
      fresh: {}
    };
    active = a;
    renderResults();
    a.ticker = setInterval(tick, 1000);
    tick();

    if (!matched.length) { finish(a); return; }
    requestWake();

    var ids = chatIds();
    var hasToken = !!store.get('garni.token', '');
    var real = hasToken ? matched.filter(function (h) { return ids[h.id]; }) : [];
    var sim = matched.filter(function (h) { return real.indexOf(h) === -1; });

    sim.forEach(function (h, i) {
      a.timers.push(setTimeout(function () { answer(a, h.id, true); }, 2600 + i * 3800 + Math.random() * 1400));
    });

    if (real.length) {
      tg.syncOffset().catch(function () {}).then(function () {
        return Promise.all(real.map(function (h) {
          return tg.call('sendMessage', {
            chat_id: ids[h.id],
            text: ownerText(req, h),
            parse_mode: 'HTML',
            reply_markup: JSON.stringify({ inline_keyboard: [[
              { text: '✅ Վերցնում եմ', callback_data: 'a:' + req.id + ':' + h.id },
              { text: '❌ Զբաղված եմ', callback_data: 'd:' + req.id + ':' + h.id }
            ]] })
          }).then(function (m) { a.sent[h.id] = m.message_id; })
            .catch(function (e) { console.warn('[Ազատ է] could not reach', h.id, e.message); });
        }));
      }).then(function () { poll(a, ids); });
    }
  }

  function poll(a, ids) {
    if (a.closed || active !== a) return;
    tg.call('getUpdates', { offset: tg.offset, timeout: 20, allowed_updates: JSON.stringify(['callback_query']) }, a.ctrl.signal)
      .then(function (ups) {
        ups.forEach(function (u) {
          tg.offset = u.update_id + 1;
          if (u.callback_query) handleCallback(a, ids, u.callback_query);
        });
        poll(a, ids);
      })
      .catch(function () {
        if (a.ctrl.signal.aborted) return;
        sleep(2500).then(function () { poll(a, ids); });
      });
  }

  function handleCallback(a, ids, cb) {
    var p = String(cb.data || '').split(':');
    var kind = p[0], rid = p[1], hid = p[2];
    var h = HOUSES.filter(function (x) { return x.id === hid; })[0];
    var valid = h && rid === a.req.id && !a.closed &&
      String(cb.from && cb.from.id) === String(ids[hid]) &&
      !a.answered[hid] && !a.declined[hid];
    tg.call('answerCallbackQuery', {
      callback_query_id: cb.id,
      text: valid ? (kind === 'a' ? 'Պատասխանդ ուղարկվեց հաճախորդին' : 'Նշվեց') : 'Այս հայտն այլևս ակտիվ չէ'
    }).catch(function () {});
    if (!valid) return;
    answer(a, hid, kind === 'a');
    if (cb.message) {
      tg.call('editMessageText', {
        chat_id: cb.message.chat.id,
        message_id: cb.message.message_id,
        text: ownerText(a.req, h, kind === 'a' ? 'accepted' : 'declined'),
        parse_mode: 'HTML'
      }).catch(function () {});
    }
  }

  function answer(a, hid, ok) {
    if (a.closed || active !== a) return;
    if (ok) { a.answered[hid] = Date.now(); a.order.push(hid); a.fresh[hid] = true; }
    else a.declined[hid] = true;
    if (navigator.vibrate) navigator.vibrate(ok ? [18, 60, 18] : 10);
    var done = a.matched.every(function (h) { return a.answered[h.id] || a.declined[h.id]; });
    if (done) finish(a);
    else renderResults();
  }

  function finish(a) {
    if (a.closed && active !== a) return;
    a.closed = true;
    a.finishedAt = Date.now();
    try { a.ctrl.abort(); } catch (e) {}
    a.timers.forEach(clearTimeout);
    clearInterval(a.ticker);
    releaseWake();
    // tell owners who didn't answer that it closed
    var ids = chatIds();
    Object.keys(a.sent).forEach(function (hid) {
      if (a.answered[hid] || a.declined[hid]) return;
      var h = HOUSES.filter(function (x) { return x.id === hid; })[0];
      tg.call('editMessageText', { chat_id: ids[hid], message_id: a.sent[hid], text: ownerText(a.req, h, 'expired'), parse_mode: 'HTML' }).catch(function () {});
    });
    renderResults();
  }

  function tick() {
    var a = active;
    if (!a) return;
    var left = Math.max(0, a.endsAt - Date.now());
    if (!a.closed && left <= 0) { finish(a); return; }
    var mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
    $('#status-time').textContent = a.closed ? '' : t('timeLeft', pad(mm) + ':' + pad(ss));
    var frac = a.closed ? 0 : left / (CONFIG.requestMinutes * 60000);
    $('#status-progress').style.transform = 'scaleX(' + frac.toFixed(4) + ')';
    $$('[data-ago]').forEach(function (el) { el.textContent = ago(+el.getAttribute('data-ago')); });
  }

  function ago(ts) {
    var m = Math.floor((Date.now() - ts) / 60000);
    return m < 1 ? t('justNow') : t('minAgo', m);
  }

  function requestWake() {
    try {
      if ('wakeLock' in navigator) navigator.wakeLock.request('screen').then(function (w) { wakeLock = w; }).catch(function () {});
    } catch (e) {}
  }
  function releaseWake() { try { if (wakeLock) wakeLock.release(); } catch (e) {} wakeLock = null; }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && active && !active.closed) requestWake();
  });

  /* ---------- results rendering ---------- */
  var ICON = {
    pin: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14.5s5-4.4 5-8.3a5 5 0 0 0-10 0c0 3.9 5 8.3 5 8.3z"/><circle cx="8" cy="6.2" r="1.7"/></svg>',
    people: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="6" cy="5" r="2.3"/><path d="M1.8 13.5c0-2.4 1.9-4 4.2-4s4.2 1.6 4.2 4M11 3a2.3 2.3 0 0 1 0 4.2M12.2 9.7c1.3.5 2.1 1.9 2.1 3.8"/></svg>',
    phone: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.2 1.8h2.9l1.4 3.4-1.9 1.2a8 8 0 0 0 4 4l1.2-1.9 3.4 1.4v2.9a1 1 0 0 1-1 1A12.2 12.2 0 0 1 2.2 2.8a1 1 0 0 1 1-1z"/></svg>',
    chat: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 14l1.1-3.2A6 6 0 1 1 5.4 13z"/></svg>'
  };

  function houseCard(h, a) {
    var n = a.req.nights;
    var photos = h.photos || [];
    var dates = fmtRange(a.req.checkIn, a.req.checkOut);
    var wa = 'https://wa.me/' + h.phone.replace(/\D/g, '') + '?text=' + encodeURIComponent(t('waText', L(h.name), dates));
    var tel = 'tel:' + h.phone.replace(/[^\d+]/g, '');
    return '' +
      '<article class="house' + (a.fresh[h.id] ? ' is-new' : '') + '" data-house="' + esc(h.id) + '">' +
        '<div class="gallery">' +
          '<div class="gallery__track">' +
            photos.map(function (src, i) {
              return '<img src="' + esc(src) + '" alt="' + esc(L(h.name) + ', ' + t('photoOf', i + 1, photos.length)) + '" loading="lazy">';
            }).join('') +
          '</div>' +
          (photos.length > 1 ? '<div class="gallery__dots">' + photos.map(function (_, i) { return '<i' + (i === 0 ? ' class="on"' : '') + '></i>'; }).join('') + '</div>' : '') +
          '<span class="badge">' + esc(t('free')) + '</span>' +
        '</div>' +
        '<div class="house__body">' +
          '<div class="house__head"><h3 class="house__name">' + esc(L(h.name)) + '</h3>' +
            '<span class="house__when" data-ago="' + a.answered[h.id] + '">' + esc(ago(a.answered[h.id])) + '</span></div>' +
          '<div class="house__meta"><span>' + ICON.pin + esc(L(h.place)) + '</span><span>' + ICON.people + esc(t('upTo', h.capacity)) + '</span></div>' +
          '<p class="house__note">«' + esc(t('notes')[h.note] || '') + '» <cite>' + esc(L(h.owner)) + '</cite></p>' +
          '<div class="house__feats">' + (h.features || []).map(function (f) { return '<span>' + esc(t('features')[f] || f) + '</span>'; }).join('') + '</div>' +
          '<div class="house__price"><div><b>' + amd(h.price) + ' ֏</b> <small>' + esc(t('perNight')) + '</small></div>' +
            '<div class="house__total">' + esc(t('totalFor', n)) + ' <strong>' + amd(h.price * n) + ' ֏</strong></div></div>' +
          '<div class="house__actions">' +
            '<a class="act act--line" href="' + esc(tel) + '">' + ICON.phone + esc(t('call')) + '</a>' +
            '<a class="act act--fill" href="' + esc(wa) + '" target="_blank" rel="noopener">' + ICON.chat + esc(t('write')) + '</a>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  function renderResults() {
    var a = active;
    if (!a) return;
    var count = a.order.length;
    var total = a.matched.length;
    var allDone = total > 0 && a.matched.every(function (h) { return a.answered[h.id] || a.declined[h.id]; });

    $('#status-dot').classList.toggle('is-off', a.closed);
    $('#status-state').textContent = a.closed ? t('closed') : t('live');
    $('#status-title').textContent = t('answered', count);
    $('#status-text').textContent = allDone ? t('sentDone') : t('sentTo', total);
    $('#status-count').textContent = total ? count + ' / ' + total : '';
    $('#status').hidden = total === 0;

    var r = a.req;
    var tags = [fmtRange(r.checkIn, r.checkOut), t('people', r.adults + r.kids), t('groups')[r.group]]
      .concat(r.extras.map(function (x) { return t('features')[x]; }));
    $('#req-tags').innerHTML = tags.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('');

    // newest answer on top
    var list = a.order.slice().reverse().map(function (id) { return HOUSES.filter(function (h) { return h.id === id; })[0]; });
    $('#houses').innerHTML = list.map(function (h) { return houseCard(h, a); }).join('');
    a.fresh = {};
    bindGalleries();

    $('#waiting').hidden = a.closed || allDone || total === 0;

    var empty = $('#empty');
    if (total === 0) {
      empty.hidden = false;
      $('#empty-title').textContent = t('noMatchTitle');
      $('#empty-text').textContent = t('noMatchText');
    } else if (a.closed && count === 0) {
      empty.hidden = false;
      $('#empty-title').textContent = t('noneTitle');
      $('#empty-text').textContent = t('noneText');
    } else {
      empty.hidden = true;
    }
    tick();
  }

  function bindGalleries() {
    $$('.gallery').forEach(function (g) {
      var track = $('.gallery__track', g), dots = $$('.gallery__dots i', g);
      if (!dots.length) return;
      track.addEventListener('scroll', function () {
        var i = Math.round(track.scrollLeft / track.clientWidth);
        dots.forEach(function (d, k) { d.classList.toggle('on', k === i); });
      }, { passive: true });
    });
  }

  /* ---------- setup (#setup) ---------- */
  var found = {};

  function renderSetup() {
    var token = store.get('garni.token', '');
    $('#token').value = token;
    var ids = chatIds();
    var linked = HOUSES.filter(function (h) { return ids[h.id]; }).length;
    $('#setup-mode').textContent = token && linked
      ? 'Իրական․ հայտերը կգնան Telegram-ով (' + linked + ' / ' + HOUSES.length + ' տուն միացված է)։ Չմիացված տները կպատասխանեն ավտոմատ։'
      : 'Սիմուլյացիա․ տները պատասխանում են ավտոմատ։ Իրականի համար մուտքագրիր token և ID-ներ։';

    var people = Object.keys(found).map(function (k) { return found[k]; });
    $('#owner-fields').innerHTML = HOUSES.map(function (h) {
      var opts = people.length
        ? '<select class="btn btn--quiet btn--small" data-pick="' + h.id + '" aria-label="Ընտրել"><option value="">Ընտրել գտնվածներից…</option>' +
          people.map(function (p) { return '<option value="' + p.id + '">' + esc(p.label) + '</option>'; }).join('') + '</select>'
        : '';
      return '<div class="owner">' +
        '<p class="owner__name">' + esc(h.name.hy) + ' · ' + esc(h.owner.hy) + '</p>' +
        '<label class="field"><span>Telegram ID</span><input type="text" inputmode="numeric" data-id="' + h.id + '" value="' + esc(ids[h.id] || '') + '" placeholder="օր․՝ 123456789"></label>' +
        '<div class="setup__row">' + opts + '<button type="button" class="btn btn--small" data-test="' + h.id + '">Ուղարկել թեստ</button></div>' +
      '</div>';
    }).join('');
  }

  function saveIds() {
    var saved = {};
    $$('[data-id]').forEach(function (inp) { saved[inp.getAttribute('data-id')] = inp.value.trim(); });
    store.set('garni.chatIds', saved);
  }

  $('#token-save').addEventListener('click', function () {
    var v = $('#token').value.trim();
    var out = $('#token-out');
    if (!v) { out.textContent = 'Մուտքագրիր token-ը։'; return; }
    store.set('garni.token', v);
    out.textContent = 'Ստուգում եմ…';
    tg.call('getMe', {}).then(function (me) {
      out.textContent = 'Աշխատում է․ բոտը՝ @' + me.username;
      return tg.call('deleteWebhook', {}).catch(function () {});
    }).catch(function (e) {
      out.textContent = 'Չստացվեց․ ' + e.message;
    }).then(renderSetup);
  });

  $('#token-clear').addEventListener('click', function () {
    store.del('garni.token');
    $('#token-out').textContent = 'Token-ը ջնջվեց այս հեռախոսից։';
    renderSetup();
  });

  $('#find-ids').addEventListener('click', function () {
    var out = $('#ids-out');
    out.textContent = 'Փնտրում եմ…';
    tg.call('getUpdates', { timeout: 0, allowed_updates: JSON.stringify(['message']) }).then(function (ups) {
      ups.forEach(function (u) {
        var f = u.message && u.message.from;
        if (!f || f.is_bot) return;
        found[f.id] = { id: f.id, label: [f.first_name, f.last_name].filter(Boolean).join(' ') + (f.username ? ' (@' + f.username + ')' : '') + ' — ' + f.id };
      });
      var list = Object.keys(found).map(function (k) { return found[k]; });
      $('#found').innerHTML = list.map(function (p) { return '<li>' + esc(p.label.split(' — ')[0]) + ' · <code>' + p.id + '</code></li>'; }).join('');
      out.textContent = list.length ? 'Գտնվեց ' + list.length + ' մարդ։ Ընտրիր ամեն տան համար։' : 'Ոչ ոք չի գրել /start։ Թող տնատերերը գրեն և նորից փորձիր։';
      saveIds();
      renderSetup();
    }).catch(function (e) {
      out.textContent = e.message === 'no token' ? 'Նախ պահիր token-ը։' : 'Չստացվեց․ ' + e.message;
    });
  });

  $('#screen-setup').addEventListener('change', function (ev) {
    var pick = ev.target.getAttribute('data-pick');
    if (pick && ev.target.value) {
      $('[data-id="' + pick + '"]').value = ev.target.value;
    }
    saveIds();
    $('#ids-out').textContent = 'Պահված է։';
    renderSetupMode();
  });
  $('#screen-setup').addEventListener('input', function (ev) {
    if (ev.target.hasAttribute('data-id')) { saveIds(); renderSetupMode(); }
  });
  function renderSetupMode() {
    var ids = chatIds(), token = store.get('garni.token', '');
    var linked = HOUSES.filter(function (h) { return ids[h.id]; }).length;
    $('#setup-mode').textContent = token && linked
      ? 'Իրական․ հայտերը կգնան Telegram-ով (' + linked + ' / ' + HOUSES.length + ' տուն միացված է)։ Չմիացված տները կպատասխանեն ավտոմատ։'
      : 'Սիմուլյացիա․ տները պատասխանում են ավտոմատ։ Իրականի համար մուտքագրիր token և ID-ներ։';
  }

  $('#screen-setup').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-test]');
    if (!b) return;
    saveIds();
    var hid = b.getAttribute('data-test');
    var id = chatIds()[hid];
    if (!id) { $('#ids-out').textContent = 'Նախ գրիր ID-ն։'; return; }
    tg.call('sendMessage', { chat_id: id, text: '✅ Թեստ «Ազատ է» դեմոյից։ Ամեն ինչ աշխատում է։' })
      .then(function () { $('#ids-out').textContent = 'Թեստը ուղարկվեց։'; })
      .catch(function (e) { $('#ids-out').textContent = 'Չհասավ․ ' + e.message + ' (տնատերը գրե՞լ է /start)'; });
  });

  /* ---------- boot ---------- */
  setLang(lang);
  if (location.hash === '#setup') show('setup');
  else { if (location.hash === '#results') history.replaceState(null, '', '#'); show('form'); }
})();
