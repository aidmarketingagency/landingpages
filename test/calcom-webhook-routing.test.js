const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("Cal.com notifications use the workspace Telegram bot", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "netlify", "functions", "calcom-webhook.js"),
    "utf8",
  );

  assert.match(source, /process\.env\.TELEGRAM_WORKSPACE_BOT_TOKEN/);
  assert.doesNotMatch(source, /process\.env\.TELEGRAM_BOT_TOKEN/);
});
