const test = require("node:test");
const assert = require("node:assert/strict");

const { loadProject } = require("./support/load-project");

test("createManagedEventState indexes managed ids and recurrence ids", () => {
  const context = loadProject();
  const state = context.createManagedEventState([
    {
      extendedProperties: {
        private: {
          id: "event-1",
          MD5: "digest-1",
        },
      },
    },
    {
      extendedProperties: {
        private: {
          id: "series-1",
          "rec-id": "series-1_20260401T090000Z",
          MD5: "digest-2",
        },
      },
    },
  ]);

  assert.equal(
    state.eventsByManagedId["event-1"].extendedProperties.private.id,
    "event-1",
  );
  assert.equal(
    state.eventsByManagedId["series-1_20260401T090000Z"].extendedProperties
      .private.id,
    "series-1",
  );
  assert.equal(state.md5ByDigest["digest-1"], "event-1");
  assert.equal(state.md5ByDigest["digest-2"], "series-1_20260401T090000Z");
});

test("shouldSendEmailSummary requires the feature flag and a recipient", () => {
  const context = loadProject();

  context.CONFIG.emailSummary = true;
  context.CONFIG.email = "user@example.com";
  assert.equal(context.shouldSendEmailSummary(), true);

  context.CONFIG.email = "";
  assert.equal(context.shouldSendEmailSummary(), false);

  context.CONFIG.emailSummary = false;
  context.CONFIG.email = "user@example.com";
  assert.equal(context.shouldSendEmailSummary(), false);
});
