function logInfo(component, message, metadata) {
  console.info(formatLogMessage(component, message, metadata));
}

function logWarn(component, message, metadata) {
  console.warn(formatLogMessage(component, message, metadata));
}

function logError(component, message, metadata) {
  console.error(formatLogMessage(component, message, metadata));
}

function logDebug(component, message, metadata) {
  console.log(formatLogMessage(component, message, metadata));
}

function logStructuredInfo(component, message, metadata) {
  logInfo(component, message, metadata);
  Logger.log(buildStructuredLogEntry(component, message, metadata));
}

function formatLogMessage(component, message, metadata) {
  var metadataText = formatLogMetadata(metadata);
  return (
    "[" +
    component +
    "] " +
    message +
    (metadataText === "" ? "" : " " + metadataText)
  );
}

function formatLogMetadata(metadata) {
  if (metadata == null) {
    return "";
  }

  var keys = Object.keys(metadata).filter(function (key) {
    return metadata[key] != null;
  });
  keys.sort();

  return keys
    .map(function (key) {
      return key + "=" + stringifyLogValue(metadata[key]);
    })
    .join(" ");
}

function stringifyLogValue(value) {
  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function buildStructuredLogEntry(component, message, metadata) {
  var entry = {
    message: message,
    component: component,
  };

  if (metadata == null) {
    return entry;
  }

  var keys = Object.keys(metadata).filter(function (key) {
    return metadata[key] != null;
  });
  keys.sort();

  keys.forEach(function (key) {
    entry[key] = metadata[key];
  });

  return entry;
}
