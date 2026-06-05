# vite-webcomponents-hooks

Vite plugin that transforms `.webcomponent.js` files into standard Custom Elements with a lightweight hooks runtime.

This project is inspired by React's function-component and hooks ergonomics, but it is not a React runtime.

## What this plugin does

- Intercepts `.webcomponent.js` files in Vite's `transform` hook.
- Infers the custom element tag name from the component function name (`Counter` -> `counter`, `MyWidget` -> `my-widget`).
- Converts function-style components into a generated `HTMLElement` class.
- Builds `props` from element attributes and passes them to your function component.
- Injects a minimal hooks runtime (`useState`, `useEffect`, `useRef`, `useEvent`, `useContext`, `createContext`).

## Installation

```bash
npm install vite-webcomponents-hooks
```

## Vite setup

```ts
import { defineConfig } from 'vite';
import viteWebcomponentsHooks from 'vite-webcomponents-hooks';

export default defineConfig({
  plugins: [viteWebcomponentsHooks()],
});
```

## File conventions

### Component file

Use the `.webcomponent.js` suffix:

```txt
counter.webcomponent.js
```

### Component stylesheet (important)

The plugin only rewrites and injects the stylesheet that matches the component file name:

```txt
counter.webcomponent.js -> counter.webcomponent.css
```

That matching CSS import is transformed to `?inline` and injected into Shadow DOM.

## Import handling rules

- Matching stylesheet import is rewritten to `?inline`.
- All other imports are preserved as-is.

This behavior allows downstream tooling/plugins to process non-CSS imports (or unrelated CSS imports) without interference.

## Authoring example

```js
import './counter.webcomponent.css';

function Counter({ initial = 0 }) {
  const [count, setCount] = useState(initial);
  const buttonRef = useRef();

  useEffect(() => {
    console.log('Counter mounted');
    return () => console.log('Counter unmounted');
  }, []);

  useEffect(() => {
    console.log('Count changed to', count);
  }, [count]);

  useEvent(buttonRef, 'click', () => {
    setCount(count + 1);
  });

  return `
    <button ref="buttonRef">Increment ${count}</button>
  `;
}
```

## Generated output (summary)

The plugin emits code that:

- Defines `CounterComponent extends HTMLElement`.
- Attaches shadow root.
- Renders your returned HTML string.
- Injects matching inline CSS into shadow root.
- Resolves refs and binds events.
- Registers the element with `customElements.define('counter', CounterComponent)`.

## Hooks runtime overview

### `useState(initial)`

- Returns `[state, setState]`.
- Calling `setState` schedules a re-render.

### `useEffect(effect, deps)`

- Tracks dependency arrays.
- Runs cleanup before re-running changed effects.
- Runs cleanup on `disconnectedCallback`.

### `useRef(initial?)`

- Returns `{ current }`.
- `current` is assigned after render based on `ref="name"` markers in returned HTML.

### `useEvent(ref, type, handler)`

- Registers event binding for the current render.
- Rebinds after render and removes listeners on disconnect.

### `createContext(defaultValue)` + `useContext(context)`

- Provides a minimal context mechanism.
- `Provider` updates context values for reads via `useContext`.

## React-inspired API and intentional scope

### React-inspired or similar concepts

- Function components as the authoring model.
- Hook-style APIs (`useState`, `useEffect`, `useRef`, `useEvent`).
- Context-like API with `createContext` and `useContext`.
- Props-driven rendering.
- Lifecycle-like behavior through mount/unmount effect cleanup.

### React features not available (by design)

- No Virtual DOM or reconciliation engine.
- No JSX transform pipeline in this plugin.
- No Fiber scheduler, concurrent rendering, transitions, or priorities.
- No class component API (`setState`, lifecycle methods).
- No synthetic event system (native DOM events are used).
- No portals, Suspense, error boundaries, or React Server Components.
- No React DevTools integration.
- No compatibility goal with the full React semantics/spec.

## Props and attributes

- Props are derived from the first function parameter when it is an object pattern.
- Each prop maps to a kebab-case attribute.
- Default values in destructuring are respected when the attribute is missing.

Example:

```js
function UserCard({ userName = 'Guest' }) {
  return `<span>${userName}</span>`;
}
```

Maps to attribute `user-name`.

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

Current tests include:

- Base transform flow.
- Complex hooks scenario.
- Matching stylesheet rewrite behavior.
- Preservation of unrelated imports.
- Ignore non-`.webcomponent.js` files.

## Limitations

- The plugin targets function-style components as the primary authoring pattern.
- Rendering is string-based (`innerHTML`), not JSX/VDOM.
- Complex HTML parsing edge cases in template strings are outside this plugin's scope.

## License

MIT
