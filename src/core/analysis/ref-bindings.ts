import * as t from '@babel/types';
import type { RefBinding } from '../../types.js';

export function collectRefBindings(statements: t.Statement[]): RefBinding[] {
  const bindings: RefBinding[] = [];
  let hookIndex = 0;

  for (const statement of statements) {
    if (t.isVariableDeclaration(statement)) {
      for (const declarator of statement.declarations) {
        if (
          t.isIdentifier(declarator.id) &&
          t.isCallExpression(declarator.init) &&
          t.isIdentifier(declarator.init.callee) &&
          declarator.init.callee.name === 'useRef'
        ) {
          bindings.push({ name: declarator.id.name, hookIndex });
        }

        if (
          t.isCallExpression(declarator.init) &&
          t.isIdentifier(declarator.init.callee) &&
          declarator.init.callee.name.startsWith('use')
        ) {
          hookIndex += 1;
        }
      }
      continue;
    }

    if (t.isExpressionStatement(statement) && t.isCallExpression(statement.expression)) {
      const callee = statement.expression.callee;
      if (t.isIdentifier(callee) && callee.name.startsWith('use')) {
        hookIndex += 1;
      }
      continue;
    }

    if (t.isBlockStatement(statement)) {
      bindings.push(...collectRefBindings(statement.body).map((binding) => ({
        name: binding.name,
        hookIndex: binding.hookIndex + hookIndex,
      })));
      continue;
    }
  }

  return bindings;
}
