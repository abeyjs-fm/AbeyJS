import { mount } from "./compiler-test.view.html";

export function mountCompilerTest(outlet: HTMLElement): () => void {
  const ctx = { count: 0, text: "hola" };
  const h = mount(outlet, ctx);
  return () => {
    try {
      h.dispose();
    } catch {
      /* */
    }
  };
}

