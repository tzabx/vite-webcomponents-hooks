export default String.raw`
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
`;