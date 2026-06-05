export default String.raw`
  __teardownEvents() {
    for (const binding of this.__activeEventBindings) {
      binding.node.removeEventListener(binding.type, binding.handler);
    }
    this.__activeEventBindings = [];
  }

  __rebindEvents() {
    this.__teardownEvents();
    for (const binding of this.__pendingEventBindings) {
      if (!binding) {
        continue;
      }
      const node = binding.ref && binding.ref.current ? binding.ref.current : null;
      if (!node) {
        continue;
      }
      node.addEventListener(binding.type, binding.handler);
      this.__activeEventBindings.push({ node, type: binding.type, handler: binding.handler });
    }
  }
`;