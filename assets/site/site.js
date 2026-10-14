/* AID Marketing Agency site script. One deferred file for every page.
   Each feature starts only if its elements exist, inside its own try/catch.
   Features: menu toggle, placeholder links, the hero storyboard controller, scroll reveals with the
   two sourced count-ups (47 and 39), and the optional "inquiries you get each month" input.
   Numbers used: 0.47 (DelPrete, August 2024) and 39 minutes (DelPrete, August 2024).
   Nothing is stored or sent. Every timer and frame is cancelled under reduced motion. */
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

  /* ---- hero storyboard: autoplay once after load, Replay, end frame under reduced motion ---- */
  function initStoryboard() {
    var root = document.querySelector("[data-storyboard]");
    if (!root) { return; }
    var btn = root.querySelector("[data-sb-replay]");
    var frame = root.querySelector(".sb-frame") || root;
    var TOTAL_MS = 11600;
    var timer = 0;
    var raf = 0;
    var autoplayed = false;
    var io = null;

    function clear() {
      if (timer) { window.clearTimeout(timer); timer = 0; }
      if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
    }
    function setState(s) { root.setAttribute("data-state", s); }
    function showEnd() { clear(); setState("done"); }
    function play() {
      clear();
      if (reduced()) { showEnd(); return; }
      setState("idle");
      void root.offsetWidth;
      raf = window.requestAnimationFrame(function () {
        raf = 0;
        setState("playing");
        timer = window.setTimeout(function () { timer = 0; setState("done"); }, TOTAL_MS);
      });
    }
    function applyMotionPref() {
      if (reduced()) {
        if (io) { io.disconnect(); io = null; }
        autoplayed = true;
        root.setAttribute("data-motion", "off");
        showEnd();
      } else {
        root.setAttribute("data-motion", "on");
      }
    }

    if (btn) { btn.addEventListener("click", play); }
    onReduceChange(applyMotionPref);
    applyMotionPref();
    if (reduced()) { return; }

    afterLoad(function () {
      window.requestAnimationFrame(function () {
        if (autoplayed || reduced()) { return; }
        if ("IntersectionObserver" in window) {
          io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting && !autoplayed) {
                autoplayed = true;
                io.disconnect();
                io = null;
                play();
              }
            });
          }, { threshold: 0.3 });
          io.observe(frame);
        } else {
          autoplayed = true;
          play();
        }
      });
    });
  }

  /* ---- scroll reveals and the sourced count-ups (47%, 39 minutes) ---- */
  function initReveals() {
    var blocks = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
    if (!blocks.length) { return; }
    var frames = [];

    function counters(block) { return Array.prototype.slice.call(block.querySelectorAll("[data-count-to]")); }
    function finishAll() {
      frames.forEach(function (id) { window.cancelAnimationFrame(id); });
      frames = [];
      blocks.forEach(function (b) {
        b.classList.add("is-in");
        counters(b).forEach(function (el) { el.textContent = el.getAttribute("data-count-to"); });
      });
    }
    function countUp(el, ms) {
      var target = parseInt(el.getAttribute("data-count-to"), 10);
      if (!isFinite(target)) { return; }
      var t0 = null;
      el.textContent = "0";
      function tick(now) {
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
      counters(block).forEach(function (el) { countUp(el, 1500); });
    }

    if (reduced() || !("IntersectionObserver" in window)) { finishAll(); return; }
    document.documentElement.classList.add("js-ok");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { io.unobserve(entry.target); reveal(entry.target); }
      });
    }, { threshold: 0.3 });
    blocks.forEach(function (b) { io.observe(b); });
    onReduceChange(function () { if (reduced()) { io.disconnect(); finishAll(); } });
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
