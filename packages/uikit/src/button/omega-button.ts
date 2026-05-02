export type ButtonVariant = "primary" | "ghost" | "danger";

export type OmegaButtonOptions = {
  label: string;
  variant?: ButtonVariant;
  onClick?: (ev: MouseEvent) => void;
};

export function createOmegaButton(opts: OmegaButtonOptions): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = opts.label;
  btn.dataset.variant = opts.variant ?? "primary";
  if (opts.onClick) btn.addEventListener("click", opts.onClick);
  return btn;
}
