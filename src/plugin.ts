import type { Plugin } from 'vite';

import { transformWebComponentSource } from './core/transform-source.js';

export type ViteWebComponentsPluginOptions = {
  includeRuntimeHelpers?: boolean;
};

export function createViteWebComponentsHooksPlugin(
  options: ViteWebComponentsPluginOptions = {},
): Plugin {
  const includeRuntimeHelpers = options.includeRuntimeHelpers ?? true;

  return {
    name: 'vite-webcomponents-hooks',
    enforce: 'pre',
    transform(code, id) {
      const cleanId = id.split('?')[0];
      if (!cleanId.endsWith('.webcomponent.js')) {
        return null;
      }

      return {
        code: transformWebComponentSource({
          code,
          id: cleanId,
          options: { includeRuntimeHelpers },
        }),
        map: null,
      };
    },
  };
}
