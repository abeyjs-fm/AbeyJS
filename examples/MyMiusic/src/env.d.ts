/// <reference types="vite/client" />
declare module "*.html?raw" {
  const html: string;
  export default html;
}

declare module "*.abey" {
  export type Ctx = unknown;
  export function mount(outlet: HTMLElement, ctx: Ctx): { render: () => void; dispose: () => void };
}

declare module "*.view.html" {
  export type Ctx = unknown;
  export const template: string;
  export function mount(outlet: HTMLElement, ctx: Ctx): { render: () => void; dispose: () => void };
}
