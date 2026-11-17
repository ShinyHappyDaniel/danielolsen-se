(function () {
  'use strict';
  var d = document;

  // Mobilmeny
  var toggle = d.querySelector('.nav-toggle'), nav = d.getElementById('nav');
  if (toggle && nav) toggle.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // Mjuk intoning av bilder
  [].forEach.call(d.querySelectorAll('.shot img, .card-img img'), function (im) {
    var done = function () { im.classList.add('is-loaded'); };
    if (im.complete && im.naturalWidth) done();
    else { im.addEventListener('load', done); im.addEventListener('error', done); }
  });

  // Filter på projektsidan. Stöder länk direkt till ett filter, t.ex. /projects/#fashion
  var bar = d.querySelector('.filters');
  if (bar) {
    var btns = [].slice.call(bar.querySelectorAll('button')), items = [].slice.call(d.querySelectorAll('.cards li'));
    var apply = function (key, push) {
      if (!btns.some(function (b) { return b.dataset.filter === key; })) key = 'all';
      btns.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.filter === key ? 'true' : 'false'); });
      items.forEach(function (li) { li.hidden = key !== 'all' && li.dataset.cat.split(' ').indexOf(key) < 0; });
      if (push) history.replaceState(null, '', key === 'all' ? location.pathname : '#' + key);
    };
    bar.hidden = false;
    bar.addEventListener('click', function (e) { if (e.target.dataset.filter) apply(e.target.dataset.filter, true); });
    window.addEventListener('hashchange', function () { apply(location.hash.slice(1)); });
    apply(location.hash.slice(1));
  }

  // Lightbox
  var box = d.querySelector('.lightbox');
  var shots = [].slice.call(d.querySelectorAll('a[data-lightbox]'));
  if (box && shots.length && box.showModal) {
    var img = box.querySelector('img'), cap = box.querySelector('figcaption'), i = 0;
    var label = (d.querySelector('[data-view-label]') || {}).dataset;
    var show = function (n) {
      i = (n + shots.length) % shots.length;
      var a = shots[i], thumb = a.querySelector('img');
      img.src = thumb.currentSrc || thumb.src;
      img.alt = thumb.alt;
      var full = new Image();
      full.onload = function () { if (shots[i] === a) img.src = a.dataset.full; };
      full.src = a.dataset.full;
      cap.textContent = '';
      if (a.dataset.link) {
        var l = d.createElement('a');
        l.href = a.dataset.link;
        l.textContent = a.dataset.caption + (label && label.viewLabel ? ' · ' + label.viewLabel + ' ›' : '');
        cap.appendChild(l);
      } else {
        cap.textContent = (i + 1) + ' / ' + shots.length;
      }
      var nx = shots[(i + 1) % shots.length];
      if (nx) new Image().src = nx.dataset.full;
    };
    shots.forEach(function (a, n) {
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault(); show(n); box.showModal();
      });
    });
    box.querySelector('.lb-close').addEventListener('click', function () { box.close(); });
    box.querySelector('.lb-prev').addEventListener('click', function () { show(i - 1); });
    box.querySelector('.lb-next').addEventListener('click', function () { show(i + 1); });
    box.addEventListener('click', function (e) { if (e.target === box || e.target.tagName === 'FIGURE') box.close(); });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') show(i - 1);
      if (e.key === 'ArrowRight') show(i + 1);
    });
    var x0 = null;
    box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1));
    });
  }

  // Kontaktformulär: skickar till form_endpoint om satt, annars öppnas mejlprogrammet
  var form = d.querySelector('.form');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = new FormData(form), status = form.querySelector('.form-status');
    if (f.get('website')) return;
    var say = function (key) { status.textContent = form.dataset[key]; status.hidden = false; };
    var endpoint = form.getAttribute('action');
    if (!endpoint) {
      var body = f.get('message') + '\n\n' + f.get('first_name') + ' ' + f.get('last_name') + '\n' + f.get('email');
      location.href = 'mailto:' + form.dataset.mailto + '?subject=' + encodeURIComponent(f.get('subject') || 'Enquiry') +
        '&body=' + encodeURIComponent(body);
      return;
    }
    fetch(endpoint, { method: 'POST', body: f, headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw 0; form.reset(); say('thanks'); track('generate_lead'); })
      .catch(function () { say('error'); });
  });

  // Google Analytics 4 med samtycke. Laddas först efter Godkänn.
  var GA = d.body.dataset.ga, KEY = 'do-consent';
  var store = { get: function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
                set: function (v) { try { localStorage.setItem(KEY, v); } catch (e) {} } };
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  function track(name, params) { if (GA && store.get() === 'yes') gtag('event', name, params || {}); }
  function loadGA() {
    if (!GA || d.getElementById('ga-js')) return;
    gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    gtag('js', new Date());
    gtag('config', GA);
    var s = d.createElement('script');
    s.id = 'ga-js'; s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA);
    d.head.appendChild(s);
  }
  if (GA) {
    var banner = d.querySelector('.consent'), choice = store.get();
    if (choice === 'yes') loadGA(); else if (!choice) banner.hidden = false;
    banner.addEventListener('click', function (e) {
      var v = e.target.dataset && e.target.dataset.consent;
      if (!v) return;
      store.set(v); banner.hidden = true;
      if (v === 'yes') loadGA(); else if (d.getElementById('ga-js')) location.reload();
    });
    var reopen = d.querySelector('[data-consent-open]');
    if (reopen) reopen.addEventListener('click', function () { banner.hidden = false; });
    d.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="mailto:"],a[href^="tel:"]');
      if (a) track('contact_click', { method: a.href.split(':')[0] });
    });
  }
})();
