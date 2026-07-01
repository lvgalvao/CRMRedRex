// Substituição de variáveis do playbook (PURA, testável sem banco/IA — T047).
// {{var}} é trocado pelo valor conhecido; variáveis sem valor permanecem visíveis.

export type TemplateVars = Record<string, string | null | undefined>;

export function fillVariables(body: string, vars: TemplateVars): string {
  return body.replace(/\{\{\s*([\w]+)\s*\}\}/g, (match, key: string) => {
    const value = vars[key];
    return value != null && value !== "" ? String(value) : match;
  });
}

/** Lista as variáveis ainda não preenchidas no texto. */
export function missingVariables(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(/\{\{\s*([\w]+)\s*\}\}/g)) found.add(m[1]);
  return Array.from(found);
}
