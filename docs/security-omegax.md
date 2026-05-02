# Seguridad AbeyJs: reglas de producto

Política en una frase: **la seguridad es el comportamiento por defecto; el riesgo solo es explícito** (tú o el código lo declaran).

---

## Reglas (normativas)

1. **Todo dato se renderiza como texto por defecto**  
   Listas, formularios y páginas declarativas usan `textContent` o nodos de texto, no cadenas HTML crudas.

2. **El binding `{{ clave }}` (si lo usas) es siempre seguro (escapado)**  
   La utilidad `bindText` de `@abeyjs/view` sustituye `{{ clave }}` con `escapeHtml` del valor. No existe interpretación de plantillas con HTML crudo en el motor por defecto.

3. **Nunca se usa `innerHTML` automáticamente**  
   Ninguna API de modo automático o data-driven asigna `innerHTML` a partir de datos de negocio sin pasar por la capa explícita de abajo.

4. **El modo automático no ejecuta HTML dinámico**  
   `PageViewSpec`, `buildPageView`, `createPageViewElement` y listas/formularios omega no inyectan HTML interpretado desde strings de datos.

5. **El HTML dinámico debe declararse explícitamente: `abey-html` / `data-abey-html`**  
   Al usar `setSanitizedHtml`, el contenedor recibe la clase `abey-html` y el atributo `data-abey-html="1"` para dejar trazada la intención (auditoría, estilos, revisiones de código).

6. **Todo HTML dinámico debe pasar por sanitización**  
   - Por defecto: `sanitize()` y `AbeyJs.sanitize()` equivalen a **escapar** a entidades: no quedan etiquetas activas, no se ejecutan scripts.  
   - Con contenido rico, configura un sanitizer con `configureSanitize` (p. ej. DOMPurify) y consciente de allowlist. No confíes en cadenas “limpias a ojo”.

7. **Modo híbrido: HTML con buenas prácticas**  
   Combinas DOM propio y AbeyJs; para fragmentos con HTML, usa `setSanitizedHtml` o `textContent` + `escapeHtml` en nodos. Si necesitas DOMPurify, centralízalo y documenta el motivo.

8. **Modo avanzado: control total, responsabilidad tuya**  
   Puedes asignar `innerHTML` o `document.write` tú mismo; el framework no lo impide. El riesgo es 100% explícito a nivel de aplicación.

9. **No confiar en datos de usuario: el input es inseguro**  
   Toda API, formulario o query debe validarse; el cliente nunca es la única defensa.

10. **Validación en backend (obligatoria en el sistema de negocio)**  
   AbeyJs puede reutilizar el mismo criterio Zod en cliente; el **servidor** obliga su contrato y vuelve a validar.

11. **AbeyJs no ejecuta scripts inyectados por defecto**  
   No hay `eval`, no se insertan `<script>`, y el HTML por omisión se escapa o pasa por `sanitize`.

12. **Resumen**  
   Seguridad = ruta por defecto (texto, escape, sin innerHTML “mágico”). Riesgo = usas tú `setSanitizedHtml`, `configureSanitize`, o DOM manual consciente.

---

## API (referencia)

| Símbolo | Paquete | Uso |
| --- | --- | --- |
| `escapeHtml` | `@abeyjs/view` | Un valor arbitrario a cadena segura. |
| `bindText` | `@abeyjs/view` | Plantilla con `{{ id }}` solo con valores escapados. |
| `sanitize` / `AbeyJs.sanitize` | `@abeyjs/view` | Misma política base; reemplazable vía `configureSanitize`. |
| `setSanitizedHtml` | `@abeyjs/view` | Único “punto de entrada” recomendado para poner HTML en un `HTMLElement` desde datos. |
| `clearSanitizedHtmlHost` | `@abeyjs/view` | Quitar marcas y vaciar el nodo. |
| `registerAbeyJsView` / `<abeyjs-view>` | `@abeyjs/view` | Vistas con HTML: `{{a.b}}` (escape), `abeyjs-for`, `abeyjs-html` → `setSanitizedHtml`. Sin `innerHTML` directo a datos. |
| `getByPath` | `@abeyjs/view` | Navegación de rutas en el modelo; usado con binding seguro. |

Más contexto: [Visión y HTML/CSS](./vision-abeyjs.md) (sección 2) y código en [safe-html.ts](../packages/view/src/safe-html.ts).
