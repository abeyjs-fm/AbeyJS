// packages/uikit/src/env.d.ts

declare module "*.css?raw" {
  const css: string;
  export default css;
}

declare module "*.css?inline" {
  const css: string;
  export default css;
}

declare module "*.html" {
  export const template: string;
}

declare module "*.html?raw" {
  const html: string;
  export default html;
}
