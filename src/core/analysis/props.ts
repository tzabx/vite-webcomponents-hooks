import * as t from '@babel/types';
import type { PropAnalysis } from '../../types.js';

export function extractPropsFromParam(param: t.Node): PropAnalysis[] {
  if (t.isAssignmentPattern(param)) {
    if (t.isPattern(param.left)) {
      return extractPropsFromParam(param.left);
    }
    return [];
  }

  if (!t.isObjectPattern(param)) {
    return [];
  }

  const props: PropAnalysis[] = [];
  for (const property of param.properties) {
    if (!t.isObjectProperty(property)) {
      continue;
    }

    const key = t.isIdentifier(property.key)
      ? property.key.name
      : t.isStringLiteral(property.key)
        ? property.key.value
        : null;

    if (!key) {
      continue;
    }

    const defaultValue = t.isAssignmentPattern(property.value) && t.isExpression(property.value.right)
      ? property.value.right
      : null;

    props.push({ key, defaultValue });
  }

  return props;
}
