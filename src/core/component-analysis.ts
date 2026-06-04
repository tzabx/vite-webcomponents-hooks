import * as t from '@babel/types';

import type { ComponentAnalysis } from '../types.js';
import {
  buildIdentifierMap,
  exportDefaultToAnalysis,
  statementToAnalysis,
} from './analysis/statement-analysis.js';

export function analyzeComponent(program: t.Program): ComponentAnalysis | null {
  const byIdentifier = buildIdentifierMap(program);

  for (const statement of program.body) {
    const direct = statementToAnalysis(statement);
    if (direct) {
      return direct;
    }

    if (t.isExportDefaultDeclaration(statement)) {
      const fromExport = exportDefaultToAnalysis(statement, byIdentifier);
      if (fromExport) return fromExport;
    }

    if (t.isExportNamedDeclaration(statement) && statement.declaration) {
      const named = statementToAnalysis(statement.declaration);
      if (named) {
        return named;
      }
    }
  }

  return null;
}
