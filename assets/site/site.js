/* AID Marketing Agency site script. One deferred file for every page.
   Each feature starts only if its elements exist, inside its own try/catch.
   Features: menu toggle, placeholder links, the 39-minute count-up, the demo timeline, the calculator.
   Numbers used: 0.47 (DelPrete, S1) and 39 minutes (DelPrete, S2). Nothing is stored or sent. */
(function () {
  "use strict";

  var reduceQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function reduced() { return !!(reduceQuery && reduceQuery.matches); }
  function onReduceChange(fn) {
    if (!reduceQuery) { return; }
    if (reduceQuery.addEventListener) { reduceQuery.addEventListener("change", fn); }
    else if (reduceQuery.addListener) { reduceQuery.addListener(fn); }
  }
  function warn(name, err) { if (window.console) { console.warn(name + " init failed", err); } }

  /* ---- menu toggle, closes on Escape and on outside click ---- */
  function initMenu() {
    var toggle = document.querySelector(".menu-toggle");
    var links = document.querySelector(".nav-links");
    if (!toggle || !links) { return; }
    function setOpen(open) {
      links.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }
    toggle.addEventListener("click", function () { setOpen(!links.classList.contains("is-open")); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && links.classList.contains("is-open")) { setOpen(false); toggle.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (links.classList.contains("is-open") && !links.contains(e.target) && !toggle.contains(e.target)) { setOpen(false); }
    });
  }

  /* ---- placeholder links never navigate; the note beside them answers the click ---- */
  function initPlaceholders() {
    var holders = document.querySelectorAll("a[data-placeholder]");
    Array.prototype.forEach.call(holders, function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var note = a.parentNode ? a.parentNode.querySelector(".pending") : null;
        if (!note) { return; }
        note.classList.add("is-flash");
        window.setTimeout(function () { note.classList.remove("is-flash"); }, 1400);
      });
    });
  }

  /* ---- the one sourced count-up: 0 to 39, once, on first view ---- */
  function initCountUp() {
    var el = document.querySelector("[data-count-to]");
    if (!el) { return; }
    var target = parseInt(el.getAttribute("data-count-to"), 10);
    if (!isFinite(target) || !("IntersectionObserver" in window)) { return; }
    var started = false;
    var raf = 0;
    function finish() {
      if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
      el.textContent = String(target);
    }
    function run() {
      var t0 = null;
      var ms = 1200;
      el.textContent = "0";
      function tick(now) {
        if (t0 === null) { t0 = now; }
        var p = Math.min(1, (now - t0) / ms);
        var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        el.textContent = String(Math.round(eased * target));
        if (p < 1) { raf = window.requestAnimationFrame(tick); } else { raf = 0; }
      }
      raf = window.requestAnimationFrame(tick);
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !started) {
          started = true;
          io.disconnect();
          if (!reduced()) { run(); }
        }
      });
    }, { threshold: 0.6 });
    io.observe(el);
    onReduceChange(function () { if (reduced()) { finish(); } });
  }

  /* ---- demo timeline ---- */
  function initDemo() {
    var root = document.querySelector("[data-demo]");
    if (!root) { return; }
    var btn = root.querySelector("[data-demo-play]");
    var steps = Array.prototype.slice.call(root.querySelectorAll("[data-step]"));
    var rows = Array.prototype.slice.call(root.querySelectorAll("[data-score]"));
    if (!btn || !steps.length) { return; }

    var timers = [];
    var state = "idle";
    var hasPlayed = false;

    function clearTimers() {
      timers.forEach(function (t) { window.clearTimeout(t); });
      timers = [];
    }
    function later(ms, fn) { timers.push(window.setTimeout(fn, ms)); }
    function setActive(i) {
      steps.forEach(function (s, k) {
        if (k === i) { s.classList.add("is-active"); s.setAttribute("aria-current", "step"); }
        else { s.classList.remove("is-active"); s.removeAttribute("aria-current"); }
      });
    }
    function setBtn(label, busy) {
      btn.textContent = label;
      if (busy) { btn.setAttribute("aria-disabled", "true"); } else { btn.removeAttribute("aria-disabled"); }
    }

    function showIdle() {
      clearTimers();
      state = "idle";
      root.setAttribute("data-state", "idle");
      steps.forEach(function (s) { s.classList.remove("is-on"); });
      rows.forEach(function (r) { r.classList.remove("is-checked"); });
      setActive(-1);
      setBtn("Play the night", false);
    }
    function showFinal() {
      clearTimers();
      state = "done";
      root.setAttribute("data-state", "done");
      steps.forEach(function (s) { s.classList.add("is-on"); });
      rows.forEach(function (r) { r.classList.add("is-checked"); });
      setActive(-1);
      setBtn("Replay", false);
    }

    function play() {
      if (state === "playing") { return; }
      if (reduced()) { showFinal(); return; }
      showIdle();
      state = "playing";
      hasPlayed = true;
      root.setAttribute("data-state", "playing");
      setBtn("Playing", true);
      var gaps = [0, 1400, 2900, 4400];
      steps.forEach(function (s, i) {
        later(gaps[i] === undefined ? 4400 + (i - 3) * 1400 : gaps[i], function () {
          s.classList.add("is-on");
          setActive(i);
        });
      });
      var last = (gaps[steps.length - 1] === undefined ? 4400 : gaps[steps.length - 1]);
      rows.forEach(function (r, i) {
        later(last + 500 + i * 500, function () { r.classList.add("is-checked"); });
      });
      later(last + 500 + rows.length * 500 + 600, function () {
        state = "done";
        root.setAttribute("data-state", "done");
        setActive(-1);
        setBtn("Replay", false);
      });
    }

    btn.addEventListener("click", function (e) {
      if (btn.getAttribute("aria-disabled") === "true") { e.preventDefault(); return; }
      play();
    });

    function applyMotionPref() {
      if (reduced()) { btn.hidden = true; showFinal(); }
      else { btn.hidden = false; showIdle(); }
    }
    onReduceChange(applyMotionPref);
    applyMotionPref();

    /* re-arm on scroll re-entry: leaving the view cancels anything in flight and resets to idle */
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting && hasPlayed && !reduced() && state !== "idle") { showIdle(); }
        });
      }, { threshold: 0 });
      io.observe(root);
    }
  }

  /* ---- calculator ---- */
  function initCalculator() {
    var form = document.getElementById("calc");
    if (!form) { return; }

    var NO_RESPONSE_SHARE = 0.47;
    var MEDIAN_MINUTES = 39;

    var leadsInput = document.getElementById("leads");
    var minsInput = document.getElementById("mins");
    var leadsErr = document.getElementById("leads-err");
    var minsErr = document.getElementById("mins-err");
    var empty = document.getElementById("empty");
    var preview = document.getElementById("preview");
    var bench = document.getElementById("bench");
    var out1 = document.getElementById("out-1");
    var out1Text = document.getElementById("out-1-text");
    var out1Note = document.getElementById("out-1-note");
    var out2 = document.getElementById("out-2");
    var out2Text = document.getElementById("out-2-text");
    var sourceDel = document.getElementById("source-delprete");
    var tickMedian = document.getElementById("tick-median");
    var tickYours = document.getElementById("tick-yours");
    var tickYoursLabel = document.getElementById("tick-yours-label");
    var shown = false;

    function fmt(n) {
      try { return n.toLocaleString("en-US", { maximumFractionDigits: 2 }); } catch (e) { return String(n); }
    }
    function setError(input, el, msg) {
      el.textContent = msg;
      if (msg) { input.setAttribute("aria-invalid", "true"); } else { input.removeAttribute("aria-invalid"); }
    }
    function parseLeads(raw) {
      var s = String(raw).replace(/[,\s]/g, "");
      if (!/^\d+$/.test(s)) { return null; }
      var n = parseInt(s, 10);
      return n >= 1 && n <= 100000000 ? n : null;
    }
    function parseMinutes(raw) {
      var s = String(raw).replace(/[,\s]/g, "");
      if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) { return null; }
      var n = parseFloat(s);
      return isFinite(n) && n >= 0 && n <= 100000000 ? n : null;
    }
    function place(tick, pos, align) {
      tick.style.setProperty("--pos", String(pos));
      if (align) { tick.setAttribute("data-align", align); } else { tick.removeAttribute("data-align"); }
    }
    function alignFor(pos) { return pos < 14 ? "start" : (pos > 86 ? "end" : ""); }

    function render(n, minutes) {
      var a = Math.round(n * NO_RESPONSE_SHARE);
      var nTxt = fmt(n);
      var lead = "If your team matched the average in the DelPrete study, ";

      out1Text.textContent = "";
      if (a < 1) {
        out1Text.appendChild(document.createTextNode(lead + "fewer than one of those inquiries would get no response at all."));
      } else {
        out1Text.appendChild(document.createTextNode(lead + "about "));
        var fig = document.createElement("span");
        fig.className = "fig";
        fig.textContent = fmt(a);
        out1Text.appendChild(fig);
        out1Text.appendChild(document.createTextNode(" of your " + nTxt + " monthly inquiries would get no response at all."));
      }
      out1Note.textContent = "(That’s 47% of " + nTxt + ". It’s the study’s average across 100+ shops, and says nothing certain about your team.)";

      if (minutes < MEDIAN_MINUTES) {
        out2Text.textContent = "Your guess is faster than the 39-minute median first reply in the study. Count the real number before you trust it.";
      } else if (minutes === MEDIAN_MINUTES) {
        out2Text.textContent = "That’s right at the median first reply in the study.";
      } else {
        out2Text.textContent = "Your guess is slower than the 39-minute median first reply in the study.";
      }

      var max = Math.max(60, Math.max(minutes, MEDIAN_MINUTES) * 1.25);
      var posMedian = (MEDIAN_MINUTES / max) * 100;
      var posYours = (minutes / max) * 100;
      tickYoursLabel.textContent = "Your guess, " + fmt(minutes) + " min";
      place(tickMedian, posMedian, alignFor(posMedian));

      var firstShow = !shown;
      empty.hidden = true;
      if (preview) { preview.hidden = true; }
      bench.hidden = false;
      out1.hidden = false;
      out2.hidden = false;
      sourceDel.hidden = false;
      shown = true;

      if (firstShow) {
        /* start the "yours" marker at the left end, commit that, then let it slide into place */
        place(tickYours, 0, "start");
        void tickYours.offsetWidth;
      }
      place(tickYours, posYours, alignFor(posYours));
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      try {
        var n = parseLeads(leadsInput.value);
        var m = parseMinutes(minsInput.value);
        setError(leadsInput, leadsErr, n === null ? "Enter a whole number of inquiries." : "");
        setError(minsInput, minsErr, m === null ? "Enter a number of minutes." : "");
        if (n === null) { leadsInput.focus(); return; }
        if (m === null) { minsInput.focus(); return; }
        render(n, m);
      } catch (err) {
        warn("calculator", err);
        setError(leadsInput, leadsErr, "Something went wrong. Reload the page and try again.");
      }
    });
  }

  var inits = [initMenu, initPlaceholders, initCountUp, initDemo, initCalculator];
  inits.forEach(function (fn) {
    try { fn(); } catch (err) { warn(fn.name || "feature", err); }
  });
})();
