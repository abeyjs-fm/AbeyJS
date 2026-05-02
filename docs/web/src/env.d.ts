/// <reference types="vite/client" />

declare module "*.view.html" {
  export const template: string;
}

declare module "*?raw" {
  const src: string;
  export default src;
}
