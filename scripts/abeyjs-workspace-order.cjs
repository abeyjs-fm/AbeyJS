/**
 * Orden topológico de workspaces `@abeyjs/*` (build y publish).
 * Mantener alineado con dependencias internas en cada `package.json`.
 */
module.exports.WORKSPACE_ORDER = [
  "@abeyjs/core",
  "@abeyjs/validation",
  "@abeyjs/state",
  "@abeyjs/flows",
  "@abeyjs/agents",
  "@abeyjs/http",
  "@abeyjs/runtime",
  "@abeyjs/compiler",
  "@abeyjs/uikit",
  "@abeyjs/view",
  "@abeyjs/openapi",
  "@abeyjs/inspector",
  "@abeyjs/cli",
];
