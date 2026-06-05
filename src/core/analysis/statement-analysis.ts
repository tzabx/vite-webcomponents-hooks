import * as t from '@babel/types';
import type { ComponentAnalysis } from '../../types.js';
import { collectHookUsage } from './hook-usage.js';
import { extractPropsFromParam } from './props.js';
import { collectRefBindings } from './ref-bindings.js';

export function buildIdentifierMap(program: t.Program): Map<string, t.Statement> {
  const byIdentifier = new Map<string, t.Statement>();

  for (const statement of program.body) {
    if (t.isFunctionDeclaration(statement) && statement.id) {
      byIdentifier.set(statement.id.name, statement);
      continue;
    }

    if (t.isVariableDeclaration(statement)) {
      for (const declarator of statement.declarations) {
        if (t.isIdentifier(declarator.id)) {
          byIdentifier.set(declarator.id.name, statement);
        }
      }
    }
  }

  return byIdentifier;
}

export function statementToAnalysis(statement: t.Statement): ComponentAnalysis | null {
  if (t.isFunctionDeclaration(statement) && statement.id) {
    const props = statement.params[0] ? extractPropsFromParam(statement.params[0]) : [];
    const refBindings = collectRefBindings(statement.body.body);
    const hookUsage = collectHookUsage(statement.body.body);

    return {
      name: statement.id.name,
      declaration: statement,
      props,
      refBindings,
      hookUsage,
    };
  }

  if (t.isVariableDeclaration(statement)) {
    for (const declarator of statement.declarations) {
      if (!t.isIdentifier(declarator.id) || !declarator.init) {
        continue;
      }

      if (!t.isArrowFunctionExpression(declarator.init) && !t.isFunctionExpression(declarator.init)) {
        continue;
      }

      const params = declarator.init.params;
      const props = params[0] ? extractPropsFromParam(params[0]) : [];
      const bodyStatements = t.isBlockStatement(declarator.init.body) ? declarator.init.body.body : [];
      const refBindings = collectRefBindings(bodyStatements);
      const hookUsage = collectHookUsage(bodyStatements);

      return {
        name: declarator.id.name,
        declaration: statement,
        props,
        refBindings,
        hookUsage,
      };
    }
  }

  return null;
}

export function exportDefaultToAnalysis(
  statement: t.ExportDefaultDeclaration,
  byIdentifier: Map<string, t.Statement>,
): ComponentAnalysis | null {
  if (t.isFunctionDeclaration(statement.declaration)) {
    return statementToAnalysis(statement.declaration);
  }

  if (t.isIdentifier(statement.declaration)) {
    const target = byIdentifier.get(statement.declaration.name);
    if (!target) return null;
    return statementToAnalysis(target);
  }

  return null;
}
