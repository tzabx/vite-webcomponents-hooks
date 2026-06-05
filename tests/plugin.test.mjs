import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

import pluginFactory from '../dist/index.js';

function transformExample(fileName) {
  const code = fs.readFileSync(new URL(`../examples/${fileName}`, import.meta.url), 'utf8');
  const plugin = pluginFactory();
  const result = plugin.transform.call({}, code, `/virtual/${fileName}`);
  assert.ok(result && typeof result === 'object', `expected transform result for ${fileName}`);
  return result.code;
}

function transformSource(source, virtualId = '/virtual/test.webcomponent.js') {
  const plugin = pluginFactory();
  const result = plugin.transform.call({}, source, virtualId);
  assert.ok(result && typeof result === 'object', `expected transform result for ${virtualId}`);
  return result.code;
}

function executeTransformedRuntime(output, styles = {}) {
  const sanitized = output.replace(/^import\s.+;$/gm, '');
  const styleVars = [...new Set(output.match(/__wcjs_style_\d+/g) ?? [])];

  const registry = new Map();
  const customElements = {
    define(name, ctor) {
      registry.set(name, ctor);
    },
    get(name) {
      return registry.get(name);
    },
  };

  class MockHTMLElement {
    attachShadow() {
      this.__shadow = {
        innerHTML: '',
        querySelector() {
          return null;
        },
      };
      return this.__shadow;
    }
  }

  const styleContext = Object.fromEntries(
    styleVars.map((styleVar) => [styleVar, styles[styleVar] ?? '']),
  );

  vm.runInNewContext(sanitized, {
    customElements,
    HTMLElement: MockHTMLElement,
    console,
    ...styleContext,
  });

  const [tagName] = registry.keys();
  assert.ok(tagName, 'expected custom element to be defined');
  const ComponentClass = registry.get(tagName);
  assert.ok(ComponentClass, 'expected component class in customElements registry');

  const instance = new ComponentClass();
  instance.connectedCallback();

  return { instance, tagName };
}

