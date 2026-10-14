/* AID Marketing Agency site script. One deferred file for every page.
   Each feature starts only if its elements exist, inside its own try/catch.
   Features: menu toggle, placeholder links, the hero storyboard controller, scroll reveals with the
   two sourced count-ups (47 and 39), and the optional "inquiries you get each month" input.
   Numbers used: 0.47 (DelPrete, August 2024) and 39 minutes (DelPrete, August 2024).
   Nothing is stored or sent.
   Motion rule: the storyboard ALWAYS plays, six beats on five frames, with the SAME beat lengths in both
   motion modes (every beat holds 4.5 s or more, crossfades are 600 ms in CSS). Under Reduce Motion it is
   plain opacity fades only; the count-ups stay at their final values. */
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
  function afterLoad(fn) {
    if (document.readyState === "complete") { fn(); }
    else { window.addEventListener("load", fn, { once: true }); }
  }

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

  /* ---- hero storyboard: six beats on five frames, always plays, Pause and Replay ----
     data-state: idle (waiting), playing, done (beat 6 settled). data-beat: 1 to 6 (beat 4 is the card
     flipping to Answered, on frame 3). data-paused="true" pauses the CSS animations (see site.css). */
  function initStoryboard() {
    var root = document.querySelector("[data-storyboard]");
    if (!root) { return; }
    var replayBtn = root.querySelector("[data-sb-replay]");
    var toggleBtn = root.querySelector("[data-sb-toggle]");
    var frame = root.querySelector(".sb-frame") || root;
    /* hold time per beat, the same in both motion modes; every beat is at least 4 s */
    var BEAT_MS = [4500, 4500, 4500, 4500, 5000, 5500];
    var LAST = BEAT_MS.length;
    var timer = 0;
    var raf = 0;
    var beat = 1;
    var remaining = 0;
    var startedAt = 0;
    var paused = false;
    var io = null;
    var started = false;

    function setState(s) { root.setAttribute("data-state", s); }
    function isPlaying() { return root.getAttribute("data-state") === "playing"; }
    function beatMs(n) { return BEAT_MS[n - 1]; }
    function clearTimers() {
      if (timer) { window.clearTimeout(timer); timer = 0; }
      if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
    }
    function schedule() {
      if (paused || !isPlaying()) { return; }
      startedAt = Date.now();
      timer = window.setTimeout(advance, Math.max(0, remaining));
    }
    function enterBeat(n) {
      beat = n;
      root.setAttribute("data-beat", String(n));
      remaining = beatMs(n);
      schedule();
    }
    function advance() {
      timer = 0;
      if (beat < LAST) { enterBeat(beat + 1); }
      else { finish(); }
    }
    function finish() {
      clearTimers();
      setState("done");
      if (toggleBtn) { toggleBtn.setAttribute("aria-disabled", "true"); }
    }
    function setPaused(p) {
      paused = p;
      if (p) {
        if (timer) {
          window.clearTimeout(timer);
          timer = 0;
          remaining -= Date.now() - startedAt;
        }
        root.setAttribute("data-paused", "true");
      } else {
        root.removeAttribute("data-paused");
        schedule();
      }
      if (toggleBtn) { toggleBtn.setAttribute("aria-pressed", p ? "true" : "false"); }
    }
    function begin() {
      clearTimers();
      setState("playing");
      enterBeat(1);
    }
    function replay() {
      clearTimers();
      started = true;
      if (io) { io.disconnect(); io = null; }
      if (toggleBtn) { toggleBtn.removeAttribute("aria-disabled"); }
      setPaused(false);
      setState("idle");
      beat = 1;
      root.setAttribute("data-beat", "1");
      void root.offsetWidth;
      raf = window.requestAnimationFrame(function () { raf = 0; begin(); });
    }
    function onToggle() {
      if (toggleBtn && toggleBtn.getAttribute("aria-disabled") === "true") { return; }
      setPaused(!paused);
    }

    /* the beat lengths are the same in both motion modes, so a motion-setting change needs no re-timing:
       CSS swaps the draws and flips for plain fades on its own */
    if (replayBtn) { replayBtn.addEventListener("click", replay); }
    if (toggleBtn) { toggleBtn.addEventListener("click", onToggle); }

    afterLoad(function () {
      window.requestAnimationFrame(function () {
        if (started) { return; }
        if ("IntersectionObserver" in window) {
          io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting && !started) {
                started = true;
                io.disconnect();
                io = null;
                begin();
              }
            });
          }, { threshold: 0.35 });
          io.observe(frame);
        } else {
          started = true;
          begin();
        }
      });
    });
  }

  /* ---- scroll reveals and the sourced count-ups (47%, 39 minutes) ----
     Under Reduce Motion the blocks still reveal (grid and bars fade, see site.css) but the numbers
     keep their final values: no count-up. */
  function initReveals() {
    var blocks = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
    if (!blocks.length) { return; }
    var frames = [];

    function counters(block) { return Array.prototype.slice.call(block.querySelectorAll("[data-count-to]")); }
    function finalNumbers() {
      frames.forEach(function (id) { window.cancelAnimationFrame(id); });
      frames = [];
      blocks.forEach(function (b) {
        counters(b).forEach(function (el) { el.textContent = el.getAttribute("data-count-to"); });
      });
    }
    function showAll() {
      blocks.forEach(function (b) { b.classList.add("is-in"); });
      finalNumbers();
    }
    function countUp(el, ms) {
      var target = parseInt(el.getAttribute("data-count-to"), 10);
      if (!isFinite(target)) { return; }
      var t0 = null;
      el.textContent = "0";
      function tick(now) {
        if (reduced()) { el.textContent = String(target); return; }
        if (t0 === null) { t0 = now; }
        var p = Math.min(1, (now - t0) / ms);
        var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        el.textContent = String(Math.round(eased * target));
        if (p < 1) { frames.push(window.requestAnimationFrame(tick)); }
      }
      frames.push(window.requestAnimationFrame(tick));
    }
    function reveal(block) {
      block.classList.add("is-in");
      if (!reduced()) { counters(block).forEach(function (el) { countUp(el, 1500); }); }
    }

    if (!("IntersectionObserver" in window)) { showAll(); return; }
    document.documentElement.classList.add("js-ok");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { io.unobserve(entry.target); reveal(entry.target); }
      });
    }, { threshold: 0.3 });
    blocks.forEach(function (b) { io.observe(b); });
    onReduceChange(function () { if (reduced()) { finalNumbers(); } });
  }

  /* ---- optional input: about N of yours, N x 0.47 rounded (benchmark, not a result) ---- */
  function initPerMonth() {
    var input = document.getElementById("per-month");
    var out = document.getElementById("yours");
    var err = document.getElementById("per-month-err");
    if (!input || !out) { return; }
    var SHARE = 0.47;
    function fmt(n) {
      try { return n.toLocaleString("en-US"); } catch (e) { return String(n); }
    }
    function clearOut() { out.textContent = ""; }
    function setErr(msg) {
      if (err) { err.textContent = msg; }
      if (msg) { input.setAttribute("aria-invalid", "true"); } else { input.removeAttribute("aria-invalid"); }
    }
    input.addEventListener("input", function () {
      var raw = String(input.value).replace(/[,\s]/g, "");
      if (raw === "") { setErr(""); clearOut(); return; }
      if (!/^\d+$/.test(raw)) { setErr("Enter a whole number."); clearOut(); return; }
      var n = parseInt(raw, 10);
      if (n < 1 || n > 100000000) { setErr("Enter a whole number."); clearOut(); return; }
      setErr("");
      var a = Math.round(n * SHARE);
      out.textContent = "";
      out.appendChild(document.createTextNode("About "));
      var fig = document.createElement("span");
      fig.className = "fig";
      fig.textContent = fmt(a);
      out.appendChild(fig);
      out.appendChild(document.createTextNode(" of yours"));
      var note = document.createElement("span");
      note.className = "small";
      note.textContent = "Study benchmark, not your team’s result.";
      out.appendChild(note);
    });
  }

  var inits = [initMenu, initPlaceholders, initStoryboard, initReveals, initPerMonth];
  inits.forEach(function (fn) {
    try { fn(); } catch (err) { warn(fn.name || "feature", err); }
  });
})();
