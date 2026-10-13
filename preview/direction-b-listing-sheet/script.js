/* Listing Sheet preview: menu toggle and the Speed Check calculator.
   Numbers: 0.47 (DelPrete, S1) and 39 minutes (DelPrete, S2). Nothing else is computed or stored. */
(function () {
  "use strict";

  var NO_RESPONSE_SHARE = 0.47;
  var MEDIAN_MINUTES = 39;

  /* ---- menu ---- */
  try {
    var toggle = document.querySelector(".menu-toggle");
    var links = document.querySelector(".nav-links");
    if (toggle && links) {
      toggle.addEventListener("click", function () {
        var open = links.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && links.classList.contains("is-open")) {
          links.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
          toggle.focus();
        }
      });
    }
  } catch (err) {
    if (window.console) { console.warn("menu init failed", err); }
  }

  /* ---- placeholders never navigate in the preview ---- */
  var holders = document.querySelectorAll("a[data-placeholder]");
  for (var i = 0; i < holders.length; i++) {
    holders[i].addEventListener("click", function (e) { e.preventDefault(); });
  }

  /* ---- calculator ---- */
  var form = document.getElementById("calc");
  if (!form) { return; }

  var leadsInput = document.getElementById("leads");
  var minsInput = document.getElementById("mins");
  var leadsErr = document.getElementById("leads-err");
  var minsErr = document.getElementById("mins-err");
  var empty = document.getElementById("empty");
  var out1 = document.getElementById("out-1");
  var out1Text = document.getElementById("out-1-text");
  var out1Note = document.getElementById("out-1-note");
  var out2 = document.getElementById("out-2");
  var out2Text = document.getElementById("out-2-text");
  var sourceDel = document.getElementById("source-delprete");
  var tickMedian = document.getElementById("tick-median");
  var tickYours = document.getElementById("tick-yours");
  var tickYoursLabel = document.getElementById("tick-yours-label");

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
    var aTxt = fmt(a);
    var lead = "If your team matched the average in the DelPrete study, ";

    if (a < 1) {
      out1Text.textContent = lead + "fewer than one of those inquiries would get no response at all.";
    } else {
      out1Text.innerHTML = "";
      out1Text.appendChild(document.createTextNode(lead + "about "));
      var fig = document.createElement("span");
      fig.className = "fig";
      fig.textContent = aTxt;
      out1Text.appendChild(fig);
      out1Text.appendChild(document.createTextNode(" of your " + nTxt + " monthly inquiries would get no response at all."));
    }
    out1Note.textContent = "(That’s 47% of " + nTxt + ". It’s the study’s average across 100+ shops, and says nothing certain about your team.)";

    var verdict;
    if (minutes < MEDIAN_MINUTES) {
      verdict = "Your guess is faster than the 39-minute median first reply in the study. Count the real number before you trust it.";
    } else if (minutes === MEDIAN_MINUTES) {
      verdict = "That’s right at the median first reply in the study.";
    } else {
      verdict = "Your guess is slower than the 39-minute median first reply in the study.";
    }
    out2Text.textContent = verdict;

    var max = Math.max(60, Math.max(minutes, MEDIAN_MINUTES) * 1.25);
    var posMedian = (MEDIAN_MINUTES / max) * 100;
    var posYours = (minutes / max) * 100;
    place(tickMedian, posMedian, alignFor(posMedian));
    place(tickYours, posYours, alignFor(posYours));
    tickYoursLabel.textContent = "Your guess, " + fmt(minutes) + (minutes === 1 ? " min" : " min");

    empty.hidden = true;
    out1.hidden = false;
    out2.hidden = false;
    sourceDel.hidden = false;

    /* re-arm the settle animation on repeat presses */
    var nodes = [out1, out2, sourceDel];
    for (var k = 0; k < nodes.length; k++) {
      nodes[k].style.animation = "none";
      void nodes[k].offsetWidth;
      nodes[k].style.animation = "";
    }
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
      if (window.console) { console.warn("calculator failed", err); }
      setError(leadsInput, leadsErr, "Something went wrong. Reload the page and try again.");
    }
  });
})();
