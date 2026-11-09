(function () {
  'use strict';

  var reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Shared digit renderer. Minutes use three slots so the readout never changes width. */
  function renderDigits(el, totalSeconds, empty) {
    var g = el.querySelector('.g');
    var m = el.querySelector('.m');
    var s = el.querySelector('.s');
    if (empty) {
      g.textContent = '_'; m.textContent = '__'; s.textContent = '__';
      g.classList.remove('is-ghost');
      el.setAttribute('aria-label', 'Clock reading blank, no reply');
      return;
    }
    var mins = Math.floor(totalSeconds / 60);
    var secs = totalSeconds % 60;
    var padded = String(mins).padStart(3, '0');
    g.textContent = padded.charAt(0);
    g.classList.toggle('is-ghost', padded.charAt(0) === '0');
    m.textContent = padded.slice(1);
    s.textContent = String(secs).padStart(2, '0');
    el.setAttribute('aria-label', 'Clock reading ' + mins + (mins === 1 ? ' minute, ' : ' minutes, ') + secs + (secs === 1 ? ' second' : ' seconds'));
  }

  /* ---------- Mobile menu ---------- */
  var menuBtn = document.querySelector('.menu-btn');
  var nav = document.getElementById('site-nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.focus();
      }
    });
  }

  /* ---------- Hero clock: counts up to 39:00 and stops ---------- */
  var heroDigits = document.getElementById('hero-digits');
  var heroLabel = document.getElementById('hero-label');
  var heroRuler = document.getElementById('hero-ruler');
  var heroReplay = document.getElementById('hero-replay');
  var heroPanel = document.getElementById('hero-clock');
  var TARGET_SECONDS = 39 * 60;
  var DURATION = 3400;
  var raf = 0;

  function setHeroFinal() {
    cancelAnimationFrame(raf);
    renderDigits(heroDigits, TARGET_SECONDS, false);
    heroRuler.style.setProperty('--p', '0.5');
    heroLabel.style.opacity = '1';
  }

  function easeOutExpo(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }

  function runHero() {
    cancelAnimationFrame(raf);
    if (reduceQuery.matches) { setHeroFinal(); return; }
    heroLabel.style.opacity = '0';
    renderDigits(heroDigits, 0, false);
    heroRuler.style.setProperty('--p', '0');
    var start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / DURATION, 1);
      var k = easeOutExpo(t);
      renderDigits(heroDigits, Math.round(k * TARGET_SECONDS), false);
      heroRuler.style.setProperty('--p', (k * 0.5).toFixed(4));
      if (t < 1) {
        raf = requestAnimationFrame(frame);
      } else {
        setHeroFinal();
      }
    }
    raf = requestAnimationFrame(frame);
  }

  if (heroDigits && heroRuler && heroLabel) {
    heroReplay.addEventListener('click', runHero);
    reduceQuery.addEventListener('change', function () { if (reduceQuery.matches) setHeroFinal(); });

    if ('IntersectionObserver' in window) {
      var visible = false;
      var io = new IntersectionObserver(function (entries) {
        var inView = entries[0].isIntersecting;
        if (inView && !visible) { runHero(); }
        if (!inView && visible) { setHeroFinal(); }
        visible = inView;
      }, { threshold: 0.35 });
      io.observe(heroPanel);
    } else {
      setHeroFinal();
    }
  }

  /* ---------- Live clock: the response-time slider ----------
     Only the two sourced anchors are used: the 39 minute median first reply
     and the 47 percent that got no reply. The slider draws no curve and
     implies no odds. Track position 50 is the median, positions 92 to 100
     are the "No reply" stop, which is a category and not a time. */
  var input = document.getElementById('reply-time');
  var liveDigits = document.getElementById('live-digits');
  var readout = document.getElementById('readout');
  var dial = document.getElementById('dial');

  var NO_REPLY_FROM = 92;
  var MEDIAN_AT = 50;
  var MEDIAN_MIN = 39;
  var MAX_MIN = 120;

  function minutesFor(v) {
    if (v <= MEDIAN_AT) return v * (MEDIAN_MIN / MEDIAN_AT);
    return MEDIAN_MIN + (v - MEDIAN_AT) * ((MAX_MIN - MEDIAN_MIN) / (NO_REPLY_FROM - 1 - MEDIAN_AT));
  }

  function plural(n) { return n + (n === 1 ? ' minute' : ' minutes'); }

  function describe(v) {
    if (v >= NO_REPLY_FROM) {
      return { head: 'No reply.', tail: '47% of online property inquiries in the study got no response at all.', empty: true };
    }
    if (v === 0) {
      return { head: 'Right away.', tail: "That's the target an automatic first message aims at." };
    }
    var shown = Math.max(1, Math.round(minutesFor(v)));
    if (v === MEDIAN_AT) {
      return { head: '39 minutes.', tail: "That's the median first reply in the study." };
    }
    if (v < MEDIAN_AT) {
      return { head: plural(shown) + '.', tail: 'Faster than the 39-minute median first reply in the study.' };
    }
    return { head: plural(shown) + '.', tail: 'Slower than the median first reply in the study.' };
  }

  function updateLive() {
    var v = Number(input.value);
    var d = describe(v);
    if (d.empty) {
      renderDigits(liveDigits, 0, true);
    } else {
      renderDigits(liveDigits, Math.round(minutesFor(v) * 60), false);
    }
    var strong = document.createElement('strong');
    strong.textContent = d.head;
    readout.textContent = '';
    readout.appendChild(strong);
    readout.appendChild(document.createTextNode(' ' + d.tail));
    input.setAttribute('aria-valuetext', d.head + ' ' + d.tail);
    dial.style.setProperty('--v', String(Math.min(v, 100) / 100));
  }

  if (input && liveDigits && readout && dial) {
    input.addEventListener('input', updateLive);
    updateLive();
  }
})();
