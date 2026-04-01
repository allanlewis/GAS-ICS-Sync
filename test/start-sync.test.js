const test = require("node:test");
const assert = require("node:assert/strict");

const { createScriptLock } = require("./support/apps-script-runtime");
const { loadProject } = require("./support/load-project");

test("startSync returns a text response when another run already holds the lock", () => {
  const lock = createScriptLock();
  lock.tryLock = () => false;

  const context = loadProject({ lock });
  const response = context.startSync();

  assert.equal(response.content, "Another iteration is currently running!");
  assert.equal(response.mimeType, context.ContentService.MimeType.TEXT);
  assert.equal(lock.released, false);
});

test("startSync orchestrates one calendar sync and releases the lock", () => {
  const lock = createScriptLock();
  const context = loadProject({ lock });
  let summarySent = 0;

  context.CONFIG.sourceCalendars = [["https://example.com/feed.ics", "Work"]];
  context.CONFIG.addEventsToCalendar = true;
  context.CONFIG.modifyExistingEvents = false;
  context.CONFIG.removeEventsFromCalendar = false;
  context.CONFIG.emailSummary = true;
  context.CONFIG.email = "user@example.com";

  context.fetchSourceCalendars = () => [
    ["BEGIN:VCALENDAR\r\nEND:VCALENDAR", "5"],
  ];
  context.setupTargetCalendar = () => ({ id: "calendar-1" });
  context.Calendar.Events.list = () => ({ items: [] });
  context.Calendar.Settings.get = () => ({ value: "UTC" });
  context.parseResponses = () => ["event-1", "event-2"];
  context.processEvent = (
    event,
    calendarTz,
    calendarContext,
    sessionContext,
  ) => {
    assert.equal(calendarTz, "UTC");
    context.recordSyncChange(
      sessionContext.notifications.addedEvents,
      calendarContext.targetCalendarName,
      {
        summary: `Summary for ${event}`,
        start: { dateTime: "2026-04-02T09:00:00Z" },
      },
    );
  };
  context.sendSummary = () => {
    summarySent += 1;
  };

  const response = context.startSync();
  const payload = JSON.parse(response.content);

  assert.equal(response.mimeType, context.ContentService.MimeType.JSON);
  assert.equal(payload.addedEvents.length, 2);
  assert.equal(summarySent, 1);
  assert.equal(lock.released, true);
});
