/*
Filters for calendar events based on ical properties (RFC 5545).
Define each filter with the following structure and add them to the var filters array:
{
  parameter: "property",      // Event property to filter by (e.g., "summary", "categories", "dtend", "dtstart").
  type: "include/exclude",    // Whether to include or exclude events matching the criteria.
  comparison: "method",       // Comparison method: "equals", "begins with", "contains", "regex", "<", ">".
                              // Note: "<", ">" only apply for date/time properties.
  criterias: ["values"],      // Array of values or patterns for comparison.
  offset: number              // (Optional) For date/time properties, specify an offset in days.
}
*/
var filters = [];

/* Examples:
var filters = [
  {
    parameter: "summary",       // Exclude events whose summary starts with "Pending:" or contains "cancelled".
    type: "exclude",
    comparison: "regex",
    criterias: ["^Pending:", "cancelled"]
  },
  {
    parameter: "categories",    // Include only events categorized as "Meetings".
    type: "include",
    comparison: "equals",
    criterias: ["Meetings"]
  },
  {
    parameter: "dtend",       // Reproduce the old onlyFutureEvents behaviour.
    type: "include",
    comparison: ">",
    offset: 0
  },
  {
    parameter: "dtstart",       // Exclude events starting more than 14 days from now.
    type: "exclude",
    comparison: ">",
    offset: 14
  }
];
*/

function applyConfiguredFilters(events) {
  if (!filters || filters.length === 0) {
    return events;
  }

  var includeFilters = filters.filter(function (filter) {
    return filter.type === "include";
  });
  var excludeFilters = filters.filter(function (filter) {
    return filter.type === "exclude";
  });

  return events.filter(function (event) {
    var included =
      includeFilters.length === 0 ||
      includeFilters.some(function (filter) {
        return eventMatchesFilter(event, filter);
      });
    if (!included) {
      return false;
    }

    return !excludeFilters.some(function (filter) {
      return eventMatchesFilter(event, filter);
    });
  });
}

function eventMatchesFilter(event, filter) {
  if (!filter || !filter.parameter || !filter.comparison) {
    return false;
  }

  if (filter.comparison === "<" || filter.comparison === ">") {
    return compareDateFilter(event, filter);
  }

  if (!event.hasProperty(filter.parameter)) {
    return false;
  }

  var values = event
    .getAllProperties(filter.parameter)
    .map(function (property) {
      return String(property.getFirstValue());
    })
    .filter(function (value) {
      return value !== "";
    });

  return values.some(function (value) {
    return matchesTextFilter(value, filter);
  });
}

function matchesTextFilter(value, filter) {
  var criteria = filter.criterias || [];

  return criteria.some(function (criterion) {
    switch (filter.comparison) {
      case "equals":
        return value === criterion;
      case "begins with":
        return value.indexOf(criterion) === 0;
      case "contains":
        return value.indexOf(criterion) !== -1;
      case "regex":
        return RegExp(criterion).test(value);
      default:
        return false;
    }
  });
}

function compareDateFilter(event, filter) {
  if (!event.hasProperty(filter.parameter)) {
    return false;
  }

  var eventTime = new ICAL.Time.fromString(
    event.getFirstPropertyValue(filter.parameter).toString(),
    event.getFirstProperty(filter.parameter),
  );
  var comparisonTime = ICAL.Time.fromJSDate(new Date());
  if (filter.offset) {
    comparisonTime.adjust(parseInt(filter.offset, 10), 0, 0, 0);
  }

  if (filter.comparison === "<") {
    return eventTime.compare(comparisonTime) < 0;
  }

  return eventTime.compare(comparisonTime) > 0;
}
