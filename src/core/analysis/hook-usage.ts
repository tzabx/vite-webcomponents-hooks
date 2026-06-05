import * as t from '@babel/types';

import type { HookUsage } from '../../types.js';

const EMPTY_USAGE: HookUsage = {
  useEffect: false,
  useEvent: false,
};

export function collectHookUsage(statements: t.Statement[]): HookUsage {
  const usage: HookUsage = { ...EMPTY_USAGE };

  for (const statement of statements) {
    scanNode(statement, usage);
  }

  return usage;
}

function scanNode(node: t.Node | null | undefined, usage: HookUsage): void {
  if (!node || usage.useEffect && usage.useEvent) {
    return;
  }

  if (t.isCallExpression(node) && t.isIdentifier(node.callee)) {
    if (node.callee.name === 'useEffect') {
      usage.useEffect = true;
    }

    if (node.callee.name === 'useEvent') {
      usage.useEvent = true;
    }
  }

  for (const key of Object.keys(node) as Array<keyof typeof node>) {
    const value = node[key];

    if (Array.isArray(value)) {
      for (const item of value) {
        if (isBabelNode(item)) {
          scanNode(item, usage);
        }
      }
      continue;
    }

    if (isBabelNode(value)) {
      scanNode(value, usage);
    }
  }
}

function isBabelNode(value: unknown): value is t.Node {
  if (!value || typeof value !== 'object' || !('type' in value)) {
    return false;
  }

  const typeValue = (value as { type?: unknown }).type;
  return typeof typeValue === 'string' && !typeValue.startsWith('Comment');
}