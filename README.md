# GAS-ICS-Sync

Sync one or more ICS/iCal feeds to Google Calendar from Google Apps Script.

The script can:
- create events from source calendars
- update changed events
- remove events that disappear from the feed
- preserve recurring series and their instances
- optionally sync `VTODO` items into Google Tasks
- optionally email a summary of changes
- optionally apply filters to incoming calendar items

## Setup

1. Create a copy of this Apps Script project in your Google account.
2. Open `Code.gs` and configure the settings near the top of the file.
3. Update `filters.gs` if you want to include or exclude events by iCal property.
4. Run `install()` once and authorize the script when prompted.
5. Optional: run `startSync()` once to force an immediate sync.
6. Use `uninstall()` to remove the triggers if you want to stop scheduled syncing.

## Configuration

The main settings live in `Code.gs`:

- `sourceCalendars`: map each ICS URL to a target Google Calendar name
- `howFrequent`: sync interval in minutes
- `addEventsToCalendar`: create new events from the feed
- `modifyExistingEvents`: update existing synced events when the feed changes
- `removeEventsFromCalendar`: delete synced events that no longer exist in the feed
- `removePastEventsFromCalendar`: keep past events even if they disappear from the feed
- `addAlerts`: control whether ICS alarms become Google Calendar reminders
- `addOrganizerToTitle`: prefix event titles with the organizer name
- `descriptionAsTitles`: use descriptions instead of summaries as titles
- `addCalToTitle`: prefix event titles with the source calendar name
- `addAttendees`: copy attendees from the ICS feed
- `defaultAllDayReminder`: custom reminder for all-day events
- `overrideVisibility`: force event visibility when set
- `addTasks`: sync `VTODO` entries to Google Tasks
- `emailSummary`: send an email after added, modified, or removed items
- `email`: destination for the summary and update notices
- `customEmailSubject`: override the summary email subject
- `dateFormat`: format used in summary emails

Additional notes:

- `appsscript.json` already enables the Calendar and Tasks advanced services.
- The script creates a trigger for regular syncs and a daily update check.
- The update checker only sends mail if `email` is configured.

## Filtering

`filters.gs` contains the `filters` array. Each filter can include or exclude events based on iCal properties such as:

- `summary`
- `categories`
- `dtstart`
- `dtend`

The code supports simple string matches, regex matches, and date-based cutoffs. Use this file when you need to trim down the source feed before it reaches Google Calendar.

## Notes

- This repository is the source for the Apps Script project; there is no build step.
- Google can still rate-limit access to the source feed if many users request the same URL at once.
- If you need to stop the sync, remove the triggers with `uninstall()` rather than deleting calendar data manually.

## Contributing

Contributions are welcome through pull requests.

If you want to fund an issue, use: https://issuehunt.io/repos/136078981/
