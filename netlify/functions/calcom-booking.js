// calcom-booking.js — cal.com API bridge for AIDHQ widget
//
// Routes:
//   GET  ?action=slots&days=7&timezone=America/New_York
//        → returns next available slots for Discovery Call event type 5976827
//   POST body {action:"book", name, email, timezone, start}
//        → creates a Discovery Call booking, returns {uid, bookingId, start, meetLink}
//   POST body {action:"cancel", uid, reason?}
//        → cancels booking, returns {uid, status}
//
// Env vars (set in Netlify site settings):
//   CAL_API_KEY  — cal.com API key (cal_live_...)
//
// CORS: allows all origins so the PayMeGPT webhook and any test client can call it.
// Auth: the CAL_API_KEY is server-side only; callers never see it.

const https = require("https");

const CAL_API_KEY = process.env.CAL_API_KEY;
const CAL_BASE = "api.cal.com";
const EVENT_TYPE_ID = 5976827;  // Discovery Call — live, schedule 2058514 baked in

// ── HTTPS helper ─────────────────────────────────────────────────────────────

function calRequest(method, path, queryParams, body) {
  return new Promise((resolve, reject) => {
    let pathname = path;
    if (queryParams && Object.keys(queryParams).length > 0) {
      const qs = new URLSearchParams(queryParams).toString();
      pathname = `${path}?${qs}`;
    }

    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: CAL_BASE,
      path: pathname,
      method,
      headers: {
        Authorization: `Bearer ${CAL_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "AID-AIOS/1.0",
      },
    };
    if (data) {
      options.headers["Content-Length"] = Buffer.byteLength(data);
    }

    const req = https.request(options, (res) => {
      let buf = "";
      res.on("data", (c) => (buf += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(buf) });
        } catch {
          resolve({ status: res.statusCode, body: buf });
        }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── Slot fetcher ──────────────────────────────────────────────────────────────

async function getSlots(days, timezone) {
  const tz = timezone || "America/New_York";
  const daysAhead = Math.min(parseInt(days, 10) || 7, 30);

  // Build start/end as ISO date strings in the user's local date
  const now = new Date();
  const startDate = now.toISOString().split("T")[0];
  const endDate = new Date(now.getTime() + daysAhead * 86400 * 1000)
    .toISOString()
    .split("T")[0];

  const resp = await calRequest("GET", "/v2/slots/available", {
    "cal-api-version": "2024-09-04",
    eventTypeId: EVENT_TYPE_ID,
    startTime: startDate,
    endTime: endDate,
    timeZone: tz,
  });

  if (resp.status >= 400) {
    throw new Error(`Cal.com slots error ${resp.status}: ${JSON.stringify(resp.body)}`);
  }

  // Shape: { data: { slots: { "YYYY-MM-DD": [{time: "ISO UTC"}] } } }
  const rawSlots = (resp.body.data || {}).slots || {};

  // Convert UTC times → human-readable ET labels grouped by date
  const formatted = [];
  const etFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  for (const [dateKey, slots] of Object.entries(rawSlots)) {
    if (!slots || slots.length === 0) continue;
    const dateLabel = dateFormatter.format(new Date(slots[0].time));
    const slotLabels = slots.map((s) => ({
      utc: s.time,
      label: etFormatter.format(new Date(s.time)) + " ET",
    }));
    formatted.push({ date: dateKey, dateLabel, slots: slotLabels });
  }

  return { eventTypeId: EVENT_TYPE_ID, timezone: tz, days: formatted };
}

// ── Booking creator ───────────────────────────────────────────────────────────

async function createBooking({ name, email, timezone, start, notes }) {
  if (!name || !email || !start) {
    throw new Error("book action requires: name, email, start (ISO UTC)");
  }
  const tz = timezone || "America/New_York";

  const resp = await calRequest(
    "POST",
    "/v2/bookings",
    { "cal-api-version": "2024-08-13" },
    {
      eventTypeId: EVENT_TYPE_ID,
      start,
      attendee: {
        name,
        email,
        timeZone: tz,
      },
      ...(notes ? { bookingFieldsResponses: { notes } } : {}),
      metadata: { source: "aidhq-widget" },
    }
  );

  // Cal.com returns 201 on success
  if (resp.status >= 400) {
    throw new Error(`Cal.com booking error ${resp.status}: ${JSON.stringify(resp.body)}`);
  }

  const bk = resp.body.data || resp.body;
  const meetLink =
    bk.meetingUrl ||
    (Array.isArray(bk.references) &&
      bk.references.find((r) => r.type === "google_meet")?.meetingUrl) ||
    null;

  return {
    uid: bk.uid,
    bookingId: bk.id,
    status: bk.status,
    start: bk.start,
    end: bk.end,
    meetLink,
    attendee: { name, email },
  };
}

// ── Booking canceller ─────────────────────────────────────────────────────────

async function cancelBooking({ uid, reason }) {
  if (!uid) throw new Error("cancel action requires: uid");
  const cancellationReason = reason || "Cancelled via AIDHQ widget";

  const resp = await calRequest(
    "POST",
    `/v2/bookings/${uid}/cancel`,
    { "cal-api-version": "2024-08-13" },
    { cancellationReason }
  );

  if (resp.status >= 400) {
    throw new Error(`Cal.com cancel error ${resp.status}: ${JSON.stringify(resp.body)}`);
  }

  const bk = resp.body.data || resp.body;
  return {
    uid,
    status: bk.status || "cancelled",
    cancellationReason,
  };
}

// ── CORS headers ──────────────────────────────────────────────────────────────

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ── Handler ───────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  // Preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  if (!CAL_API_KEY) {
    return {
      statusCode: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "CAL_API_KEY not configured" }),
    };
  }

  const method = event.httpMethod;
  const qs = event.queryStringParameters || {};

  try {
    // ── GET: list available slots ────────────────────────────────────────────
    if (method === "GET") {
      const action = qs.action || "slots";
      if (action !== "slots") {
        return {
          statusCode: 400,
          headers: { ...CORS, "Content-Type": "application/json" },
          body: JSON.stringify({ error: "GET only supports action=slots" }),
        };
      }
      const data = await getSlots(qs.days, qs.timezone);
      return {
        statusCode: 200,
        headers: { ...CORS, "Content-Type": "application/json" },
        body: JSON.stringify({ ok: true, ...data }),
      };
    }

    // ── POST: book or cancel ─────────────────────────────────────────────────
    if (method === "POST") {
      let payload;
      try {
        payload = JSON.parse(event.body || "{}");
      } catch {
        return {
          statusCode: 400,
          headers: { ...CORS, "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Invalid JSON body" }),
        };
      }

      const action = payload.action || qs.action;

      if (action === "book") {
        const data = await createBooking(payload);
        return {
          statusCode: 201,
          headers: { ...CORS, "Content-Type": "application/json" },
          body: JSON.stringify({ ok: true, action: "booked", ...data }),
        };
      }

      if (action === "cancel") {
        const data = await cancelBooking(payload);
        return {
          statusCode: 200,
          headers: { ...CORS, "Content-Type": "application/json" },
          body: JSON.stringify({ ok: true, action: "cancelled", ...data }),
        };
      }

      return {
        statusCode: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "POST body.action must be 'book' or 'cancel'",
        }),
      };
    }

    return {
      statusCode: 405,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  } catch (err) {
    console.error("[calcom-booking] error:", err.message);
    return {
      statusCode: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