test('transforms function-based webcomponent files', () => {
  const output = transformExample('counter.webcomponent.js');

  assert.match(output, /customElements\.define\("counter"/);
  assert.match(output, /function useState/);
  assert.match(output, /function useEffect/);
  assert.match(output, /\?inline/);
  assert.match(output, /from 'wc-hooks'/);
});

test('transforms a complex hook component with refs, effects, events and context', () => {
  const output = transformSource([
    "import './complex.webcomponent.css';",
    "import './shared.css';",
    "import { useState, useEffect, useRef, useEvent, useContext, createContext } from 'wc-hooks';",
    '',
    "const ThemeContext = createContext('light');",
    '',
    "function Complex({ title = 'Hello', count = 2 }) {",
    '  const [value, setValue] = useState(count);',
    '  const buttonRef = useRef();',
    '  const theme = useContext(ThemeContext);',
    '',
    '  useEffect(() => {',
    "    return () => console.log('cleanup');",
    '  }, [value]);',
    '',
    "  useEvent(buttonRef, 'click', () => setValue(value + 1));",
    '',
    '  return `',
    '    <button ref="buttonRef" id="inc">',
    '      ${title} ${value} ${theme}',
    '    </button>',
    '  `;',
    '}',
  ].join('\n'), '/virtual/complex.webcomponent.js');

  assert.match(output, /customElements\.define\("complex"/);
  assert.match(output, /const __wcjs_styles/);
  assert.match(output, /__resolveRefs\(\)/);
  assert.match(output, /__rebindEvents\(\)/);
  assert.match(output, /if \(!binding\) \{/);
  assert.match(output, /__hookEffects/);
  assert.match(output, /__refs/);
  assert.match(output, /ThemeContext/);
  assert.match(output, /getAttribute\("title"\)/);
  assert.match(output, /getAttribute\("count"\)/);
  assert.match(output, /\?inline/);
  assert.match(output, /from 'wc-hooks'/);
  assert.match(output, /import '\.\/shared\.css';/);
});

test('rewrites only the stylesheet that matches the webcomponent filename', () => {
  const output = transformSource([
    "import './widget.webcomponent.css';",
    "import './shared.css';",
    "import { helper } from './helper.js';",
    '',
    'function Widget() {',
    '  return `<div>Widget</div>`;',
    '}',
  ].join('\n'), '/virtual/widget.webcomponent.js');

  assert.match(output, /import __wcjs_style_0 from "\.\/widget\.webcomponent\.css\?inline";/);
  assert.match(output, /import '\.\/shared\.css';/);
  assert.match(output, /import \{ helper \} from '\.\/helper\.js';/);
  assert.equal((output.match(/\?inline/g) || []).length, 1);
});

test('keeps unrelated imports intact', () => {
  const output = transformSource([
    "import './card.webcomponent.css';",
    "import defaultTheme from './theme.js';",
    "import { createContext } from 'wc-hooks';",
    '',
    'function Card() {',
    '  return `<div>Card</div>`;',
    '}',
  ].join('\n'), '/virtual/card.webcomponent.js');

  assert.match(output, /import defaultTheme from '\.\/theme\.js';/);
  assert.match(output, /import \{ createContext \} from 'wc-hooks';/);
  assert.match(output, /import __wcjs_style_0 from "\.\/card\.webcomponent\.css\?inline";/);
});

test('ignores files without the .webcomponent.js suffix', () => {
  const plugin = pluginFactory();
  const result = plugin.transform.call({}, "export default 1;", '/virtual/not-a-component.js');

  assert.equal(result, null);
});

test('generated __rebindEvents guards against undefined bindings in sparse arrays', () => {
  const output = transformSource([
    "import { useState, useRef, useEvent } from 'wc-hooks';",
    '',
    'function Sparse() {',
    '  const [count, setCount] = useState(0);',
    '  const btnRef = useRef();',
    "  useEvent(btnRef, 'click', () => setCount(count + 1));",
    '  return `<button ref="btnRef">${count}</button>`;',
    '}',
  ].join('\n'), '/virtual/sparse.webcomponent.js');

  assert.match(output, /if \(!binding\) \{/);
  assert.match(output, /continue;/);
});

test('generated __rebindEvents only binds events where ref.current is set', () => {
  const output = transformSource([
    "import { useRef, useEvent } from 'wc-hooks';",
    '',
    'function Guarded() {',
    '  const btnRef = useRef();',
    "  useEvent(btnRef, 'click', () => {});",
    '  return `<button ref="btnRef">click</button>`;',
    '}',
  ].join('\n'), '/virtual/guarded.webcomponent.js');

  assert.match(output, /binding\.ref && binding\.ref\.current/);
  assert.match(output, /node\.addEventListener/);
  assert.match(output, /__activeEventBindings\.push/);
});

test('generated disconnectedCallback tears down active event listeners', () => {
  const output = transformSource([
    "import { useRef, useEvent } from 'wc-hooks';",
    '',
    'function TearDown() {',
    '  const btnRef = useRef();',
    "  useEvent(btnRef, 'click', () => {});",
    '  return `<button ref="btnRef">x</button>`;',
    '}',
  ].join('\n'), '/virtual/teardown.webcomponent.js');

  assert.match(output, /disconnectedCallback\(\) \{/);
  assert.doesNotMatch(output, /__cleanupEffects\(\)/);
  assert.match(output, /__teardownEvents\(\)/);
  assert.match(output, /removeEventListener/);
});

test('does not emit refs/events/effects blocks when component does not use them', () => {
  const output = transformSource([
    "import { useState } from 'wc-hooks';",
    '',
    'function Lean() {',
    '  const [count] = useState(1);',
    '  return `<p>${count}</p>`;',
    '}',
  ].join('\n'), '/virtual/lean.webcomponent.js');

  assert.doesNotMatch(output, /__resolveRefs\(\)/);
  assert.doesNotMatch(output, /__refBindings/);
  assert.doesNotMatch(output, /__rebindEvents\(\)/);
  assert.doesNotMatch(output, /__teardownEvents\(\)/);
  assert.doesNotMatch(output, /this\.__hookEffects\s*=\s*\[\]/);
  assert.doesNotMatch(output, /__flushEffects\(\)/);
  assert.doesNotMatch(output, /__cleanupEffects\(\)/);
});

test('emits only effect blocks when useEffect is present', () => {
  const output = transformSource([
    "import { useEffect } from 'wc-hooks';",
    '',
    'function EffectsOnly() {',
    '  useEffect(() => {}, []);',
    '  return `<p>ok</p>`;',
    '}',
  ].join('\n'), '/virtual/effects-only.webcomponent.js');

  assert.match(output, /__flushEffects\(\)/);
  assert.match(output, /__cleanupEffects\(\)/);
  assert.match(output, /__hookEffects/);
  assert.doesNotMatch(output, /__resolveRefs\(\)/);
  assert.doesNotMatch(output, /__rebindEvents\(\)/);
});

test('injects matching webcomponent stylesheet into shadow root at runtime', () => {
  const output = transformSource([
    "import './runtime-style.webcomponent.css';",
    "import './shared.css';",
    '',
    'function RuntimeStyle() {',
    '  return `<div class="ok">ok</div>`;',
    '}',
  ].join('\n'), '/virtual/runtime-style.webcomponent.js');

  const { instance } = executeTransformedRuntime(output, {
    __wcjs_style_0: '.ok { color: red; }',
  });

  assert.match(instance.shadow.innerHTML, /^<style>\.ok \{ color: red; \}<\/style>/);
  assert.match(instance.shadow.innerHTML, /<div class="ok">ok<\/div>/);
});

test('does not inject style tag at runtime when no matching webcomponent stylesheet exists', () => {
  const output = transformSource([
    "import './shared.css';",
    '',
    'function RuntimeNoStyle() {',
    '  return `<div>plain</div>`;',
    '}',
  ].join('\n'), '/virtual/runtime-no-style.webcomponent.js');

  const { instance } = executeTransformedRuntime(output);

  assert.doesNotMatch(instance.shadow.innerHTML, /<style>/);
  assert.match(instance.shadow.innerHTML, /^<div>plain<\/div>$/);
});
