import type { CategoryStructure } from '../types';
import { downloadJson } from './fileDownload';

const FILE_KIND = 'bank-statement-annotator/categories';

/** Trigger a download of the expense / income category lists as a JSON file. */
export function exportCategoriesToFile(categories: CategoryStructure): void {
  downloadJson('categories', {
    kind: FILE_KIND,
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: {
      income: [...categories.income],
      expense: [...categories.expense],
    },
  });
}

/** Trim, drop blanks, de-duplicate case-insensitively (keeping first spelling). */
function cleanList(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of arr) {
    if (typeof v !== 'string') continue;
    const t = v.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/**
 * Parse the text of an exported categories file (or a bare {income, expense}
 * object) into a CategoryStructure. Throws a readable message on bad input.
 */
export function parseImportedCategories(text: string): CategoryStructure {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON');
  }

  const src =
    data && typeof data === 'object' && (data as any).categories && typeof (data as any).categories === 'object'
      ? (data as any).categories
      : data;

  if (!src || typeof src !== 'object') throw new Error('No categories found in file');

  const income = cleanList((src as any).income);
  const expense = cleanList((src as any).expense);
  if (income.length === 0 && expense.length === 0) throw new Error('No categories found in file');

  // "Uncategorized" is a protected default and must always be present
  if (!income.some((c) => c.toLowerCase() === 'uncategorized')) income.push('Uncategorized');
  if (!expense.some((c) => c.toLowerCase() === 'uncategorized')) expense.push('Uncategorized');

  return { income, expense };
}
