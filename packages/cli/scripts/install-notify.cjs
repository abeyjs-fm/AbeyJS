/**
 * npm lifecycle: preinstall → "installing…", postinstall → result (global vs local).
 * Skip noise in CI: CI=true, or SKIP_ABEYJS_INSTALL_MSG=1 (e.g. repeated monorepo installs).
 */
const { readFileSync, existsSync } = require("node:fs");
const { join, dirname } = require("node:path");

const lifecycle = process.env.npm_lifecycle_event || "";
const silent =
  process.env.SKIP_ABEYJS_INSTALL_MSG === "1" ||
  process.env.CI === "true" ||
  process.env.CI === "1" ||
  Boolean(process.env.GITHUB_ACTIONS);
const tty = process.stdout.isTTY && !silent;

function pkgPath() {
  return join(__dirname, "..", "package.json");
}

function readVersion() {
  try {
    const pkg = JSON.parse(readFileSync(pkgPath(), "utf8"));
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function isGlobalInstall() {
  return process.env.npm_config_global === "true";
}

function dim(s) {
  return tty ? `\x1b[2m${s}\x1b[0m` : s;
}
function bold(s) {
  return tty ? `\x1b[1m${s}\x1b[0m` : s;
}
function green(s) {
  return tty ? `\x1b[32m${s}\x1b[0m` : s;
}
function cyan(s) {
  return tty ? `\x1b[36m${s}\x1b[0m` : s;
}

if (lifecycle === "preinstall") {
  if (silent) {
    process.exit(0);
  }
  // eslint-disable-next-line no-console
  console.log("");
  // eslint-disable-next-line no-console
  console.log(dim("… installing ") + bold("@abeyjs/cli") + dim(" — please wait"));
  // eslint-disable-next-line no-console
  console.log("");
  process.exit(0);
}

if (lifecycle === "postinstall") {
  if (silent) {
    process.exit(0);
  }
  const version = readVersion();
  const global = isGlobalInstall();
  const prefix = (process.env.npm_config_prefix || "").trim();

  // eslint-disable-next-line no-console
  console.log("");
  // eslint-disable-next-line no-console
  console.log(green("✔") + " " + bold(`@abeyjs/cli@${version}`) + " " + dim("installation complete"));
  // eslint-disable-next-line no-console
  console.log("");
  if (global) {
    // eslint-disable-next-line no-console
    console.log(dim("Scope:     ") + cyan("global"));
    if (prefix) {
      // eslint-disable-next-line no-console
      console.log(dim("npm prefix:") + " " + prefix);
    }
    // eslint-disable-next-line no-console
    console.log(dim("Try:       ") + bold("abeyjs help") + dim("  ·  ") + bold("abeyjs version"));
  } else {
    // eslint-disable-next-line no-console
    console.log(dim("Scope:     ") + cyan("local") + dim(" (this project or workspace link)"));
    if (prefix) {
      // eslint-disable-next-line no-console
      console.log(dim("npm prefix:") + " " + prefix);
    }
    // eslint-disable-next-line no-console
    console.log(dim("Try:       ") + bold("npx abeyjs help") + dim("  ·  ") + bold("npx abeyjs version"));
    // eslint-disable-next-line no-console
    console.log(dim("Tip:       ") + "install globally with " + bold("npm install -g @abeyjs/cli"));
  }
  // eslint-disable-next-line no-console
  console.log("");
  process.exit(0);
}

process.exit(0);
