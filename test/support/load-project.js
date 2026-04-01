const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const { createAppsScriptRuntime } = require("./apps-script-runtime");

const PROJECT_FILES = [
  "ical.js.gs",
  "tzid.gs",
  "config.gs",
  "filters.gs",
  "sync-context.gs",
  "sync-helpers.gs",
  "main.gs",
];

function loadProject(options = {}) {
  const projectRoot = path.resolve(__dirname, "..", "..");
  const context = {
    ...createAppsScriptRuntime(options),
    console,
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
