const test = require("node:test");
const assert = require("node:assert/strict");

const { loadProject } = require("./support/load-project");
const { getVevents } = require("./support/ical");

test("applyConfiguredFilters honors include and exclude filters together", () => {
  const context = loadProject();
  const events = getVevents(
    context,
    [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:keep-1",
      "SUMMARY:Team Sync",
      "CATEGORIES:Meetings",
      "DTSTART:20260402T090000Z",
      "DTEND:20260402T100000Z",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "UID:drop-1",
      "SUMMARY:Cancelled Team Sync",
      "CATEGORIES:Meetings",
      "DTSTART:20260403T090000Z",
      "DTEND:20260403T100000Z",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "UID:drop-2",
      "SUMMARY:Personal Errand",
      "CATEGORIES:Personal",
      "DTSTART:20260404T090000Z",
      "DTEND:20260404T100000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n"),
  );

  context.filters = [
    {
      parameter: "categories",
      type: "include",
      comparison: "equals",
      criterias: ["Meetings"],
    },
    {
      parameter: "summary",
      type: "exclude",
      comparison: "contains",
      criterias: ["Cancelled"],
    },
  ];

  const filtered = context.applyConfiguredFilters(events);

  assert.deepEqual(
    Array.from(filtered, (event) =>
      event.getFirstPropertyValue("uid").toString(),
    ),
    ["keep-1"],
  );
});

test("compareDateFilter supports relative date offsets", () => {
  const context = loadProject();
  const [event] = getVevents(
    context,
    [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:future-1",
      "SUMMARY:Future Event",
      "DTSTART:20990101T090000Z",
      "DTEND:20990101T100000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n"),
  );

  assert.equal(
    context.compareDateFilter(event, {
      parameter: "dtstart",
      comparison: ">",
      offset: 14,
    }),
    true,
  );
});
