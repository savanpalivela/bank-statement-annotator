import type { Rule } from '../types';
import { normalizeRule, normalizeRules } from './ruleEngine';
import { downloadJson } from './fileDownload';

const FILE_KIND = 'bank-statement-annotator/smart-rules';

/** Trigger a download of the current rules as a JSON file. */
export function exportRulesToFile(rules: Rule[]): void {
  downloadJson('smart-rules', {
    kind: FILE_KIND,
    version: 1,
    exportedAt: new Date().toISOString(),
    rules: normalizeRules(rules),
  });
}

/**
 * Parse the text of an exported rules file (or a bare rules array) into
 * normalized Rule objects. Throws with a readable message on malformed input.
 */
export function parseImportedRules(text: string): Rule[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON');
  }

  const arr = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as any).rules)
    ? (data as any).rules
    : null;

  if (!arr) throw new Error('No "rules" array found in file');

  return arr.map((r: any, i: number): Rule => {
    if (!r || typeof r !== 'object') throw new Error(`Rule ${i + 1} is not an object`);
    return normalizeRule({
      id: typeof r.id === 'string' && r.id ? r.id : `imp-${i}`,
      name: typeof r.name === 'string' && r.name ? r.name : `Imported rule ${i + 1}`,
      enabled: r.enabled !== false,
      targetCategory: typeof r.targetCategory === 'string' ? r.targetCategory : 'Uncategorized',
      action: r.action === 'exclude' ? 'exclude' : 'categorize',
      match: r.match === 'any' ? 'any' : 'all',
      conditions: Array.isArray(r.conditions) ? r.conditions : undefined,
      accountId: typeof r.accountId === 'string' ? r.accountId : 'ALL',
      appliesTo: r.appliesTo,
      field: r.field,
      operator: r.operator,
      value: r.value,
    } as Rule);
  });
}
