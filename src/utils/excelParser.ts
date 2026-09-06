import * as XLSX from 'xlsx';
import type { ColumnMapping, Transaction } from '../types';

export interface ParseExcelResult {
  fileName: string;
  columns: string[];
  rawData: Record<string, any>[];
  suggestedMapping: ColumnMapping;
}

export interface MultiFileParseResult {
  acceptedResults: ParseExcelResult[];
  rejectedFiles: { fileName: string; reason: string; columns?: string[] }[];
  primaryColumns: string[];
}

export function parseExcelFile(file: File): Promise<ParseExcelResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!jsonRows || jsonRows.length === 0) {
          throw new Error('File contains no readable rows.');
        }

        const columns = Object.keys(jsonRows[0]);
        const suggestedMapping = detectColumnMapping(columns);

        resolve({
          fileName: file.name,
          columns,
          rawData: jsonRows,
          suggestedMapping,
        });
      } catch (err: any) {
        reject(new Error(err.message || 'Failed to parse Excel file. Ensure it is a valid .xlsx or .xls file.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('File reading error. Please try uploading again.'));
    };

    reader.readAsArrayBuffer(file);
  });
}

export function areColumnsMatching(baseCols: string[], targetCols: string[]): boolean {
  if (baseCols.length !== targetCols.length) return false;
  const baseNormalized = baseCols.map((c) => c.trim().toLowerCase()).sort();
  const targetNormalized = targetCols.map((c) => c.trim().toLowerCase()).sort();
  return baseNormalized.every((val, idx) => val === targetNormalized[idx]);
}

/**
 * Parse multiple files to be treated as the SAME account (same column format required).
 * Files with different column formats are rejected.
 */
export async function parseMultipleExcelFiles(
  files: File[],
  existingBaseColumns?: string[]
): Promise<MultiFileParseResult> {
  const acceptedResults: ParseExcelResult[] = [];
  const rejectedFiles: { fileName: string; reason: string; columns?: string[] }[] = [];

  let baseColumns = existingBaseColumns && existingBaseColumns.length > 0 ? existingBaseColumns : null;

  for (const file of files) {
    try {
      const parsed = await parseExcelFile(file);

      if (!baseColumns) {
        baseColumns = parsed.columns;
        acceptedResults.push(parsed);
      } else {
        if (areColumnsMatching(baseColumns, parsed.columns)) {
          acceptedResults.push(parsed);
        } else {
          rejectedFiles.push({
            fileName: file.name,
            reason: `Column mismatch. Expected headers: [${baseColumns.slice(0, 4).join(', ')}...], found: [${parsed.columns.slice(0, 4).join(', ')}...]`,
            columns: parsed.columns,
          });
        }
      }
    } catch (err: any) {
      rejectedFiles.push({
        fileName: file.name,
        reason: err.message || 'Parsing error',
      });
    }
  }

  return {
    acceptedResults,
    rejectedFiles,
    primaryColumns: baseColumns || [],
  };
}

/**
 * Parse a single file as a NEW account (no column-matching required).
 * Always succeeds unless the file can't be read.
 */
export async function parseExcelFileAsNewAccount(file: File): Promise<ParseExcelResult> {
  return parseExcelFile(file);
}

export function detectColumnMapping(columns: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    dateCol: '',
    descCol: '',
    amountMode: 'single',
    amountCol: '',
    debitCol: '',
    creditCol: '',
    balanceCol: '',
    categoryCol: '',
  };

  const lowerCols = columns.map((c) => c.toLowerCase());

  // Date column detection
  const dateIdx = lowerCols.findIndex(
    (c) => c.includes('date') || c.includes('time') || c.includes('day') || c.includes('posted')
  );
  if (dateIdx !== -1) mapping.dateCol = columns[dateIdx];
  else mapping.dateCol = columns[0] || '';

  // Description column detection
  const descIdx = lowerCols.findIndex(
    (c) =>
      c.includes('desc') ||
      c.includes('particular') ||
      c.includes('payee') ||
      c.includes('memo') ||
      c.includes('narrative') ||
      c.includes('name') ||
      c.includes('detail')
  );
  if (descIdx !== -1) mapping.descCol = columns[descIdx];
  else mapping.descCol = columns[1] || columns[0] || '';

  // Debit / Credit vs Single Amount.
  // Long keywords are matched as substrings; the short abbreviations (dr/cr/in/out)
  // are matched only as whole words so headers like "Description" (contains "cr")
  // are not mistaken for the credit column.
  const debitIdx = lowerCols.findIndex(
    (c) => c.includes('debit') || c.includes('withdrawal') || /\b(dr|out)\b/.test(c)
  );
  const creditIdx = lowerCols.findIndex(
    (c) => c.includes('credit') || c.includes('deposit') || /\b(cr|in)\b/.test(c)
  );

  if (debitIdx !== -1 && creditIdx !== -1) {
    mapping.amountMode = 'split';
    mapping.debitCol = columns[debitIdx];
    mapping.creditCol = columns[creditIdx];
  } else {
    const amountIdx = lowerCols.findIndex(
      (c) => c.includes('amount') || c.includes('amt') || c.includes('sum') || c.includes('value')
    );
    if (amountIdx !== -1) {
      mapping.amountCol = columns[amountIdx];
    } else if (debitIdx !== -1) {
      mapping.amountCol = columns[debitIdx];
    } else if (creditIdx !== -1) {
      mapping.amountCol = columns[creditIdx];
    } else {
      mapping.amountCol = columns[2] || columns[0];
    }
  }

  // Balance column detection
  const balIdx = lowerCols.findIndex(
    (c) => c.includes('balance') || c.includes('bal') || c.includes('running')
  );
  if (balIdx !== -1) mapping.balanceCol = columns[balIdx];

  // Category column detection
  const catIdx = lowerCols.findIndex(
    (c) => c.includes('category') || c.includes('annotation') || c.includes('tag') || c.includes('label') || c.includes('remark')
  );
  if (catIdx !== -1) mapping.categoryCol = columns[catIdx];

  return mapping;
}

export function exportTransactionsToExcel(
  transactions: Transaction[],
  _originalColumns: string[],
  categoryColName: string = 'Category / Annotation',
  fileName: string = 'annotated_bank_statement.xlsx'
) {
  const exportRows = transactions.map((tx) => {
    const rowObj: Record<string, any> = {
      Account: tx.accountLabel,
      ...tx.rawRow,
    };
    rowObj[categoryColName] = tx.category || 'Uncategorized';
    rowObj['Excluded (Internal Transfer)'] = tx.excluded ? 'TRUE' : '';
    return rowObj;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Annotated Statement');

  XLSX.writeFile(workbook, fileName);
}
