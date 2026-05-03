#!/usr/bin/env node
/**
 * CLI: **`abey-sync-spa-paths [--config PATH] [--cwd DIR]`**
 *
 * **`--config`**: defaults to **`abey-spa-paths.config.json`** next to **`--cwd`** (or **`process.cwd()`**).
 * JSON may include **`cwd`**: resolved relative to the config file’s directory.
 */

import fs from "node:fs";
import path from "node:path";

import type { SyncSpaHtmlFallbackConfig } from "./sync-spa-html-fallback-paths.js";
import { syncSpaHtmlFallbackPaths } from "./sync-spa-html-fallback-paths.js";

function readJsonConfig(abs: string): SyncSpaHtmlFallbackConfig {
  const raw = fs.readFileSync(abs, "utf8");
  return JSON.parse(raw) as SyncSpaHtmlFallbackConfig;
}

function parseArgv(argv: string[]): { baseCwd: string; configArg: string | undefined } {
  let baseCwd = process.cwd();
  let configArg: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--cwd" && argv[i + 1]) {
      baseCwd = path.resolve(argv[++i]);
    } else if (a === "--config" && argv[i + 1]) {
      configArg = argv[++i];
    }
  }
  return { baseCwd, configArg };
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(`abey-sync-spa-paths — generate SPA path list for static hosting (from @abeyjs/view)

Usage:
  abey-sync-spa-paths [--cwd DIR] [--config PATH]

  --cwd     Directory for default config path (default: process.cwd())
  --config  JSON config (default: <cwd>/abey-spa-paths.config.json)

Config fields: see SyncSpaHtmlFallbackConfig (output, files[], optional cwd relative to config dir).
`);
    process.exit(0);
  }

  const { baseCwd, configArg } = parseArgv(argv);
  const configPath = path.resolve(baseCwd, configArg ?? "abey-spa-paths.config.json");

  if (!fs.existsSync(configPath)) {
    console.error(`[abey-sync-spa-paths] config not found: ${configPath}`);
    process.exit(1);
  }

  const cfg = readJsonConfig(configPath);
  const configDir = path.dirname(configPath);
  const projectCwd = cfg.cwd ? path.resolve(configDir, cfg.cwd) : configDir;

  const { paths, outputFile } = syncSpaHtmlFallbackPaths({ ...cfg, cwd: projectCwd });
  const rel = path.relative(projectCwd, outputFile) || path.basename(outputFile);
  console.log(`[abey-sync-spa-paths] wrote ${paths.length} paths → ${rel}`);
}

main();
