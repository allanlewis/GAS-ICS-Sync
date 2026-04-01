const crypto = require("node:crypto");

function arrayDigest(algorithm, value) {
  if (algorithm !== "MD5") {
    throw new Error(`Unsupported digest algorithm: ${algorithm}`);
  }

  return Array.from(
    crypto.createHash("md5").update(String(value)).digest().values(),
  );
}

function normalizeTimeZone(timeZone) {
  if (!timeZone || /^etc\/gmt$/i.test(timeZone)) {
    return "UTC";
  }

  return timeZone;
}

function formatDate(date, timeZone, pattern) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: normalizeTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return pattern
    .replaceAll("YYYY", parts.year)
    .replaceAll("yyyy", parts.year)
    .replaceAll("MM", parts.month)
    .replaceAll("dd", parts.day)
    .replaceAll("HH", parts.hour)
    .replaceAll("mm", parts.minute)
    .replaceAll("ss", parts.second);
}

function createScriptLock() {
  return {
    released: false,
    tryLock() {
      return true;
    },
    releaseLock() {
      this.released = true;
    },
  };
}

function createTextOutput(content) {
  return {
    content,
    mimeType: null,
    setMimeType(mimeType) {
      this.mimeType = mimeType;
      return this;
    },
  };
}

function notConfigured(name) {
  return function () {
    throw new Error(`${name} was not configured for this test`);
  };
}

function createAppsScriptRuntime(overrides = {}) {
  const lock = overrides.lock || createScriptLock();

  const runtime = {
    Logger: {
      log() {},
    },
    Utilities: {
      DigestAlgorithm: {
        MD5: "MD5",
      },
      computeDigest: arrayDigest,
      formatDate,
      sleep() {},
    },
    ContentService: {
      MimeType: {
        JSON: "application/json",
        TEXT: "text/plain",
      },
      createTextOutput,
    },
    LockService: {
      getScriptLock() {
        return lock;
      },
    },
    Calendar: {
      Events: {
        list: notConfigured("Calendar.Events.list"),
        insert: notConfigured("Calendar.Events.insert"),
        update: notConfigured("Calendar.Events.update"),
        remove: notConfigured("Calendar.Events.remove"),
      },
      Settings: {
        get: notConfigured("Calendar.Settings.get"),
      },
      CalendarList: {
        list: notConfigured("Calendar.CalendarList.list"),
      },
      Calendars: {
        insert: notConfigured("Calendar.Calendars.insert"),
      },
      newCalendar() {
        return {};
      },
      newEvent() {
        return {};
      },
      newEventSource() {
        return {};
      },
    },
    MailApp: {
      sendEmail: notConfigured("MailApp.sendEmail"),
    },
    ScriptApp: {
      getProjectTriggers() {
        return [];
      },
      deleteTrigger() {},
      newTrigger: notConfigured("ScriptApp.newTrigger"),
    },
    UrlFetchApp: {
      fetch: notConfigured("UrlFetchApp.fetch"),
    },
    PropertiesService: {
      getScriptProperties: notConfigured(
        "PropertiesService.getScriptProperties",
      ),
    },
  };

  return Object.assign(runtime, overrides.globals || {});
}

module.exports = {
  createAppsScriptRuntime,
  createScriptLock,
};
