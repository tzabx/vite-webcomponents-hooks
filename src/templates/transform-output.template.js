export default String.raw`
%%RUNTIME_HELPERS%%
%%MODULE_SOURCE%%

%%STYLE_BLOCK%%

class %%CLASS_NAME%% extends HTMLElement {
  static get observedAttributes() {
    return [%%OBSERVED_ATTRIBUTES%%];
  }

  constructor() {
    super();
    this.__attrToProp = { %%ATTR_TO_PROP%% };
    this.__props = { %%PROP_ENTRIES%% };
    this.__hookState = [];
    this.__hookEffects = [];
    this.__pendingEffects = [];
    this.__pendingEventBindings = [];
    this.__activeEventBindings = [];
    this.__refBindings = %%REF_BINDINGS%%;
    this.__refs = {};
    this.shadow = this.attachShadow({ mode: "open" });
    this.render = this.render.bind(this);
  }

  __scheduleRender() {
    this.render();
  }

  __resolveRefs() {
    for (const binding of this.__refBindings) {
      const node = this.shadow.querySelector(`[ref="${binding.name}"]`);
      if (!node) {
        continue;
      }
      node.removeAttribute("ref");
      this.__refs[binding.name] = node;
      const refObject = this.__hookState[binding.hookIndex];
      if (refObject && typeof refObject === "object") {
        refObject.current = node;
      }
    }
  }

  __teardownEvents() {
    for (const binding of this.__activeEventBindings) {
      binding.node.removeEventListener(binding.type, binding.handler);
    }
    this.__activeEventBindings = [];
  }

  __rebindEvents() {
    this.__teardownEvents();
    for (const binding of this.__pendingEventBindings) {
      const node = binding.ref && binding.ref.current ? binding.ref.current : null;
      if (!node) {
        continue;
      }
      node.addEventListener(binding.type, binding.handler);
      this.__activeEventBindings.push({ node, type: binding.type, handler: binding.handler });
    }
  }

  __flushEffects() {
    for (const effectRecord of this.__hookEffects) {
      if (!effectRecord || !effectRecord.dirty) {
        continue;
      }
      if (typeof effectRecord.cleanup === "function") {
        effectRecord.cleanup();
      }
      const cleanup = effectRecord.effect();
      effectRecord.cleanup = typeof cleanup === "function" ? cleanup : null;
      effectRecord.dirty = false;
    }
  }

  __cleanupEffects() {
    for (const effectRecord of this.__hookEffects) {
      if (effectRecord && typeof effectRecord.cleanup === "function") {
        effectRecord.cleanup();
      }
    }
  }

  render() {
    __wcjs_beginRender(this);
    const html = %%COMPONENT_CALL%%;
    const styleTag = __wcjs_styles ? "<style>" + __wcjs_styles + "</style>" : "";
    this.shadow.innerHTML = styleTag + (html ?? "");
    this.__resolveRefs();
    this.__rebindEvents();
    __wcjs_endRender();
    this.__flushEffects();
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.__cleanupEffects();
    this.__teardownEvents();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }
    const propName = this.__attrToProp[name] || name;
    this.__props[propName] = newValue;
    this.render();
  }
}

if (!customElements.get("%%TAG_NAME%%")) {
  customElements.define("%%TAG_NAME%%", %%CLASS_NAME%%);
}
`;