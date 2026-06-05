export default String.raw`
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
`;