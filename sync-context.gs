function createSessionContext() {
  return {
    startUpdateTime: CONFIG.onlyFutureEvents
      ? ICAL.Time.fromJSDate(new Date())
      : null,
    notifications: {
      addedEvents: [],
      modifiedEvents: [],
      removedEvents: [],
    },
  };
}

function createCalendarContext(targetCalendarName) {
  return {
    targetCalendarId: null,
    targetCalendarName: targetCalendarName,
    managedEvents: createManagedEventState([]),
    icsEventIds: [],
    recurringEvents: [],
  };
}

function createManagedEventState(events) {
  var state = {
    events: events || [],
    eventsByManagedId: {},
    md5ByDigest: {},
  };

  for (var i = 0; i < state.events.length; i++) {
    var event = state.events[i];
    if (
      event.extendedProperties == null ||
      event.extendedProperties.private == null
    )
      continue;

    var managedId =
      event.extendedProperties.private["rec-id"] ||
      event.extendedProperties.private["id"];
    if (managedId != null) {
      state.eventsByManagedId[managedId] = event;
    }

    var digest = event.extendedProperties.private["MD5"];
    if (digest != null) {
      state.md5ByDigest[digest] = managedId || true;
    }
  }

  return state;
}

function recordSyncChange(changeList, calendarName, event) {
  changeList.push([
    [event.summary, event.start.date || event.start.dateTime],
    calendarName,
  ]);
}

function shouldSendEmailSummary() {
  return CONFIG.emailSummary && CONFIG.email !== "";
}
