var CONFIG = {
  // The ics/ical urls that you want to get events from along with their target calendars
  // (list a new row for each mapping of ICS url to Google Calendar).
  // For instance: ["https://p24-calendars.icloud.com/holidays/us_en.ics", "US Holidays"]
  // Or with colors following mapping https://developers.google.com/apps-script/reference/calendar/event-color,
  // for instance: ["https://p24-calendars.icloud.com/holidays/us_en.ics", "US Holidays", "11"]
  sourceCalendars: [
    [
      "https://rest.cozi.com/api/ext/1103/bec55cf9-2e05-4179-bfa6-7048d2e480e8/icalendar/feed/feed.ics",
      "Cozi",
    ],
  ],
  howFrequent: 15, // What interval (minutes) to run this script on to check for new events
  onlyFutureEvents: false, // If true, past events will not be synced
  addEventsToCalendar: true, // If false, events are parsed but not inserted
  modifyExistingEvents: true, // If false, existing managed events are left untouched
  removeEventsFromCalendar: true, // If true, managed events missing from the feed will be removed
  addAlerts: "yes", // "yes", "no", or "default"
  addOrganizerToTitle: false, // Prefix the event name with the organiser
  descriptionAsTitles: false, // Use the description as the event title
  addCalToTitle: false, // Prefix the event title with the source calendar name
  addAttendees: false, // Add the attendee list from the feed
  defaultAllDayReminder: -1, // Minutes before all-day events (-1 = no reminder)
  // See https://github.com/derekantrican/GAS-ICS-Sync/issues/75 for why this is necessary.
  overrideVisibility: "", // "default", "public", "private", or "confidential"
  addTasks: false,
  emailSummary: true, // Email a summary when events are added/modified/removed
  email: "allanlewis99@gmail.com", // Required for summary emails and update notifications
};

var RUNTIME_SETTINGS = {
  currentVersion: 5.7,
  defaultMaxRetries: 10,
  runGuardTimeoutMs: 5000,
};
