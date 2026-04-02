const test = require("node:test");
const assert = require("node:assert/strict");

const { loadProject } = require("./support/load-project");

test("formatLogMessage sorts metadata and stringifies objects", () => {
  const context = loadProject();

  assert.equal(
    context.formatLogMessage("sync", "Finished", {
      zeta: 2,
      alpha: "first",
      payload: { ok: true },
    }),
    '[sync] Finished alpha=first payload={"ok":true} zeta=2',
  );
});

test("logStructuredInfo emits console info and structured logger payload", () => {
  const context = loadProject();

  context.logStructuredInfo("sync", "Completed calendar sync", {
    calendar: "Work",
    added: 2,
  });

  assert.deepEqual(context.__logEntries.console.info, [
    ["[sync] Completed calendar sync added=2 calendar=Work"],
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(context.__logEntries.logger)), [
    [
      {
        message: "Completed calendar sync",
        component: "sync",
        added: 2,
        calendar: "Work",
      },
    ],
  ]);
});
