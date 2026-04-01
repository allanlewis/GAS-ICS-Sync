const test = require("node:test");
const assert = require("node:assert/strict");

const { loadProject } = require("./support/load-project");

test("getValidTriggerFrequency normalizes unsupported minute values", () => {
  const context = loadProject();

  assert.equal(context.getValidTriggerFrequency(undefined), 15);
  assert.equal(context.getValidTriggerFrequency(2), 1);
  assert.equal(context.getValidTriggerFrequency(8), 10);
  assert.equal(context.getValidTriggerFrequency(27), 30);
});

test("condenseCalendarMap groups entries by target calendar", () => {
  const context = loadProject();
  const condensed = context.condenseCalendarMap([
    ["https://example.com/team.ics", "Work", "5"],
    ["https://example.com/personal.ics", "Home"],
    ["https://example.com/releases.ics", "Work", "9"],
  ]);

  assert.deepEqual(JSON.parse(JSON.stringify(condensed)), [
    [
      "Work",
      [
        ["https://example.com/team.ics", "5"],
        ["https://example.com/releases.ics", "9"],
      ],
    ],
    ["Home", [["https://example.com/personal.ics", null]]],
  ]);
});

test("parseNotificationTime converts duration strings into minutes", () => {
  const context = loadProject();

  assert.equal(context.parseNotificationTime("-PT15M"), 15);
  assert.equal(context.parseNotificationTime("PT2H"), 120);
  assert.equal(context.parseNotificationTime("P1DT3H"), 1620);
});

test("callWithBackoff retries recoverable failures and returns the eventual result", () => {
  const context = loadProject();
  let attempts = 0;

  const result = context.callWithBackoff(() => {
    attempts += 1;
    if (attempts < 3) {
      throw new Error("Rate limit exceeded");
    }

    return "ok";
  }, 5);

  assert.equal(result, "ok");
  assert.equal(attempts, 3);
});

test("callWithBackoff returns null for HTTP failures and rethrows non-recoverable errors", () => {
  const context = loadProject();

  assert.equal(
    context.callWithBackoff(() => {
      throw new Error("HTTP error 500 when accessing feed");
    }, 2),
    null,
  );

  assert.throws(
    () =>
      context.callWithBackoff(() => {
        throw new Error("Permission denied");
      }, 2),
    /Permission denied/,
  );
});

test("sendSummary renders and sends a condensed execution email", () => {
  let sentMessage = null;
  const context = loadProject({
    globals: {
      MailApp: {
        sendEmail(message) {
          sentMessage = message;
        },
      },
    },
  });

  context.CONFIG.email = "user@example.com";
  context.sendSummary({
    notifications: {
      addedEvents: [
        [["Planning", "2026-04-02T09:00:00Z"], "Work"],
        [["Retro", "2026-04-03T09:00:00Z"], "Work"],
      ],
      modifiedEvents: [[["Town Hall", "2026-04-04"], "Home"]],
      removedEvents: [],
    },
  });

  assert.equal(sentMessage.to, "user@example.com");
  assert.match(sentMessage.subject, /2 new, 1 modified, 0 deleted/);
  assert.match(sentMessage.htmlBody, /Work: 2 added events/);
  assert.match(sentMessage.htmlBody, /Town Hall at 2026-04-04/);
});
