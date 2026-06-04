export function withInlineQuery(source: string): string {
  return source.includes('?') ? `${source}&inline` : `${source}?inline`;
}

export function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}
