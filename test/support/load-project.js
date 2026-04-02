const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const { createAppsScriptRuntime } = require("./apps-script-runtime");

const PROJECT_FILES = [
  "ical.js",
  "tzid.js",
  "config.js",
  "logging.js",
  "filters.js",
  "sync-context.js",
  "sync-helpers.js",
  "main.js",
];

function loadProject(options = {}) {
  const projectRoot = path.resolve(__dirname, "..", "..");
  const runtime = createAppsScriptRuntime(options);
  const context = {
    ...runtime,
    console: runtime.console || console,
    Math,
    JSON,
    Date,
    RegExp,
    String,
    Object,
    Array,
    Number,
    Boolean,
    parseInt,
    parseFloat,
    isNaN,
  };

  context.global = context;
  context.globalThis = context;

  vm.createContext(context);

  for (const relativePath of PROJECT_FILES) {
    const filename = path.join(projectRoot, relativePath);
    const source = fs.readFileSync(filename, "utf8");
    vm.runInContext(source, context, { filename });
  }

  return context;
}

module.exports = {
  loadProject,
};
