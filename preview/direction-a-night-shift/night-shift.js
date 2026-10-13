(function () {
  'use strict';

  // Mobile menu
  var menuBtn = document.getElementById('menu-btn');
  var nav = document.getElementById('site-nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuBtn.textContent = open ? 'Close' : 'Menu';
    });
  }

  // Placeholder links stay inert in the preview.
  Array.prototype.forEach.call(document.querySelectorAll('a[data-placeholder]'), function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); });
  });

  // Lead-arrives timeline
  var stage = document.getElementById('stage');
  var playBtn = document.getElementById('play');
  if (!stage || !playBtn) return;

  var clockN = document.getElementById('clock-n');
  var sentEl = document.getElementById('sent');
  var trackW = document.getElementById('track-w');
  var trackY = document.getElementById('track-y');
  var steps = Array.prototype.slice.call(stage.querySelectorAll('.step'));
  var MEDIAN = 39; // minutes, DelPrete secret shop, August 2024

  var mqReal = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Preview aid: ?motion=1 plays the full animation even when the OS asks for reduced motion.
  var force = /[?&]motion=1/.test(window.location.search);
  if (force) document.documentElement.classList.add('force-motion');
  var mq = { get matches() { return mqReal.matches && !force; } };
  var timers = [];
  var raf = 0;
  var token = 0;

  function clearAll() {
    token += 1;
    timers.forEach(function (t) { clearTimeout(t); });
    timers = [];
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  function later(ms, fn) {
    var my = token;
    timers.push(setTimeout(function () { if (my === token) fn(); }, ms));
  }

  function setTrack(el, v, ms) {
    el.style.transition = ms ? 'transform ' + ms + 'ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none';
    el.style.transform = 'scaleX(' + v + ')';
  }

  function showFinal() {
    clearAll();
    stage.setAttribute('data-state', 'done');
    steps.forEach(function (s) { s.classList.add('on'); });
    clockN.textContent = String(MEDIAN);
    sentEl.textContent = 'Sent';
    setTrack(trackW, 1, 0);
    setTrack(trackY, 1, 0);
    playBtn.textContent = 'Replay';
  }

  function showIdle() {
    clearAll();
    stage.setAttribute('data-state', 'idle');
    steps.forEach(function (s) { if (!s.classList.contains('is-first')) s.classList.remove('on'); });
    clockN.textContent = '0';
    sentEl.textContent = 'Ready';
    setTrack(trackW, 0, 0);
    setTrack(trackY, 0, 0);
  }

  function stepsAt(n) {
    return steps.filter(function (s) { return s.getAttribute('data-step') === String(n); });
  }

  function play() {
    if (mq.matches) { showFinal(); return; }
    showIdle();
    stage.setAttribute('data-state', 'playing');
    playBtn.disabled = true;
    playBtn.textContent = 'Playing';

    // With a first response: the first text goes out at once.
    later(250, function () {
      sentEl.textContent = 'Sent';
      stage.setAttribute('data-state', 'playing');
      setTrack(trackY, 1, 900);
    });

    // Without: the clock runs to the sourced median.
    var runStart = 700, runMs = 6400;
    later(runStart, function () {
      setTrack(trackW, 1, runMs);
      var t0 = performance.now(), my = token;
      (function tick(now) {
        if (my !== token) return;
        var p = Math.min(1, (now - t0) / runMs);
        clockN.textContent = String(Math.round(p * MEDIAN));
        if (p < 1) raf = requestAnimationFrame(tick);
      })(t0);
    });

    later(2600, function () { stepsAt(2).forEach(function (s) { s.classList.add('on'); }); });
    later(runStart + runMs, function () {
      stepsAt(3).forEach(function (s) { s.classList.add('on'); });
      clockN.textContent = String(MEDIAN);
      stage.setAttribute('data-state', 'done');
      playBtn.disabled = false;
      playBtn.textContent = 'Replay';
      playBtn.focus({ preventScroll: true });
    });
  }

  playBtn.addEventListener('click', play);

  function applyMotionPref() {
    if (mq.matches) {
      showFinal();
      playBtn.hidden = true;
    } else {
      playBtn.hidden = false;
      playBtn.disabled = false;
      playBtn.textContent = 'Play the night';
      showIdle();
    }
  }
  if (mqReal.addEventListener) mqReal.addEventListener('change', applyMotionPref);
  else if (mqReal.addListener) mqReal.addListener(applyMotionPref);
  applyMotionPref();
})();
