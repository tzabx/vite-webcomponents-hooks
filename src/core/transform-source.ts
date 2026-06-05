import { parse } from '@babel/parser';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { basename } from 'node:path';

import type { ComponentAnalysis } from '../types.js';
import { toKebabCase, withInlineQuery } from '../utils/string.js';
import { loadTemplate, renderTemplate } from '../utils/template-loader.js';
import { analyzeComponent } from './component-analysis.js';

const babelGenerate =
  (generate as unknown as { default?: typeof generate }).default ?? generate;

export type TransformSourceOptions = {
  includeRuntimeHelpers: boolean;
};

export type TransformSourceInput = {
  code: string;
  id: string;
  options: TransformSourceOptions;
};

export function transformWebComponentSource({ code, id, options }: TransformSourceInput): string {
  const expectedStylesheetName = toExpectedStylesheetName(id);

  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  const cssImports: Array<{ localName: string; source: string }> = [];
  const rewrittenBody: Array<t.Statement | t.ModuleDeclaration> = [];

  let styleIndex = 0;
  for (const statement of ast.program.body) {
    if (
      t.isImportDeclaration(statement) &&
      typeof statement.source.value === 'string' &&
      basename(statement.source.value) === expectedStylesheetName
    ) {
      const localName = `__wcjs_style_${styleIndex++}`;
      cssImports.push({
        localName,
        source: withInlineQuery(statement.source.value),
      });

      rewrittenBody.push(
        t.importDeclaration(
          [t.importDefaultSpecifier(t.identifier(localName))],
          t.stringLiteral(withInlineQuery(statement.source.value)),
        ),
      );
      continue;
    }

    rewrittenBody.push(statement);
  }

  ast.program.body = rewrittenBody;

  const analysis = analyzeComponent(ast.program);
  if (!analysis) {
    throw new Error(`[vite-webcomponents-hooks] Could not find a top-level function component in ${id}`);
  }

  return generateTransformedSource(ast.program, analysis, cssImports, options.includeRuntimeHelpers);
}

function generateTransformedSource(
  program: t.Program,
  analysis: ComponentAnalysis,
  cssImports: Array<{ localName: string; source: string }>,
  includeRuntimeHelpers: boolean,
): string {
  const tagName = toKebabCase(analysis.name);
  const className = `${analysis.name}Component`;
  const propAttrMapEntries = analysis.props
    .map((prop) => `${JSON.stringify(toKebabCase(prop.key))}: ${JSON.stringify(prop.key)}`)
    .join(', ');
  const propEntries = analysis.props
    .map((prop) => {
      const attributeName = toKebabCase(prop.key);
      const defaultValue = prop.defaultValue
        ? babelGenerate(prop.defaultValue, { compact: false }).code
        : 'undefined';
      return `${JSON.stringify(prop.key)}: this.getAttribute(${JSON.stringify(attributeName)}) === null ? ${defaultValue} : this.getAttribute(${JSON.stringify(attributeName)})`;
    })
    .join(', ');

  const observedAttributes = analysis.props
    .map((prop) => JSON.stringify(toKebabCase(prop.key)))
    .join(', ');

  const hasRefs = analysis.refBindings.length > 0;
  const hasEvents = analysis.hookUsage.useEvent;
  const hasEffects = analysis.hookUsage.useEffect;
  const refBindings = JSON.stringify(analysis.refBindings);
  const moduleSource = babelGenerate(program, { compact: false }).code;
  const styleArray = cssImports.map((style) => style.localName).join(', ');
  const styleBlock = cssImports.length > 0
    ? 'const __wcjs_styles = [' + styleArray + '].filter(Boolean).join("\\n");'
    : 'const __wcjs_styles = "";';

  const runtimeHelpers = includeRuntimeHelpers
    ? loadTemplate('runtime.template.js')
    : '';

  const refsState = hasRefs
    ? `    this.__refBindings = ${refBindings};\n    this.__refs = {};`
    : '';
  const eventsState = hasEvents
    ? '    this.__pendingEventBindings = [];\n    this.__activeEventBindings = [];'
    : '';
  const effectsState = hasEffects
    ? '    this.__hookEffects = [];\n    this.__pendingEffects = [];'
    : '';

  const refsMethods = hasRefs
    ? loadTemplate('features/refs.methods.partial.js').trim()
    : '';
  const eventsMethods = hasEvents
    ? loadTemplate('features/events.methods.partial.js').trim()
    : '';
  const effectsMethods = hasEffects
    ? loadTemplate('features/effects.methods.partial.js').trim()
    : '';

  return renderTemplate(loadTemplate('transform-output.template.js'), {
    '%%RUNTIME_HELPERS%%': runtimeHelpers,
    '%%MODULE_SOURCE%%': moduleSource,
    '%%STYLE_BLOCK%%': styleBlock,
    '%%CLASS_NAME%%': className,
    '%%OBSERVED_ATTRIBUTES%%': observedAttributes,
    '%%ATTR_TO_PROP%%': propAttrMapEntries,
    '%%PROP_ENTRIES%%': propEntries,
    '%%REFS_STATE%%': refsState,
    '%%EVENTS_STATE%%': eventsState,
    '%%EFFECTS_STATE%%': effectsState,
    '%%REFS_METHODS%%': refsMethods,
    '%%EVENTS_METHODS%%': eventsMethods,
    '%%EFFECTS_METHODS%%': effectsMethods,
    '%%REFS_RENDER%%': hasRefs ? '    this.__resolveRefs();' : '',
    '%%EVENTS_RENDER%%': hasEvents ? '    this.__rebindEvents();' : '',
    '%%EFFECTS_RENDER%%': hasEffects ? '    this.__flushEffects();' : '',
    '%%EFFECTS_DISCONNECT%%': hasEffects ? '    this.__cleanupEffects();' : '',
    '%%EVENTS_DISCONNECT%%': hasEvents ? '    this.__teardownEvents();' : '',
    '%%COMPONENT_CALL%%': `${analysis.name}(this.__props)`,
    '%%TAG_NAME%%': tagName,
  });
}

function toExpectedStylesheetName(id: string): string {
  const fileName = basename(id.split('?')[0]);
  return fileName.replace(/\.js$/, '.css');
}
