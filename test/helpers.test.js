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

test("runWithBackoff retries recoverable failures and returns the eventual result", () => {
  const context = loadProject();
  let attempts = 0;

  const result = context.runWithBackoff(() => {
    attempts += 1;
    if (attempts < 3) {
      throw new Error("Rate limit exceeded");
    }

    return "ok";
  }, 5);

  assert.equal(result, "ok");
  assert.equal(attempts, 3);
});

test("runWithBackoff applies retry jitter to the sleep duration", () => {
  const context = loadProject();
  let sleptFor = null;

  context.Utilities.sleep = (duration) => {
    sleptFor = duration;
  };
  context.Math.random = () => 0.5;

  let attempts = 0;
  const result = context.runWithBackoff(() => {
    attempts += 1;
    if (attempts === 1) {
      throw new Error("Internal error");
    }

    return "ok";
  }, 1);

  assert.equal(result, "ok");
  assert.equal(sleptFor, 250);
});

test("runWithBackoff returns null for HTTP failures and rethrows non-recoverable errors", () => {
  const context = loadProject();

  assert.equal(
    context.runWithBackoff(() => {
      throw new Error("HTTP error 500 when accessing feed");
    }, 2),
    null,
  );

  assert.throws(
    () =>
      context.runWithBackoff(() => {
        throw new Error("Permission denied");
      }, 2),
    /Permission denied/,
  );
});

test("sendExecutionSummary renders and sends a condensed execution email", () => {
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
  context.sendExecutionSummary({
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
  assert.deepEqual(context.__logEntries.logger, [
    ["Sending execution summary email: added=2 modified=1 removed=0"],
  ]);
});

test("removeMissingEvents deletes only missing non-recurring managed events", () => {
  const removed = [];
  const context = loadProject({
    globals: {
      Calendar: {
        Events: {
          remove(calendarId, eventId) {
            removed.push([calendarId, eventId]);
          },
        },
      },
    },
  });

  context.CONFIG.emailSummary = true;
  context.CONFIG.email = "user@example.com";

  const sessionContext = {
    notifications: {
      addedEvents: [],
      modifiedEvents: [],
      removedEvents: [],
    },
  };
  const calendarContext = {
    targetCalendarId: "calendar-1",
    targetCalendarName: "Work",
    icsEventIds: ["keep-1", "series-1_20260402T090000Z"],
    managedEvents: {
      events: [
        {
          id: "managed-keep",
          summary: "Keep",
          start: { dateTime: "2026-04-02T09:00:00Z" },
          extendedProperties: {
            private: {
              id: "keep-1",
            },
          },
        },
        {
          id: "managed-remove",
          summary: "Remove",
          start: { dateTime: "2026-04-03T09:00:00Z" },
          extendedProperties: {
            private: {
              id: "remove-1",
            },
          },
        },
        {
          id: "managed-instance",
          summary: "Recurring instance",
          start: { dateTime: "2026-04-04T09:00:00Z" },
          recurringEventId: "20260404T090000Z",
          extendedProperties: {
            private: {
              id: "series-1",
              "rec-id": "series-1_20260404T090000Z",
            },
          },
        },
      ],
    },
  };

  context.removeMissingEvents(calendarContext, sessionContext);

  assert.deepEqual(removed, [["calendar-1", "managed-remove"]]);
  assert.deepEqual(
    JSON.parse(JSON.stringify(sessionContext.notifications.removedEvents)),
    [[["Remove", "2026-04-03T09:00:00Z"], "Work"]],
  );
  assert.deepEqual(context.__logEntries.logger, [
    [
      "Deleting managed event: calendar=Work eventId=remove-1 summary=Remove start=2026-04-03T09:00:00Z",
    ],
  ]);
});

test("findRecurringEventInstance ignores non-managed matches and falls back by parent id", () => {
  const listCalls = [];
  const context = loadProject({
    globals: {
      Calendar: {
        Events: {
          list(calendarId, query) {
            listCalls.push([calendarId, query]);
            if (listCalls.length === 1) {
              return {
                items: [
                  {
                    id: "foreign-instance",
                    extendedProperties: { private: { fromGAS: "false" } },
                  },
                ],
              };
            }

            return {
              items: [
                {
                  id: "managed-instance",
                  extendedProperties: { private: { fromGAS: "true" } },
                },
              ],
            };
          },
        },
      },
    },
  });

  const recEvent = {
    recurringEventId: "20260405T090000Z",
    extendedProperties: {
      private: {
        id: "series-1",
      },
    },
  };

  const matches = context.findRecurringEventInstance("calendar-1", recEvent);

  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, "managed-instance");
  assert.deepEqual(JSON.parse(JSON.stringify(listCalls)), [
    [
      "calendar-1",
      {
        singleEvents: true,
        privateExtendedProperty: "rec-id=series-1_20260405T090000Z",
      },
    ],
    [
      "calendar-1",
      {
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 1,
        timeMin: "20260405T090000Z",
        privateExtendedProperty: "id=series-1",
      },
    ],
  ]);
});

test("upsertRecurringEventInstance updates the matching managed recurring event", () => {
  const updates = [];
  const context = loadProject();

  context.findRecurringEventInstance = () => [{ id: "managed-instance" }];
  context.Calendar.Events.update = (event, calendarId, eventId) => {
    updates.push([event, calendarId, eventId]);
  };

  const recEvent = {
    recurringEventId: "20260405T090000Z",
    extendedProperties: {
      private: {
        id: "series-1",
      },
    },
  };

  context.upsertRecurringEventInstance(recEvent, {
    targetCalendarId: "calendar-1",
  });

  assert.equal(updates.length, 1);
  assert.equal(updates[0][1], "calendar-1");
  assert.equal(updates[0][2], "managed-instance");
  assert.deepEqual(context.__logEntries.logger, [
    [
      "Processing recurring instance: eventId=series-1 recurrenceId=20260405T090000Z summary=(no summary) start=(no start)",
    ],
    [
      "Updating recurring instance: eventId=series-1 recurrenceId=20260405T090000Z matchedEventId=managed-instance",
    ],
  ]);
});
