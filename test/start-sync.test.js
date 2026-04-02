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
  assert.deepEqual(context.__logEntries.logger, [
    ["[WARN] Sync skipped: another iteration is already running."],
  ]);
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
  context.getOrCreateTargetCalendar = () => ({ id: "calendar-1" });
  context.Calendar.Events.list = () => ({ items: [] });
  context.Calendar.Settings.get = () => ({ value: "UTC" });
  context.parseSourceEvents = () => ["event-1", "event-2"];
  context.syncEvent = (event, calendarTz, calendarContext, sessionContext) => {
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
  context.sendExecutionSummary = () => {
    summarySent += 1;
  };

  const response = context.startSync();
  const payload = JSON.parse(response.content);

  assert.equal(response.mimeType, context.ContentService.MimeType.JSON);
  assert.equal(payload.addedEvents.length, 2);
  assert.equal(summarySent, 1);
  assert.equal(lock.released, true);
  assert.deepEqual(context.__logEntries.logger, [
    ["Starting sync: targetCalendars=1"],
    ["Fetched source feeds: calendar=Work sourceFeeds=1"],
    ["Resolved target calendar: calendar=Work calendarId=calendar-1"],
    ["Fetched managed events: calendar=Work calendarId=calendar-1 managedEvents=0"],
    ["Parsed source events: calendar=Work calendarId=calendar-1 sourceEvents=2"],
    ["Syncing events: calendar=Work calendarId=calendar-1 sourceEvents=2"],
    ["Processing deferred recurring instances: calendar=Work calendarId=calendar-1 deferredInstances=0"],
    ["Completed calendar sync: calendar=Work calendarId=calendar-1 sourceFeeds=1 sourceEvents=2 added=2 modified=0 removed=0 deferredInstances=0"],
    ["Sync finished: targetCalendars=1 added=2 modified=0 removed=0"],
  ]);
});
