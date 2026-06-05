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
%%EFFECTS_STATE%%
%%EVENTS_STATE%%
%%REFS_STATE%%
    this.shadow = this.attachShadow({ mode: "open" });
    this.render = this.render.bind(this);
  }

  __scheduleRender() {
    this.render();
  }

%%REFS_METHODS%%

%%EVENTS_METHODS%%

%%EFFECTS_METHODS%%

  render() {
    __wcjs_beginRender(this);
    const html = %%COMPONENT_CALL%%;
    const styleTag = __wcjs_styles ? "<style>" + __wcjs_styles + "</style>" : "";
    this.shadow.innerHTML = styleTag + (html ?? "");
%%REFS_RENDER%%
%%EVENTS_RENDER%%
    __wcjs_endRender();
%%EFFECTS_RENDER%%
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
%%EFFECTS_DISCONNECT%%
%%EVENTS_DISCONNECT%%
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