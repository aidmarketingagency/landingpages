// calcom-webhook.js — receives Cal.com booking events
// Writes to Supabase bookings table + fires Telegram alert to Ryan
//
// Triggers: BOOKING_CREATED, BOOKING_RESCHEDULED, BOOKING_CANCELLED
// Env vars required (set in Netlify site settings):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   TELEGRAM_BOT_TOKEN, TELEGRAM_OWNER_CHAT_ID
//   CALCOM_WEBHOOK_SECRET (optional — enables signature verification)

const https = require("https");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_OWNER_CHAT_ID;
const WEBHOOK_SECRET = process.env.CALCOM_WEBHOOK_SECRET;

// ── Helpers ──────────────────────────────────────────────────────────────────

function post(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      { hostname, path, method: "POST", headers: { ...headers, "Content-Length": Buffer.byteLength(data) } },
      (res) => {
        let buf = "";
        res.on("data", (c) => (buf += c));
        res.on("end", () => resolve({ status: res.statusCode, body: buf }));
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function writeBooking(payload) {
  const attendee = (payload.attendees || [])[0] || {};
  const row = {
    booking_uid: payload.uid,
    event_type_id: payload.eventTypeId || null,
    event_type_title: payload.type || payload.title || null,
    status: (payload.status || "ACCEPTED").toUpperCase(),
    start_time: payload.startTime || null,
    end_time: payload.endTime || null,
    attendee_name: attendee.name || null,
    attendee_email: attendee.email || null,
    attendee_timezone: attendee.timeZone || null,
    organizer_email: (payload.organizer || {}).email || null,
    location: typeof payload.location === "string" ? payload.location : JSON.stringify(payload.location || ""),
    cancel_reason: payload.cancellationReason || null,
    reschedule_reason: payload.rescheduleReason || null,
    raw_payload: payload,
    created_at: new Date().toISOString(),
  };

  return post(
    new URL(SUPABASE_URL).hostname,
    "/rest/v1/bookings",
    {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "resolution=merge-duplicates",
    },
    row
  );
}

async function sendTelegram(text) {
  return post(
    "api.telegram.org",
    `/bot${TELEGRAM_TOKEN}/sendMessage`,
    { "Content-Type": "application/json" },
    { chat_id: TELEGRAM_CHAT_ID, text, parse_mode: "HTML" }
  );
}

function formatAlert(trigger, payload) {
  const attendee = (payload.attendees || [])[0] || {};
  const name = attendee.name || "Unknown";
  const email = attendee.email || "";
  const start = payload.startTime
    ? new Date(payload.startTime).toLocaleString("en-US", {
        timeZone: "America/New_York",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "TBD";

  const icons = {
    BOOKING_CREATED: "📅",
    BOOKING_RESCHEDULED: "🔄",
    BOOKING_CANCELLED: "❌",
  };
  const icon = icons[trigger] || "📌";
  const action = trigger.replace("BOOKING_", "").toLowerCase();

  return (
    `${icon} <b>Discovery Call ${action}</b>\n` +
    `👤 ${name}` + (email ? ` · ${email}` : "") + `\n` +
    `🕐 ${start} ET\n` +
    (payload.cancellationReason ? `Reason: ${payload.cancellationReason}\n` : "") +
    (payload.rescheduleReason ? `Reason: ${payload.rescheduleReason}\n` : "") +
    `\n<code>uid: ${payload.uid || "n/a"}</code>`
  );
}

// ── Handler ──────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Optional signature verification
  if (WEBHOOK_SECRET) {
    const sig = event.headers["x-cal-signature-256"] || "";
    const crypto = require("crypto");
    const expected = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(event.body || "")
      .digest("hex");
    if (sig !== expected) {
      return { statusCode: 401, body: "Invalid signature" };
    }
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const trigger = payload.triggerEvent || "UNKNOWN";
  const bookingPayload = payload.payload || payload;

  const errors = [];

  // Write to Supabase
  try {
    const result = await writeBooking(bookingPayload);
    if (result.status >= 400) {
      errors.push(`Supabase ${result.status}: ${result.body}`);
    }
  } catch (e) {
    errors.push(`Supabase error: ${e.message}`);
  }

  // Fire Telegram alert
  try {
    const text = formatAlert(trigger, bookingPayload);
    await sendTelegram(text);
  } catch (e) {
    errors.push(`Telegram error: ${e.message}`);
  }

  if (errors.length) {
    console.error("Webhook errors:", errors);
    return { statusCode: 500, body: JSON.stringify({ errors }) };
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true, trigger }) };
};
