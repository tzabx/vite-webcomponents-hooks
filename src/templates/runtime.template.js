export default String.raw`
let __wcjs_currentHost = null;
let __wcjs_hookCursor = 0;
let __wcjs_contextId = 0;
const __wcjs_contextValues = new Map();

function __wcjs_beginRender(host) {
  __wcjs_currentHost = host;
  __wcjs_hookCursor = 0;
  host.__pendingEffects = [];
  host.__pendingEventBindings = [];
}

function __wcjs_endRender() {
  __wcjs_currentHost = null;
}

function __wcjs_getHost() {
  if (!__wcjs_currentHost) {
    throw new Error("Hooks can only be used while rendering a .webcomponent.js component.");
  }
  return __wcjs_currentHost;
}

function useState(initialValue) {
  const host = __wcjs_getHost();
  const index = __wcjs_hookCursor++;
  if (!(index in host.__hookState)) {
    host.__hookState[index] = typeof initialValue === "function" ? initialValue() : initialValue;
  }

  const setState = (nextValue) => {
    const previousValue = host.__hookState[index];
    const resolvedValue = typeof nextValue === "function" ? nextValue(previousValue) : nextValue;
    if (Object.is(previousValue, resolvedValue)) {
      return;
    }
    host.__hookState[index] = resolvedValue;
    host.__scheduleRender();
  };

  return [host.__hookState[index], setState];
}

function useRef(initialValue = null) {
  const host = __wcjs_getHost();
  const index = __wcjs_hookCursor++;
  if (!(index in host.__hookState)) {
    host.__hookState[index] = { current: initialValue };
  }
  return host.__hookState[index];
}

function useEffect(effect, deps) {
  const host = __wcjs_getHost();
  const index = __wcjs_hookCursor++;
  const previousRecord = host.__hookEffects[index];
  const hasChanged =
    !previousRecord ||
    !deps ||
    !previousRecord.deps ||
    deps.length !== previousRecord.deps.length ||
    deps.some((dep, depIndex) => !Object.is(dep, previousRecord.deps[depIndex]));

  host.__hookEffects[index] = {
    effect,
    deps: deps ? [...deps] : undefined,
    cleanup: previousRecord ? previousRecord.cleanup : null,
    dirty: hasChanged,
  };
}

function useEvent(ref, type, handler) {
  const host = __wcjs_getHost();
  const index = __wcjs_hookCursor++;
  host.__pendingEventBindings[index] = { ref, type, handler };
}

function createContext(defaultValue) {
  const id = ++__wcjs_contextId;
  __wcjs_contextValues.set(id, defaultValue);

  return {
    id,
    defaultValue,
    Provider({ value, children = "" } = {}) {
      __wcjs_contextValues.set(id, value);
      return children;
    },
  };
}

function useContext(context) {
  if (!context) {
    return undefined;
  }
  if (typeof context.id !== "number") {
    return context.defaultValue;
  }
  return __wcjs_contextValues.has(context.id)
    ? __wcjs_contextValues.get(context.id)
    : context.defaultValue;
}
`;