import template from "./home.html?raw";
import "./home.css";

export function mountHome(outlet: HTMLElement): void {
  outlet.innerHTML = template;
}

