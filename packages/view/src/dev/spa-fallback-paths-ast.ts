/**
 * Pure AST helpers: extract **string** route URLs from **`pageRoute`** / **`componentRoute`**
 * and **`navChildren`** shapes without importing app modules (avoids OM **`.html`** in Vite config).
 */

import ts from "typescript";

export function stringifyStaticRouteArg(expr: ts.Expression | undefined): string | null {
  if (!expr) return null;
  if (ts.isStringLiteralLike(expr)) return expr.text;
  if (ts.isNoSubstitutionTemplateLiteral(expr)) return expr.text;
  return null;
}

function normalizeRoutePath(lit: string): string | null {
  const s = lit.trim();
  if (!s || s === "*") return null;
  return s.startsWith("/") ? s : `/${s}`;
}

/** Paths from **`pageRoute('…',)`** / **`componentRoute('…',)`** first argument when it is a static string. */
export function collectRouteCallPaths(
  sourceFile: ts.SourceFile,
  rootNames: ReadonlySet<string> = new Set(["componentRoute", "pageRoute"]),
): string[] {
  const paths: string[] = [];
  const visit = (n: ts.Node): void => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && rootNames.has(n.expression.text)) {
      const arg0 = n.arguments[0];
      const lit = stringifyStaticRouteArg(arg0);
      if (lit !== null) {
        const p = normalizeRoutePath(lit);
        if (p) paths.push(p);
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sourceFile);
  return paths;
}

export function extractNavChildPathsFromObject(_sf: ts.SourceFile, expr: ts.Expression, paths: string[]): void {
  if (!ts.isObjectLiteralExpression(expr)) return;

  /** Inline nested **`children`** arrays on **`AppRouteNavChild`**. */
  const nested: ts.Expression[] = [];
  for (const p of expr.properties) {
    if (!ts.isPropertyAssignment(p) || !ts.isIdentifier(p.name)) continue;
    if (p.name.text === "path") {
      const lit = stringifyStaticRouteArg(p.initializer);
      if (lit !== null) {
        const n = normalizeRoutePath(lit);
        if (n) paths.push(n);
      }
    } else if (p.name.text === "children" && ts.isArrayLiteralExpression(p.initializer)) {
      nested.push(...p.initializer.elements);
    }
  }
  for (const c of nested) extractNavChildPathsFromObject(_sf, c, paths);
}

/** Paths from **`const navChildren = [ { path: '…' }, … ]`**. */
export function collectNavPathsFromVariable(sourceFile: ts.SourceFile, varName: string): string[] {
  const paths: string[] = [];
  const visit = (n: ts.Node): void => {
    if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      n.name.text === varName &&
      n.initializer &&
      ts.isArrayLiteralExpression(n.initializer)
    ) {
      for (const el of n.initializer.elements) extractNavChildPathsFromObject(sourceFile, el, paths);
    }
    ts.forEachChild(n, visit);
  };
  visit(sourceFile);
  return paths;
}

/**
 * Paths from **`pageRoute`** second argument **`{ navChildren: [ … ] }`** (when not a standalone variable).
 */
export function collectPageRouteInlineNavChildPaths(sourceFile: ts.SourceFile): string[] {
  const paths: string[] = [];

  const grab = (n: ts.CallExpression): void => {
    if (!ts.isIdentifier(n.expression) || n.expression.text !== "pageRoute") return;
    if (n.arguments.length < 2) return;
    const arg1 = n.arguments[1];
    if (!ts.isObjectLiteralExpression(arg1)) return;
    const nav = arg1.properties.find(
      (p): p is ts.PropertyAssignment =>
        ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === "navChildren",
    );
    if (!nav || !ts.isArrayLiteralExpression(nav.initializer)) return;
    for (const el of nav.initializer.elements) extractNavChildPathsFromObject(sourceFile, el, paths);
  };

  const visit = (n: ts.Node): void => {
    if (ts.isCallExpression(n)) grab(n);
    ts.forEachChild(n, visit);
  };
  visit(sourceFile);
  return paths;
}

/** Slug strings from **`const PKGS = [ { slug: 'core' }, … ]`**. */
export function collectStringFieldFromObjectArrayVar(
  sourceFile: ts.SourceFile,
  arrayVarName: string,
  fieldName: string,
): string[] {
  const slugs: string[] = [];
  const visit = (n: ts.Node): void => {
    if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      n.name.text === arrayVarName &&
      n.initializer &&
      ts.isArrayLiteralExpression(n.initializer)
    ) {
      for (const el of n.initializer.elements) {
        if (!ts.isObjectLiteralExpression(el)) continue;
        for (const prop of el.properties) {
          if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue;
          if (prop.name.text !== fieldName) continue;
          const lit = stringifyStaticRouteArg(prop.initializer);
          if (lit) slugs.push(lit);
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sourceFile);
  return slugs;
}
