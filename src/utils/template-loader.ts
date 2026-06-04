import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);
const templatesDir = resolve(currentDir, '../templates');
const templateCache = new Map<string, string>();

export function loadTemplate(fileName: string): string {
  const cached = templateCache.get(fileName);
  if (cached) {
    return cached;
  }

  const fullPath = resolve(templatesDir, fileName);
  const content = readFileSync(fullPath, 'utf8');
  const match = content.match(/String\.raw`([\s\S]*)`\s*;?\s*$/);
  const template = match ? match[1] : content;
  templateCache.set(fileName, template);
  return template;
}

export function renderTemplate(template: string, values: Record<string, string>): string {
  let output = template;
  for (const [token, value] of Object.entries(values)) {
    output = output.split(token).join(value);
  }
  return output;
}
