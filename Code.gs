/*
 *=========================================
 *       INSTALLATION INSTRUCTIONS
 *=========================================
 *
 * 1) Make a copy:
 *      New Interface: Go to the project overview icon on the left (looks like this: ⓘ), then click the "copy" icon on the top right (looks like two files on top of each other)
 *      Old Interface: Click in the menu "File" > "Make a copy..." and make a copy to your Google Drive
 * 2) Settings: Update the values in Config.gs to match how you want the sync to behave
 * 3) Install:
 *      New Interface: Make sure your toolbar says "install" to the right of "Debug", then click "Run"
 *      Old Interface: Click "Run" > "Run function" > "install"
 * 4) Authorize: You will be prompted to authorize the program and will need to click "Advanced" > "Go to GAS-ICS-Sync (unsafe)"
 *    (For steps to follow in authorization, see this video: https://youtu.be/_5k10maGtek?t=1m22s )
 * 5) You can also run "startSync" if you want to sync only once (New Interface: change the dropdown to the right of "Debug" from "install" to "startSync")
 *
 * **To stop the Script from running click in the menu "Run" > "Run function" > "uninstall" (New Interface: change the dropdown to the right of "Debug" from "install" to "uninstall")
 *
 *=========================================
 *           ABOUT THE AUTHOR
 *=========================================
 *
 * This program was created by Derek Antrican
 *
 * If you would like to see other programs Derek has made, you can check out
 * his website: derekantrican.com or his github: https://github.com/derekantrican
 *
 *=========================================
 *            BUGS/FEATURES
 *=========================================
 *
 * Please report any issues at https://github.com/derekantrican/GAS-ICS-Sync/issues
 *
 *=========================================
 *           $$ DONATIONS $$
 *=========================================
 *
 * If you would like to donate and support the project,
 * you can do that here: https://www.paypal.me/jonasg0b1011001
 *
 *=========================================
 *             CONTRIBUTORS
 *=========================================
 * Andrew Brothers
 * Github: https://github.com/agentd00nut
 * Twitter: @abrothers656
 *
 * Joel Balmer
 * Github: https://github.com/JoelBalmer
 *
 * Blackwind
 * Github: https://github.com/blackwind
 *
 * Jonas Geissler
 * Github: https://github.com/jonas0b1011001
 */

//=====================================================================================================
//!!!!!!!!!!!!!!!! DO NOT EDIT BELOW HERE UNLESS YOU REALLY KNOW WHAT YOU'RE DOING !!!!!!!!!!!!!!!!!!!!
//=====================================================================================================

function doGet() {
  return startSync();
}

function install() {
  //Delete any already existing triggers so we don't create excessive triggers
  deleteAllTriggers();

  //Schedule sync routine to explicitly repeat and schedule the initial sync
  ScriptApp.newTrigger("startSync")
    .timeBased()
    .everyMinutes(getValidTriggerFrequency(CONFIG.howFrequent))
    .create();
  ScriptApp.newTrigger("startSync").timeBased().after(1000).create();
}

function uninstall() {
  deleteAllTriggers();
}

function startSync() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(RUNTIME_SETTINGS.runGuardTimeoutMs)) {
    const msg = "Another iteration is currently running!";
    Logger.log(msg);
    return ContentService.createTextOutput(msg).setMimeType(
      ContentService.MimeType.TEXT,
    );
  }

  var sessionContext = createSessionContext();

  try {
    var sourceCalendars = condenseCalendarMap(CONFIG.sourceCalendars);
    for (var calendar of sourceCalendars) {
      var calendarContext = createCalendarContext(calendar[0]);
      var sourceCalendarURLs = calendar[1];
      var vevents = [];

      //------------------------ Fetch URL items ------------------------
      var responses = fetchSourceCalendars(sourceCalendarURLs);
      Logger.log(
        "Syncing " +
          responses.length +
          " calendars to " +
          calendarContext.targetCalendarName,
      );

      //------------------------ Get target calendar information------------------------
      var targetCalendar = setupTargetCalendar(
        calendarContext.targetCalendarName,
      );
      calendarContext.targetCalendarId = targetCalendar.id;
      Logger.log("Working on calendar: " + calendarContext.targetCalendarId);

      //------------------------ Parse existing events --------------------------
      if (
        CONFIG.addEventsToCalendar ||
        CONFIG.modifyExistingEvents ||
        CONFIG.removeEventsFromCalendar
      ) {
        var eventList = callWithBackoff(function () {
          return Calendar.Events.list(calendarContext.targetCalendarId, {
            showDeleted: false,
            privateExtendedProperty: "fromGAS=true",
            maxResults: 2500,
          });
        }, RUNTIME_SETTINGS.defaultMaxRetries);
        var calendarEvents = (eventList && eventList.items) || [];

        //loop until we received all events
        while (
          eventList != null &&
          typeof eventList.nextPageToken !== "undefined"
        ) {
          eventList = callWithBackoff(function () {
            return Calendar.Events.list(calendarContext.targetCalendarId, {
              showDeleted: false,
              privateExtendedProperty: "fromGAS=true",
              maxResults: 2500,
              pageToken: eventList.nextPageToken,
            });
          }, RUNTIME_SETTINGS.defaultMaxRetries);

          if (eventList != null) {
            calendarEvents = [].concat(calendarEvents, eventList.items || []);
          }
        }

        calendarContext.managedEvents = createManagedEventState(calendarEvents);
        Logger.log(
          "Fetched " +
            calendarContext.managedEvents.events.length +
            " existing events from " +
            calendarContext.targetCalendarName,
        );

        //------------------------ Parse ical events --------------------------
        vevents = parseResponses(responses, calendarContext, sessionContext);
        Logger.log("Parsed " + vevents.length + " events from ical sources");
      }

      //------------------------ Process ical events ------------------------
      if (CONFIG.addEventsToCalendar || CONFIG.modifyExistingEvents) {
        Logger.log("Processing " + vevents.length + " events");
        var calendarTz = callWithBackoff(function () {
          return Calendar.Settings.get("timezone").value;
        }, RUNTIME_SETTINGS.defaultMaxRetries);

        vevents.forEach(function (event) {
          processEvent(event, calendarTz, calendarContext, sessionContext);
        });

        Logger.log("Done processing events");
      }

      //------------------------ Remove old events from calendar ------------------------
      if (CONFIG.removeEventsFromCalendar) {
        Logger.log(
          "Checking " +
            calendarContext.managedEvents.events.length +
            " events for removal",
        );
        processEventCleanup(calendarContext, sessionContext);
        Logger.log("Done checking events for removal");
      }

      //------------------------ Add Recurring Event Instances ------------------------
      Logger.log(
        "Processing " +
          calendarContext.recurringEvents.length +
          " Recurrence Instances!",
      );
      for (var recEvent of calendarContext.recurringEvents) {
        processEventInstance(recEvent, calendarContext);
      }
    }

    var notifications = sessionContext.notifications;
    if (
      shouldSendEmailSummary() &&
      notifications.addedEvents.length +
        notifications.modifiedEvents.length +
        notifications.removedEvents.length >
        0
    ) {
      sendSummary(sessionContext);
    }

    Logger.log("Sync finished!");
    return ContentService.createTextOutput(
      JSON.stringify(notifications),
    ).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
