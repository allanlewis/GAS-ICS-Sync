# GAS-ICS-Sync

Sync one or more ICS/iCal feeds to Google Calendar from Google Apps Script.

The script can:

- create events from source calendars
- update changed events
- remove events that disappear from the feed
- preserve recurring series and their instances
- optionally email a summary of changes
- optionally apply filters to incoming calendar items

## Setup

1. Create a copy of this Apps Script project in your Google account.
2. Open `Config.gs` and configure the `CONFIG` settings near the top of the file.
3. Update `filters.gs` if you want to include or exclude events by iCal property.
4. Run `install()` once and authorize the script when prompted.
5. Optional: run `startSync()` once to force an immediate sync.
6. Use `uninstall()` to remove the triggers if you want to stop scheduled syncing.

## Configuration

The main settings live in `Config.gs` in the `CONFIG` object:

- `sourceCalendars`: map each ICS URL to a target Google Calendar name
- `howFrequent`: sync interval in minutes
- `onlyFutureEvents`: sync only future events and preserve recurring instances during cleanup
- `addEventsToCalendar`: create new events from the feed
- `modifyExistingEvents`: update existing synced events when the feed changes
- `removeEventsFromCalendar`: delete synced events that no longer exist in the feed
- `addAlerts`: control whether ICS alarms become Google Calendar reminders
- `addOrganizerToTitle`: prefix event titles with the organizer name
- `descriptionAsTitles`: use descriptions instead of summaries as titles
- `addCalToTitle`: prefix event titles with the source calendar name
- `addAttendees`: copy attendees from the ICS feed
- `defaultAllDayReminder`: custom reminder for all-day events
- `overrideVisibility`: force event visibility when set
- `emailSummary`: send an email after added, modified, or removed items
- `email`: destination for the summary and update notices
- `customEmailSubject`: override the summary email subject
- `dateFormat`: format used in summary emails

Additional notes:

- `appsscript.json` already enables the Calendar advanced service.
- The script creates a trigger for regular syncs and a daily update check.
- The update checker only sends mail if `email` is configured.

## Filtering

`filters.gs` contains the `filters` array. Each filter can include or exclude events based on iCal properties using structured rules:

- `summary`
- `categories`
- `dtstart`
- `dtend`

The code supports simple string matches, regex matches, and date-based cutoffs. Use this file when you need to trim down the source feed before it reaches Google Calendar.

## Notes

- This repository is the source for the Apps Script project; there is no build step.
- `ical.js.gs` is a vendored copy of `ical.js`, and `tzid.gs` is vendored/generated timezone data. Refresh those files from their upstream sources instead of editing application logic into them.
- Google can still rate-limit access to the source feed if many users request the same URL at once.
- Transient errors such as rate limits are retried with exponential backoff and a small random jitter.
- If you need to stop the sync, remove the triggers with `uninstall()` rather than deleting calendar data manually.

## Testing

This repository includes a local Node test harness for the Apps Script code.

- Run `npm test` to execute the suite.
- The tests use the built-in `node --test` runner and do not require a build step.

## Contributing

Contributions are welcome through pull requests.

If you want to fund an issue, use: https://issuehunt.io/repos/136078981/
