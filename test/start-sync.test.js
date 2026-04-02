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
  assert.deepEqual(context.__logEntries.console.warn, [
    ["[sync] Sync skipped: another iteration is already running."],
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
  assert.deepEqual(context.__logEntries.console.info, [
    ["[sync] Starting sync targetCalendars=1"],
    ["[fetch] Fetched source feeds calendar=Work sourceFeeds=1"],
    ["[sync] Resolved target calendar calendar=Work calendarId=calendar-1"],
    [
      "[sync] Fetched managed events calendar=Work calendarId=calendar-1 managedEvents=0",
    ],
    [
      "[sync] Parsed source events calendar=Work calendarId=calendar-1 sourceEvents=2",
    ],
    [
      "[sync] Syncing events calendar=Work calendarId=calendar-1 sourceEvents=2",
    ],
    [
      "[recurrence] Processing deferred recurring instances calendar=Work calendarId=calendar-1 deferredInstances=0",
    ],
    [
      "[sync] Completed calendar sync added=2 calendar=Work calendarId=calendar-1 deferredInstances=0 modified=0 removed=0 sourceEvents=2 sourceFeeds=1",
    ],
    ["[sync] Sync finished added=2 modified=0 removed=0 targetCalendars=1"],
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(context.__logEntries.logger)), [
    [
      {
        message: "Completed calendar sync",
        component: "sync",
        added: 2,
        calendar: "Work",
        calendarId: "calendar-1",
        deferredInstances: 0,
        modified: 0,
        removed: 0,
        sourceEvents: 2,
        sourceFeeds: 1,
      },
    ],
    [
      {
        message: "Sync finished",
        component: "sync",
        added: 2,
        modified: 0,
        removed: 0,
        targetCalendars: 1,
      },
    ],
  ]);
});
