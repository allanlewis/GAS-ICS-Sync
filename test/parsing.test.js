const test = require("node:test");
const assert = require("node:assert/strict");

const { loadProject } = require("./support/load-project");

test("parseSourceEvents adds metadata, filters cancelled events, and tracks managed ids", () => {
  const context = loadProject();
  const sessionContext = context.createSessionContext();
  const calendarContext = context.createCalendarContext("Target");
  const responses = [
    [
      [
        "BEGIN:VCALENDAR",
        "X-WR-CALNAME:Imported Feed",
        "BEGIN:VEVENT",
        "SUMMARY:Planning",
        "DTSTART:20260402T090000Z",
        "DTEND:20260402T100000Z",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "UID:cancelled-1",
        "SUMMARY:Cancelled",
        "STATUS:CANCELLED",
        "DTSTART:20260403T090000Z",
        "DTEND:20260403T100000Z",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n"),
      "11",
    ],
  ];

  const events = context.parseSourceEvents(
    responses,
    calendarContext,
    sessionContext,
  );

  assert.equal(events.length, 1);
  assert.equal(events[0].getFirstPropertyValue("parentCal"), "Imported Feed");
  assert.equal(events[0].getFirstPropertyValue("color"), "11");
  assert.equal(calendarContext.icsEventIds.length, 1);
  assert.match(calendarContext.icsEventIds[0], /.+/);
});
